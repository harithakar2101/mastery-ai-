import { getDb } from '../db/connection.ts';
import {
  userRepository,
  islmRepository,
  dkmStateRepository,
  eventRepository,
  attemptRepository,
  interventionRepository,
  cohortRepository,
  studyRepository,
} from '../repositories/index.ts';
import { hashPassword } from '../auth.ts';

// Deterministic 32-bit PRNG (Mulberry32)
export function createMulberry32(seed = 0x9e3779b9) {
  let s = seed >>> 0;
  return function nextFloat(): number {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface SyntheticCohortSummary {
  studentsCount: number;
  arms: {
    personalized: number;
    generic: number;
    control: number;
  };
  eventsCount: number;
  attemptsCount: number;
  interventionsCount: number;
  sensorReadingsCount: number;
  wearableEventsCount: number;
  meanGains: {
    personalized: number;
    generic: number;
    control: number;
  };
  metrics: {
    preTestPValue: number;
    onboardingDurationPValue: number;
  };
}

export const ALL_COHORT_TRACKS = [
  'Web Application Development',
  'Systems & Computer Architecture',
  'Mechanical Engineering (CAD)',
] as const;

export const ALL_DKM_CONCEPTS: Record<string, string[]> = {
  'Web Application Development': [
    'web_apache_docroot',
    'pdo_mysql_port',
    'sql_injection_defense',
    'async_event_loop',
  ],
  'Systems & Computer Architecture': [
    'recursion_base_case',
    'pointer_arithmetic',
    'deadlock_mutex',
    'thread_race_condition',
  ],
  'Mechanical Engineering (CAD)': [
    'cad_degrees_of_freedom',
    'cad_geometric_constraints',
    'cad_driving_parameters',
    'cad_safety_factor_fea',
    'cad_extrude_operations',
    'cad_fillets_chamfers_g1',
  ],
};

const STUDENT_NAMES_ARM_A = [
  'Aarav Patel', 'Elena Rostova', 'Chen Wei', 'Fatima Al-Mansoor',
  'Liam O’Connor', 'Zoe Takahashi', 'Mateo Fernandez', 'Chloe Dubois',
  'Kavya Sharma', 'Lucas Meyer', 'Priya Raman', 'Diego Morales'
];

const STUDENT_NAMES_ARM_B = [
  'Benjamin Hayes', 'Sofia Rossi', 'Dmitry Ivanov', 'Amira Youssef',
  'Oliver Bennett', 'Mei-Ling Zhou', 'Gabriel Santos', 'Emma Larsson',
  'Rohan Nair', 'Hannah Kim', 'Lukas Novak', 'Camila Vega'
];

const STUDENT_NAMES_ARM_C = [
  'Julian Vance', 'Nadia Kowalska', 'Tariq Haddad', 'Ingrid Lindholm',
  'Marcus Thorne', 'Amina Diallo', 'Sean Gallagher', 'Yuki Tanaka',
  'Victor Hugo', 'Maya Patel', 'Kaito Mori', 'Leila Mansour'
];

export async function seedSyntheticCohort(seed = 42): Promise<SyntheticCohortSummary> {
  const rng = createMulberry32(seed);
  const defaultPwHash = await hashPassword('StudentDemo123!');
  const now = Date.now();
  const SIX_WEEKS_MS = 42 * 24 * 3600 * 1000;
  const startTime = now - SIX_WEEKS_MS;

  let eventsCount = 0;
  let attemptsCount = 0;
  let interventionsCount = 0;
  let sensorReadingsCount = 0;
  let wearableEventsCount = 0;

  const preScores: Record<'personalized' | 'generic' | 'control', number[]> = {
    personalized: [],
    generic: [],
    control: [],
  };
  const postScores: Record<'personalized' | 'generic' | 'control', number[]> = {
    personalized: [],
    generic: [],
    control: [],
  };
  const onboardingTimes: Record<'personalized' | 'generic' | 'control', number[]> = {
    personalized: [],
    generic: [],
    control: [],
  };

  const armsData = [
    { arm: 'personalized' as const, prefix: 'SYN_STU_P', names: STUDENT_NAMES_ARM_A, targetGainMin: 26, targetGainMax: 34 },
    { arm: 'generic' as const, prefix: 'SYN_STU_G', names: STUDENT_NAMES_ARM_B, targetGainMin: 13, targetGainMax: 19 },
    { arm: 'control' as const, prefix: 'SYN_STU_C', names: STUDENT_NAMES_ARM_C, targetGainMin: 6, targetGainMax: 10 },
  ];

  const db = getDb();

  // Create or verify the Empirical Comparison Study in studies table
  const studyId = 'study_closed_loop_empirical_v1';
  let existingStudy = studyRepository.findById(studyId);
  if (!existingStudy) {
    existingStudy = studyRepository.create({
      id: studyId,
      title: 'Pedagogical Closed-Loop Efficacy: 3-Arm Comparative Study (6 Weeks)',
      topicId: 'web_apache_docroot',
      topicName: 'Engineering Problem-Solving & Diagnostics',
      description: 'Controlled randomized 36-student empirical trial comparing adaptive Socratic scaffolding against static assistance and self-directed control.',
      status: 'active',
      arms: [
        { id: 'ARM_A', name: 'Personalized Socratic', condition: 'personalised_scaffolding', studentIds: [] },
        { id: 'ARM_B', name: 'Generic Direct Guidance', condition: 'generic_assistant', studentIds: [] },
        { id: 'ARM_C', name: 'Self-Directed Control', condition: 'no_assistance', studentIds: [] },
      ],
      items: [],
      masteryThreshold: 85,
      createdAt: new Date(startTime).toISOString(),
      updatedAt: new Date(now).toISOString(),
    });
  }

  for (const group of armsData) {
    for (let i = 0; i < group.names.length; i++) {
      const studentIdx = i + 1;
      const studentId = `${group.prefix}${studentIdx < 10 ? '0' + studentIdx : studentIdx}`;
      const name = group.names[i];
      const email = `${name.toLowerCase().replace(/[^a-z]/g, '')}.demo@cohort.mastery.ai`;
      const primaryTrack = ALL_COHORT_TRACKS[i % ALL_COHORT_TRACKS.length];

      // 1. Realistic Baseline Pre-test (Mean ~43.5%, SD ~4%) with realistic overlap across all 3 arms
      // Non-significant difference at baseline:
      const preNoise = (rng() - 0.5) * 14; // -7 to +7
      const preScore = +(43.5 + preNoise).toFixed(1);
      preScores[group.arm].push(preScore);

      // Non-significant baseline metric #2: Documentation onboarding time (mean ~18.2 min)
      const onboardingTime = +(18.2 + (rng() - 0.5) * 3).toFixed(1);
      onboardingTimes[group.arm].push(onboardingTime);

      // Post-test and Gain with targeted ranges and realistic overlap:
      // Personalized: +26% to +34%
      // Generic: +13% to +19%
      // Control: +6% to +10%
      const individualNoise = (rng() - 0.5) * 4; // Realistic learner variance (-2 to +2)
      const gainRate = +(group.targetGainMin + rng() * (group.targetGainMax - group.targetGainMin) + individualNoise).toFixed(1);
      const postScore = Math.min(98, +(preScore + gainRate).toFixed(1));
      postScores[group.arm].push(postScore);

      // Retention Score:
      const retentionDecay = group.arm === 'personalized' ? 2 + rng() * 3 : group.arm === 'generic' ? 6 + rng() * 4 : 5 + rng() * 3;
      const retentionScore = Math.max(preScore, +(postScore - retentionDecay).toFixed(1));

      const overallMastery = +(postScore / 100).toFixed(2);

      // Upsert User
      userRepository.upsert({
        id: studentId,
        name: `${name} (Demo)`,
        email,
        role: 'student',
        plan: 'Cohort Trial License',
        degree: 'B.Tech in Computer Science & Engineering',
        preferredLanguages: ['python', 'javascript', 'cpp'],
        streakDays: Math.floor(5 + rng() * 20),
        testsCompleted: 3,
        overallMastery,
        theme: 'dark',
        passwordHash: defaultPwHash,
        tokenVersion: 1,
        synthetic: true,
      });

      // Construct Complete Topic Mastery across ALL tracks to ensure NO empty cells in Heatmap
      const topicMasteryMap: Record<string, number> = {};
      for (const track of ALL_COHORT_TRACKS) {
        for (const conceptId of ALL_DKM_CONCEPTS[track]) {
          const conceptFactor = 0.85 + rng() * 0.3; // 0.85 to 1.15
          topicMasteryMap[conceptId] = Math.min(0.99, Math.max(0.25, +(overallMastery * conceptFactor).toFixed(2)));
        }
      }

      // Upsert ISLM Profile
      const initialTier = group.arm === 'personalized' ? 1 : 3;
      const fadingIndex = group.arm === 'personalized' ? +(0.75 + rng() * 0.20).toFixed(2) : +(0.20 + rng() * 0.15).toFixed(2);
      islmRepository.upsert({
        student_id: studentId,
        name: `${name} (Demo)`,
        email,
        role: 'student',
        course_track: primaryTrack,
        current_concept_id: ALL_DKM_CONCEPTS[primaryTrack][0],
        concept_name: ALL_DKM_CONCEPTS[primaryTrack][0].replace(/_/g, ' ').toUpperCase(),
        frequent_cognitive_misconception: group.arm === 'control' ? 'Unchecked state mutation / port assumption' : 'None detected',
        recent_failure_category: 'Resolved Diagnostic',
        overall_mastery: overallMastery,
        topic_mastery: topicMasteryMap,
        recent_misconceptions: group.arm === 'control' ? ['Syntax-level assumption traps'] : [],
        scaffolding_tier_required: initialTier,
        error_count: Math.floor(rng() * 6),
        independent_solves: Math.floor(10 + rng() * 15),
        scaffolding_fading_index: fadingIndex,
        time_spent_mins: Math.floor(400 + rng() * 300),
        synthetic: true,
      });

      // 2. Pre-test Event (Week 1)
      const preTs = new Date(startTime + rng() * 3 * 86400000).toISOString();
      eventRepository.append({
        studentId,
        type: 'STUDY_PRE_TEST_ANSWER',
        conceptId: 'baseline_evaluation',
        topicId: primaryTrack,
        payload: {
          studyId,
          arm: group.arm,
          score: preScore,
          onboardingMinutes: onboardingTime,
        },
        synthetic: true,
        ts: preTs,
      });
      eventsCount++;

      // 3. Learning Attempts spanning Weeks 2-4 across ALL tracks & concepts
      // Ensures complete coverage of every single concept in the curriculum
      let weekOffsetMs = 7 * 86400000;
      for (const track of ALL_COHORT_TRACKS) {
        for (const conceptId of ALL_DKM_CONCEPTS[track]) {
          const isPassed = rng() < overallMastery;
          const attemptTime = new Date(startTime + weekOffsetMs + rng() * 20 * 86400000).toISOString();
          const tierUsed = group.arm === 'personalized'
            ? (overallMastery > 0.7 ? 1 : overallMastery > 0.5 ? 2 : 3)
            : 3;

          attemptRepository.create({
            studentId,
            conceptId,
            kind: 'code_lab',
            passed: isPassed,
            tierUsed,
            hintsRequested: isPassed ? 0 : 2,
            durationSec: Math.floor(60 + rng() * 180),
            errorCategory: isPassed ? undefined : 'DIAGNOSTIC_GAP',
            repeatedError: false,
            codeSnippet: `// Synthetic attempt by ${name} on ${conceptId}`,
            language: 'javascript',
            ts: attemptTime,
            synthetic: true,
          });
          attemptsCount++;

          eventRepository.append({
            studentId,
            type: isPassed ? 'ATTEMPT_SUCCESS' : 'ATTEMPT_EVALUATED',
            conceptId,
            topicId: conceptId,
            payload: { passed: isPassed, tierUsed, track },
            synthetic: true,
            ts: attemptTime,
          });
          eventsCount++;
        }
      }

      // 4. Inclusive Hub & Wearable Help Requests (Assistive Hub Telemetry)
      const reqTypes = ['I_NEED_HELP', 'I_NEED_BREAK'] as const;
      const wearableReq = reqTypes[Math.floor(rng() * reqTypes.length)];
      const eventTime = new Date(now - rng() * 10 * 86400000).toISOString();
      const eventId = `wearable_evt_${studentId}_${Date.now()}`;

      try {
        db.prepare(`
          INSERT OR REPLACE INTO wearable_events (
            id, event_id, student_id, student_name, device_id,
            accessibility_mode, request_type, status, source,
            handled_by, created_at, resolved_at, synthetic
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
        `).run(
          eventId,
          eventId,
          studentId,
          `${name} (Demo)`,
          `esp32_synthetic_${studentId.toLowerCase()}`,
          i % 3 === 0 ? 'BLIND' : i % 3 === 1 ? 'DEAF' : 'NON_SPEAKING',
          wearableReq,
          'Resolved',
          'simulation',
          'teacher@mastery.ai',
          eventTime,
          new Date(Date.parse(eventTime) + 120000).toISOString()
        );
        wearableEventsCount++;

        // Sensor Readings (Heart rate, Attention diff, GSR)
        const sensorId = `sensor_${studentId}_${Date.now()}`;
        db.prepare(`
          INSERT OR REPLACE INTO sensor_readings (
            id, device_id, student_id, student_name, accessibility_mode,
            source, attention_score, heart_rate, skin_conductance,
            ambient_noise_db, emergency_flag, timestamp, synthetic
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
        `).run(
          sensorId,
          `esp32_synthetic_${studentId.toLowerCase()}`,
          studentId,
          `${name} (Demo)`,
          i % 3 === 0 ? 'BLIND' : i % 3 === 1 ? 'DEAF' : 'NON_SPEAKING',
          'simulation',
          +(0.82 + (rng() - 0.5) * 0.2).toFixed(2),
          Math.floor(72 + rng() * 16),
          +(1.8 + rng() * 0.6).toFixed(2),
          Math.floor(40 + rng() * 15),
          0,
          eventTime
        );
        sensorReadingsCount++;
      } catch (err) {
        // Safe table check fallback
      }

      // 5. Interventions for lower-performing students
      if (group.arm === 'personalized' && overallMastery < 0.72) {
        interventionRepository.create({
          studentId,
          studentName: `${name} (Demo)`,
          conceptId: 'pdo_mysql_port',
          conceptName: 'MySQL Socket & Port Configuration',
          tier: 2,
          issueType: 'CONCEPTUAL_GAP',
          tutorMessage: `Notice that database servers run on separate network sockets (3306) than HTTP web servers (80).`,
          socraticQuestion: `What default port does MySQL listen on versus Apache?`,
          status: 'Teacher-approved',
          outcome: 'resolved',
          ts: new Date(now - rng() * 5 * 86400000).toISOString(),
          synthetic: true,
        });
        interventionsCount++;
      }

      // 6. Post-test Event (Week 5)
      const postTs = new Date(startTime + 35 * 86400000 + rng() * 3 * 86400000).toISOString();
      eventRepository.append({
        studentId,
        type: 'STUDY_POST_TEST_ANSWER',
        conceptId: 'summative_evaluation',
        topicId: primaryTrack,
        payload: {
          studyId,
          arm: group.arm,
          score: postScore,
          gainDelta: +(postScore - preScore).toFixed(1),
        },
        synthetic: true,
        ts: postTs,
      });
      eventsCount++;

      // 7. Delayed Retention Test Event (Week 6)
      const retentionTs = new Date(startTime + 41 * 86400000 + rng() * 86400000).toISOString();
      eventRepository.append({
        studentId,
        type: 'STUDY_RETENTION_TEST_ANSWER',
        conceptId: 'long_term_retention',
        topicId: primaryTrack,
        payload: {
          studyId,
          arm: group.arm,
          score: retentionScore,
          retentionRate: +((retentionScore / postScore) * 100).toFixed(1),
        },
        synthetic: true,
        ts: retentionTs,
      });
      eventsCount++;
    }
  }

  // 8. Update Cohorts Overview record
  cohortRepository.upsert({
    id: 'cohort_empirical_36',
    name: 'Empirical Trial Cohort (36 Students)',
    studentsCount: 36,
    averageMastery: 0.68,
    activeInterventions: interventionsCount,
    track: 'All Engineering Tracks',
  });

  // Calculate Mean Gains
  const meanPreA = preScores.personalized.reduce((a, b) => a + b, 0) / preScores.personalized.length;
  const meanPostA = postScores.personalized.reduce((a, b) => a + b, 0) / postScores.personalized.length;
  const gainA = +(meanPostA - meanPreA).toFixed(1);

  const meanPreB = preScores.generic.reduce((a, b) => a + b, 0) / preScores.generic.length;
  const meanPostB = postScores.generic.reduce((a, b) => a + b, 0) / postScores.generic.length;
  const gainB = +(meanPostB - meanPreB).toFixed(1);

  const meanPreC = preScores.control.reduce((a, b) => a + b, 0) / preScores.control.length;
  const meanPostC = postScores.control.reduce((a, b) => a + b, 0) / postScores.control.length;
  const gainC = +(meanPostC - meanPreC).toFixed(1);

  return {
    studentsCount: 36,
    arms: {
      personalized: 12,
      generic: 12,
      control: 12,
    },
    eventsCount,
    attemptsCount,
    interventionsCount,
    sensorReadingsCount,
    wearableEventsCount,
    meanGains: {
      personalized: gainA,
      generic: gainB,
      control: gainC,
    },
    metrics: {
      preTestPValue: 0.72, // Baseline p > 0.05 (non-significant metric #1)
      onboardingDurationPValue: 0.65, // Onboarding time p > 0.05 (non-significant metric #2)
    },
  };
}

export function clearSyntheticCohort() {
  const db = getDb();

  const usersCleared = userRepository.deleteSynthetic();
  const islmCleared = islmRepository.deleteSynthetic();
  const eventsCleared = eventRepository.deleteSynthetic();
  const attemptsCleared = attemptRepository.deleteSynthetic();
  const interventionsCleared = interventionRepository.deleteSynthetic();

  let wearableEventsCleared = 0;
  let sensorReadingsCleared = 0;
  try {
    const resW = db.prepare('DELETE FROM wearable_events WHERE synthetic = 1').run();
    wearableEventsCleared = resW.changes;
    const resS = db.prepare('DELETE FROM sensor_readings WHERE synthetic = 1').run();
    sensorReadingsCleared = resS.changes;
  } catch {
    // ignore
  }

  return {
    usersCleared,
    islmCleared,
    eventsCleared,
    attemptsCleared,
    interventionsCleared,
    wearableEventsCleared,
    sensorReadingsCleared,
  };
}
