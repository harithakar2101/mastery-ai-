import { type Express, type Request, type Response } from 'express';
import { authenticate } from './authMiddleware.ts';
import { sendError } from './auth.ts';
import {
  generateStudyStudioPlan,
  rateFlashcardAndReplan,
  updateStudioContent,
} from './services/studyStudioService.ts';
import { studyPlanRepository, flashcardRepository } from './repositories/index.ts';

const MAX_FILE_BYTES = 20 * 1024 * 1024; // 20 MB

export function registerStudyStudioRoutes(app: Express) {
  // 1. Generate study studio materials & plan
  app.post('/api/study-studio/generate', authenticate, async (req: Request, res: Response) => {
    try {
      const studentId = req.user!.id;
      const {
        courseTopic,
        examDate,
        targetGrade,
        dailyStudyMinutes,
        fileBase64,
        fileName,
        fileMimeType,
        fileMime,
        pastedText,
      } = req.body;

      const effectiveMime = fileMimeType || fileMime;

      if (!courseTopic || !examDate) {
        return sendError(res, 400, 'VALIDATION_ERROR', 'courseTopic and examDate are required', req);
      }

      // Check max file size (20 MB)
      if (fileBase64 && typeof fileBase64 === 'string') {
        const approxBytes = Math.ceil((fileBase64.length * 3) / 4);
        if (approxBytes > MAX_FILE_BYTES) {
          return sendError(
            res,
            400,
            'STUDY_STUDIO_OVERSIZED_PAYLOAD',
            `File size exceeds the 20 MB limit (detected ~${Math.round(approxBytes / (1024 * 1024))} MB).`,
            req
          );
        }
      }

      // Validate allowed mime types if file provided
      if (effectiveMime) {
        const allowedMimes = [
          'application/pdf',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/msword',
          'text/plain',
          'application/octet-stream',
        ];
        if (!allowedMimes.includes(effectiveMime.toLowerCase())) {
          return sendError(
            res,
            400,
            'STUDY_STUDIO_INVALID_FILE_TYPE',
            `Unsupported file format: ${effectiveMime}. Supported formats are PDF, DOCX, and TXT.`,
            req
          );
        }
      }

      const parsedGrade = Math.max(4, Math.min(10, Number(targetGrade) || 8));
      const parsedMinutes = Math.max(15, Math.min(180, Number(dailyStudyMinutes) || 45));

      const result = await generateStudyStudioPlan({
        studentId,
        courseTopic: String(courseTopic).trim(),
        examDate: String(examDate).trim(),
        targetGrade: parsedGrade,
        dailyStudyMinutes: parsedMinutes,
        fileBase64,
        fileName,
        fileMimeType,
        pastedText,
      });

      return res.json({
        success: true,
        ...result,
      });
    } catch (err: any) {
      console.error('Study studio generation failure:', err);
      return sendError(res, 500, 'STUDIO_GEN_ERROR', err?.message || 'Failed to generate study studio materials', req);
    }
  });

  // 2. Get active Study Studio state for authenticated student
  app.get('/api/study-studio/state', authenticate, (req: Request, res: Response) => {
    try {
      const studentId = req.user!.id;
      const plan = studyPlanRepository.findLatestByStudent(studentId);

      if (!plan || !plan.meta) {
        return res.json({
          hasActivePlan: false,
          session: null,
        });
      }

      const allCards = flashcardRepository.listAllByStudent(studentId);
      const studioCards = allCards.map(c => ({
        id: c.id,
        conceptId: c.conceptId,
        conceptName: c.conceptName,
        question: c.cardJson?.question || 'Question',
        answer: c.cardJson?.answer || 'Answer',
        sourceRef: c.cardJson?.sourceRef || 'Notes',
        leitnerBox: c.leitnerBox,
        easeFactor: c.easeFactor,
        intervalDays: c.intervalDays,
        repetitions: c.repetitions,
        dueDate: c.dueDate,
        lastReviewed: c.lastReviewed,
      }));

      // Calculate today's counter: cards reviewed today vs scheduled today
      const todayStr = new Date().toISOString().split('T')[0];
      const reviewedToday = studioCards.filter(c => c.lastReviewed && c.lastReviewed.startsWith(todayStr)).length;
      const dueOrReviewedToday = studioCards.filter(c => (c.dueDate && c.dueDate.startsWith(todayStr)) || (c.lastReviewed && c.lastReviewed.startsWith(todayStr))).length;
      const totalTodayCards = Math.max(reviewedToday, dueOrReviewedToday, 10);

      return res.json({
        hasActivePlan: true,
        config: plan.meta.config,
        summary: plan.meta.summary || [],
        concepts: plan.meta.concepts || [],
        flashcards: studioCards.length > 0 ? studioCards : (plan.meta.flashcards || []),
        practiceQuestions: plan.meta.practiceQuestions || [],
        schedule: plan.schedule || [],
        latestRePlanNote: plan.meta.latestRePlanNote || '',
        provenance: plan.meta.provenance || 'FALLBACK',
        todayCounter: {
          completedToday: reviewedToday,
          totalToday: totalTodayCards,
        },
      });
    } catch (err: any) {
      return sendError(res, 500, 'STUDIO_STATE_ERROR', err?.message || 'Failed to fetch study studio state', req);
    }
  });

  // 3. Rate a flashcard (feeding SM-2 + BKT and triggering Adaptive Re-planning)
  app.post('/api/study-studio/rate-card', authenticate, (req: Request, res: Response) => {
    try {
      const studentId = req.user!.id;
      const { cardId, rating } = req.body;

      if (!cardId || !rating) {
        return sendError(res, 400, 'VALIDATION_ERROR', 'cardId and rating (again, hard, good, easy) are required', req);
      }

      const validRatings = ['again', 'hard', 'good', 'easy'];
      if (!validRatings.includes(String(rating).toLowerCase())) {
        return sendError(res, 400, 'VALIDATION_ERROR', 'Rating must be one of: again, hard, good, easy', req);
      }

      const result = rateFlashcardAndReplan({
        studentId,
        cardId: String(cardId),
        rating: String(rating).toLowerCase() as any,
      });

      return res.json({
        success: true,
        ...result,
      });
    } catch (err: any) {
      return sendError(res, 500, 'STUDIO_RATE_ERROR', err?.message || 'Failed to rate flashcard', req);
    }
  });

  // 4. Update student-edited content (Summary, Flashcards, Practice Questions)
  app.put('/api/study-studio/content', authenticate, (req: Request, res: Response) => {
    try {
      const studentId = req.user!.id;
      const { summary, section, flashcards, card, practiceQuestions, question } = req.body;

      const result = updateStudioContent({
        studentId,
        summary,
        section,
        flashcards,
        card,
        practiceQuestions,
        question,
      });

      return res.json(result);
    } catch (err: any) {
      return sendError(res, 500, 'STUDIO_UPDATE_ERROR', err?.message || 'Failed to update studio content', req);
    }
  });
}
