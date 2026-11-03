import { Router, type Request, type Response } from 'express';
import {
  hashPassword,
  verifyPassword,
  createSessionToken,
  setSessionCookie,
  clearSessionCookie,
  sendError,
  TEACHER_INVITE_CODE,
} from './auth.ts';
import { authenticate } from './authMiddleware.ts';
import { validateBody, registerSchema, loginSchema, changePasswordSchema } from './validation.ts';
import { readStore, writeStoreAtomically, getDemoStore, type StoreUser, type UserRole } from './store.ts';

export const authRouter = Router();

function sanitizeUser(user: StoreUser) {
  const { passwordHash, ...safe } = user;
  return safe;
}

// 1. User Registration (Server strictly enforces role; never client-set)
authRouter.post('/register', validateBody(registerSchema), async (req: Request, res: Response) => {
  try {
    const { email, password, name, degree, inviteCode } = req.body;
    const normEmail = email.toLowerCase().trim();

    const store = readStore();
    const existing = store.users.find(u => u.email.toLowerCase() === normEmail);
    if (existing) {
      return sendError(res, 409, 'EMAIL_EXISTS', 'An account with this email address already exists.', req);
    }

    // Role is assigned strictly on the server:
    // Only a valid teacher invite code grants the 'teacher' role; otherwise always 'student'
    const role: UserRole = inviteCode && inviteCode.trim() === TEACHER_INVITE_CODE ? 'teacher' : 'student';

    const userId = role === 'teacher'
      ? `FACULTY_${Math.floor(100 + Math.random() * 900)}`
      : `CSE_STU_${Math.floor(1000 + Math.random() * 9000)}`;

    const passwordHash = await hashPassword(password);
    const now = new Date().toISOString();

    const newUser: StoreUser = {
      id: userId,
      name,
      email: normEmail,
      role,
      plan: role === 'teacher' ? 'Campus License' : 'Free Plan',
      degree: degree || (role === 'teacher' ? 'Department of Computer Science & Engineering' : 'B.Tech in Computer Science & Engineering'),
      preferredLanguages: ['python', 'javascript'],
      streakDays: 1,
      testsCompleted: 0,
      overallMastery: 0.50,
      theme: 'dark',
      passwordHash,
      tokenVersion: 1,
      createdAt: now,
      updatedAt: now,
    };

    const newIslm = {
      student_id: userId,
      name,
      email: normEmail,
      role,
      course_track: 'Data Structures & Algorithms',
      overall_mastery: 0.50,
      topic_mastery: {},
      recent_misconceptions: [],
      scaffolding_tier_required: 1,
      error_count: 0,
      independent_solves: 0,
      scaffolding_fading_index: 0.2,
      time_spent_mins: 0,
      history: [],
    };

    await writeStoreAtomically(s => {
      s.users.push(newUser);
      s.islm.push(newIslm);
    });

    const token = createSessionToken(newUser);
    setSessionCookie(res, token);

    return res.status(201).json({
      success: true,
      user: sanitizeUser(newUser),
      islm: newIslm,
      sessions: [],
      dkmNodes: null,
      token,
    });
  } catch (err: any) {
    return sendError(res, 500, 'REGISTRATION_FAILED', err?.message || 'Failed to register account', req);
  }
});

// 2. User Login
authRouter.post('/login', validateBody(loginSchema), async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const normEmail = email.toLowerCase().trim();

    const store = readStore();
    let user = store.users.find(u => u.email.toLowerCase() === normEmail);

    // If not found in current store, check demo accounts template
    if (!user) {
      const demoUser = getDemoStore().users.find(u => u.email.toLowerCase() === normEmail);
      if (demoUser) {
        await writeStoreAtomically(s => {
          s.users.push(demoUser);
          const demoIslm = getDemoStore().islm.find(i => i.student_id === demoUser.id);
          if (demoIslm && !s.islm.some(i => i.student_id === demoUser.id)) {
            s.islm.push(demoIslm);
          }
        });
        user = demoUser;
      }
    }

    if (!user || !user.passwordHash) {
      return sendError(res, 401, 'INVALID_CREDENTIALS', 'Invalid email or password.', req);
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return sendError(res, 401, 'INVALID_CREDENTIALS', 'Invalid email or password.', req);
    }

    const updatedStore = readStore();
    const islm = updatedStore.islm.find(i => i.student_id === user!.id);
    const sessions = (updatedStore.sessions || []).filter(s => s.studentId === user!.id);
    const dkmNodes = updatedStore.dkmStates?.[user!.id] || null;

    const token = createSessionToken(user);
    setSessionCookie(res, token);

    return res.json({
      success: true,
      user: sanitizeUser(user),
      islm: islm || null,
      sessions,
      dkmNodes,
      token,
    });
  } catch (err: any) {
    return sendError(res, 500, 'LOGIN_FAILED', err?.message || 'Login failed', req);
  }
});

