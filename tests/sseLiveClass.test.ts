process.env.NODE_ENV = 'test';

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { liveSessionService } from '../server/services/LiveSessionService.ts';
import { userRepository } from '../server/repositories/index.ts';

const teacherUser = {
  id: 'FACULTY_SSE_TEST',
  name: 'Prof. Live Tester',
  email: 'live.prof@mastery.ai',
  role: 'teacher' as const,
  plan: 'Campus License',
  tokenVersion: 1,
};

const studentUser = {
  id: 'STU_SSE_TEST_1',
  name: 'Student SSE 1',
  email: 'stu.sse1@mastery.ai',
  role: 'student' as const,
  plan: 'Free Plan',
  tokenVersion: 1,
};

before(() => {
  userRepository.upsert(teacherUser);
  userRepository.upsert(studentUser);
});

after(() => {
  liveSessionService.destroy();
});

describe('SSE Live-Class Service Suite', () => {
  it('manages clients and provides initial connected event', () => {
    const receivedChunks: string[] = [];
    const mockRes: any = {
      writableEnded: false,
      destroyed: false,
      write(chunk: string) {
        receivedChunks.push(chunk);
        return true;
      },
      end() {
        this.writableEnded = true;
      },
    };

    liveSessionService.addClient({
      id: 'test_client_1',
      role: 'student',
      studentId: studentUser.id,
      studentName: studentUser.name,
      res: mockRes,
    });

    assert.equal(liveSessionService.getConnectedClientsCount(), 1);
    assert.ok(receivedChunks.length >= 1);
    assert.match(receivedChunks[0], /event: connected/);

    liveSessionService.removeClient('test_client_1');
    assert.equal(liveSessionService.getConnectedClientsCount(), 0);
  });

  it('heartbeat writes ping comments to active connections', () => {
    const receivedChunks: string[] = [];
    const mockRes: any = {
      writableEnded: false,
      destroyed: false,
      write(chunk: string) {
        receivedChunks.push(chunk);
        return true;
      },
    };

    liveSessionService.addClient({
      id: 'test_client_hb',
      role: 'student',
      studentId: studentUser.id,
      res: mockRes,
    });

    liveSessionService.sendHeartbeat();
    assert.ok(receivedChunks.some(c => c === ': ping\n\n'), 'Heartbeat ping must be written to client');
    liveSessionService.removeClient('test_client_hb');
  });

  it('reconnection with Last-Event-ID replays missed buffered events', () => {
    // 1. Send broadcasts into the event buffer
    liveSessionService.broadcast('TOPIC_UPDATE', { topic: 'SQL Injections' });
    liveSessionService.broadcast('ANNOUNCEMENT', { text: 'Quiz starting soon' });

    // 2. Client reconnects with lastEventId = 0 (missed everything)
    const replayChunks: string[] = [];
    const mockRes: any = {
      writableEnded: false,
      destroyed: false,
      write(chunk: string) {
        replayChunks.push(chunk);
        return true;
      },
    };

    liveSessionService.addClient(
      {
        id: 'test_client_reconnect',
        role: 'student',
        studentId: studentUser.id,
        res: mockRes,
      },
      0 // Last-Event-ID = 0
    );

    // Verify replayed events received
    const combined = replayChunks.join('');
    assert.match(combined, /event: TOPIC_UPDATE/);
    assert.match(combined, /event: ANNOUNCEMENT/);
    assert.match(combined, /SQL Injections/);

    liveSessionService.removeClient('test_client_reconnect');
  });

  it('cleans up dead destroyed connections automatically', () => {
    const mockRes: any = {
      writableEnded: false,
      destroyed: false,
      write() {
        return true;
      },
    };

    liveSessionService.addClient({
      id: 'dead_client_1',
      role: 'student',
      studentId: studentUser.id,
      res: mockRes,
    });

    // Client connection terminates
    mockRes.writableEnded = true;
    mockRes.destroyed = true;

    const removed = liveSessionService.cleanupDeadConnections();
    assert.equal(removed, 1, 'Dead connection must be collected and removed');
  });
});
