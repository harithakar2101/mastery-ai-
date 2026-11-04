process.env.NODE_ENV = 'test';

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { type Server } from 'http';
import { app } from '../server.ts';
import { createSessionToken, COOKIE_NAME } from '../server/auth.ts';
import {
  userRepository,
  islmRepository,
  dkmStateRepository,
  eventRepository,
  attemptRepository,
  interventionRepository,
  sessionRepository,
  studyRepository,
  flashcardRepository,
  studyPlanRepository,
  portfolioRepository,
} from '../server/repositories/index.ts';

let server: Server;
let baseUrl: string;

const adminUser = {
  id: 'ADMIN_REPO_TEST',
  name: 'Admin Tester',
  email: 'admin.repo@mastery.ai',
  role: 'admin' as const,
  plan: 'Enterprise',
  tokenVersion: 1,
};

const studentUser = {
  id: 'STU_REPO_TEST_1',
  name: 'Student Tester 1',
  email: 'stu1.repo@mastery.ai',
  role: 'student' as const,
  plan: 'Free Plan',
  tokenVersion: 1,
};

before(async () => {
  userRepository.upsert(adminUser);
  userRepository.upsert(studentUser);

  await new Promise<void>(resolve => {
    server = app.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      const port = typeof addr === 'object' && addr ? addr.port : 3001;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
});

after(async () => {
  if (server) {
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
});

describe('Database Repositories & Cursor Pagination Suite', () => {
  it('GET /healthz returns 200 with status ok and uptime', async () => {
    const res = await fetch(`${baseUrl}/healthz`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, 'ok');
    assert.equal(typeof body.uptime, 'number');
    assert.ok(body.timestamp);
  });

  it('GET /readyz returns 200 when SQLite database is ready', async () => {
    const res = await fetch(`${baseUrl}/readyz`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, 'ready');
    assert.equal(body.database, 'connected');
  });

  it('tests domain repositories: dkmStates, flashcards, studyPlans, portfolio', () => {
    // 1. DKM state repository
    const mockNodes = [
      { id: 'node_1', concept: 'Pointers', state: 'green' },
      { id: 'node_2', concept: 'Memory', state: 'yellow' },
    ];
    dkmStateRepository.upsert(studentUser.id, mockNodes);
    const retrievedDkm = dkmStateRepository.findByStudentId(studentUser.id);
    assert.deepEqual(retrievedDkm, mockNodes);

    // 2. Flashcard repository
    flashcardRepository.upsert({
      id: 'fc_test_1',
      studentId: studentUser.id,
      conceptId: 'tcp_handshake',
      box: 2,
      intervalDays: 3,
      dueTimestamp: new Date().toISOString(),
      easeFactor: 2.5,
      repetitions: 2,
    });
    const retrievedFc = flashcardRepository.findById('fc_test_1');
    assert.ok(retrievedFc);
    assert.equal(retrievedFc?.conceptId, 'tcp_handshake');
    assert.equal(retrievedFc?.box, 2);

    // 3. StudyPlan repository
    studyPlanRepository.upsert({
      id: 'plan_test_1',
      studentId: studentUser.id,
      title: 'Operating Systems Mastery',
      weeklyGoals: ['Threads', 'Deadlocks'],
      status: 'active',
    });
    const retrievedPlan = studyPlanRepository.findById('plan_test_1');
    assert.ok(retrievedPlan);
    assert.equal(retrievedPlan?.title, 'Operating Systems Mastery');

    // 4. Portfolio repository
    portfolioRepository.upsert({
      id: 'port_test_1',
      studentId: studentUser.id,
      title: 'Full Stack Compiler Project',
      description: 'Built a LLVM IR parser in C++',
      score: 95,
      artifacts: ['github.com/test/compiler'],
    });
    const retrievedPort = portfolioRepository.findById('port_test_1');
    assert.ok(retrievedPort);
    assert.equal(retrievedPort?.title, 'Full Stack Compiler Project');
  });

  it('verifies cursor-based pagination on events and bounded response arrays', async () => {
    // Create 15 events for studentUser
    const baseTs = Date.now();
    for (let i = 0; i < 15; i++) {
      eventRepository.append({
        studentId: studentUser.id,
        type: 'CURSOR_TEST_EVENT',
        conceptId: 'pagination',
        payload: { index: i },
        synthetic: false,
        ts: new Date(baseTs + i * 1000).toISOString(),
      });
    }

    const studentToken = createSessionToken(studentUser);

    // Fetch page 1 with limit=5
    const resPage1 = await fetch(`${baseUrl}/api/store/events?limit=5`, {
      headers: { Cookie: `${COOKIE_NAME}=${studentToken}` },
    });
    assert.equal(resPage1.status, 200);
    const body1 = await resPage1.json();
    assert.equal(body1.items.length, 5);
    assert.equal(body1.hasMore, true);
    assert.ok(body1.nextCursor, 'Must return nextCursor for pagination');

    // Fetch page 2 using nextCursor
    const resPage2 = await fetch(`${baseUrl}/api/store/events?limit=5&cursor=${encodeURIComponent(body1.nextCursor)}`, {
      headers: { Cookie: `${COOKIE_NAME}=${studentToken}` },
    });
    assert.equal(resPage2.status, 200);
    const body2 = await resPage2.json();
    assert.equal(body2.items.length, 5);

    // Ensure no overlapping items between page 1 and page 2
    const page1Ids = new Set(body1.items.map((e: any) => e.id));
    for (const item of body2.items) {
      assert.equal(page1Ids.has(item.id), false, 'Page 2 should not contain items from Page 1');
    }
  });

  it('admin demo seed tags records as synthetic and clear-demo removes them in one click', async () => {
    const adminToken = createSessionToken(adminUser);

    // 1. Seed demo cohort
    const seedRes = await fetch(`${baseUrl}/api/admin/seed-demo`, {
      method: 'POST',
      headers: { Cookie: `${COOKIE_NAME}=${adminToken}` },
    });
    if (seedRes.status !== 200) {
      console.error('SEED RES ERROR:', await seedRes.text());
    }
    assert.equal(seedRes.status, 200);
    const seedBody = await seedRes.json();
    assert.equal(seedBody.success, true);
    assert.ok(seedBody.studentsCount > 0);
    assert.ok(seedBody.eventsCount > 0);

    // Verify synthetic records exist in repository
    const synthEvents = eventRepository.listAllPaginated({ synthetic: true, limit: 100 });
    assert.ok(synthEvents.items.length > 0);

    // 2. Clear demo cohort in one click
    const clearRes = await fetch(`${baseUrl}/api/admin/clear-demo`, {
      method: 'POST',
      headers: { Cookie: `${COOKIE_NAME}=${adminToken}` },
    });
    assert.equal(clearRes.status, 200);
    const clearBody = await clearRes.json();
    assert.equal(clearBody.success, true);
    assert.ok(clearBody.cleared.usersCleared > 0);
    assert.ok(clearBody.cleared.eventsCleared > 0);

    // Verify all synthetic records were purged
    const remainingSynth = eventRepository.listAllPaginated({ synthetic: true, limit: 100 });
    assert.equal(remainingSynth.items.length, 0, 'All synthetic events must be completely deleted');
  });
});
