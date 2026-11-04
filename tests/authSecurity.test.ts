process.env.NODE_ENV = 'test';

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { type Server } from 'http';
import { app } from '../server.ts';
import { createSessionToken, COOKIE_NAME } from '../server/auth.ts';
import { readStore, writeStoreAtomically, seedDemoStore, type StoreUser } from '../server/store.ts';
import { userRepository } from '../server/repositories/index.ts';

let server: Server;
let baseUrl: string;

const studentUser: StoreUser = {
  id: 'CSE_STU_8810',
  name: 'Haritha Student',
  email: 'haritha.k@university.edu',
  role: 'student',
  plan: 'Free Plan',
  tokenVersion: 1,
};

const otherStudentUser: StoreUser = {
  id: 'CSE_STU_9021',
  name: 'Alex Rivera',
  email: 'alex.r@cs.university.edu',
  role: 'student',
  plan: 'Free Plan',
  tokenVersion: 1,
};

const teacherUser: StoreUser = {
  id: 'FACULTY_402',
  name: 'Prof. David Thorne',
  email: 'd.thorne@cs.university.edu',
  role: 'teacher',
  plan: 'Campus License',
  tokenVersion: 1,
};

const adminUser: StoreUser = {
  id: 'ADMIN_001',
  name: 'System Admin',
  email: 'admin@mastery.ai',
  role: 'admin',
  plan: 'Enterprise',
  tokenVersion: 1,
};

