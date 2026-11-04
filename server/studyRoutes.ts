import type { Express, Request, Response } from 'express';
import { callGeminiWithRetry, cleanErrorMessage } from './gemini.ts';
import { generateSyntheticStudyData } from './studyDemoSeeder.ts';
import { computeStudyMetricsAndStats } from './studyMetricsCalculator.ts';
import { getDefaultStudyItems } from './studyDefaultItems.ts';
import { authenticate, requireRole } from './authMiddleware.ts';
import { sendError } from './auth.ts';
import { validateBody, studyCreateSchema, studyRecordEventSchema } from './validation.ts';
import {
  studyRepository,
  eventRepository,
  userRepository,
  islmRepository,
} from './repositories/index.ts';

export interface StudyItem {
  id: string;
  stage: 'pre-test' | 'learning' | 'post-test' | 'retention';
  conceptId: string;
  question: string;
  codeSnippet?: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  targetMisconception?: string;
  isTransferTask?: boolean;
}

export interface StudyArm {
  id: 'ARM_A' | 'ARM_B' | 'ARM_C';
  name: string;
  description: string;
  condition: 'personalised_scaffolding' | 'generic_assistant' | 'no_assistance';
  studentIds: string[];
}

export interface StudyDefinition {
  id: string;
  title: string;
  topicId: string;
  topicName: string;
  description: string;
  status: 'draft' | 'active' | 'completed';
  arms: StudyArm[];
  items: StudyItem[];
  masteryThreshold: number;
  createdAt: string;
  updatedAt: string;
}

