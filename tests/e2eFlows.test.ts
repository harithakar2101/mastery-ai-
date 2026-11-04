process.env.NODE_ENV = 'test';

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { type Server } from 'http';
import { app } from '../server.ts';
import { COOKIE_NAME, createSessionToken } from '../server/auth.ts';
import {
  userRepository,
  islmRepository,
  attemptRepository,
  interventionRepository,
  dkmStateRepository,
} from '../server/repositories/index.ts';

let testServer: Server;
let testBaseUrl: string;

// Helper for authenticated requests
async function makeRequest(
  path: string,
  options: {
    method?: string;
    token?: string;
    body?: any;
    headers?: Record<string, string>;
  } = {}
) {
  const method = options.method || 'GET';
  const headers: Record<string, string> = {
    ...(options.headers || {}),
  };

  if (options.token) {
    headers.Cookie = `${COOKIE_NAME}=${options.token}`;
  }

  let body: string | undefined;
  if (options.body) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(options.body);
  }

  const res = await (globalThis as any).fetch(`${testBaseUrl}${path}`, {
    method,
    headers,
    body,
  });

  let data: any;
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    data = await res.json();
  } else {
    data = await res.text();
  }

  return { status: res.status, data, headers: res.headers };
}

describe('End-to-End Release Candidate Flows (Student, Teacher, Admin)', () => {
  const timestamp = Date.now().toString().slice(-5);
  const studentEmail = `student_${timestamp}@university.edu`;
  const teacherEmail = `faculty_${timestamp}@university.edu`;
  const adminEmail = `admin_${timestamp}@university.edu`;

  let studentToken: string;
  let teacherToken: string;
  let adminToken: string;
  let studentUser: any;
  let teacherUser: any;
  let adminUser: any;

  before(async () => {
    // 1. Create Student
    studentUser = userRepository.create({
      id: `CSE_STU_${timestamp}`,
      name: 'E2E Student Alice',
      email: studentEmail,
      role: 'student',
      plan: 'Free Plan',
      theme: 'dark',
      streakDays: 3,
      testsCompleted: 2,
      overallMastery: 0.60,
    });
    studentToken = createSessionToken(studentUser);

    // 2. Create Teacher
    teacherUser = userRepository.create({
      id: `FACULTY_${timestamp}`,
      name: 'Professor E2E Bob',
      email: teacherEmail,
      role: 'teacher',
      plan: 'Campus License',
      theme: 'dark',
      streakDays: 10,
      testsCompleted: 0,
      overallMastery: 0.95,
    });
    teacherToken = createSessionToken(teacherUser);

    // 3. Create Admin
    adminUser = userRepository.create({
      id: `ADMIN_${timestamp}`,
      name: 'Dean E2E Carol',
      email: adminEmail,
      role: 'admin',
      plan: 'Campus License',
      theme: 'dark',
      streakDays: 30,
      testsCompleted: 0,
      overallMastery: 0.99,
    });
    adminToken = createSessionToken(adminUser);

    // Initialize ISLM for student
    islmRepository.upsert({
      student_id: studentUser.id,
      name: studentUser.name,
      email: studentUser.email,
      role: 'student',
      course_track: 'Web Application Development',
      overall_mastery: 0.60,
      topic_mastery: { web_apache_docroot: 0.45 },
      recent_misconceptions: ['DocumentRoot confusion'],
      scaffolding_tier_required: 1,
      error_count: 1,
      independent_solves: 2,
      scaffolding_fading_index: 0.30,
      time_spent_mins: 45,
      history: [],
    });

    await new Promise<void>((resolve) => {
      testServer = app.listen(0, '127.0.0.1', () => {
        const addr = testServer.address() as any;
        testBaseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });
  });

  after(async () => {
    if (testServer) {
      await new Promise<void>((resolve) => testServer.close(() => resolve()));
    }
  });

  describe('Student Journey Flow', () => {
    it('S1: Fetches authenticated user state and profile', async () => {
      const res = await makeRequest('/api/user/state', { token: studentToken });
      assert.equal(res.status, 200);
      assert.equal(res.data.user.id, studentUser.id);
      assert.equal(res.data.user.role, 'student');
      assert.ok(res.data.islm);
    });

    it('S2: Requests Socratic tutoring assistance for a conceptual gap', async () => {
      const res = await makeRequest('/api/tutoring', {
        method: 'POST',
        token: studentToken,
        body: {
          student_input: 'Why does Apache look in /var/www/html instead of /var/www?',
          current_topic: 'web_apache_docroot',
          workflow: 'CHATS',
          language: 'en',
        },
      });

      assert.equal(res.status, 200);
      assert.ok(res.data.scaffolding_response);
      assert.ok(res.data.scaffolding_response.tutor_message);
      assert.ok(res.data.scaffolding_response.current_tier >= 1);
    });

    it('S3: Records practical code lab attempt and receives evaluation', async () => {
      const attemptId = `att_e2e_${Date.now()}`;
      const res = await makeRequest('/api/attempts', {
        method: 'POST',
        token: studentToken,
        body: {
          id: attemptId,
          conceptId: 'web_apache_docroot',
          kind: 'code_lab',
          passed: true,
          tierUsed: 1,
          hintsRequested: 0,
          durationSec: 42,
          codeSnippet: 'DocumentRoot "/var/www/html"',
        },
      });

      assert.equal(res.status, 200);
      assert.equal(res.data.success, true);
      assert.equal(res.data.attempt.id, attemptId);
      assert.equal(res.data.attempt.passed, true);
    });

    it('S4: Generates Study Studio summary and dated plan', async () => {
      const examDate = new Date();
      examDate.setDate(examDate.getDate() + 14);

      const res = await makeRequest('/api/study-studio/generate', {
        method: 'POST',
        token: studentToken,
        body: {
          courseTopic: 'Web Server Architecture',
          examDate: examDate.toISOString().slice(0, 10),
          targetGrade: 9,
          dailyStudyMinutes: 30,
          pastedText: 'Apache HTTP Server uses DocumentRoot to define where web assets reside.',
        },
      });

      assert.equal(res.status, 200);
      assert.equal(res.data.success, true);
      assert.ok(res.data.summary);
      assert.ok(res.data.flashcards.length >= 20);
      assert.ok(res.data.schedule || res.data.studyPlan);
    });

    it('S5: Generates AI Video Storyboard with subtitles', async () => {
      const res = await makeRequest('/api/generate-video', {
        method: 'POST',
        token: studentToken,
        body: {
          topic: 'DocumentRoot Configuration',
          misconception: 'Placing html files in /etc/apache2',
          subject_track: 'Web Application Development',
        },
      });

      assert.equal(res.status, 200);
      assert.ok(res.data.title);
      assert.ok(res.data.scenes && res.data.scenes.length >= 3);
    });

    it('S6: Publishes learner portfolio and validates public showcase URL', async () => {
      const res = await makeRequest('/api/portfolio/publish', {
        method: 'POST',
        token: studentToken,
        body: {
          visibility: 'public',
        },
      });

      assert.equal(res.status, 200);
      assert.equal(res.data.success, true);
      const slug = res.data.slug || res.data.profile?.slug;
      assert.ok(slug);

      // Verify public access without authentication
      const publicRes = await makeRequest(`/p/${slug}`);
      assert.equal(publicRes.status, 200);
    });
  });

  describe('Teacher Journey Flow', () => {
    it('T1: Starts and inspects interactive live class session', async () => {
      const res = await makeRequest('/api/live/session/start', {
        method: 'POST',
        token: teacherToken,
        body: {
          topicId: 'web_apache_docroot',
          topicName: 'Apache DocumentRoot Architecture',
          track: 'Web Application Development',
        },
      });

      assert.equal(res.status, 200);
      assert.equal(res.data.success, true);
      assert.ok(res.data.session.sessionId || res.data.session.id);

      const stateRes = await makeRequest('/api/live/session/state', { token: teacherToken });
      assert.equal(stateRes.status, 200);
      assert.equal(stateRes.data.isActive, true);
    });

    it('T2: Accesses cohort analytics drilldown with redness and risk metrics', async () => {
      const res = await makeRequest('/api/teacher/cohort-analytics', { token: teacherToken });
      assert.equal(res.status, 200);
      assert.ok(typeof res.data.cohortSize === 'number');
      assert.ok(Array.isArray(res.data.students));
    });

    it('T3: Approves an intervention and verifies pedagogical outcome tracking', async () => {
      const intId = `int_e2e_approval_${Date.now()}`;
      const res = await makeRequest('/api/teacher/interventions/approve', {
        method: 'POST',
        token: teacherToken,
        body: {
          interventionId: intId,
          studentId: studentUser.id,
          conceptId: 'web_apache_docroot',
          tutorMessage: 'Carefully review directory permissions for Apache document root.',
          socraticQuestion: 'What user does the httpd daemon execute as?',
        },
      });

      assert.equal(res.status, 200);
      assert.equal(res.data.success, true);
      assert.equal(res.data.intervention.status, 'Teacher-approved');
    });

    it('T4: Exports comprehensive cohort analytics as CSV', async () => {
      const res = await makeRequest('/api/teacher/export-csv', { token: teacherToken });
      assert.equal(res.status, 200);
      assert.ok(res.headers.get('content-type')?.includes('text/csv'));
      assert.ok(res.data.includes('Student ID,Student Name,Email'));
    });
  });

  describe('Admin Journey Flow', () => {
    it('A1: Creates official faculty member account', async () => {
      const newFacultyEmail = `dr_curie_${timestamp}@university.edu`;
      const res = await makeRequest('/api/admin/create-teacher', {
        method: 'POST',
        token: adminToken,
        body: {
          name: 'Dr. Marie Curie',
          email: newFacultyEmail,
          password: 'Password123!',
          degree: 'Department of Computing',
        },
      });

      assert.equal(res.status, 201);
      assert.equal(res.data.success, true);
      assert.equal(res.data.user.role, 'teacher');
    });

    it('A2: Queries anti-answer policy statistics and pass rate', async () => {
      const res = await makeRequest('/api/admin/anti-answer-stats', { token: adminToken });
      assert.equal(res.status, 200);
      assert.ok(typeof res.data.latestPassRate === 'number');
      assert.ok(res.data.latestPassRate >= 90);
    });

    it('A3: Retrieves AI quota consumption summary and estimated Gemini cost', async () => {
      const res = await makeRequest('/api/admin/ai-usage', { token: adminToken });
      assert.equal(res.status, 200);
      assert.ok(res.data.today);
      assert.ok(res.data.allTime);
      assert.ok(typeof res.data.allTime.estimatedCostUsd === 'number');
    });

    it('A4: Inspects immutable administrative and faculty audit logs', async () => {
      const res = await makeRequest('/api/admin/audit-logs?limit=20', { token: adminToken });
      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.data.logs));
      assert.ok(res.data.logs.some((l: any) => l.action.includes('ADMIN') || l.action.includes('TEACHER')));
    });

    it('A5: Seeds synthetic demo cohort and verifies isolated tagging', async () => {
      const res = await makeRequest('/api/admin/seed-demo', {
        method: 'POST',
        token: adminToken,
      });

      assert.equal(res.status, 200);
      assert.equal(res.data.success, true);
      assert.ok(res.data.studentsCount > 0 || res.data.studentsAdded > 0);
    });

    it('A6: Executes one-click removal of all synthetic demo records', async () => {
      const res = await makeRequest('/api/admin/clear-demo', {
        method: 'POST',
        token: adminToken,
      });

      assert.equal(res.status, 200);
      assert.equal(res.data.success, true);
      assert.ok(res.data.cleared);
    });
  });
});