// 3. User Logout
authRouter.post('/logout', (_req: Request, res: Response) => {
  clearSessionCookie(res);
  return res.json({ success: true, message: 'Logged out successfully.' });
});

// 4. Sign Out Everywhere (Token Rotation & Revocation)
authRouter.post('/signout-all', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    await writeStoreAtomically(store => {
      const u = store.users.find(x => x.id === userId);
      if (u) {
        u.tokenVersion = (u.tokenVersion || 1) + 1;
      }
    });

    clearSessionCookie(res);
    return res.json({
      success: true,
      message: 'All active sessions on all devices have been revoked. Please sign in again.',
    });
  } catch (err: any) {
    return sendError(res, 500, 'REVOCATION_FAILED', err?.message || 'Failed to revoke sessions', req);
  }
});

// 5. Get Current Authenticated Profile
authRouter.get('/me', authenticate, (req: Request, res: Response) => {
  const store = readStore();
  const user = store.users.find(u => u.id === req.user!.id);
  if (!user) {
    return sendError(res, 404, 'NOT_FOUND', 'User profile not found', req);
  }

  const islm = store.islm.find(i => i.student_id === req.user!.id);
  const sessions = (store.sessions || []).filter(s => s.studentId === req.user!.id);
  const dkmNodes = store.dkmStates?.[req.user!.id] || null;

  return res.json({
    user: sanitizeUser(user),
    islm: islm || null,
    sessions,
    dkmNodes,
  });
});

// 6. Change Password
authRouter.post('/change-password', authenticate, validateBody(changePasswordSchema), async (req: Request, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user!.id;

    const store = readStore();
    const user = store.users.find(u => u.id === userId);

    if (!user || !user.passwordHash) {
      return sendError(res, 404, 'NOT_FOUND', 'User not found', req);
    }

    const isValid = await verifyPassword(currentPassword, user.passwordHash);
    if (!isValid) {
      return sendError(res, 400, 'INCORRECT_PASSWORD', 'Current password entered is incorrect.', req);
    }

    const newHash = await hashPassword(newPassword);

    await writeStoreAtomically(s => {
      const u = s.users.find(x => x.id === userId);
      if (u) {
        u.passwordHash = newHash;
        u.tokenVersion = (u.tokenVersion || 1) + 1;
        u.updatedAt = new Date().toISOString();
      }
    });

    // Re-issue cookie with updated tokenVersion
    const updatedUser = { ...user, tokenVersion: (user.tokenVersion || 1) + 1 };
    const token = createSessionToken(updatedUser);
    setSessionCookie(res, token);

    return res.json({ success: true, message: 'Password changed successfully.' });
  } catch (err: any) {
    return sendError(res, 500, 'PASSWORD_CHANGE_FAILED', err?.message || 'Failed to change password', req);
  }
});

// 7. Delete My Account & All Associated Data
authRouter.post('/delete-account', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    await writeStoreAtomically(store => {
      store.users = store.users.filter(u => u.id !== userId);
      store.islm = store.islm.filter(i => i.student_id !== userId);
      store.events = (store.events || []).filter(e => e.studentId !== userId);
      store.attempts = (store.attempts || []).filter(a => a.studentId !== userId);
      store.sessions = (store.sessions || []).filter(s => s.studentId !== userId);
      store.interventions = (store.interventions || []).filter(i => i.studentId !== userId);
      if (store.dkmStates) {
        delete store.dkmStates[userId];
      }
    });

    clearSessionCookie(res);
    return res.json({
      success: true,
      message: 'Your account and all associated personal records have been permanently deleted.',
    });
  } catch (err: any) {
    return sendError(res, 500, 'DELETE_FAILED', err?.message || 'Failed to delete account', req);
  }
});

// 8. Export My Personal Data (JSON dump)
authRouter.get('/export-data', authenticate, (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const store = readStore();

    const user = store.users.find(u => u.id === userId);
    const islm = store.islm.find(i => i.student_id === userId);
    const events = (store.events || []).filter(e => e.studentId === userId);
    const attempts = (store.attempts || []).filter(a => a.studentId === userId);
    const sessions = (store.sessions || []).filter(s => s.studentId === userId);
    const interventions = (store.interventions || []).filter(i => i.studentId === userId);
    const dkm = store.dkmStates?.[userId] || null;

    const exportPayload = {
      exportedAt: new Date().toISOString(),
      user: user ? sanitizeUser(user) : null,
      islm: islm || null,
      dkmNodes: dkm,
      events,
      attempts,
      sessions,
      interventions,
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="cognicse_user_${userId}_export.json"`);
    return res.json(exportPayload);
  } catch (err: any) {
    return sendError(res, 500, 'EXPORT_FAILED', err?.message || 'Failed to export data', req);
  }
});
