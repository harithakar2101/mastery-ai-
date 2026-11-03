import { initDb, closeDb, getDb } from '../server/db/connection.ts';
import { runMigrations } from '../server/db/migrations.ts';
import { userRepository, eventRepository } from '../server/repositories/index.ts';

/**
 * Acceptance Criterion Verification Script:
 * 50 simulated concurrent students can post events without lost writes,
 * and restart preserves everything.
 */
export async function runConcurrencySimulation(numStudents = 50, eventsPerStudent = 10): Promise<{
  success: boolean;
  totalEventsExpected: number;
  totalEventsPersisted: number;
  lostWrites: number;
  preservedAfterRestart: boolean;
}> {
  console.log(`\n==========================================================`);
  console.log(`[CONCURRENCY BENCHMARK] Spawning ${numStudents} concurrent students`);
  console.log(`[CONCURRENCY BENCHMARK] Target: ${numStudents * eventsPerStudent} total events (${eventsPerStudent} per student)`);
  console.log(`==========================================================\n`);

  // Ensure DB and migrations are ready
  initDb();
  runMigrations();

  const runId = Date.now().toString(36);
  const studentIds: string[] = [];

  // Register 50 student accounts
  for (let i = 1; i <= numStudents; i++) {
    const sId = `SIM_STU_${runId}_${String(i).padStart(3, '0')}`;
    studentIds.push(sId);
    userRepository.upsert({
      id: sId,
      name: `Simulated Student ${i}`,
      email: `${sId.toLowerCase()}@testbench.edu`,
      role: 'student',
      tokenVersion: 1,
      synthetic: false,
    });
  }

  const startTime = Date.now();

  // Concurrently fire event posts from all 50 students
  const studentTasks = studentIds.map(async (studentId, sIdx) => {
    const postedIds: string[] = [];
    for (let eIdx = 1; eIdx <= eventsPerStudent; eIdx++) {
      // Simulate real-world micro-jitter
      await new Promise(r => setTimeout(r, Math.random() * 5));

      const event = eventRepository.append({
        studentId,
        type: eIdx % 2 === 0 ? 'ATTEMPT_EVALUATED' : 'SCAFFOLDING_STEP_VIEWED',
        conceptId: 'deadlock_detection',
        topicId: 'operating_systems',
        payload: {
          simStudentIndex: sIdx,
          eventSequence: eIdx,
          randomMetric: Math.random(),
        },
        synthetic: false,
      });

      postedIds.push(event.id);
    }
    return postedIds;
  });

  const allPosted = await Promise.all(studentTasks);
  const durationMs = Date.now() - startTime;
  const totalEventsExpected = numStudents * eventsPerStudent;
  const totalPostedCount = allPosted.reduce((sum, list) => sum + list.length, 0);

  console.log(`[CONCURRENCY BENCHMARK] All ${numStudents} students completed posting in ${durationMs}ms`);
  console.log(`[CONCURRENCY BENCHMARK] Throughput: ${Math.round((totalEventsExpected / (durationMs / 1000)))} events/second`);

  // Verify write completeness before restart
  let verifiedBeforeRestart = 0;
  for (const studentId of studentIds) {
    const count = eventRepository.listByStudentPaginated(studentId, { limit: 100 }).totalCount;
    verifiedBeforeRestart += count;
  }

  const lostWrites = totalEventsExpected - verifiedBeforeRestart;
  console.log(`[CONCURRENCY BENCHMARK] Pre-restart check: Expected=${totalEventsExpected}, Found=${verifiedBeforeRestart}, LostWrites=${lostWrites}`);

  // Simulate server restart: close database instance completely
  console.log(`[CONCURRENCY BENCHMARK] Simulating server shutdown & database closure...`);
  closeDb();

  // Re-open fresh database connection (simulating boot after restart)
  console.log(`[CONCURRENCY BENCHMARK] Re-opening database after simulated server restart...`);
  getDb();

  // Verify preservation after restart
  let verifiedAfterRestart = 0;
  let allStudentsPreserved = true;

  for (const studentId of studentIds) {
    const user = userRepository.findById(studentId);
    if (!user) allStudentsPreserved = false;

    const count = eventRepository.listByStudentPaginated(studentId, { limit: 100 }).totalCount;
    verifiedAfterRestart += count;
  }

  const preservedAfterRestart = allStudentsPreserved && verifiedAfterRestart === totalEventsExpected;

  console.log(`[CONCURRENCY BENCHMARK] Post-restart check: PreservedEvents=${verifiedAfterRestart}/${totalEventsExpected}`);
  console.log(`[CONCURRENCY BENCHMARK] All 50 students preserved: ${allStudentsPreserved}`);
  console.log(`[CONCURRENCY BENCHMARK] Result: ${preservedAfterRestart ? 'PASSED (0 LOST WRITES)' : 'FAILED'}\n`);

  // Clean up benchmark data specifically for this run
  for (const sId of studentIds) {
    eventRepository.deleteByStudentId(sId);
    userRepository.delete(sId);
  }

  return {
    success: preservedAfterRestart && lostWrites === 0,
    totalEventsExpected,
    totalEventsPersisted: verifiedAfterRestart,
    lostWrites,
    preservedAfterRestart,
  };
}

const isMain = process.argv[1] && (
  process.argv[1].endsWith('simulateConcurrency.ts') ||
  process.argv[1].endsWith('simulateConcurrency.js')
);

if (isMain) {
  runConcurrencySimulation(50, 10)
    .then(result => {
      if (!result.success) {
        process.exit(1);
      }
      process.exit(0);
    })
    .catch(err => {
      console.error('Concurrency simulation failed:', err);
      process.exit(1);
    });
}
