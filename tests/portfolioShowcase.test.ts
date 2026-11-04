process.env.NODE_ENV = 'test';

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { type Server } from 'http';
import { app } from '../server.ts';
import { createSessionToken, COOKIE_NAME } from '../server/auth.ts';
import { userRepository, islmRepository, attemptRepository, portfolioRepository } from '../server/repositories/index.ts';

let server: Server;
let baseUrl: string;

const testStudent = {
  id: 'STU_PORT_TEST_101',
  name: 'Marcus Vance',
  email: 'marcus.vance@university.edu',
  role: 'student' as const,
  plan: 'Free Plan',
  degree: 'B.Tech in Computer Science & Engineering',
  overallMastery: 0.86,
  streakDays: 6,
  tokenVersion: 1,
};

let studentCookie: string;
let publishedSlug: string;

before(async () => {
  // Ensure user and records exist in database
  if (!userRepository.findById(testStudent.id)) {
    userRepository.create({
      ...testStudent,
      preferredLanguages: ['python', 'javascript'],
      testsCompleted: 8,
      theme: 'dark',
      passwordHash: 'hash',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      synthetic: false,
    });
  }

  // Ensure ISLM record exists
  islmRepository.upsert({
    student_id: testStudent.id,
    name: testStudent.name,
    email: testStudent.email,
    role: 'student',
    course_track: 'Data Structures & Algorithms',
    overall_mastery: 0.86,
    topic_mastery: {
      'binary-search': 0.88,
      'tree-traversal': 0.91,
    },
    recent_misconceptions: [],
    scaffolding_tier_required: 1,
    error_count: 1,
    independent_solves: 5,
    scaffolding_fading_index: 0.6,
    time_spent_mins: 120,
    history: [],
  });

  // Seed a passed attempt for evidence verification
  if (!attemptRepository.findById('att_test_evidence_1')) {
    attemptRepository.create({
      id: 'att_test_evidence_1',
      studentId: testStudent.id,
      conceptId: 'binary-search',
      kind: 'code_lab',
      passed: true,
      tierUsed: 1,
      hintsRequested: 0,
      durationSec: 45,
      language: 'python',
      codeSnippet: 'def binary_search(arr, target): ...',
      ts: new Date().toISOString(),
    });
  }

  const token = createSessionToken(testStudent);
  studentCookie = `${COOKIE_NAME}=${token}`;

  await new Promise<void>((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      const addr = server.address() as any;
      baseUrl = `http://127.0.0.1:${addr.port}`;
      resolve();
    });
  });
});

after(async () => {
  if (server) {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  }
});

