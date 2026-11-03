import { PedagogicalEvent, StoreData } from './store.ts';

export interface SeedArmOptions {
  studyId: string;
  topicId: string;
  topicName: string;
}

/**
 * Generates synthetic students and realistic event trails for Arm A (Personalised),
 * Arm B (Generic Assistant), and Arm C (No Assistance).
 * All records and events are strictly flagged synthetic: true.
 */
export function generateSyntheticStudyData(
  options: SeedArmOptions,
  existingEvents: PedagogicalEvent[]
): {
  syntheticUsers: StoreData['users'];
  syntheticISLM: StoreData['islm'];
  newEvents: PedagogicalEvent[];
  armAssignments: {
    ARM_A: string[];
    ARM_B: string[];
    ARM_C: string[];
  };
} {
  const { studyId, topicId, topicName } = options;
  const now = Date.now();

  const syntheticUsers: StoreData['users'] = [];
  const syntheticISLM: StoreData['islm'] = [];
  const newEvents: PedagogicalEvent[] = [];

  const armAssignments: { ARM_A: string[]; ARM_B: string[]; ARM_C: string[] } = {
    ARM_A: [],
    ARM_B: [],
    ARM_C: [],
  };

  // 10 students for Arm A (Personalised closed-loop with Socratic scaffolding)
  const armANames = [
    'Aarav Patel', 'Elena Rostova', 'Chen Wei', 'Fatima Al-Mansoor',
    'Liam O’Connor', 'Zoe Takahashi', 'Mateo Fernandez', 'Chloe Dubois',
    'Kavya Sharma', 'Lucas Meyer'
  ];

  // 10 students for Arm B (Generic Assistant: spoon-fed direct answers)
  const armBNames = [
    'Benjamin Hayes', 'Sofia Rossi', 'Dmitry Ivanov', 'Amira Youssef',
    'Oliver Bennett', 'Mei-Ling Zhou', 'Gabriel Santos', 'Emma Larsson',
    'Rohan Nair', 'Hannah Kim'
  ];

  // 10 students for Arm C (Control: No assistance)
  const armCNames = [
    'Julian Vance', 'Nadia Kowalska', 'Tariq Haddad', 'Ingrid Lindholm',
    'Marcus Thorne', 'Amina Diallo', 'Sean Gallagher', 'Yuki Tanaka',
    'Victor Hugo', 'Maya Patel'
  ];

  const createStudentRecord = (id: string, name: string, armId: 'ARM_A' | 'ARM_B' | 'ARM_C') => {
    armAssignments[armId].push(id);
    syntheticUsers.push({
      id,
      name: `${name} (Demo)`,
      email: `${name.toLowerCase().replace(/[^a-z]/g, '')}.demo@university.edu`,
      role: 'student',
      plan: 'Free Plan',
      degree: 'B.Tech in Computer Science & Engineering',
      preferredLanguages: ['python', 'javascript', 'cpp'],
      streakDays: Math.floor(Math.random() * 5) + 1,
      testsCompleted: 3,
      overallMastery: armId === 'ARM_A' ? 0.88 : armId === 'ARM_B' ? 0.62 : 0.45,
      theme: 'dark',
    });

    syntheticISLM.push({
      student_id: id,
      name: `${name} (Demo)`,
      email: `${name.toLowerCase().replace(/[^a-z]/g, '')}.demo@university.edu`,
      role: 'student',
      course_track: 'Empirical Study Cohort',
      overall_mastery: armId === 'ARM_A' ? 0.88 : armId === 'ARM_B' ? 0.62 : 0.45,
      topic_mastery: { [topicId]: armId === 'ARM_A' ? 0.92 : armId === 'ARM_B' ? 0.64 : 0.46 },
      recent_misconceptions: armId === 'ARM_A' ? [] : ['Typical parameter and syntax assumption trap'],
      scaffolding_tier_required: armId === 'ARM_A' ? 1 : 3,
      error_count: armId === 'ARM_A' ? 2 : 7,
      independent_solves: armId === 'ARM_A' ? 8 : 2,
      scaffolding_fading_index: armId === 'ARM_A' ? 0.84 : 0.25,
      time_spent_mins: 45,
    });
  };

  // 1. Arm A creation & events
  armANames.forEach((name, idx) => {
    const studentId = `DEMO_ARM_A_${idx + 101}`;
    createStudentRecord(studentId, name, 'ARM_A');

    // Pre-test: baseline ~35-50%
    const preScore = Math.floor(35 + Math.random() * 18);
    newEvents.push({
      id: `evt_demo_pre_${studentId}`,
      ts: new Date(now - 7 * 86400000).toISOString(),
      studentId,
      type: 'STUDY_PRE_TEST_ANSWER',
      conceptId: topicId,
      topicId,
      synthetic: true,
      payload: {
        studyId,
        armId: 'ARM_A',
        score: preScore,
        passed: preScore >= 70,
        durationSec: Math.floor(120 + Math.random() * 60),
      },
    });

    // Learning stage: 4 practical attempts with Socratic scaffolding
    // Low repeated error rate (~10-15%), gradual fading, ~2 hints
    const repeatedError = Math.random() < 0.12;
    newEvents.push({
      id: `evt_demo_learn_${studentId}`,
      ts: new Date(now - 6 * 86400000).toISOString(),
      studentId,
      type: 'STUDY_LEARNING_ATTEMPT',
      conceptId: topicId,
      topicId,
      synthetic: true,
      payload: {
        studyId,
        armId: 'ARM_A',
        passed: true,
        durationSec: Math.floor(280 + Math.random() * 90),
        hintsRequested: Math.floor(1 + Math.random() * 2),
        repeatedError,
        tasksCompleted: 4,
        totalTasks: 4,
        improvementDelta: 15 + Math.floor(Math.random() * 8),
      },
    });

    // Post-test: high mastery ~88-96%
    const postScore = Math.floor(88 + Math.random() * 10);
    newEvents.push({
      id: `evt_demo_post_${studentId}`,
      ts: new Date(now - 5 * 86400000).toISOString(),
      studentId,
      type: 'STUDY_POST_TEST_ANSWER',
      conceptId: topicId,
      topicId,
      synthetic: true,
      payload: {
        studyId,
        armId: 'ARM_A',
        score: postScore,
        passed: postScore >= 70,
        durationSec: Math.floor(100 + Math.random() * 45),
        firstAttemptPass: Math.random() < 0.88,
      },
    });

    // Delayed retention test: strong retention ~85-94%
    const retentionScore = Math.floor(postScore * (0.92 + Math.random() * 0.06));
    newEvents.push({
      id: `evt_demo_ret_${studentId}`,
      ts: new Date(now - 86400000).toISOString(),
      studentId,
      type: 'STUDY_RETENTION_ANSWER',
      conceptId: topicId,
      topicId,
      synthetic: true,
      payload: {
        studyId,
        armId: 'ARM_A',
        score: Math.min(100, retentionScore),
        passed: retentionScore >= 70,
        durationSec: Math.floor(95 + Math.random() * 40),
      },
    });
  });

  // 2. Arm B creation & events (Generic Assistant: spoon-fed)
  armBNames.forEach((name, idx) => {
    const studentId = `DEMO_ARM_B_${idx + 201}`;
    createStudentRecord(studentId, name, 'ARM_B');

    // Pre-test: baseline ~35-50%
    const preScore = Math.floor(35 + Math.random() * 18);
    newEvents.push({
      id: `evt_demo_pre_${studentId}`,
      ts: new Date(now - 7 * 86400000).toISOString(),
      studentId,
      type: 'STUDY_PRE_TEST_ANSWER',
      conceptId: topicId,
      topicId,
      synthetic: true,
      payload: {
        studyId,
        armId: 'ARM_B',
        score: preScore,
        passed: preScore >= 70,
        durationSec: Math.floor(110 + Math.random() * 55),
      },
    });

    // Learning stage: direct copy-paste without mental model, fast completion but high repeated error (~70%)
    const repeatedError = Math.random() < 0.72;
    newEvents.push({
      id: `evt_demo_learn_${studentId}`,
      ts: new Date(now - 6 * 86400000).toISOString(),
      studentId,
      type: 'STUDY_LEARNING_ATTEMPT',
      conceptId: topicId,
      topicId,
      synthetic: true,
      payload: {
        studyId,
        armId: 'ARM_B',
        passed: true,
        durationSec: Math.floor(140 + Math.random() * 50), // faster because pasted
        hintsRequested: Math.floor(4 + Math.random() * 3), // high direct answers requested
        repeatedError,
        tasksCompleted: 4,
        totalTasks: 4,
        improvementDelta: 4 + Math.floor(Math.random() * 5),
      },
    });

    // Post-test: struggles on transfer problems ~55-68%
    const postScore = Math.floor(55 + Math.random() * 14);
    newEvents.push({
      id: `evt_demo_post_${studentId}`,
      ts: new Date(now - 5 * 86400000).toISOString(),
      studentId,
      type: 'STUDY_POST_TEST_ANSWER',
      conceptId: topicId,
      topicId,
      synthetic: true,
      payload: {
        studyId,
        armId: 'ARM_B',
        score: postScore,
        passed: postScore >= 70,
        durationSec: Math.floor(130 + Math.random() * 60),
        firstAttemptPass: Math.random() < 0.22,
      },
    });

    // Delayed retention test: steep drop ~38-52%
    const retentionScore = Math.floor(postScore * (0.65 + Math.random() * 0.12));
    newEvents.push({
      id: `evt_demo_ret_${studentId}`,
      ts: new Date(now - 86400000).toISOString(),
      studentId,
      type: 'STUDY_RETENTION_ANSWER',
      conceptId: topicId,
      topicId,
      synthetic: true,
      payload: {
        studyId,
        armId: 'ARM_B',
        score: Math.min(100, retentionScore),
        passed: retentionScore >= 70,
        durationSec: Math.floor(125 + Math.random() * 50),
      },
    });
  });

  // 3. Arm C creation & events (No Assistance Control)
  armCNames.forEach((name, idx) => {
    const studentId = `DEMO_ARM_C_${idx + 301}`;
    createStudentRecord(studentId, name, 'ARM_C');

    const preScore = Math.floor(33 + Math.random() * 18);
    newEvents.push({
      id: `evt_demo_pre_${studentId}`,
      ts: new Date(now - 7 * 86400000).toISOString(),
      studentId,
      type: 'STUDY_PRE_TEST_ANSWER',
      conceptId: topicId,
      topicId,
      synthetic: true,
      payload: {
        studyId,
        armId: 'ARM_C',
        score: preScore,
        passed: preScore >= 70,
        durationSec: Math.floor(120 + Math.random() * 60),
      },
    });

    newEvents.push({
      id: `evt_demo_learn_${studentId}`,
      ts: new Date(now - 6 * 86400000).toISOString(),
      studentId,
      type: 'STUDY_LEARNING_ATTEMPT',
      conceptId: topicId,
      topicId,
      synthetic: true,
      payload: {
        studyId,
        armId: 'ARM_C',
        passed: Math.random() < 0.6,
        durationSec: Math.floor(380 + Math.random() * 120),
        hintsRequested: 0,
        repeatedError: Math.random() < 0.55,
        tasksCompleted: 2,
        totalTasks: 4,
        improvementDelta: 2,
      },
    });

    const postScore = Math.floor(45 + Math.random() * 15);
    newEvents.push({
      id: `evt_demo_post_${studentId}`,
      ts: new Date(now - 5 * 86400000).toISOString(),
      studentId,
      type: 'STUDY_POST_TEST_ANSWER',
      conceptId: topicId,
      topicId,
      synthetic: true,
      payload: {
        studyId,
        armId: 'ARM_C',
        score: postScore,
        passed: postScore >= 70,
        durationSec: Math.floor(140 + Math.random() * 50),
        firstAttemptPass: Math.random() < 0.15,
      },
    });

    const retentionScore = Math.floor(postScore * (0.7 + Math.random() * 0.1));
    newEvents.push({
      id: `evt_demo_ret_${studentId}`,
      ts: new Date(now - 86400000).toISOString(),
      studentId,
      type: 'STUDY_RETENTION_ANSWER',
      conceptId: topicId,
      topicId,
      synthetic: true,
      payload: {
        studyId,
        armId: 'ARM_C',
        score: Math.min(100, retentionScore),
        passed: retentionScore >= 70,
        durationSec: Math.floor(135 + Math.random() * 45),
      },
    });
  });

  return {
    syntheticUsers,
    syntheticISLM,
    newEvents,
    armAssignments,
  };
}
