process.env.NODE_ENV = 'test';

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { type Server } from 'http';
import { app } from '../server.ts';
import { createSessionToken, COOKIE_NAME } from '../server/auth.ts';
import { userRepository, eventRepository } from '../server/repositories/index.ts';
import { closeDb, getDb } from '../server/db/connection.ts';
import { runConcurrencySimulation } from '../scripts/simulateConcurrency.ts';

let server: Server;
let baseUrl: string;

before(async () => {
  await new Promise<void>(resolve => {
    server = app.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      const port = typeof addr === 'object' && addr ? addr.port : 3002;
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

describe('Acceptance Criteria: 50 Simulated Concurrent Students Suite', () => {
  it('50 simulated concurrent students can post events without lost writes, and restart preserves everything (script benchmark)', async () => {
    const result = await runConcurrencySimulation(50, 10);
    assert.equal(result.lostWrites, 0, 'Zero lost writes permitted');
    assert.equal(result.totalEventsPersisted, result.totalEventsExpected);
    assert.equal(result.preservedAfterRestart, true, 'Restart must preserve 100% of events and students');
    assert.equal(result.success, true);
  });

  it('50 concurrent students posting via HTTP API concurrently without lost writes', async () => {
    const numStudents = 50;
    const eventsPerStudent = 3;
    const runTag = `http_${Date.now().toString(36)}`;

    // 1. Prepare 50 student users with session tokens
    const students: Array<{ id: string; token: string }> = [];
    for (let i = 1; i <= numStudents; i++) {
      const sId = `HTTP_SIM_${runTag}_${String(i).padStart(3, '0')}`;
      const user = {
        id: sId,
        name: `HTTP Student ${i}`,
        email: `${sId.toLowerCase()}@test.edu`,
        role: 'student' as const,
        tokenVersion: 1,
        synthetic: false,
      };
      userRepository.upsert(user);
      const token = createSessionToken(user);
      students.push({ id: sId, token });
    }

    // 2. Concurrently fire HTTP POST /api/events from all 50 students
    const tasks = students.map(async (student, sIdx) => {
      const responses: any[] = [];
      for (let eIdx = 1; eIdx <= eventsPerStudent; eIdx++) {
        const res = await fetch(`${baseUrl}/api/events`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Cookie: `${COOKIE_NAME}=${student.token}`,
          },
          body: JSON.stringify({
            type: 'CONCURRENT_HTTP_EVENT',
            conceptId: 'concurrency_primitives',
            topicId: 'operating_systems',
            payload: {
              studentIndex: sIdx,
              eventNum: eIdx,
            },
          }),
        });

        assert.equal(res.status, 200);
        const data = await res.json();
        assert.equal(data.success, true);
        responses.push(data.event);
      }
      return responses;
    });

    const allResults = await Promise.all(tasks);
    const totalExpected = numStudents * eventsPerStudent;
    const totalCreated = allResults.reduce((acc, r) => acc + r.length, 0);
    assert.equal(totalCreated, totalExpected);

    // 3. Verify in repository
    let foundInDb = 0;
    for (const student of students) {
      const count = eventRepository.listByStudentPaginated(student.id).totalCount ?? 0;
      assert.equal(count, eventsPerStudent);
      foundInDb += count;
    }
    assert.equal(foundInDb, totalExpected);

    // 4. Simulate server restart
    closeDb();
    getDb();

    // Verify after restart
    let foundAfterRestart = 0;
    for (const student of students) {
      const count = eventRepository.listByStudentPaginated(student.id).totalCount ?? 0;
      foundAfterRestart += count;
    }
    assert.equal(foundAfterRestart, totalExpected);

    // Clean up specifically these benchmark students and events
    for (const student of students) {
      eventRepository.deleteByStudentId(student.id);
      userRepository.delete(student.id);
    }
  });
});