describe('Learner Portfolio & Public Showcase Acceptance Suite', () => {
  it('1. GET /api/portfolio: returns verified skills, evidence records, and mastery badges', async () => {
    const res = await fetch(`${baseUrl}/api/portfolio`, {
      headers: { Cookie: studentCookie },
    });
    if (res.status !== 200) {
      const err = await res.text();
      console.error('[TEST 1 ERROR BODY]:', err);
    }
    assert.equal(res.status, 200);

    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(data.portfolio);
    assert.equal(data.portfolio.profile.name, 'Marcus Vance');

    // Verify skills are grouped and have evidence records
    assert.ok(Array.isArray(data.portfolio.skills));
    assert.ok(data.portfolio.skills.length > 0);

    const verifiedSkill = data.portfolio.skills.find((s: any) => s.id === 'binary-search');
    if (verifiedSkill) {
      assert.equal(verifiedSkill.verificationType, 'verified_by_assessment');
      assert.ok(verifiedSkill.evidence.length >= 1);
      assert.equal(verifiedSkill.evidence[0].attemptId, 'att_test_evidence_1');
    }

    // Verify badges evaluated from mastery engine rules
    assert.ok(Array.isArray(data.portfolio.badges));
    const bktScholarBadge = data.portfolio.badges.find((b: any) => b.id === 'bkt_mastery_scholar');
    assert.ok(bktScholarBadge);
    // Since overallMastery is 0.86 (>= 0.80), badge must be awarded
    assert.equal(bktScholarBadge.awarded, true);

    publishedSlug = data.portfolio.profile.slug;
    assert.ok(publishedSlug);
  });

  it('2. Acceptance: student can publish a link, opening it logged-out shows only allowed public content', async () => {
    // Publish portfolio as link_only
    const publishRes = await fetch(`${baseUrl}/api/portfolio/publish`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: studentCookie,
      },
      body: JSON.stringify({ visibility: 'link_only' }),
    });
    assert.equal(publishRes.status, 200);
    const publishData = await publishRes.json();
    assert.equal(publishData.success, true);
    assert.equal(publishData.visibility, 'link_only');

    // Access public endpoint logged out (NO Cookie provided)
    const publicRes = await fetch(`${baseUrl}/api/portfolio/public/${publishedSlug}`);
    assert.equal(publicRes.status, 200);

    const publicData = await publicRes.json();
    assert.equal(publicData.success, true);
    assert.equal(publicData.portfolio.profile.name, 'Marcus Vance');

    // STRICT SANITIZATION CHECK: Private data MUST NEVER leak!
    assert.equal(publicData.portfolio.profile.email, undefined, 'Email must NOT be exposed in public portfolio');
    assert.equal(publicData.portfolio.profile.passwordHash, undefined, 'Password hash must NOT be exposed');
    assert.equal(publicData.portfolio.profile.tokenVersion, undefined, 'Token version must NOT be exposed');
    assert.equal(publicData.portfolio.events, undefined, 'Raw event logs must NOT be exposed');
  });

  it('3. Acceptance: revoking public portfolio returns 404 on public URL', async () => {
    // Revoke portfolio
    const revokeRes = await fetch(`${baseUrl}/api/portfolio/revoke`, {
      method: 'POST',
      headers: { Cookie: studentCookie },
    });
    assert.equal(revokeRes.status, 200);
    const revokeData = await revokeRes.json();
    assert.equal(revokeData.visibility, 'private');

    // Public API call must now return 404
    const publicApiRes = await fetch(`${baseUrl}/api/portfolio/public/${publishedSlug}`);
    assert.equal(publicApiRes.status, 404, 'Public API endpoint must return 404 after revocation');

    // Public HTML page call /p/:slug must also return 404
    const publicHtmlRes = await fetch(`${baseUrl}/p/${publishedSlug}`);
    assert.equal(publicHtmlRes.status, 404, 'Public route /p/:slug must return 404 after revocation');
    const htmlText = await publicHtmlRes.text();
    assert.ok(htmlText.includes('404'), 'HTML response should indicate 404 private/expired');
  });

  it('4. Export: GET /api/portfolio/transcript.json returns verified skills transcript in Verifiable Credentials format', async () => {
    const res = await fetch(`${baseUrl}/api/portfolio/transcript.json`, {
      headers: { Cookie: studentCookie },
    });
    assert.equal(res.status, 200);

    const transcript = await res.json();
    assert.ok(transcript.type.includes('VerifiableCredential'));
    assert.equal(transcript.issuer.name, 'Mastery.ai Autonomous Pedagogical Engine');
    assert.equal(transcript.credentialSubject.name, 'Marcus Vance');
    assert.ok(transcript.proof);
    assert.ok(transcript.proof.jws.startsWith('cogni_sig_'));
  });

  it('5. Showcase: GET /api/showcase/metrics returns live metrics from real study data', async () => {
    const res = await fetch(`${baseUrl}/api/showcase/metrics`);
    assert.equal(res.status, 200);

    const data = await res.json();
    // Since we seeded test attempts and users, metrics must be available
    assert.equal(data.available, true);
    assert.ok(data.stats.totalVerifiedAttempts >= 1);
    assert.ok(data.stats.activeLearners >= 1);
  });

  it('6. Demo Mode: POST /api/auth/demo-login logs into sandboxed demo student account with session cookie', async () => {
    const res = await fetch(`${baseUrl}/api/auth/demo-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    assert.equal(res.status, 200);

    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.isDemo, true);
    assert.equal(data.user.role, 'student');
    assert.ok(data.user.email.includes('demo.student'));

    // Check session cookie is set
    const setCookie = res.headers.get('set-cookie');
    assert.ok(setCookie);
    assert.ok(setCookie.includes(COOKIE_NAME));
  });
});