export function registerStudyRoutes(app: Express) {
  // 1. Get all studies (cursor-paginated, authenticated)
  app.get('/api/studies', authenticate, (req: Request, res: Response) => {
    try {
      const cursor = req.query.cursor as string | undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
      const paginated = studyRepository.listPaginated({ cursor, limit });
      return res.json({
        studies: paginated.items,
        nextCursor: paginated.nextCursor,
        hasMore: paginated.hasMore,
        totalCount: paginated.totalCount,
      });
    } catch (err: any) {
      return sendError(res, 500, 'STUDY_LIST_ERROR', err?.message || 'Failed to list studies', req);
    }
  });

  // 2. Create study (teacher/admin only)
  app.post(
    '/api/studies',
    authenticate,
    requireRole('teacher', 'admin'),
    validateBody(studyCreateSchema),
    async (req: Request, res: Response) => {
      try {
        const { title, topicId, topicName, description, masteryThreshold, enableArmC } = req.body;

        const studyId = `study_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const defaultItems = getDefaultStudyItems(topicId, topicName || topicId);

        const arms: StudyArm[] = [
          {
            id: 'ARM_A',
            name: 'Arm A (Personalised Closed-Loop)',
            description: 'Socratic 4-tier scaffolding, ISLM profile modeling, and anti-answer protocol.',
            condition: 'personalised_scaffolding',
            studentIds: [],
          },
          {
            id: 'ARM_B',
            name: 'Arm B (Generic Assistant)',
            description: 'Standard LLM assistance, direct complete code answers, no ISLM or scaffolding.',
            condition: 'generic_assistant',
            studentIds: [],
          },
        ];

        if (enableArmC) {
          arms.push({
            id: 'ARM_C',
            name: 'Arm C (No Assistance Control)',
            description: 'Independent practice environment without automated AI hints or solutions.',
            condition: 'no_assistance',
            studentIds: [],
          });
        }

        const newStudy: StudyDefinition = {
          id: studyId,
          title,
          topicId,
          topicName: topicName || topicId,
          description: description || 'Empirical comparison study evaluating learning gains and error recurrence.',
          status: 'draft',
          arms,
          items: defaultItems,
          masteryThreshold: Number(masteryThreshold) || 90,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        const created = studyRepository.create(newStudy);
        return res.status(201).json({ study: created });
      } catch (err: any) {
        console.error('Failed to create study:', err);
        return sendError(res, 500, 'STUDY_CREATE_ERROR', err?.message || 'Failed to create study', req);
      }
    }
  );

  // 3. Get single study details (authenticated)
  app.get('/api/studies/:id', authenticate, (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const study = studyRepository.findById(id);
      if (!study) {
        return sendError(res, 404, 'NOT_FOUND', `Study ${id} not found`, req);
      }
      return res.json({ study });
    } catch (err: any) {
      return sendError(res, 500, 'STUDY_GET_ERROR', err?.message || 'Failed to get study', req);
    }
  });

  // 4. Generate AI item banks for study stages (teacher/admin only)
  app.post(
    '/api/studies/:id/generate-items',
    authenticate,
    requireRole('teacher', 'admin'),
    async (req: Request, res: Response) => {
      try {
        const { id } = req.params;
        const study = studyRepository.findById(id);
        if (!study) {
          return sendError(res, 404, 'NOT_FOUND', `Study ${id} not found`, req);
        }

        const prompt = `You are a psychometrician and CSE computer science educator.
Generate an empirical study item bank for topic: "${study.topicName}" (id: ${study.topicId}).
Generate exactly 8 multiple choice questions structured across 4 sequential stages:
- 2 questions for "pre-test" (baseline concept knowledge)
- 3 questions for "learning" (practical tasks with common traps)
- 2 questions for "post-test" (concept transfer problems)
- 1 question for "retention" (delayed conceptual retest)

Return valid JSON with an array named "items" containing objects with:
- id: string
- stage: 'pre-test' | 'learning' | 'post-test' | 'retention'
- conceptId: "${study.topicId}"
- question: string
- options: array of 4 string choices
- correctIndex: integer (0-3)
- explanation: string
- targetMisconception: string`;

        const { data, error } = await callGeminiWithRetry<{ items: StudyItem[] }>(
          prompt,
          'You are an educational assessment designer. Return structured JSON only.',
          undefined,
          12000
        );

        let generatedItems: StudyItem[] = [];
        let provenance: 'LIVE AI' | 'FALLBACK' = 'LIVE AI';

        if (data && Array.isArray(data.items) && data.items.length >= 4) {
          generatedItems = data.items.map((item, idx) => ({
            ...item,
            id: `item_gen_${Date.now()}_${idx}`,
            conceptId: study.topicId,
          }));
        } else {
          provenance = 'FALLBACK';
          generatedItems = getDefaultStudyItems(study.topicId, study.topicName);
        }

        studyRepository.update(id, {
          items: generatedItems,
          updatedAt: new Date().toISOString(),
        });

        return res.json({
          items: generatedItems,
          provenance,
          error: error ? cleanErrorMessage(error) : null,
        });
      } catch (err: any) {
        console.error('Failed to generate study items:', err);
        return sendError(res, 500, 'ITEM_GENERATION_ERROR', err?.message || 'Failed to generate study items', req);
      }
    }
  );

  // 5. Update/Review item banks (teacher/admin only)
  app.put('/api/studies/:id/items', authenticate, requireRole('teacher', 'admin'), async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { items } = req.body;
      if (!Array.isArray(items)) {
        return sendError(res, 400, 'VALIDATION_ERROR', 'items array is required', req);
      }

      const study = studyRepository.findById(id);
      if (!study) {
        return sendError(res, 404, 'NOT_FOUND', `Study ${id} not found`, req);
      }

      studyRepository.update(id, {
        items,
        updatedAt: new Date().toISOString(),
      });

      return res.json({ success: true, count: items.length });
    } catch (err: any) {
      return sendError(res, 500, 'ITEM_UPDATE_ERROR', err?.message || 'Failed to update study items', req);
    }
  });

  // 6. Assign students to study arms (teacher/admin only)
  app.post('/api/studies/:id/assign', authenticate, requireRole('teacher', 'admin'), async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { method, assignments } = req.body;
      const study = studyRepository.findById(id);
      if (!study) {
        return sendError(res, 404, 'NOT_FOUND', `Study ${id} not found`, req);
      }

      const updatedArms: StudyArm[] = study.arms.map((arm: StudyArm) => ({ ...arm }));

      if (method === 'manual' && assignments) {
        updatedArms.forEach(arm => {
          if (assignments[arm.id]) {
            arm.studentIds = assignments[arm.id];
          }
        });
      } else if (method === 'random') {
        const enrolledStudents = userRepository.listPaginated({ limit: 500 }).items
          .filter(u => u.role === 'student')
          .map(u => u.id);
        const shuffled = [...enrolledStudents].sort(() => Math.random() - 0.5);
        updatedArms.forEach(arm => (arm.studentIds = []));
        shuffled.forEach((stuId, idx) => {
          const armIndex = idx % updatedArms.length;
          updatedArms[armIndex].studentIds.push(stuId);
        });
      }

      studyRepository.update(id, {
        arms: updatedArms,
        status: 'active',
        updatedAt: new Date().toISOString(),
      });

      return res.json({ success: true });
    } catch (err: any) {
      return sendError(res, 500, 'ASSIGN_ERROR', err?.message || 'Failed to assign study arms', req);
    }
  });

  // 7. Seed Demo Cohort (10 synthetic students per arm with realistic events) (teacher/admin only)
  app.post('/api/studies/:id/seed-demo', authenticate, requireRole('teacher', 'admin'), async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const study = studyRepository.findById(id);
      if (!study) {
        return sendError(res, 404, 'NOT_FOUND', `Study ${id} not found`, req);
      }

      const existingStudyEvents = eventRepository.listAllForStudy(id);
      const { syntheticUsers, syntheticISLM, newEvents, armAssignments } = generateSyntheticStudyData(
        { studyId: id, topicId: study.topicId, topicName: study.topicName },
        existingStudyEvents as any
      );

      // Persist synthetic users
      syntheticUsers.forEach(u => {
        userRepository.upsert({
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role as any,
          tokenVersion: 1,
          synthetic: true,
        });
      });

      // Persist synthetic ISLM profiles
      syntheticISLM.forEach(islm => {
        islmRepository.upsert({
          student_id: islm.student_id,
          name: islm.name,
          email: islm.email || `${islm.student_id.toLowerCase()}@synthetic.edu`,
          role: 'student',
          course_track: islm.course_track || 'Web Application Development',
          overall_mastery: islm.overall_mastery,
          topic_mastery: islm.topic_mastery,
          recent_misconceptions: (islm as any).recent_misconceptions || (islm as any).misconceptions || [],
          scaffolding_tier_required: (islm as any).scaffolding_tier_required ?? 1,
          error_count: (islm as any).error_count ?? 0,
          independent_solves: (islm as any).independent_solves ?? 0,
          scaffolding_fading_index: (islm as any).scaffolding_fading_index ?? (islm as any).retention_strength ?? 0.5,
          time_spent_mins: (islm as any).time_spent_mins ?? 60,
          synthetic: true,
        });
      });

      // Persist new synthetic events
      newEvents.forEach(evt => {
        eventRepository.append({
          id: evt.id,
          studentId: evt.studentId,
          type: evt.type,
          conceptId: evt.conceptId,
          topicId: evt.topicId,
          payload: evt.payload,
          synthetic: true,
          ts: evt.ts,
        });
      });

      // Update study arm assignments
      const updatedArms: StudyArm[] = study.arms.map((arm: StudyArm) => {
        const key = arm.id as keyof typeof armAssignments;
        const newIds = armAssignments[key] || [];
        return {
          ...arm,
          studentIds: Array.from(new Set([...arm.studentIds, ...newIds])),
        };
      });

      studyRepository.update(id, {
        arms: updatedArms,
        status: 'active',
        updatedAt: new Date().toISOString(),
      });

      return res.json({
        success: true,
        seededStudents: syntheticUsers.length,
        seededEvents: newEvents.length,
      });
    } catch (err: any) {
      console.error('Failed to seed demo study:', err);
      return sendError(res, 500, 'SEED_STUDY_ERROR', err?.message || 'Failed to seed study demo data', req);
    }
  });

  // 8. Delete individual event (Event reactivity test) (teacher/admin only)
  app.delete(
    '/api/studies/:id/events/:eventId',
    authenticate,
    requireRole('teacher', 'admin'),
    async (req: Request, res: Response) => {
      try {
        const { eventId } = req.params;
        const removed = eventRepository.deleteById(eventId);
        return res.json({ success: removed });
      } catch (err: any) {
        return sendError(res, 500, 'DELETE_EVENT_ERROR', err?.message || 'Failed to delete event', req);
      }
    }
  );

  // 9. Clear events for a study (teacher/admin only)
  app.post(
    '/api/studies/:id/clear-events',
    authenticate,
    requireRole('teacher', 'admin'),
    async (req: Request, res: Response) => {
      try {
        const { id } = req.params;
        const removedCount = eventRepository.deleteByStudyId(id);
        return res.json({ success: true, removedCount });
      } catch (err: any) {
        return sendError(res, 500, 'CLEAR_EVENTS_ERROR', err?.message || 'Failed to clear study events', req);
      }
    }
  );

  // 10. Record a study event (Protected - studentId always strictly derived from session)
  app.post(
    '/api/studies/:id/record-event',
    authenticate,
    validateBody(studyRecordEventSchema),
    async (req: Request, res: Response) => {
      try {
        const { id } = req.params;
        const { armId, stage, score, passed, durationSec, hintsRequested, repeatedError, isTransferTask } = req.body;
        const studentId = req.user!.id; // Strictly derived from session token

        let eventType = 'STUDY_PRE_TEST_ANSWER';
        if (stage === 'learning') eventType = 'STUDY_LEARNING_ATTEMPT';
        else if (stage === 'post-test') eventType = 'STUDY_POST_TEST_ANSWER';
        else if (stage === 'retention') eventType = 'STUDY_RETENTION_ANSWER';

        const event = eventRepository.append({
          studentId,
          type: eventType,
          conceptId: 'study',
          topicId: id,
          synthetic: false,
          payload: {
            studyId: id,
            armId,
            stage,
            score: Number(score) || 0,
            passed: Boolean(passed),
            durationSec: Number(durationSec) || 60,
            hintsRequested: Number(hintsRequested) || 0,
            repeatedError: Boolean(repeatedError),
            isTransferTask: Boolean(isTransferTask),
          },
        });

        return res.json({ success: true, event });
      } catch (err: any) {
        return sendError(res, 500, 'RECORD_EVENT_ERROR', err?.message || 'Failed to record study event', req);
      }
    }
  );

  // 11. Compute Study Results & Statistics strictly derived from events! (teacher/admin only)
  app.get('/api/studies/:id/results', authenticate, requireRole('teacher', 'admin'), (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const study = studyRepository.findById(id);
      if (!study) {
        return sendError(res, 404, 'NOT_FOUND', `Study ${id} not found`, req);
      }

      const studyEvents = eventRepository.listAllForStudy(id);
      const computed = computeStudyMetricsAndStats(study, studyEvents as any);
      return res.json(computed);
    } catch (err: any) {
      console.error('Failed to compute study results:', err);
      return sendError(res, 500, 'STUDY_RESULTS_ERROR', err?.message || 'Failed to compute study results', req);
    }
  });

  // 12. Export Raw Events and Summary CSV (teacher/admin only)
  app.get('/api/studies/:id/export-csv', authenticate, requireRole('teacher', 'admin'), (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const study = studyRepository.findById(id);
      if (!study) return sendError(res, 404, 'NOT_FOUND', `Study ${id} not found`, req);

      const studyEvents = eventRepository.listAllForStudy(id);

      const header = [
        'EventID',
        'StudyID',
        'ArmID',
        'StudentID',
        'Synthetic',
        'EventType',
        'Stage',
        'Score',
        'Passed',
        'HintsRequested',
        'DurationSec',
        'RepeatedError',
        'Timestamp',
      ].join(',');

      const rows = studyEvents.map(e => [
        `"${e.id}"`,
        `"${id}"`,
        `"${e.payload?.armId || ''}"`,
        `"${e.studentId}"`,
        e.synthetic ? 'true' : 'false',
        `"${e.type}"`,
        `"${e.payload?.stage || ''}"`,
        e.payload?.score ?? '',
        e.payload?.passed ?? '',
        e.payload?.hintsRequested ?? '',
        e.payload?.durationSec ?? '',
        e.payload?.repeatedError ?? '',
        `"${e.ts}"`,
      ].join(','));

      const csvContent = [header, ...rows].join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=study_${id}_raw_events.csv`);
      return res.send(csvContent);
    } catch (err: any) {
      return sendError(res, 500, 'EXPORT_CSV_ERROR', err?.message || 'Failed to export CSV', req);
    }
  });

  // 13. Export Raw Events and Summary JSON (teacher/admin only)
  app.get('/api/studies/:id/export-json', authenticate, requireRole('teacher', 'admin'), (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const study = studyRepository.findById(id);
      if (!study) return sendError(res, 404, 'NOT_FOUND', `Study ${id} not found`, req);

      const studyEvents = eventRepository.listAllForStudy(id);
      return res.json({
        study,
        events: studyEvents,
        exportedAt: new Date().toISOString(),
      });
    } catch (err: any) {
      return sendError(res, 500, 'EXPORT_JSON_ERROR', err?.message || 'Failed to export JSON', req);
    }
  });
}
