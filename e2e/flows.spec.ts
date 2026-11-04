import { test, expect } from '@playwright/test';

test.describe('Mastery.ai End-to-End Persona Verification Suite', () => {

  test('Student Journey: Login, Pretest, Socratic Tutor, Code Lab, CAD Lab, Study Studio, Video & Portfolio', async ({ page }) => {
    // 1. Visit App Shell and Verify Platform Identity
    await page.goto('/');
    await expect(page).toHaveTitle(/Mastery\.ai/i);

    // 2. Authenticate as Student
    const loginRes = await page.request.post('/api/auth/login', {
      data: {
        email: 'student@mastery.ai',
        password: 'StudentPass123!',
      },
    });
    expect(loginRes.status()).toBe(200);

    // 3. Verify Student State & ISLM Profile
    const userStateRes = await page.request.get('/api/user/state');
    expect(userStateRes.status()).toBe(200);
    const userState = await userStateRes.json();
    expect(userState.user).toBeDefined();
    expect(userState.user.role).toBe('student');
    expect(userState.islm).toBeDefined();

    // 4. Pretest / Diagnostic Mock Test Generation
    const diagnosticRes = await page.request.post('/api/generate-mock-test', {
      data: {
        track: 'Operating Systems',
        topic: 'Deadlock Conditions',
        difficulty: 'medium',
      },
    });
    expect(diagnosticRes.status()).toBe(200);
    const diagnosticData = await diagnosticRes.json();
    expect(diagnosticData.questions || diagnosticData.test).toBeDefined();

    // 5. Socratic Tutor Interaction & Anti-Answer Enforcement
    const tutorRes = await page.request.post('/api/tutoring', {
      data: {
        student_input: 'Give me the complete answer for Dijkstra safety algorithm in C.',
        current_topic: 'os_deadlock_bankers',
        workflow: 'CHATS',
        language: 'en',
      },
    });
    expect(tutorRes.status()).toBe(200);
    const tutorData = await tutorRes.json();
    expect(tutorData.scaffolding_response).toBeDefined();
    expect(tutorData.scaffolding_response.current_tier).toBeGreaterThanOrEqual(1);

    // 6. Code Lab Attempt Submission & BKT Update
    const attemptRes = await page.request.post('/api/attempts', {
      data: {
        id: `att_pw_${Date.now()}`,
        conceptId: 'os_deadlock_bankers',
        kind: 'code_lab',
        passed: true,
        tierUsed: 2,
        hintsRequested: 1,
        durationSec: 65,
        codeSnippet: 'int need[P][R]; for(int i=0;i<P;i++) need[i][j] = max[i][j] - alloc[i][j];',
      },
    });
    expect(attemptRes.status()).toBe(200);
    const attemptData = await attemptRes.json();
    expect(attemptData.success).toBe(true);

    // 7. CAD Lab Parameter Calculation & Mechanics
    const cadRes = await page.request.post('/api/events', {
      data: {
        id: `evt_cad_${Date.now()}`,
        type: 'ATTEMPT_RECORDED',
        conceptId: 'cad_cantilever_beam',
        topicId: 'Mechanical Engineering (CAD)',
        payload: {
          beamLength: 500,
          appliedLoad: 1200,
          crossSection: 'I-Beam',
          maxDeflectionMm: 1.42,
          vonMisesStressMpa: 87.5,
          factorOfSafety: 2.85,
        },
      },
    });
    expect(cadRes.status()).toBe(200);

    // 8. Study Studio: Material Synthesis, Plan Generation & SM-2 Flashcard Recall
    const examDate = new Date();
    examDate.setDate(examDate.getDate() + 10);
    const studioRes = await page.request.post('/api/study-studio/generate', {
      data: {
        courseTopic: 'Operating Systems & Deadlocks',
        examDate: examDate.toISOString().slice(0, 10),
        targetGrade: 9.5,
        dailyStudyMinutes: 45,
        pastedText: 'Banker algorithm avoids deadlock by simulating allocation of predetermined maximum possible amounts of all resources.',
      },
    });
    expect(studioRes.status()).toBe(200);
    const studioData = await studioRes.json();
    expect(studioData.flashcards.length).toBeGreaterThanOrEqual(20);

    const rateRes = await page.request.post('/api/study-studio/rate-card', {
      data: {
        cardId: studioData.flashcards[0].id,
        rating: 'Good',
      },
    });
    expect(rateRes.status()).toBe(200);

    // 9. Video Generation Pipeline
    const videoRes = await page.request.post('/api/generate-video', {
      data: {
        topic: 'Deadlock Circular Wait Condition',
        misconception: 'Assuming locks can be acquired in arbitrary orders without cycle prevention.',
        subject_track: 'Operating Systems',
      },
    });
    expect(videoRes.status()).toBe(200);
    const videoData = await videoRes.json();
    expect(videoData.scenes.length).toBeGreaterThanOrEqual(3);

    // 10. Learner Portfolio Showcase & Public Link Generation
    const publishRes = await page.request.post('/api/portfolio/publish', {
      data: { visibility: 'public' },
    });
    expect(publishRes.status()).toBe(200);
    const publishData = await publishRes.json();
    const slug = publishData.slug || publishData.profile?.slug;
    expect(slug).toBeDefined();

    // Verify Public Access (Unauthenticated)
    const publicPortfolioRes = await page.request.get(`/p/${slug}`);
    expect(publicPortfolioRes.status()).toBe(200);
  });

  test('Teacher Journey: Live Class, Cohort Drilldown, Interventions & Study Analytics', async ({ page }) => {
    // 1. Authenticate as Teacher
    const loginRes = await page.request.post('/api/auth/login', {
      data: {
        email: 'teacher@mastery.ai',
        password: 'TeacherPass123!',
      },
    });
    expect(loginRes.status()).toBe(200);

    // 2. Live Class Broadcast Start
    const liveStartRes = await page.request.post('/api/live/session/start', {
      data: {
        topicId: 'os_deadlock_bankers',
        topicName: 'Banker Algorithm Resource Safety',
        track: 'Operating Systems',
      },
    });
    expect(liveStartRes.status()).toBe(200);
    const liveData = await liveStartRes.json();
    expect(liveData.success).toBe(true);

    // 3. Cohort Analytics Heatmap Query
    const cohortRes = await page.request.get('/api/teacher/cohort-analytics');
    expect(cohortRes.status()).toBe(200);
    const cohortData = await cohortRes.json();
    expect(Array.isArray(cohortData.students)).toBe(true);

    // 4. Faculty Socratic Intervention Approval
    const interventionRes = await page.request.post('/api/teacher/interventions/approve', {
      data: {
        interventionId: `int_pw_${Date.now()}`,
        studentId: 'CSE_STU_8810',
        conceptId: 'os_deadlock_bankers',
        tutorMessage: 'Trace the Available vector before granting request R_i.',
        socraticQuestion: 'Does the requested resource exceed Need_i?',
      },
    });
    expect(interventionRes.status()).toBe(200);
    const interventionData = await interventionRes.json();
    expect(interventionData.intervention.status).toBe('Teacher-approved');

    // 5. Study CSV Export & Empirical Metrics
    const exportCsvRes = await page.request.get('/api/teacher/export-csv');
    expect(exportCsvRes.status()).toBe(200);
    const csvText = await exportCsvRes.text();
    expect(csvText).toContain('Student ID');
  });

  test('Admin Journey: Compliance Audits, AI Quota Dashboard, Governance & Cohort Seeding', async ({ page }) => {
    // 1. Authenticate as Admin
    const loginRes = await page.request.post('/api/auth/login', {
      data: {
        email: 'admin@mastery.ai',
        password: 'AdminPass123!',
      },
    });
    expect(loginRes.status()).toBe(200);

    // 2. 30-Prompt Anti-Answer Compliance Evaluation
    const antiAnswerStatsRes = await page.request.get('/api/admin/anti-answer-stats');
    expect(antiAnswerStatsRes.status()).toBe(200);
    const antiAnswerStats = await antiAnswerStatsRes.json();
    expect(antiAnswerStats.latestPassRate).toBeGreaterThanOrEqual(90);

    // 3. AI Usage & Token Cost Estimation Dashboard
    const aiUsageRes = await page.request.get('/api/admin/ai-usage');
    expect(aiUsageRes.status()).toBe(200);
    const aiUsage = await aiUsageRes.json();
    expect(aiUsage.today).toBeDefined();
    expect(typeof aiUsage.allTime.estimatedCostUsd).toBe('number');

    // 4. Security Audit Logs Query
    const auditRes = await page.request.get('/api/admin/audit-logs?limit=25');
    expect(auditRes.status()).toBe(200);
    const auditData = await auditRes.json();
    expect(Array.isArray(auditData.logs)).toBe(true);

    // 5. Provision Verified Faculty Account
    const createTeacherRes = await page.request.post('/api/admin/create-teacher', {
      data: {
        name: 'Dr. Katherine Johnson',
        email: `dr_kj_${Date.now()}@mastery.ai`,
        password: 'Password123!',
        degree: 'Applied Mathematics & Mechanics',
      },
    });
    expect(createTeacherRes.status()).toBe(201);

    // 6. Synthetic Demo Cohort Seeding & Isolated Cleanup
    const seedRes = await page.request.post('/api/admin/seed-demo');
    expect(seedRes.status()).toBe(200);

    const clearRes = await page.request.post('/api/admin/clear-demo');
    expect(clearRes.status()).toBe(200);
    const clearData = await clearRes.json();
    expect(clearData.success || clearData.cleared).toBeTruthy();
  });

});
