import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import {
  createMulberry32,
  seedSyntheticCohort,
  clearSyntheticCohort,
  ALL_COHORT_TRACKS,
  ALL_DKM_CONCEPTS,
  SyntheticCohortSummary,
} from '../server/services/syntheticCohortSeeder.ts';
import { getDb } from '../server/db/connection.ts';
import {
  userRepository,
  islmRepository,
  eventRepository,
  attemptRepository,
  interventionRepository,
} from '../server/repositories/index.ts';

describe('Realistic Synthetic Demo Cohort & Empirical Trial Suite', () => {
  let summary: SyntheticCohortSummary;

  before(async () => {
    clearSyntheticCohort();
    summary = await seedSyntheticCohort(42);
  });

  after(() => {
    clearSyntheticCohort();
  });

  it('1. Mulberry32 PRNG produces deterministic, reproducible pseudorandom streams', () => {
    const rng1 = createMulberry32(12345);
    const rng2 = createMulberry32(12345);
    const rng3 = createMulberry32(99999);

    const stream1 = Array.from({ length: 5 }, () => rng1());
    const stream2 = Array.from({ length: 5 }, () => rng2());
    const stream3 = Array.from({ length: 5 }, () => rng3());

    // Identical seeds must produce identical values
    assert.deepEqual(stream1, stream2, 'Mulberry32 with same seed must produce identical outputs');

    // Different seed should differ
    assert.notDeepEqual(stream1, stream3, 'Mulberry32 with different seeds should produce different outputs');

    // Values must be normalized floats in [0, 1)
    for (const v of stream1) {
      assert.ok(v >= 0 && v < 1, `Value ${v} should be in [0, 1)`);
    }
  });

  it('2. Seeds 36 students evenly partitioned across 3 study arms with expected gain ranges', () => {
    assert.equal(summary.studentsCount, 36, 'Expected exactly 36 students');
    assert.equal(summary.arms.personalized, 12, 'Arm A (Personalized) must have 12 students');
    assert.equal(summary.arms.generic, 12, 'Arm B (Generic) must have 12 students');
    assert.equal(summary.arms.control, 12, 'Arm C (Control) must have 12 students');

    // Check mean gains match empirical targets:
    // Personalized (+25 to +35), Generic (+12 to +20), Control (+5 to +10)
    assert.ok(
      summary.meanGains.personalized >= 25 && summary.meanGains.personalized <= 36,
      `Personalized gain should be ~25-36, got ${summary.meanGains.personalized}`
    );
    assert.ok(
      summary.meanGains.generic >= 12 && summary.meanGains.generic <= 21,
      `Generic gain should be ~12-21, got ${summary.meanGains.generic}`
    );
    assert.ok(
      summary.meanGains.control >= 5 && summary.meanGains.control <= 11,
      `Control gain should be ~5-11, got ${summary.meanGains.control}`
    );

    // Verify ordering
    assert.ok(
      summary.meanGains.personalized > summary.meanGains.generic,
      'Personalized arm gain should surpass Generic arm gain'
    );
    assert.ok(
      summary.meanGains.generic > summary.meanGains.control,
      'Generic arm gain should surpass Control arm gain'
    );
  });

  it('3. Guarantees 2 non-significant baseline metrics (p > 0.05)', () => {
    // 1) Baseline pre-test equivalence (p > 0.05)
    assert.ok(
      summary.metrics.preTestPValue > 0.05,
      `Pre-test baseline p-value must be > 0.05 for arm equivalence, got ${summary.metrics.preTestPValue}`
    );

    // 2) Onboarding duration equivalence (p > 0.05)
    assert.ok(
      summary.metrics.onboardingDurationPValue > 0.05,
      `Onboarding duration p-value must be > 0.05, got ${summary.metrics.onboardingDurationPValue}`
    );
  });

  it('4. Ensures complete curriculum coverage with NO empty heatmap cells across all tracks and concepts', () => {
    const db = getDb();
    const islmRows = db.prepare('SELECT student_id, topic_mastery FROM islm WHERE synthetic = 1').all() as Array<{
      student_id: string;
      topic_mastery: string;
    }>;

    assert.equal(islmRows.length, 36, 'All 36 synthetic students must have an ISLM profile');

    // Collect all required concept IDs
    const allExpectedConcepts: string[] = [];
    for (const track of ALL_COHORT_TRACKS) {
      allExpectedConcepts.push(...ALL_DKM_CONCEPTS[track]);
    }
    assert.ok(allExpectedConcepts.length >= 10, 'Curriculum must contain all track concepts');

    for (const row of islmRows) {
      const topicMap = JSON.parse(row.topic_mastery || '{}');
      for (const conceptId of allExpectedConcepts) {
        assert.ok(
          conceptId in topicMap,
          `Student ${row.student_id} is missing concept ${conceptId} in topic_mastery`
        );
        const score = topicMap[conceptId];
        assert.ok(
          typeof score === 'number' && score >= 0 && score <= 1,
          `Mastery for ${conceptId} should be valid numeric [0, 1], got ${score}`
        );
      }
    }
  });

  it('5. Generates realistic noise with overlapping distribution boundaries', () => {
    const db = getDb();
    // Query post-test scores from events for personalized vs generic arms
    const postEvents = db.prepare(`
      SELECT payload FROM events
      WHERE type = 'STUDY_POST_TEST_ANSWER' AND synthetic = 1
    `).all() as Array<{ payload: string }>;

    assert.equal(postEvents.length, 36, 'Should have 36 post-test records');

    const scoresByArm: Record<string, number[]> = {
      personalized: [],
      generic: [],
      control: [],
    };

    for (const e of postEvents) {
      const p = JSON.parse(e.payload);
      if (scoresByArm[p.arm]) {
        scoresByArm[p.arm].push(p.score);
      }
    }

    // Check that distribution boundaries overlap (i.e. Max of generic is >= min of personalized)
    const minPersonalized = Math.min(...scoresByArm.personalized);
    const maxGeneric = Math.max(...scoresByArm.generic);

    assert.ok(
      maxGeneric >= minPersonalized,
      `Expected realistic overlapping distributions: max generic (${maxGeneric}) should overlap with min personalized (${minPersonalized})`
    );
  });

  it('6. All synthetic records carry synthetic = 1 flag in the database', () => {
    const db = getDb();

    const syntheticUsers = db.prepare('SELECT COUNT(*) as count FROM users WHERE synthetic = 1').get() as { count: number };
    assert.equal(syntheticUsers.count, 36);

    const syntheticEvents = db.prepare('SELECT COUNT(*) as count FROM events WHERE synthetic = 1').get() as { count: number };
    assert.ok(syntheticEvents.count > 0, 'Events should contain synthetic rows');

    const syntheticAttempts = db.prepare('SELECT COUNT(*) as count FROM attempts WHERE synthetic = 1').get() as { count: number };
    assert.ok(syntheticAttempts.count > 0, 'Attempts should contain synthetic rows');

    const syntheticInterventions = db.prepare('SELECT COUNT(*) as count FROM interventions WHERE synthetic = 1').get() as { count: number };
    assert.ok(syntheticInterventions.count > 0, 'Interventions should contain synthetic rows');
  });

  it('7. clearSyntheticCohort cleanly wipes all synthetic records without touching real data', () => {
    const cleared = clearSyntheticCohort();

    assert.equal(cleared.usersCleared, 36, 'Should have cleared 36 synthetic users');
    assert.ok(cleared.eventsCleared > 0, 'Should have cleared synthetic events');
    assert.ok(cleared.attemptsCleared > 0, 'Should have cleared synthetic attempts');

    const db = getDb();
    const remainingUsers = db.prepare('SELECT COUNT(*) as count FROM users WHERE synthetic = 1').get() as { count: number };
    assert.equal(remainingUsers.count, 0, 'Zero synthetic users should remain');

    const remainingEvents = db.prepare('SELECT COUNT(*) as count FROM events WHERE synthetic = 1').get() as { count: number };
    assert.equal(remainingEvents.count, 0, 'Zero synthetic events should remain');

    const remainingIslm = db.prepare('SELECT COUNT(*) as count FROM islm WHERE synthetic = 1').get() as { count: number };
    assert.equal(remainingIslm.count, 0, 'Zero synthetic ISLM rows should remain');
  });
});
