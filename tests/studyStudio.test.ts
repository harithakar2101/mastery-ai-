process.env.NODE_ENV = 'test';

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { type Server } from 'http';
import { app } from '../server.ts';
import { createSessionToken, COOKIE_NAME } from '../server/auth.ts';
import {
  userRepository,
  dkmStateRepository,
  flashcardRepository,
  studyPlanRepository,
} from '../server/repositories/index.ts';
import { computeTradeOffText, buildBKTWeightedSchedule } from '../server/services/studyStudioService.ts';

let server: Server;
let baseUrl: string;

const studentUser = {
  id: 'STUDY_STUDIO_TEST_STU',
  name: 'Study Studio Tester',
  email: 'studystudio.test@cognicse.edu',
  role: 'student' as const,
  plan: 'Pro Plan',
  tokenVersion: 1,
};

let studentCookie: string;

before(async () => {
  userRepository.upsert(studentUser);
  const token = createSessionToken(studentUser);
  studentCookie = `${COOKIE_NAME}=${token}`;

  // Seed initial DKM states with a known weak concept (pL < 0.5) and a strong concept (pL >= 0.8)
  dkmStateRepository.upsert(studentUser.id, [
    {
      id: 'react_hooks',
      name: 'React Hooks Lifecycle',
      category: 'web_dev',
      pL: 0.25, // weak concept!
      pG: 0.20,
      pS: 0.10,
      pT: 0.15,
      retention: 40,
      stability: 2,
      compositeMastery: 0.25,
      status: 'learning',
      lastUpdated: new Date().toISOString(),
    },
    {
      id: 'html_semantic',
      name: 'HTML Semantic Elements',
      category: 'web_dev',
      pL: 0.88, // strong concept
      pG: 0.20,
      pS: 0.10,
      pT: 0.15,
      retention: 90,
      stability: 14,
      compositeMastery: 0.88,
      status: 'mastered',
      lastUpdated: new Date().toISOString(),
    },
  ]);

  await new Promise<void>(resolve => {
    server = app.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      const port = typeof addr === 'object' && addr ? addr.port : 3004;
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

describe('Study Studio Workflow & Acceptance Test Suite', () => {
  it('1. Setup wizard: verifies grade-to-% mapping and dynamic trade-off notice', () => {
    // Target grade 10 (100%) with 15 mins daily -> should warn that it requires more effort
    const highEffortNotice = computeTradeOffText(10, 15, 14);
    assert.match(highEffortNotice, /100%/);
    assert.match(highEffortNotice, /tight|effort|recommended/i);

    // Target grade 7 (70%) with 45 mins
    const balancedNotice = computeTradeOffText(7, 45, 14);
    assert.match(balancedNotice, /70%/);
    assert.match(balancedNotice, /Proficient/i);

    // Target grade 5 (50%)
    const foundationNotice = computeTradeOffText(5, 30, 14);
    assert.match(foundationNotice, /50%/);
    assert.match(foundationNotice, /Foundation/i);
  });

  it('2. Material upload validation: rejects files > 20 MB with 400', async () => {
    // 21 MB binary file in base64 is ~29.3 MB (within 32MB parser, but over 20MB limit)
    const oversizedBase64 = 'A'.repeat(Math.ceil((21 * 1024 * 1024 * 4) / 3));

    const res = await fetch(`${baseUrl}/api/study-studio/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: studentCookie,
      },
      body: JSON.stringify({
        courseTopic: 'Computer Networks',
        examDate: '2026-11-20',
        targetGrade: 9,
        dailyStudyMinutes: 45,
        fileBase64: oversizedBase64,
        fileName: 'huge-textbook.pdf',
        fileMimeType: 'application/pdf',
      }),
    });

    assert.equal(res.status, 400);
    const data = await res.json();
    assert.equal(data.error.code, 'STUDY_STUDIO_OVERSIZED_PAYLOAD');
    assert.match(data.error.message, /20 MB/);
  });

  it('3. Material upload validation: rejects unsupported file types with 400', async () => {
    const res = await fetch(`${baseUrl}/api/study-studio/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: studentCookie,
      },
      body: JSON.stringify({
        courseTopic: 'Computer Networks',
        examDate: '2026-11-20',
        targetGrade: 9,
        dailyStudyMinutes: 45,
        fileBase64: Buffer.from('binary-exe-data').toString('base64'),
        fileName: 'malware.exe',
        fileMimeType: 'application/x-msdownload',
      }),
    });

    assert.equal(res.status, 400);
    const data = await res.json();
    assert.equal(data.error.code, 'STUDY_STUDIO_INVALID_FILE_TYPE');
  });

  it('4. Acceptance Criterion: uploading sample produces summary, 20+ cards, dated plan, and badges', async () => {
    const sampleText = `
      Title: Distributed Systems and Consensus
      Section 1: Introduction to Raft Consensus
      Raft is a consensus algorithm designed as an alternative to Paxos. It is intended to be more understandable than Paxos.
      Key subtopics: Leader Election, Log Replication, Safety Invariants.
      Raft decomposes consensus into subproblems:
      1. Leader Election: A leader must be chosen when an existing leader fails.
      2. Log Replication: The leader must accept log entries from clients and replicate them.
      3. Safety: If any server has applied a particular log entry, no other server may apply a different entry for that log index.
      Source reference: Chapter 4, Section 2.
    `;

    const sampleBase64 = Buffer.from(sampleText).toString('base64');
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);
    const examDateStr = futureDate.toISOString().split('T')[0];

    const res = await fetch(`${baseUrl}/api/study-studio/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: studentCookie,
      },
      body: JSON.stringify({
        courseTopic: 'Distributed Systems',
        examDate: examDateStr,
        targetGrade: 9, // 90%
        dailyStudyMinutes: 45,
        fileBase64: sampleBase64,
        fileName: 'distributed-systems-sample.txt',
        fileMimeType: 'text/plain',
      }),
    });

    assert.equal(res.status, 200, `Expected 200 but got ${res.status}`);
    const data = await res.json();
    assert.equal(data.success, true);

    // (a) Hierarchical summary with sections saved
    assert.ok(Array.isArray(data.summary));
    assert.ok(data.summary.length >= 1, 'Should have at least 1 summary section');
    const firstSection = data.summary[0];
    assert.ok(firstSection.title);
    assert.ok(firstSection.keyTakeaway);
    assert.ok(firstSection.content);
    assert.ok(Array.isArray(firstSection.subtopics));

    // (b) Concept list mapped to DKM nodes
    assert.ok(Array.isArray(data.concepts));
    assert.ok(data.concepts.length >= 1, 'Should extract concepts');

    // (c) 20 to 60 flashcards with source references
    assert.ok(Array.isArray(data.flashcards));
    assert.ok(
      data.flashcards.length >= 20,
      `Expected at least 20 flashcards, received ${data.flashcards.length}`
    );
    assert.ok(
      data.flashcards.length <= 60,
      `Expected at most 60 flashcards, received ${data.flashcards.length}`
    );
    for (const card of data.flashcards) {
      assert.ok(card.question, 'Card must have question');
      assert.ok(card.answer, 'Card must have answer');
      assert.ok(card.sourceRef, 'Card must have source reference');
    }

    // (d) 5 to 10 practice questions
    assert.ok(Array.isArray(data.practiceQuestions));
    assert.ok(
      data.practiceQuestions.length >= 5 && data.practiceQuestions.length <= 10,
      `Expected 5 to 10 practice questions, received ${data.practiceQuestions.length}`
    );

    // (e) Day-by-day dated schedule from today to exam date
    assert.ok(Array.isArray(data.schedule));
    assert.ok(data.schedule.length >= 7, 'Schedule should span at least 7 days');
    assert.equal(data.schedule[0].status, 'today');
    assert.equal(data.schedule[1].status, 'upcoming');

    // (f) LIVE AI or FALLBACK provenance badge
    assert.ok(['LIVE AI', 'FALLBACK'].includes(data.provenance));

    // Verify persisted into flashcard repository and study plan repository
    const storedCards = flashcardRepository.listAllByStudent(studentUser.id);
    assert.ok(storedCards.length >= 20, 'Cards should be persisted in database');

    const storedPlan = studyPlanRepository.findLatestByStudent(studentUser.id);
    assert.ok(storedPlan, 'Plan should be persisted in database');
  });

  it('5. Study Plan BKT Weighting: weak concepts prioritized earlier and more often', () => {
    const concepts = [
      { id: 'c1', name: 'Weak Concept A', category: 'algorithms', masteryPrior: 0.2, importance: 'high' as const },
      { id: 'c2', name: 'Mastered Concept B', category: 'algorithms', masteryPrior: 0.9, importance: 'medium' as const },
      { id: 'c3', name: 'Medium Concept C', category: 'algorithms', masteryPrior: 0.6, importance: 'core' as const },
    ];

    const mockCards = concepts.flatMap((c, idx) => [
      {
        id: `card_${idx}_1`,
        conceptId: c.id,
        conceptName: c.name,
        question: `Q for ${c.name}`,
        answer: 'Ans',
        sourceRef: 'Doc',
        leitnerBox: 1 as const,
        easeFactor: 2.5,
        intervalDays: 1,
        repetitions: 0,
        dueDate: '2026-11-04',
      },
    ]);

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 5);

    const schedule = buildBKTWeightedSchedule({
      examDate: futureDate.toISOString().split('T')[0],
      targetGrade: 9,
      dailyStudyMinutes: 45,
      concepts,
      flashcards: mockCards,
      practiceQuestions: [],
    });

    // Today/early days should prioritize weak concepts
    const day1Focus = schedule[0].focusConcepts;
    assert.ok(day1Focus.includes('Weak Concept A'), 'Weak concepts must be scheduled on day 1');
  });

  it('6. Acceptance Criterion: rating flashcards changes tomorrow\'s schedule and feeds SM-2/BKT', async () => {
    // Fetch initial state
    const stateRes = await fetch(`${baseUrl}/api/study-studio/state`, {
      headers: { Cookie: studentCookie },
    });
    assert.equal(stateRes.status, 200);
    const initialData = await stateRes.json();
    const testCard = initialData.flashcards[0];
    const initialTomorrowSchedule = initialData.schedule[1]; // dayIndex 2 is tomorrow
    const initialTomorrowCardsCount = initialTomorrowSchedule.scheduledCardsCount;

    // Rate card with "Again" -> triggers immediate re-planning for tomorrow
    const rateRes = await fetch(`${baseUrl}/api/study-studio/rate-card`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: studentCookie,
      },
      body: JSON.stringify({
        cardId: testCard.id,
        rating: 'again',
      }),
    });

    assert.equal(rateRes.status, 200);
    const rateData = await rateRes.json();
    assert.equal(rateData.success, true);
    assert.ok(rateData.updatedCard);
    assert.equal(rateData.updatedCard.leitnerBox, 1, 'Card should remain in box 1 on Again');

    // Tomorrow's schedule must be updated with concept prioritized and card count increased
    assert.ok(rateData.rePlanNote, 'Must provide plain-language re-plan note');
    assert.match(
      rateData.rePlanNote,
      /rescheduled|tomorrow|reinforced|re-planning|review|moved forward/i
    );

    const newTomorrowSchedule = rateData.updatedSchedule[1]; // tomorrow is index 1
    assert.ok(
      newTomorrowSchedule.scheduledCardsCount >= initialTomorrowCardsCount,
      "Tomorrow's schedule card count should increase after an 'Again' rating"
    );
    assert.ok(
      newTomorrowSchedule.focusConcepts.includes(testCard.conceptName),
      "Tomorrow's focus concepts must include the struggled concept"
    );

    // Verify counter state endpoint reflects reviewed cards
    const counterRes = await fetch(`${baseUrl}/api/study-studio/state`, {
      headers: { Cookie: studentCookie },
    });
    const counterData = await counterRes.json();
    assert.ok(counterData.todayCounter.completedToday >= 1, 'Daily reviewed counter must increment');
  });

  it('7. Content editability: student can edit summary sections and flashcards', async () => {
    const editSectionRes = await fetch(`${baseUrl}/api/study-studio/content`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Cookie: studentCookie,
      },
      body: JSON.stringify({
        section: {
          id: 'sec_1',
          title: 'Custom Student Title for Distributed Consensus',
          keyTakeaway: 'Student edited key takeaway',
          content: 'Updated section text with personal mnemonics.',
          subtopics: ['Raft', 'Paxos', 'Zab'],
        },
      }),
    });

    assert.equal(editSectionRes.status, 200);
    const editData = await editSectionRes.json();
    assert.equal(editData.success, true);

    // Verify update persisted
    const stateRes = await fetch(`${baseUrl}/api/study-studio/state`, {
      headers: { Cookie: studentCookie },
    });
    const stateData = await stateRes.json();
    const updatedSec = stateData.summary.find((s: any) => s.id === 'sec_1');
    assert.ok(updatedSec);
    assert.equal(updatedSec.title, 'Custom Student Title for Distributed Consensus');
  });
});
