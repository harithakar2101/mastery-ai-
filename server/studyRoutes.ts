import type { Express, Request, Response } from 'express';
import { readStore, writeStoreAtomically, appendEvent } from './store.ts';
import { callGeminiWithRetry, cleanErrorMessage } from './gemini.ts';
import { generateSyntheticStudyData } from './studyDemoSeeder.ts';
import { computeStudyMetricsAndStats } from './studyMetricsCalculator.ts';

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

import { getDefaultStudyItems } from './studyDefaultItems.ts';
import { authenticate, requireRole } from './authMiddleware.ts';

export function registerStudyRoutes(app: Express) {
  // 1. Get all studies (authenticated)
  app.get('/api/studies', authenticate, (_req: Request, res: Response) => {
    const store = readStore();
    const studies = (store as any).studyDefinitions || [];
    return res.json({ studies });
  });

  // 2. Create study (teacher/admin only)
  app.post('/api/studies', authenticate, requireRole('teacher', 'admin'), async (req: Request, res: Response) => {
    try {
      const { title, topicId, topicName, description, masteryThreshold, enableArmC } = req.body;
      if (!title || !topicId) {
        return res.status(400).json({ error: 'Title and topicId are required' });
      }

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

      await writeStoreAtomically(store => {
        if (!(store as any).studyDefinitions) {
          (store as any).studyDefinitions = [];
        }
        (store as any).studyDefinitions.push(newStudy);
      });

      return res.status(201).json({ study: newStudy });
    } catch (err: any) {
      console.error('Failed to create study:', err);
      return res.status(500).json({ error: err.message || 'Internal error' });
    }
  });

  // 3. Get single study details (authenticated)
  app.get('/api/studies/:id', authenticate, (req: Request, res: Response) => {
    const { id } = req.params;
    const store = readStore();
    const studies: StudyDefinition[] = (store as any).studyDefinitions || [];
    const study = studies.find(s => s.id === id);
    if (!study) {
      return res.status(404).json({ error: 'Study not found' });
    }
    return res.json({ study });
  });

  // 4. Generate AI item banks for study stages (teacher/admin only)
  app.post('/api/studies/:id/generate-items', authenticate, requireRole('teacher', 'admin'), async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const store = readStore();
      const studies: StudyDefinition[] = (store as any).studyDefinitions || [];
      const studyIndex = studies.findIndex(s => s.id === id);
      if (studyIndex === -1) {
        return res.status(404).json({ error: 'Study not found' });
      }

      const study = studies[studyIndex];
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

      await writeStoreAtomically(st => {
        const list: StudyDefinition[] = (st as any).studyDefinitions || [];
        const idx = list.findIndex(s => s.id === id);
        if (idx !== -1) {
          list[idx].items = generatedItems;
          list[idx].updatedAt = new Date().toISOString();
        }
      });

      return res.json({
        items: generatedItems,
        provenance,
        error: error ? cleanErrorMessage(error) : null,
      });
    } catch (err: any) {
      console.error('Failed to generate study items:', err);
      return res.status(500).json({ error: err.message });
    }
  });

  // 5. Update/Review item banks (teacher/admin only)
  app.put('/api/studies/:id/items', authenticate, requireRole('teacher', 'admin'), async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { items } = req.body;
      if (!Array.isArray(items)) {
        return res.status(400).json({ error: 'items array is required' });
      }

      await writeStoreAtomically(st => {
        const list: StudyDefinition[] = (st as any).studyDefinitions || [];
        const idx = list.findIndex(s => s.id === id);
        if (idx !== -1) {
          list[idx].items = items;
          list[idx].updatedAt = new Date().toISOString();
        }
      });

      return res.json({ success: true, count: items.length });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // 6. Assign students to study arms (teacher/admin only)
  app.post('/api/studies/:id/assign', authenticate, requireRole('teacher', 'admin'), async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { method, assignments } = req.body;
      const store = readStore();
      const studies: StudyDefinition[] = (store as any).studyDefinitions || [];
      const study = studies.find(s => s.id === id);
      if (!study) {
        return res.status(404).json({ error: 'Study not found' });
      }

      await writeStoreAtomically(st => {
        const list: StudyDefinition[] = (st as any).studyDefinitions || [];
        const target = list.find(s => s.id === id);
        if (!target) return;

        if (method === 'manual' && assignments) {
          target.arms.forEach(arm => {
            if (assignments[arm.id]) {
              arm.studentIds = assignments[arm.id];
            }
          });
        } else if (method === 'random') {
          const enrolledStudents = st.users.filter(u => u.role === 'student').map(u => u.id);
          const shuffled = [...enrolledStudents].sort(() => Math.random() - 0.5);
          target.arms.forEach(arm => (arm.studentIds = []));
          shuffled.forEach((stuId, idx) => {
            const armIndex = idx % target.arms.length;
            target.arms[armIndex].studentIds.push(stuId);
          });
        }
        target.status = 'active';
        target.updatedAt = new Date().toISOString();
      });

      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // 7. Seed Demo Cohort (10 synthetic students per arm with realistic events) (teacher/admin only)
  app.post('/api/studies/:id/seed-demo', authenticate, requireRole('teacher', 'admin'), async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const store = readStore();
      const studies: StudyDefinition[] = (store as any).studyDefinitions || [];
      const study = studies.find(s => s.id === id);
      if (!study) {
        return res.status(404).json({ error: 'Study not found' });
      }

      const { syntheticUsers, syntheticISLM, newEvents, armAssignments } = generateSyntheticStudyData(
        { studyId: id, topicId: study.topicId, topicName: study.topicName },
        store.events || []
      );

      await writeStoreAtomically(st => {
        syntheticUsers.forEach(u => {
          const exists = st.users.some(x => x.id === u.id);
          if (!exists) st.users.push(u);
        });
        syntheticISLM.forEach(islm => {
          const exists = st.islm.some(x => x.student_id === islm.student_id);
          if (!exists) st.islm.push(islm);
        });
        if (!st.events) st.events = [];
        st.events.push(...newEvents);

        const list: StudyDefinition[] = (st as any).studyDefinitions || [];
        const target = list.find(s => s.id === id);
        if (target) {
          target.arms.forEach(arm => {
            if (armAssignments[arm.id]) {
              arm.studentIds = Array.from(new Set([...arm.studentIds, ...armAssignments[arm.id]]));
            }
          });
          target.status = 'active';
          target.updatedAt = new Date().toISOString();
        }
      });

      return res.json({
        success: true,
        seededStudents: syntheticUsers.length,
        seededEvents: newEvents.length,
      });
    } catch (err: any) {
      console.error('Failed to seed demo study:', err);
      return res.status(500).json({ error: err.message });
    }
  });

  // 8. Delete individual event (Event reactivity test) (teacher/admin only)
  app.delete('/api/studies/:id/events/:eventId', authenticate, requireRole('teacher', 'admin'), async (req: Request, res: Response) => {
    try {
      const { eventId } = req.params;
      let removed = false;
      await writeStoreAtomically(st => {
        if (!st.events) return;
        const initialLen = st.events.length;
        st.events = st.events.filter(e => e.id !== eventId);
        removed = st.events.length < initialLen;
      });
      return res.json({ success: removed });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // 9. Clear events for a study (teacher/admin only)
  app.post('/api/studies/:id/clear-events', authenticate, requireRole('teacher', 'admin'), async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      let removedCount = 0;
      await writeStoreAtomically(st => {
        if (!st.events) return;
        const remaining = st.events.filter(e => e.payload?.studyId !== id);
        removedCount = st.events.length - remaining.length;
        st.events = remaining;
      });
      return res.json({ success: true, removedCount });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // 10. Record a study event (student/authenticated)
  app.post('/api/studies/:id/record-event', authenticate, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { armId, stage, score, passed, durationSec, hintsRequested, repeatedError, isTransferTask } = req.body;
      const studentId = req.user!.role === 'student' ? req.user!.id : (req.body.studentId || req.user!.id);

      let eventType = 'STUDY_PRE_TEST_ANSWER';
      if (stage === 'learning') eventType = 'STUDY_LEARNING_ATTEMPT';
      else if (stage === 'post-test') eventType = 'STUDY_POST_TEST_ANSWER';
      else if (stage === 'retention') eventType = 'STUDY_RETENTION_ANSWER';

      const event = await appendEvent({
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
      return res.status(500).json({ error: err.message });
    }
  });

  // 11. Compute Study Results & Statistics strictly derived from events! (teacher/admin only)
  app.get('/api/studies/:id/results', authenticate, requireRole('teacher', 'admin'), (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const store = readStore();
      const studies: StudyDefinition[] = (store as any).studyDefinitions || [];
      const study = studies.find(s => s.id === id);
      if (!study) {
        return res.status(404).json({ error: 'Study not found' });
      }

      const allEvents = store.events || [];
      const studyEvents = allEvents.filter(e => e.payload?.studyId === id);
      const computed = computeStudyMetricsAndStats(study, studyEvents);
      return res.json(computed);
    } catch (err: any) {
      console.error('Failed to compute study results:', err);
      return res.status(500).json({ error: err.message });
    }
  });

  // 12. Export Raw Events and Summary CSV (teacher/admin only)
  app.get('/api/studies/:id/export-csv', authenticate, requireRole('teacher', 'admin'), (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const store = readStore();
      const studies: StudyDefinition[] = (store as any).studyDefinitions || [];
      const study = studies.find(s => s.id === id);
      if (!study) return res.status(404).send('Study not found');

      const studyEvents = (store.events || []).filter(e => e.payload?.studyId === id);

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
      return res.status(500).send(err.message);
    }
  });

  // 13. Export Raw Events and Summary JSON (teacher/admin only)
  app.get('/api/studies/:id/export-json', authenticate, requireRole('teacher', 'admin'), (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const store = readStore();
      const studies: StudyDefinition[] = (store as any).studyDefinitions || [];
      const study = studies.find(s => s.id === id);
      if (!study) return res.status(404).json({ error: 'Study not found' });

      const studyEvents = (store.events || []).filter(e => e.payload?.studyId === id);
      return res.json({
        study,
        events: studyEvents,
        exportedAt: new Date().toISOString(),
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });
}
