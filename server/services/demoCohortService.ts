import {
  userRepository,
  islmRepository,
  eventRepository,
  attemptRepository,
  interventionRepository,
  cohortRepository,
} from '../repositories/index.ts';
import { hashPassword } from '../auth.ts';

export async function seedDemoCohort(): Promise<{
  studentsCount: number;
  eventsCount: number;
  attemptsCount: number;
  interventionsCount: number;
}> {
  const defaultPwHash = await hashPassword('Student@123');

  const demoStudents = [
    { id: 'DEMO_STU_101', name: 'Aarav Patel', email: 'aarav.patel@demo.edu', mastery: 0.85, track: 'Systems & Artificial Intelligence' },
    { id: 'DEMO_STU_102', name: 'Elena Rostova', email: 'elena.rostova@demo.edu', mastery: 0.72, track: 'Web Application Development' },
    { id: 'DEMO_STU_103', name: 'Chen Wei', email: 'chen.wei@demo.edu', mastery: 0.44, track: 'Web Application Development' },
    { id: 'DEMO_STU_104', name: 'Fatima Al-Mansoor', email: 'fatima.almansoor@demo.edu', mastery: 0.91, track: 'Systems & Artificial Intelligence' },
    { id: 'DEMO_STU_105', name: 'Liam O’Connor', email: 'liam.oconnor@demo.edu', mastery: 0.62, track: 'Web Application Development' },
    { id: 'DEMO_STU_106', name: 'Zoe Takahashi', email: 'zoe.takahashi@demo.edu', mastery: 0.78, track: 'Systems & Artificial Intelligence' },
    { id: 'DEMO_STU_107', name: 'Mateo Fernandez', email: 'mateo.fernandez@demo.edu', mastery: 0.53, track: 'Web Application Development' },
    { id: 'DEMO_STU_108', name: 'Chloe Dubois', email: 'chloe.dubois@demo.edu', mastery: 0.88, track: 'Systems & Artificial Intelligence' },
    { id: 'DEMO_STU_109', name: 'Kavya Sharma', email: 'kavya.sharma@demo.edu', mastery: 0.67, track: 'Web Application Development' },
    { id: 'DEMO_STU_110', name: 'Lucas Meyer', email: 'lucas.meyer@demo.edu', mastery: 0.35, track: 'Web Application Development' },
  ];

  let eventsCount = 0;
  let attemptsCount = 0;
  let interventionsCount = 0;

  const now = Date.now();

  for (let idx = 0; idx < demoStudents.length; idx++) {
    const s = demoStudents[idx];

    // 1. User Record (Synthetic)
    userRepository.upsert({
      id: s.id,
      name: s.name,
      email: s.email,
      role: 'student',
      plan: 'Student Free Tier',
      degree: 'B.Tech Computer Science & Engineering',
      preferredLanguages: ['python', 'javascript', 'cpp'],
      streakDays: Math.floor(2 + Math.random() * 8),
      testsCompleted: Math.floor(1 + Math.random() * 5),
      overallMastery: s.mastery,
      theme: 'dark',
      passwordHash: defaultPwHash,
      tokenVersion: 1,
      synthetic: true,
    });

    // 2. ISLM Profile (Synthetic)
    islmRepository.upsert({
      student_id: s.id,
      name: s.name,
      email: s.email,
      role: 'student',
      course_track: s.track,
      overall_mastery: s.mastery,
      topic_mastery: {
        web_apache_docroot: Math.min(1.0, Math.max(0.2, s.mastery + (Math.random() * 0.2 - 0.1))),
        pdo_mysql_port: Math.min(1.0, Math.max(0.15, s.mastery - 0.2)),
        async_event_loop: Math.min(1.0, Math.max(0.3, s.mastery + 0.05)),
        recursion_base_case: Math.min(1.0, Math.max(0.25, s.mastery - 0.1)),
      },
      recent_misconceptions: s.mastery < 0.6 ? ['Confusing MySQL port 3306 with HTTP port 80'] : [],
      scaffolding_tier_required: s.mastery < 0.5 ? 2 : 1,
      error_count: Math.floor((1 - s.mastery) * 10),
      independent_solves: Math.floor(s.mastery * 12),
      scaffolding_fading_index: Math.min(1.0, s.mastery * 0.9),
      time_spent_mins: Math.floor(120 + Math.random() * 300),
      synthetic: true,
    });

    // 3. Realistic Attempts (Synthetic)
    const concepts = ['web_apache_docroot', 'pdo_mysql_port', 'async_event_loop'];
    for (const c of concepts) {
      const isPassed = Math.random() < s.mastery;
      const attemptTs = new Date(now - (10 - idx) * 3600000 - Math.random() * 1800000).toISOString();

      attemptRepository.create({
        studentId: s.id,
        conceptId: c,
        kind: 'code_lab',
        passed: isPassed,
        tierUsed: isPassed ? 1 : 2,
        hintsRequested: isPassed ? 0 : 2,
        durationSec: Math.floor(45 + Math.random() * 120),
        errorCategory: isPassed ? undefined : 'PORT_CONFUSION',
        repeatedError: false,
        codeSnippet: `// Demo attempt by ${s.name} on ${c}`,
        language: 'javascript',
        ts: attemptTs,
        synthetic: true,
      });
      attemptsCount++;

      // 4. Corresponding Pedagogical Event (Synthetic)
      eventRepository.append({
        studentId: s.id,
        type: isPassed ? 'ATTEMPT_SUCCESS' : 'ATTEMPT_EVALUATED',
        conceptId: c,
        topicId: c,
        payload: { passed: isPassed, score: isPassed ? 100 : 40 },
        synthetic: true,
        ts: attemptTs,
      });
      eventsCount++;
    }

    // 5. Intervention for lower mastery students (Synthetic)
    if (s.mastery < 0.65) {
      const intTs = new Date(now - 1800000).toISOString();
      interventionRepository.create({
        studentId: s.id,
        studentName: s.name,
        conceptId: 'pdo_mysql_port',
        tier: 2,
        issueType: 'CONCEPTUAL_GAP',
        tutorMessage: `Notice that database servers run on separate network sockets than web servers.`,
        socraticQuestion: `What default port does MySQL listen on versus Apache?`,
        status: 'Teacher-approved',
        outcome: 'pending',
        ts: intTs,
        synthetic: true,
      });
      interventionsCount++;
    }
  }

  // Ensure Demo Cohorts exist
  cohortRepository.upsert({
    id: 'cohort_demo_batch',
    name: 'Demo Cohort - CSE Fall 2026',
    studentsCount: demoStudents.length,
    averageMastery: 0.68,
    activeInterventions: interventionsCount,
    track: 'Web Application Development',
  });

  return {
    studentsCount: demoStudents.length,
    eventsCount,
    attemptsCount,
    interventionsCount,
  };
}

export function clearDemoCohort(): {
  usersCleared: number;
  islmCleared: number;
  eventsCleared: number;
  attemptsCleared: number;
  interventionsCleared: number;
} {
  const usersCleared = userRepository.deleteSynthetic();
  const islmCleared = islmRepository.deleteSynthetic();
  const eventsCleared = eventRepository.deleteSynthetic();
  const attemptsCleared = attemptRepository.deleteSynthetic();
  const interventionsCleared = interventionRepository.deleteSynthetic();

  return {
    usersCleared,
    islmCleared,
    eventsCleared,
    attemptsCleared,
    interventionsCleared,
  };
}
