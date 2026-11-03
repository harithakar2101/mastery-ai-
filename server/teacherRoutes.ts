import { type Express, type Request, type Response } from 'express';
import { readStore, writeStoreAtomically } from './store.ts';
import { processInterventionSuggestionsRequest } from './gemini.ts';
import { authenticate, requireRole } from './authMiddleware.ts';
import { sendError } from './auth.ts';
import { validateBody, approveInterventionSchema, dismissInterventionSchema } from './validation.ts';

export function registerTeacherRoutes(app: Express) {
  // All teacher routes require a valid session with teacher or admin role
  app.use('/api/teacher', authenticate, requireRole('teacher', 'admin'));

  // GET /api/teacher/cohort-analytics
  app.get('/api/teacher/cohort-analytics', (req: Request, res: Response) => {
    try {
      const store = readStore();
      const students = (store.islm || []).filter(i => i.role === 'student');
      const attempts = store.attempts || [];
      const events = store.events || [];
      const interventions = store.interventions || [];

      // Empty state support: with no students, return zeros and empty structures
      if (students.length === 0) {
        return res.json({
          cohortSize: 0,
          avgClassMastery: 0,
          atRiskCount: 0,
          scaffoldingFadingRate: 0,
          heatmap: {},
          students: [],
          misconceptions: [],
          interventions: [],
        });
      }

      const now = Date.now();
      const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

      // Calculate Per-Student Drilldown and At-Risk Status
      const studentDrilldowns = students.map(s => {
        const studentAttempts = attempts.filter((a: any) => a.studentId === s.student_id);
        const studentEvents = events.filter((e: any) => e.studentId === s.student_id);

        // Count RED nodes in topic_mastery (pL < 0.50)
        const topicMastery = s.topic_mastery || {};
        const redNodes = Object.entries(topicMastery).filter(([_, pL]) => Number(pL) < 0.50);
        const greenNodes = Object.entries(topicMastery).filter(([_, pL]) => Number(pL) >= 0.80);

        // Check if there was an independent success in the last 7 days
        const hasIndependentSuccess7Days = studentAttempts.some((a: any) => {
          const attemptTime = new Date(a.ts || a.timestamp || 0).getTime();
          const isRecent = now - attemptTime <= SEVEN_DAYS_MS;
          const isIndependent = a.tierUsed === 1 || a.kind === 'independent';
          return isRecent && isIndependent && Boolean(a.passed);
        });

        const atRiskReasons: string[] = [];
        if (redNodes.length >= 3) {
          atRiskReasons.push(`${redNodes.length} Concepts in RED zone (pL < 0.50)`);
        }
        if (!hasIndependentSuccess7Days) {
          atRiskReasons.push('No independent success verified in past 7 days');
        }

        const isAtRisk = redNodes.length >= 3 || !hasIndependentSuccess7Days;

        // Group errors by errorCategory
        const errorCategories: Record<string, number> = {};
        studentAttempts.forEach((a: any) => {
          if (a.errorCategory) {
            errorCategories[a.errorCategory] = (errorCategories[a.errorCategory] || 0) + 1;
          }
        });

        const repeatedErrors = studentAttempts.filter((a: any) => a.repeatedError).length;
        const totalHints = studentAttempts.reduce((sum: number, a: any) => sum + (a.hintsRequested || 0), 0);
        const avgTaskDuration = studentAttempts.length > 0
          ? Math.round(studentAttempts.reduce((sum: number, a: any) => sum + (a.durationSec || 0), 0) / studentAttempts.length)
          : 0;

        // Recent timeline of attempts and events
        const timeline = [
          ...studentAttempts.map((a: any) => ({
            id: a.id,
            type: 'attempt',
            description: `${a.kind || 'lab'} on ${a.conceptId || 'concept'} - ${a.passed ? 'PASSED' : 'FAILED'} (Tier ${a.tierUsed || 1})`,
            errorCategory: a.errorCategory,
            repeatedError: a.repeatedError,
            timestamp: a.ts || a.timestamp,
            passed: a.passed,
          })),
          ...studentEvents.slice(-10).map((e: any) => ({
            id: e.id,
            type: 'event',
            description: `Event: ${e.type} (${e.conceptId || 'general'})`,
            timestamp: e.ts,
          })),
        ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 15);

        return {
          studentId: s.student_id,
          name: s.name,
          email: s.email,
          courseTrack: s.course_track,
          overallMastery: s.overall_mastery,
          scaffoldingFadingIndex: s.scaffolding_fading_index,
          topicMastery,
          recentMisconceptions: s.recent_misconceptions || [],
          redCount: redNodes.length,
          greenCount: greenNodes.length,
          isAtRisk,
          atRiskReasons,
          errorCategories,
          repeatedErrorCount: repeatedErrors,
          assistanceRequests: totalHints + (s.error_count || 0),
          timeSpentMins: s.time_spent_mins || 0,
          avgTaskDurationSec: avgTaskDuration,
          timeline,
        };
      });

      // Cohort Aggregate Tiles
      const cohortSize = students.length;
      const avgMasterySum = students.reduce((sum, s) => sum + (s.overall_mastery || 0), 0);
      const avgClassMastery = Math.round((avgMasterySum / cohortSize) * 100);
      const atRiskCount = studentDrilldowns.filter(s => s.isAtRisk).length;
      const fadingSum = students.reduce((sum, s) => sum + (s.scaffolding_fading_index || 0), 0);
      const scaffoldingFadingRate = Math.round((fadingSum / cohortSize) * 100);

      // Cohort Concept Heatmap (% students with pL >= 0.80)
      const targetConcepts = [
        { id: 'web_apache_docroot', label: 'Apache DocumentRoot Mapping' },
        { id: 'pdo_mysql_port', label: 'PDO Port & Socket Configuration' },
        { id: 'sql_injection_defense', label: 'SQL Injection Defense' },
        { id: 'async_event_loop', label: 'Async Event Loop & Callbacks' },
        { id: 'recursion_base_case', label: 'Recursion Termination Base Cases' },
        { id: 'cad_degrees_of_freedom', label: 'CAD Sketch Degrees of Freedom' },
        { id: 'cad_safety_factor_fea', label: 'FEA Stress & Factor of Safety' },
      ];

      const heatmap: Record<string, { label: string; greenCount: number; totalCount: number; percent: number }> = {};
      targetConcepts.forEach(c => {
        let green = 0;
        students.forEach(s => {
          const val = s.topic_mastery?.[c.id] ?? 0;
          if (val >= 0.80) green++;
        });
        const pct = Math.round((green / cohortSize) * 100);
        heatmap[c.id] = { label: c.label, greenCount: green, totalCount: cohortSize, percent: pct };
      });

      // Misconception Analytics ranked by number of affected students
      const misconceptionMap: Record<string, Set<string>> = {};
      students.forEach(s => {
        (s.recent_misconceptions || []).forEach(m => {
          if (!misconceptionMap[m]) misconceptionMap[m] = new Set();
          misconceptionMap[m].add(s.student_id);
        });
      });
      attempts.forEach((a: any) => {
        if (a.errorCategory && a.errorCategory !== 'none') {
          const label = `Category: ${a.errorCategory.replace(/_/g, ' ')}`;
          if (!misconceptionMap[label]) misconceptionMap[label] = new Set();
          misconceptionMap[label].add(a.studentId);
        }
      });

      const misconceptions = Object.entries(misconceptionMap)
        .map(([misconception, studentSet]) => ({
          misconception,
          affectedStudentsCount: studentSet.size,
          affectedPercent: Math.round((studentSet.size / cohortSize) * 100),
        }))
        .sort((a, b) => b.affectedStudentsCount - a.affectedStudentsCount);

      return res.json({
        cohortSize,
        avgClassMastery,
        atRiskCount,
        scaffoldingFadingRate,
        heatmap,
        students: studentDrilldowns,
        misconceptions,
        interventions,
      });
    } catch (err: any) {
      console.error('Teacher cohort analytics error:', err);
      return sendError(res, 500, 'COHORT_ANALYTICS_ERROR', err?.message || 'Failed to compute cohort analytics', req);
    }
  });

  // POST /api/teacher/intervention-suggestions
  app.post('/api/teacher/intervention-suggestions', async (req: Request, res: Response) => {
    try {
      const store = readStore();
      const students = (store.islm || []).filter(i => i.role === 'student');
      const dkmNodes = store.dkmStates ? Object.values(store.dkmStates)[0] : undefined;
      const result = await processInterventionSuggestionsRequest(students, dkmNodes);
      return res.json(result);
    } catch (err: any) {
      return sendError(res, 500, 'SUGGESTION_ERROR', err?.message || 'Failed to generate intervention suggestions', req);
    }
  });

  // POST /api/teacher/interventions/approve
  app.post('/api/teacher/interventions/approve', validateBody(approveInterventionSchema), async (req: Request, res: Response) => {
    try {
      const { interventionId, studentId, studentName, conceptId, tutorMessage, socraticQuestion } = req.body;

      let approvedItem: any = null;

      await writeStoreAtomically(store => {
        if (!store.interventions) store.interventions = [];
        const existingIdx = store.interventions.findIndex(i => i.id === interventionId);

        if (existingIdx >= 0) {
          store.interventions[existingIdx].status = 'Teacher-approved';
          store.interventions[existingIdx].approvedAt = new Date().toISOString();
          if (tutorMessage) store.interventions[existingIdx].tutorMessage = tutorMessage;
          if (socraticQuestion) store.interventions[existingIdx].socraticQuestion = socraticQuestion;
          if (!store.interventions[existingIdx].outcome) store.interventions[existingIdx].outcome = 'pending';
          approvedItem = store.interventions[existingIdx];
        } else {
          // If approving a newly suggested intervention
          approvedItem = {
            id: interventionId,
            studentId: studentId || 'CSE_STU_9021',
            studentName: studentName || 'Alex Rivera',
            conceptId: conceptId || 'web_apache_docroot',
            timestamp: new Date().toISOString(),
            approvedAt: new Date().toISOString(),
            tier: 1,
            issueType: 'INSTRUCTOR_APPROVED_GAP',
            tutorMessage: tutorMessage || 'Instructor-recommended focus: Review core boundary constraints.',
            socraticQuestion: socraticQuestion || 'What is the primary constraint governing this operation?',
            status: 'Teacher-approved' as const,
            outcome: 'pending' as const,
          };
          store.interventions.push(approvedItem);
        }
      });

      return res.json({ success: true, intervention: approvedItem });
    } catch (err: any) {
      return sendError(res, 500, 'INTERVENTION_APPROVE_ERROR', err?.message || 'Failed to approve intervention', req);
    }
  });

  // POST /api/teacher/interventions/dismiss
  app.post('/api/teacher/interventions/dismiss', validateBody(dismissInterventionSchema), async (req: Request, res: Response) => {
    try {
      const { interventionId } = req.body;

      await writeStoreAtomically(store => {
        if (!store.interventions) store.interventions = [];
        const idx = store.interventions.findIndex(i => i.id === interventionId);
        if (idx >= 0) {
          store.interventions[idx].status = 'dismissed';
        }
      });

      return res.json({ success: true });
    } catch (err: any) {
      return sendError(res, 500, 'INTERVENTION_DISMISS_ERROR', err?.message || 'Failed to dismiss intervention', req);
    }
  });

  // GET /api/teacher/export-csv
  app.get('/api/teacher/export-csv', (_req: Request, res: Response) => {
    try {
      const store = readStore();
      const students = (store.islm || []).filter(i => i.role === 'student');
      const attempts = store.attempts || [];

      const headers = [
        'Student ID',
        'Student Name',
        'Email',
        'Track',
        'Overall Mastery %',
        'At Risk Status',
        'Red Concepts Count',
        'Green Concepts Count',
        'Repeated Errors',
        'Hints & Assistance Requests',
        'Scaffolding Fading Rate %',
        'Time Spent (Mins)',
      ];

      const rows = students.map(s => {
        const studentAttempts = attempts.filter((a: any) => a.studentId === s.student_id);
        const redCount = Object.values(s.topic_mastery || {}).filter((v: any) => Number(v) < 0.50).length;
        const greenCount = Object.values(s.topic_mastery || {}).filter((v: any) => Number(v) >= 0.80).length;
        const repeated = studentAttempts.filter((a: any) => a.repeatedError).length;
        const hints = studentAttempts.reduce((sum: number, a: any) => sum + (a.hintsRequested || 0), 0);
        const isAtRisk = redCount >= 3 || (s.overall_mastery || 0) < 0.35;

        return [
          s.student_id,
          `"${s.name.replace(/"/g, '""')}"`,
          s.email,
          `"${(s.course_track || 'Web Application Development').replace(/"/g, '""')}"`,
          Math.round((s.overall_mastery || 0) * 100),
          isAtRisk ? 'AT RISK' : 'ON TRACK',
          redCount,
          greenCount,
          repeated,
          hints + (s.error_count || 0),
          Math.round((s.scaffolding_fading_index || 0) * 100),
          s.time_spent_mins || 0,
        ].join(',');
      });

      const csvContent = [headers.join(','), ...rows].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="cognicse_cohort_metrics.csv"');
      return res.status(200).send(csvContent);
    } catch (err: any) {
      return sendError(res, 500, 'CSV_EXPORT_ERROR', err?.message || 'Failed to export CSV', _req);
    }
  });
}
