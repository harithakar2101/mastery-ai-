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
import {
  userRepository,
  islmRepository,
  dkmStateRepository,
  eventRepository,
  attemptRepository,
  interventionRepository,
  sessionRepository,
  flashcardRepository,
  studyPlanRepository,
  portfolioRepository,
  auditLogRepository,
  type StoreUser,
  type UserRole,
} from './repositories/index.ts';

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

    const existing = userRepository.findByEmail(normEmail);
    if (existing) {
      return sendError(res, 409, 'EMAIL_EXISTS', 'An account with this email address already exists.', req);
    }

    // Role is assigned strictly on the server:
    // Only a valid teacher invite code grants the 'teacher' role; otherwise always 'student'
    const role: UserRole = inviteCode && inviteCode.trim() === TEACHER_INVITE_CODE ? 'teacher' : 'student';

    const suffix = `${Date.now().toString().slice(-4)}${Math.floor(10 + Math.random() * 90)}`;
    const userId = role === 'teacher'
      ? `FACULTY_${suffix}`
      : `CSE_STU_${suffix}`;

    const passwordHash = await hashPassword(password);
    const now = new Date().toISOString();

    const newUser = userRepository.create({
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
    });

    const newIslm = islmRepository.upsert({
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
      scaffolding_fading_index: 0.20,
      time_spent_mins: 0,
      history: [],
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

    const user = userRepository.findByEmail(normEmail);

    if (!user || !user.passwordHash) {
      return sendError(res, 401, 'INVALID_CREDENTIALS', 'Invalid email or password.', req);
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return sendError(res, 401, 'INVALID_CREDENTIALS', 'Invalid email or password.', req);
    }

    const islm = islmRepository.findByStudentId(user.id);
    const sessionsResult = sessionRepository.findByStudentPaginated(user.id, { limit: 20 });
    const dkmNodes = dkmStateRepository.findByStudentId(user.id);

    const token = createSessionToken(user);
    setSessionCookie(res, token);

    return res.json({
      success: true,
      user: sanitizeUser(user),
      islm: islm || null,
      sessions: sessionsResult.items,
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

// Demo Mode: Sandboxed Demo Account Login
authRouter.post('/demo-login', async (req: Request, res: Response) => {
  try {
    const demoEmail = 'demo.student@cognicse.edu';
    let user = userRepository.findByEmail(demoEmail);

    if (!user) {
      const now = new Date().toISOString();
      const passwordHash = await hashPassword('DemoPass123!');
      user = userRepository.create({
        id: 'DEMO_STUDENT_001',
        name: 'Alex Chen (Demo Student)',
        email: demoEmail,
        role: 'student',
        plan: 'Free Plan',
        degree: 'B.Tech in Computer Science & Engineering',
        preferredLanguages: ['python', 'javascript'],
        streakDays: 7,
        testsCompleted: 12,
        overallMastery: 0.88,
        theme: 'dark',
        passwordHash,
        tokenVersion: 1,
        createdAt: now,
        updatedAt: now,
        synthetic: true,
      });

      islmRepository.upsert({
        student_id: user.id,
        name: user.name,
        email: user.email,
        role: 'student',
        course_track: 'Data Structures & Algorithms',
        overall_mastery: 0.88,
        topic_mastery: {
          'bkt-recursion': 0.92,
          'cad-csg-booleans': 0.86,
          'web-dom-state': 0.85,
          'ai-bkt-inference': 0.89,
        },
        recent_misconceptions: [],
        scaffolding_tier_required: 1,
        error_count: 2,
        independent_solves: 8,
        scaffolding_fading_index: 0.75,
        time_spent_mins: 180,
        history: [],
      });
    }

    const token = createSessionToken(user);
    setSessionCookie(res, token);

    const islm = islmRepository.findByStudentId(user.id);
    const sessionsResult = sessionRepository.findByStudentPaginated(user.id, { limit: 20 });
    const dkmNodes = dkmStateRepository.findByStudentId(user.id);

    return res.json({
      success: true,
      user: sanitizeUser(user),
      islm: islm || null,
      sessions: sessionsResult.items,
      dkmNodes,
      token,
      isDemo: true,
    });
  } catch (err: any) {
    return sendError(res, 500, 'DEMO_LOGIN_FAILED', err?.message || 'Failed to initialize demo session', req);
  }
});

// 4. Token Refresh / Rotation
authRouter.post('/refresh', authenticate, (req: Request, res: Response) => {
  try {
    const user = userRepository.findById(req.user!.id);
    if (!user) {
      return sendError(res, 404, 'NOT_FOUND', 'User not found', req);
    }

    const token = createSessionToken(user);
    setSessionCookie(res, token);
    return res.json({
      success: true,
      token,
      user: sanitizeUser(user),
    });
  } catch (err: any) {
    return sendError(res, 500, 'REFRESH_FAILED', err?.message || 'Token refresh failed', req);
  }
});

// 5. Sign Out Everywhere (Token Rotation & Revocation)
authRouter.post('/signout-all', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    userRepository.incrementTokenVersion(userId);
    clearSessionCookie(res);
    return res.json({
      success: true,
      message: 'All active sessions on all devices have been revoked. Please sign in again.',
    });
  } catch (err: any) {
    return sendError(res, 500, 'REVOCATION_FAILED', err?.message || 'Failed to revoke sessions', req);
  }
});

// 6. Get Current Authenticated Profile
authRouter.get('/me', authenticate, (req: Request, res: Response) => {
  const user = userRepository.findById(req.user!.id);
  if (!user) {
    return sendError(res, 404, 'NOT_FOUND', 'User profile not found', req);
  }

  const islm = islmRepository.findByStudentId(req.user!.id);
  const sessions = sessionRepository.findByStudentPaginated(req.user!.id, { limit: 20 });
  const dkmNodes = dkmStateRepository.findByStudentId(req.user!.id);

  return res.json({
    user: sanitizeUser(user),
    islm: islm || null,
    sessions: sessions.items,
    dkmNodes,
  });
});

// 7. Change Password
authRouter.post('/change-password', authenticate, validateBody(changePasswordSchema), async (req: Request, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user!.id;

    const user = userRepository.findById(userId);

    if (!user || !user.passwordHash) {
      return sendError(res, 404, 'NOT_FOUND', 'User not found', req);
    }

    const isValid = await verifyPassword(currentPassword, user.passwordHash);
    if (!isValid) {
      return sendError(res, 400, 'INCORRECT_PASSWORD', 'Current password entered is incorrect.', req);
    }

    const newHash = await hashPassword(newPassword);

    userRepository.update(userId, { passwordHash: newHash });
    const newTokenVersion = userRepository.incrementTokenVersion(userId);

    // Re-issue cookie with updated tokenVersion
    const updatedUser = { ...user, tokenVersion: newTokenVersion };
    const token = createSessionToken(updatedUser);
    setSessionCookie(res, token);

    return res.json({ success: true, message: 'Password changed successfully.' });
  } catch (err: any) {
    return sendError(res, 500, 'PASSWORD_CHANGE_FAILED', err?.message || 'Failed to change password', req);
  }
});

// 8. Delete My Account & All Associated Data
authRouter.post('/delete-account', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    userRepository.delete(userId);
    islmRepository.deleteByStudentId(userId);
    dkmStateRepository.deleteByStudentId(userId);
    eventRepository.deleteByStudentId(userId);
    attemptRepository.deleteByStudentId(userId);
    interventionRepository.deleteByStudentId(userId);
    sessionRepository.deleteByStudentId(userId);
    flashcardRepository.deleteByStudentId(userId);
    studyPlanRepository.deleteByStudentId(userId);
    portfolioRepository.deleteByStudentId(userId);

    auditLogRepository.log({
      userId,
      userRole: req.user!.role,
      action: 'USER_DELETE_ACCOUNT',
      resourceType: 'user',
      resourceId: userId,
      ipAddress: req.ip,
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

// 9. Export My Personal Data (JSON dump)
authRouter.get('/export-data', authenticate, (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    const user = userRepository.findById(userId);
    const islm = islmRepository.findByStudentId(userId);
    const events = eventRepository.listByStudentPaginated(userId, { limit: 1000 }).items;
    const attempts = attemptRepository.listByStudentPaginated(userId, { limit: 1000 }).items;
    const sessions = sessionRepository.findByStudentPaginated(userId, { limit: 100 }).items;
    const interventions = interventionRepository.listByStudentPaginated(userId, { limit: 100 }).items;
    const dkm = dkmStateRepository.findByStudentId(userId);
    const flashcards = flashcardRepository.findByStudentPaginated(userId, { limit: 100 }).items;
    const studyPlans = studyPlanRepository.findByStudentPaginated(userId, { limit: 50 }).items;
    const portfolio = portfolioRepository.findByStudentPaginated(userId, { limit: 50 }).items;

    const exportPayload = {
      exportedAt: new Date().toISOString(),
      user: user ? sanitizeUser(user) : null,
      islm: islm || null,
      dkmNodes: dkm,
      events,
      attempts,
      sessions,
      interventions,
      flashcards,
      studyPlans,
      portfolio,
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="cognicse_user_${userId}_export.json"`);
    return res.json(exportPayload);
  } catch (err: any) {
    return sendError(res, 500, 'EXPORT_FAILED', err?.message || 'Failed to export data', req);
  }
});

// 10. Update Data Retention Preferences
authRouter.post('/retention', authenticate, (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const retentionDays = Number(req.body.retentionDays);

    if (isNaN(retentionDays) || retentionDays < 1 || retentionDays > 3650) {
      return sendError(res, 400, 'INVALID_RETENTION_DAYS', 'Retention days must be an integer between 1 and 3650.', req);
    }

    userRepository.update(userId, { retentionDays });

    auditLogRepository.log({
      userId,
      userRole: req.user!.role,
      action: 'USER_UPDATE_RETENTION_PREFERENCE',
      details: { retentionDays },
      ipAddress: req.ip,
    });

    return res.json({
      success: true,
      message: `Data retention period successfully updated to ${retentionDays} days.`,
      retentionDays,
    });
  } catch (err: any) {
    return sendError(res, 500, 'RETENTION_UPDATE_FAILED', err?.message || 'Failed to update retention preferences', req);
  }
});
