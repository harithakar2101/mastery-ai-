import { type Express, type Request, type Response } from 'express';
import {
  addSSEClient,
  removeSSEClient,
  startLiveSession,
  endLiveSession,
  getLiveSessionState,
  setLiveTimeline,
  releaseLiveQuestion,
  submitLiveAnswer,
  updateStudentEngagement,
} from './liveSession.ts';
import { processLiveTranscriptRequest } from './gemini.ts';
import { authenticate, requireRole } from './authMiddleware.ts';
import { verifySessionToken, COOKIE_NAME, sendError } from './auth.ts';
import { readStore } from './store.ts';

export function registerLiveRoutes(app: Express) {
  // SSE Connection Stream: GET /api/live/stream
  app.get('/api/live/stream', (req: Request, res: Response) => {
    // Extract token from cookie, query param (for EventSource), or auth header
    const token =
      (req.cookies && req.cookies[COOKIE_NAME]) ||
      (req.query.token as string) ||
      (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')
        ? req.headers.authorization.substring(7)
        : null);

    if (!token) {
      return sendError(res, 401, 'UNAUTHORIZED', 'Authentication token required for live stream', req);
    }

    const verification = verifySessionToken(token);
    if (!verification.valid || !verification.payload) {
      return sendError(res, 401, 'UNAUTHORIZED', 'Invalid or expired session token', req);
    }

    const store = readStore();
    const user = store.users.find(u => u.id === verification.payload!.userId);
    if (!user) {
      return sendError(res, 401, 'UNAUTHORIZED', 'User not found', req);
    }

    // Role and studentId strictly from verified session
    const role = user.role;
    const studentId = user.id;
    const studentName = user.name;

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });

    if (typeof (res as any).flushHeaders === 'function') {
      (res as any).flushHeaders();
    }

    const clientId = `client_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    addSSEClient({
      id: clientId,
      role: role === 'admin' ? 'teacher' : role,
      studentId,
      studentName,
      res,
    });

    // 15-second heartbeat ping to keep connection alive
    const pingInterval = setInterval(() => {
      try {
        res.write(': ping\n\n');
      } catch {
        clearInterval(pingInterval);
      }
    }, 15000);

    req.on('close', () => {
      clearInterval(pingInterval);
      removeSSEClient(clientId);
    });
  });

  // POST /api/live/session/start (teacher/admin only)
  app.post('/api/live/session/start', authenticate, requireRole('teacher', 'admin'), (req: Request, res: Response) => {
    try {
      const { topicId, topicName, track } = req.body;
      const session = startLiveSession({
        topicId: topicId || 'web_apache_docroot',
        topicName: topicName || 'Apache DocumentRoot & File Hierarchy',
        track: track || 'Web Application Development',
        teacherId: req.user!.id,
      });
      return res.json({ success: true, session });
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to start live session', details: err?.message });
    }
  });

  // POST /api/live/session/end (teacher/admin only)
  app.post('/api/live/session/end', authenticate, requireRole('teacher', 'admin'), (_req: Request, res: Response) => {
    try {
      const result = endLiveSession();
      return res.json(result);
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to end live session', details: err?.message });
    }
  });

  // GET /api/live/session/state (authenticated)
  app.get('/api/live/session/state', authenticate, (_req: Request, res: Response) => {
    try {
      const state = getLiveSessionState();
      return res.json(state);
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to get live session state', details: err?.message });
    }
  });

  // POST /api/live/transcript (teacher/admin only)
  app.post('/api/live/transcript', authenticate, requireRole('teacher', 'admin'), async (req: Request, res: Response) => {
    try {
      const { transcript, track, topicId } = req.body;
      if (!transcript) {
        return res.status(400).json({ error: 'transcript is required' });
      }

      const result = await processLiveTranscriptRequest(transcript, track, topicId);
      if (result.timeline && Array.isArray(result.timeline)) {
        setLiveTimeline(result.timeline);
      }

      return res.json({
        success: true,
        timeline: result.timeline || [],
        source: result.source,
        fallback_reason: result.fallback_reason,
      });
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to process transcript', details: err?.message });
    }
  });

  // POST /api/live/release-question (teacher/admin only)
  app.post('/api/live/release-question', authenticate, requireRole('teacher', 'admin'), (req: Request, res: Response) => {
    try {
      const { questionId } = req.body;
      if (!questionId) {
        return res.status(400).json({ error: 'questionId is required' });
      }

      const releasedQuestion = releaseLiveQuestion(questionId);
      if (!releasedQuestion) {
        return res.status(404).json({ error: `Question ${questionId} not found in session timeline` });
      }

      return res.json({ success: true, releasedQuestion });
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to release question', details: err?.message });
    }
  });

  // POST /api/live/submit-answer (authenticated student)
  app.post('/api/live/submit-answer', authenticate, async (req: Request, res: Response) => {
    try {
      const { questionId, selectedIndex, lowEngagement } = req.body;
      const studentId = req.user!.id; // Derived strictly from session token
      if (!questionId || selectedIndex === undefined) {
        return res.status(400).json({ error: 'questionId and selectedIndex are required' });
      }

      const result = await submitLiveAnswer({
        studentId,
        questionId,
        selectedIndex: Number(selectedIndex),
        lowEngagement: Boolean(lowEngagement),
      });

      return res.json({ success: true, ...result });
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to submit live answer', details: err?.message });
    }
  });

  // POST /api/live/student-engagement (authenticated student)
  app.post('/api/live/student-engagement', authenticate, (req: Request, res: Response) => {
    try {
      const { lowEngagement } = req.body;
      const studentId = req.user!.id; // Derived strictly from session token

      updateStudentEngagement(studentId, Boolean(lowEngagement));
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to update engagement', details: err?.message });
    }
  });
}
