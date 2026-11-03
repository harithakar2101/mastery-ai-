import { type Express, type Request, type Response } from 'express';
import { liveSessionService } from './services/LiveSessionService.ts';
import { processLiveTranscriptRequest } from './gemini.ts';
import { authenticate, requireRole } from './authMiddleware.ts';
import { verifySessionToken, COOKIE_NAME, sendError } from './auth.ts';
import { userRepository } from './repositories/index.ts';
import {
  validateBody,
  liveSessionStartSchema,
  liveReleaseQuestionSchema,
  liveSubmitAnswerSchema,
  liveEngagementSchema,
  liveTranscriptSchema,
} from './validation.ts';

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

    const user = userRepository.findById(verification.payload!.userId);
    if (!user) {
      return sendError(res, 401, 'UNAUTHORIZED', 'User not found', req);
    }

    // Role and studentId strictly from verified session
    const role = user.role;
    const studentId = user.id;
    const studentName = user.name;

    // Check for Last-Event-ID header (or query param) for reconnection replay
    const rawLastId = req.headers['last-event-id'] || req.query.lastEventId || req.query['last-event-id'];
    const lastEventId = rawLastId !== undefined && rawLastId !== null ? parseInt(String(rawLastId), 10) : undefined;

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
    liveSessionService.addClient(
      {
        id: clientId,
        role: role === 'admin' ? 'teacher' : (role as 'teacher' | 'student'),
        studentId,
        studentName,
        res,
      },
      !isNaN(Number(lastEventId)) ? Number(lastEventId) : undefined
    );

    req.on('close', () => {
      liveSessionService.removeClient(clientId);
    });
  });

  // POST /api/live/session/start (teacher/admin only)
  app.post(
    '/api/live/session/start',
    authenticate,
    requireRole('teacher', 'admin'),
    validateBody(liveSessionStartSchema),
    (req: Request, res: Response) => {
      try {
        const { topicId, topicName, track } = req.body;
        const session = liveSessionService.startSession({
          topicId: topicId || 'web_apache_docroot',
          topicName: topicName || 'Apache DocumentRoot & File Hierarchy',
          track: track || 'Web Application Development',
          teacherId: req.user!.id,
        });
        return res.json({ success: true, session });
      } catch (err: any) {
        return sendError(res, 500, 'LIVE_START_ERROR', err?.message || 'Failed to start live session', req);
      }
    }
  );

  // POST /api/live/session/end (teacher/admin only)
  app.post('/api/live/session/end', authenticate, requireRole('teacher', 'admin'), (req: Request, res: Response) => {
    try {
      const result = liveSessionService.endSession();
      return res.json(result);
    } catch (err: any) {
      return sendError(res, 500, 'LIVE_END_ERROR', err?.message || 'Failed to end live session', req);
    }
  });

  // GET /api/live/session/state (authenticated)
  app.get('/api/live/session/state', authenticate, (req: Request, res: Response) => {
    try {
      const state = liveSessionService.getState();
      return res.json(state);
    } catch (err: any) {
      return sendError(res, 500, 'LIVE_STATE_ERROR', err?.message || 'Failed to get live session state', req);
    }
  });

  // POST /api/live/transcript (teacher/admin only)
  app.post(
    '/api/live/transcript',
    authenticate,
    requireRole('teacher', 'admin'),
    validateBody(liveTranscriptSchema),
    async (req: Request, res: Response) => {
      try {
        const { transcript, track, topicId } = req.body;
        const result = await processLiveTranscriptRequest(transcript, track, topicId);
        if (result.timeline && Array.isArray(result.timeline)) {
          liveSessionService.setTimeline(result.timeline);
        }

        return res.json({
          success: true,
          timeline: result.timeline || [],
          source: result.source,
          fallback_reason: result.fallback_reason,
        });
      } catch (err: any) {
        return sendError(res, 500, 'TRANSCRIPT_ERROR', err?.message || 'Failed to process transcript', req);
      }
    }
  );

  // POST /api/live/release-question (teacher/admin only)
  app.post(
    '/api/live/release-question',
    authenticate,
    requireRole('teacher', 'admin'),
    validateBody(liveReleaseQuestionSchema),
    (req: Request, res: Response) => {
      try {
        const { questionId } = req.body;
        const releasedQuestion = liveSessionService.releaseQuestion(questionId);
        if (!releasedQuestion) {
          return sendError(res, 404, 'NOT_FOUND', `Question ${questionId} not found in session timeline`, req);
        }

        return res.json({ success: true, releasedQuestion });
      } catch (err: any) {
        return sendError(res, 500, 'RELEASE_ERROR', err?.message || 'Failed to release question', req);
      }
    }
  );

  // POST /api/live/submit-answer (authenticated student)
  app.post(
    '/api/live/submit-answer',
    authenticate,
    validateBody(liveSubmitAnswerSchema),
    async (req: Request, res: Response) => {
      try {
        const { questionId, selectedIndex, lowEngagement } = req.body;
        const studentId = req.user!.id; // Strictly from session token

        const result = await liveSessionService.submitAnswer({
          studentId,
          questionId,
          selectedIndex: Number(selectedIndex),
          lowEngagement: Boolean(lowEngagement),
        });

        return res.json({ success: true, ...result });
      } catch (err: any) {
        return sendError(res, 500, 'SUBMIT_ANSWER_ERROR', err?.message || 'Failed to submit live answer', req);
      }
    }
  );

  // POST /api/live/student-engagement (authenticated student)
  app.post(
    '/api/live/student-engagement',
    authenticate,
    validateBody(liveEngagementSchema),
    (req: Request, res: Response) => {
      try {
        const { lowEngagement } = req.body;
        const studentId = req.user!.id; // Strictly from session token

        liveSessionService.updateEngagement(studentId, Boolean(lowEngagement));
        return res.json({ success: true });
      } catch (err: any) {
        return sendError(res, 500, 'ENGAGEMENT_ERROR', err?.message || 'Failed to update engagement', req);
      }
    }
  );
}
