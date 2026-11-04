import { z, ZodSchema } from 'zod';
import { type Request, type Response, type NextFunction } from 'express';
import { sendError } from './auth.ts';

// 1. Auth Schemas
export const registerSchema = z.object({
  email: z.string().trim().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  name: z.string().trim().min(2, 'Name must be at least 2 characters'),
  degree: z.string().trim().optional(),
  inviteCode: z.string().trim().optional(),
}).strict();

export const loginSchema = z.object({
  email: z.string().trim().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
}).strict();

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters long'),
}).strict();

export const createTeacherSchema = z.object({
  email: z.string().trim().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  name: z.string().trim().min(2, 'Name must be at least 2 characters'),
  degree: z.string().trim().optional(),
}).strict();

// 2. User State Schema - Strict Whitelisting
// Never allows mutation of role, id, plan, or passwordHash
export const updateUserStateSchema = z.object({
  userProfile: z.object({
    name: z.string().trim().min(2).optional(),
    theme: z.enum(['dark', 'light']).optional(),
    preferredLanguages: z.array(z.string()).optional(),
    degree: z.string().optional(),
    avatar: z.string().optional(),
    retentionDays: z.number().int().min(1).max(3650).optional(),
  }).optional(),
  islm: z.record(z.string(), z.any()).optional(),
  dkmNodes: z.array(z.any()).optional(),
  sessions: z.array(z.any()).optional(),
}).strict();

// 3. AI & Tutoring Schemas
export const tutoringSchema = z.object({
  student_input: z.string().optional(),
  workflow: z.enum(['CODE_SANDBOX_TUTORING', 'CHATS', 'CAD_LAB_TUTORING']).optional(),
  current_topic: z.string().optional(),
  visualizer_mode: z.string().optional(),
  code_snippet: z.string().optional(),
  execution_logs: z.string().optional(),
  language: z.enum(['en', 'ta', 'hi']).optional(),
  islm_profile: z.record(z.string(), z.any()).optional(),
  course_track: z.string().optional(),
});

export const videoGenerationSchema = z.object({
  topic: z.string().min(1, 'Topic is required'),
  misconception: z.string().optional(),
  subject_track: z.string().optional(),
});

export const mockTestGenerationSchema = z.object({
  track: z.string().optional(),
  red_nodes: z.array(z.string()).optional(),
  difficulty: z.string().optional(),
});

export const libraryVaultSchema = z.object({
  document_title: z.string().min(1, 'Document title is required'),
  text_content: z.string().min(1, 'Text content is required'),
  subject_track: z.string().optional(),
});

export const variantTaskSchema = z.object({
  conceptId: z.string().min(1, 'conceptId is required'),
  conceptName: z.string().optional(),
  track: z.string().optional(),
  language: z.string().optional(),
});

// 4. Pedagogical & Assessment Schemas
export const pedagogicalEventSchema = z.object({
  type: z.string().min(1, 'type is required'),
  conceptId: z.string().optional(),
  topicId: z.string().optional(),
  payload: z.record(z.string(), z.any()).optional(),
  synthetic: z.boolean().optional(),
});

export const recordAttemptSchema = z.object({
  id: z.string().optional(),
  conceptId: z.string().optional(),
  kind: z.string().optional(),
  passed: z.boolean().optional(),
  tierUsed: z.number().optional(),
  hintsRequested: z.number().optional(),
  durationSec: z.number().optional(),
  errorCategory: z.string().optional(),
  codeSnippet: z.string().optional(),
  language: z.string().optional(),
  details: z.string().optional(),
  ts: z.string().optional(),
});

// 5. Study & Teacher Management Schemas
export const studyCreateSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  topicId: z.string().min(1, 'topicId is required'),
  topicName: z.string().optional(),
  description: z.string().optional(),
  masteryThreshold: z.number().or(z.string()).optional(),
  enableArmC: z.boolean().optional(),
});

export const studyRecordEventSchema = z.object({
  armId: z.string().min(1, 'armId is required'),
  stage: z.enum(['pre-test', 'learning', 'post-test', 'retention']),
  score: z.number().or(z.string()).optional(),
  passed: z.boolean().optional(),
  durationSec: z.number().or(z.string()).optional(),
  hintsRequested: z.number().or(z.string()).optional(),
  repeatedError: z.boolean().optional(),
  isTransferTask: z.boolean().optional(),
});

export const approveInterventionSchema = z.object({
  interventionId: z.string().min(1, 'interventionId is required'),
  studentId: z.string().optional(),
  studentName: z.string().optional(),
  conceptId: z.string().optional(),
  tutorMessage: z.string().optional(),
  socraticQuestion: z.string().optional(),
});

export const dismissInterventionSchema = z.object({
  interventionId: z.string().min(1, 'interventionId is required'),
});

// 6. Live Class Schemas
export const liveSessionStartSchema = z.object({
  topicId: z.string().optional(),
  topicName: z.string().optional(),
  track: z.string().optional(),
});

export const liveReleaseQuestionSchema = z.object({
  questionId: z.string().min(1, 'questionId is required'),
});

export const liveSubmitAnswerSchema = z.object({
  questionId: z.string().min(1, 'questionId is required'),
  selectedIndex: z.number().int().min(0),
  lowEngagement: z.boolean().optional(),
});

export const liveEngagementSchema = z.object({
  lowEngagement: z.boolean(),
});

export const liveTranscriptSchema = z.object({
  transcript: z.string().min(1, 'transcript is required'),
  track: z.string().optional(),
  topicId: z.string().optional(),
});

// 7. Query Validation Schemas
export const attemptsQuerySchema = z.object({
  studentId: z.string().optional(),
  conceptId: z.string().optional(),
  cursor: z.string().optional(),
  limit: z.string().optional(),
});

export const storeCollectionQuerySchema = z.object({
  studentId: z.string().optional(),
  cursor: z.string().optional(),
  limit: z.string().optional(),
});

// 8. Middleware Builders
export function validateBody(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const issues = (result.error as any).issues || (result.error as any).errors || [];
      const messages = issues.map((e: any) => `${e.path.join('.') || 'body'}: ${e.message}`).join('; ');
      return sendError(res, 400, 'VALIDATION_ERROR', messages || 'Invalid request body', req);
    }
    req.body = result.data;
    next();
  };
}

export function validateQuery(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      const issues = (result.error as any).issues || (result.error as any).errors || [];
      const messages = issues.map((e: any) => `${e.path.join('.') || 'query'}: ${e.message}`).join('; ');
      return sendError(res, 400, 'VALIDATION_ERROR', messages || 'Invalid query parameters', req);
    }
    req.query = result.data as any;
    next();
  };
}