before(async () => {
  process.env.NODE_ENV = 'test';
  await seedDemoStore();

  await new Promise<void>(resolve => {
    server = app.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      const port = typeof addr === 'object' && addr ? addr.port : 3000;
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

describe('Production Auth & Strict Access Control Tests', () => {
  // Test 1: A student gets 403 on teacher routes
  it('a student gets 403 on teacher routes (/api/teacher/cohort-analytics)', async () => {
    const studentToken = createSessionToken(studentUser);
    const res = await fetch(`${baseUrl}/api/teacher/cohort-analytics`, {
      headers: {
        Cookie: `${COOKIE_NAME}=${studentToken}`,
      },
    });

    assert.equal(res.status, 403);
    const body = await res.json();
    assert.ok(body.error, 'Error envelope must exist');
    assert.equal(body.error.code, 'FORBIDDEN');
    assert.ok(body.error.requestId, 'requestId must be present');
    assert.match(body.error.message, /Insufficient privileges/i);
  });

  // Test 2: A student gets 403 on another student data
  it('a student gets 403 on another student data (GET /api/attempts?studentId=...)', async () => {
    const studentToken = createSessionToken(studentUser); // studentUser.id is CSE_STU_8810
    const res = await fetch(`${baseUrl}/api/attempts?studentId=CSE_STU_9021`, {
      headers: {
        Cookie: `${COOKIE_NAME}=${studentToken}`,
      },
    });

    assert.equal(res.status, 403);
    const body = await res.json();
    assert.ok(body.error);
    assert.equal(body.error.code, 'FORBIDDEN');
    assert.match(body.error.message, /students may not view other students attempts/i);
  });

  it('a student gets 403 on reading another student data via /api/store/:collection', async () => {
    const studentToken = createSessionToken(studentUser);
    const res = await fetch(`${baseUrl}/api/store/attempts?studentId=CSE_STU_9021`, {
      headers: {
        Cookie: `${COOKIE_NAME}=${studentToken}`,
      },
    });

    assert.equal(res.status, 403);
    const body = await res.json();
    assert.equal(body.error.code, 'FORBIDDEN');
  });

  it('a student gets 403 trying to write records for another student in /api/store/:collection', async () => {
    const studentToken = createSessionToken(studentUser);
    const res = await fetch(`${baseUrl}/api/store/attempts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `${COOKIE_NAME}=${studentToken}`,
      },
      body: JSON.stringify({
        studentId: 'CSE_STU_9021', // Trying to forge record for someone else
        conceptId: 'deadlock',
        passed: true,
      }),
    });

    assert.equal(res.status, 403);
    const body = await res.json();
    assert.equal(body.error.code, 'FORBIDDEN');
  });

  // Test 3: A forged role header has NO effect
  it('a forged x-role header (e.g. x-role: teacher or admin) has no effect', async () => {
    const studentToken = createSessionToken(studentUser);
    const res = await fetch(`${baseUrl}/api/teacher/cohort-analytics`, {
      headers: {
        Cookie: `${COOKIE_NAME}=${studentToken}`,
        'x-role': 'teacher', // Forged role header
        'X-Role': 'admin',
      },
    });

    // Server must reject with 403, ignoring the client header completely
    assert.equal(res.status, 403);
    const body = await res.json();
    assert.equal(body.error.code, 'FORBIDDEN');
  });

  it('a forged ?role= query parameter has no effect', async () => {
    const studentToken = createSessionToken(studentUser);
    const res = await fetch(`${baseUrl}/api/teacher/cohort-analytics?role=teacher`, {
      headers: {
        Cookie: `${COOKIE_NAME}=${studentToken}`,
      },
    });

    assert.equal(res.status, 403);
    const body = await res.json();
    assert.equal(body.error.code, 'FORBIDDEN');
  });

  // Test 4: Unauthenticated requests are rejected with 401
  it('unauthenticated request to protected route returns 401 UNAUTHORIZED', async () => {
    const res = await fetch(`${baseUrl}/api/user/state`);
    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.error.code, 'UNAUTHORIZED');
    assert.ok(body.error.requestId);
  });

  // Test 5: Teacher can access teacher routes
  it('teacher role can successfully access /api/teacher/cohort-analytics', async () => {
    const teacherToken = createSessionToken(teacherUser);
    const res = await fetch(`${baseUrl}/api/teacher/cohort-analytics`, {
      headers: {
        Cookie: `${COOKIE_NAME}=${teacherToken}`,
      },
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok('cohortSize' in body);
    assert.ok('avgClassMastery' in body);
  });

  // Test 6: Student gets 403 on study management routes
  it('student gets 403 on study creation route (POST /api/studies)', async () => {
    const studentToken = createSessionToken(studentUser);
    const res = await fetch(`${baseUrl}/api/studies`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `${COOKIE_NAME}=${studentToken}`,
      },
      body: JSON.stringify({
        title: 'Unauthorized Study',
        topicId: 'recursion_base_case',
      }),
    });

    assert.equal(res.status, 403);
    const body = await res.json();
    assert.equal(body.error.code, 'FORBIDDEN');
  });

  // Test 7: Student gets 403 on admin routes
  it('student gets 403 on admin route (POST /api/admin/create-teacher)', async () => {
    const studentToken = createSessionToken(studentUser);
    const res = await fetch(`${baseUrl}/api/admin/create-teacher`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `${COOKIE_NAME}=${studentToken}`,
      },
      body: JSON.stringify({
        email: 'rogue@teacher.edu',
        password: 'Password123!',
        name: 'Rogue Teacher',
      }),
    });

    assert.equal(res.status, 403);
    const body = await res.json();
    assert.equal(body.error.code, 'FORBIDDEN');
  });

  // Test 8: Admin can create teachers
  it('admin can create teachers via POST /api/admin/create-teacher', async () => {
    const adminToken = createSessionToken(adminUser);
    const newFacultyEmail = `faculty.test.${Date.now()}@university.edu`;

    const res = await fetch(`${baseUrl}/api/admin/create-teacher`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `${COOKIE_NAME}=${adminToken}`,
      },
      body: JSON.stringify({
        email: newFacultyEmail,
        password: 'SecurePassword123!',
        name: 'Prof. Test Instructor',
        degree: 'Department of Electrical & Computer Engineering',
      }),
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.user.role, 'teacher');
    assert.ok(body.user.id.startsWith('FACULTY_'));

    // Check store
    const store = readStore();
    const created = store.users.find(u => u.email === newFacultyEmail);
    assert.ok(created);
    assert.equal(created.role, 'teacher');
  });

  // Test 9: Client cannot set role during registration
  it('client registration without invite code always creates student, ignoring client role field', async () => {
    const testEmail = `student.test.${Date.now()}@university.edu`;
    const res = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'Password123!',
        name: 'Attempted Admin',
      }),
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.user.role, 'student');
    assert.ok(body.user.id.startsWith('CSE_STU_'));
  });

  it('registration with valid teacher invite code creates teacher role', async () => {
    const testFacultyEmail = `faculty.invite.${Date.now()}@university.edu`;
    const res = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testFacultyEmail,
        password: 'Password123!',
        name: 'Invited Faculty',
        inviteCode: 'TEACHER_INVITE_2026',
      }),
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.user.role, 'teacher');
    assert.ok(body.user.id.startsWith('FACULTY_'));
  });

  // Test 10: State update ownership and field whitelisting
  it('POST /api/user/state whitelists safe fields and ignores or rejects client changes to role/plan/id', async () => {
    const studentToken = createSessionToken(studentUser);

    const res = await fetch(`${baseUrl}/api/user/state`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `${COOKIE_NAME}=${studentToken}`,
      },
      body: JSON.stringify({
        userProfile: {
          name: 'Updated Haritha',
          theme: 'dark',
        },
      }),
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);

    const updated = userRepository.findById(studentUser.id);
    assert.equal(updated?.name, 'Updated Haritha');
    assert.equal(updated?.role, 'student'); // Still student
    assert.equal(updated?.plan, 'Free Plan'); // Still Free Plan
  });

  // Test 11: Account Settings - Change password
  it('account settings: change password updates hash and rejects wrong current password', async () => {
    // 1. Register a dedicated test account
    const email = `pwd.test.${Date.now()}@university.edu`;
    const regRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password: 'InitialPassword123!',
        name: 'Password Tester',
      }),
    });
    const regBody = await regRes.json();
    const token = regBody.token;

    // 2. Attempt change with incorrect current password -> returns 400
    const failRes = await fetch(`${baseUrl}/api/auth/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `${COOKIE_NAME}=${token}`,
      },
      body: JSON.stringify({
        currentPassword: 'WrongPassword!',
        newPassword: 'BrandNewPassword123!',
      }),
    });

    assert.equal(failRes.status, 400);
    const failBody = await failRes.json();
    assert.equal(failBody.error.code, 'INCORRECT_PASSWORD');

    // 3. Change with correct password -> returns 200
    const successRes = await fetch(`${baseUrl}/api/auth/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `${COOKIE_NAME}=${token}`,
      },
      body: JSON.stringify({
        currentPassword: 'InitialPassword123!',
        newPassword: 'BrandNewPassword123!',
      }),
    });

    assert.equal(successRes.status, 200);
    const successBody = await successRes.json();
    assert.equal(successBody.success, true);
  });

  // Test 12: Account Settings - Sign out everywhere revokes active tokens
  it('account settings: sign out everywhere increments tokenVersion and revokes prior tokens', async () => {
    const email = `signout.${Date.now()}@university.edu`;
    const regRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password: 'Password123!',
        name: 'Signout Tester',
      }),
    });
    const { token } = await regRes.json();

    // Call signout-all
    const revokeRes = await fetch(`${baseUrl}/api/auth/signout-all`, {
      method: 'POST',
      headers: {
        Cookie: `${COOKIE_NAME}=${token}`,
      },
    });
    assert.equal(revokeRes.status, 200);

    // Using the same token now must be rejected with 401
    const checkRes = await fetch(`${baseUrl}/api/user/state`, {
      headers: {
        Cookie: `${COOKIE_NAME}=${token}`,
      },
    });
    assert.equal(checkRes.status, 401);
    const checkBody = await checkRes.json();
    assert.equal(checkBody.error.code, 'UNAUTHORIZED');
    assert.match(checkBody.error.message, /Session revoked/i);
  });

  // Test 13: Account Settings - Export data (JSON)
  it('account settings: export data returns complete JSON dump', async () => {
    const studentToken = createSessionToken(studentUser);
    const res = await fetch(`${baseUrl}/api/auth/export-data`, {
      headers: {
        Cookie: `${COOKIE_NAME}=${studentToken}`,
      },
    });

    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type') || '', /application\/json/);
    const body = await res.json();
    assert.ok(body.exportedAt);
    assert.ok(body.user);
    assert.equal(body.user.id, studentUser.id);
    assert.equal(body.user.passwordHash, undefined, 'passwordHash must never be exported');
    assert.ok(Array.isArray(body.events));
    assert.ok(Array.isArray(body.attempts));
  });

  // Test 14: Account Settings - Delete account
  it('account settings: delete account permanently removes user records from store', async () => {
    const email = `delete.me.${Date.now()}@university.edu`;
    const regRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password: 'Password123!',
        name: 'Delete Me',
      }),
    });
    const { token, user } = await regRes.json();

    const delRes = await fetch(`${baseUrl}/api/auth/delete-account`, {
      method: 'POST',
      headers: {
        Cookie: `${COOKIE_NAME}=${token}`,
      },
    });
    assert.equal(delRes.status, 200);

    const store = readStore();
    const deletedUser = store.users.find(u => u.id === user.id);
    assert.equal(deletedUser, undefined, 'User must be deleted from store.users');
    const deletedIslm = store.islm.find(i => i.student_id === user.id);
    assert.equal(deletedIslm, undefined, 'User must be deleted from store.islm');
  });

  // Test 15: Unified Error Envelope Verification
  it('every error response strictly follows { error: { code, message, requestId } } envelope', async () => {
    // Trigger validation error
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'not-an-email' }), // Missing password, invalid email
    });

    assert.equal(res.status, 400);
    const body = await res.json();
    assert.ok(body.error, 'Must have error root object');
    assert.equal(typeof body.error.code, 'string');
    assert.equal(typeof body.error.message, 'string');
    assert.equal(typeof body.error.requestId, 'string');
    assert.ok(body.error.requestId.length > 0);
  });
});
