import { z, ZodSchema } from 'zod';
import { type Request, type Response, type NextFunction } from 'express';
import { sendError } from './auth.ts';

export const registerSchema = z.object({
  email: z.string().trim().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  name: z.string().trim().min(2, 'Name must be at least 2 characters'),
  degree: z.string().trim().optional(),
  inviteCode: z.string().trim().optional(),
});

export const loginSchema = z.object({
  email: z.string().trim().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters long'),
});

// Whitelisted profile update fields (never allows role, id, or plan modifications)
export const updateUserStateSchema = z.object({
  userProfile: z.object({
    name: z.string().trim().min(2).optional(),
    theme: z.enum(['dark', 'light']).optional(),
    preferredLanguages: z.array(z.string()).optional(),
    degree: z.string().optional(),
    avatar: z.string().optional(),
  }).optional(),
  islm: z.record(z.any()).optional(),
  dkmNodes: z.array(z.any()).optional(),
  sessions: z.array(z.any()).optional(),
});

export const tutoringSchema = z.object({
  student_input: z.string().optional(),
  workflow: z.enum(['CODE_SANDBOX_TUTORING', 'CHATS', 'CAD_LAB_TUTORING']).optional(),
  current_topic: z.string().optional(),
  visualizer_mode: z.string().optional(),
  code_snippet: z.string().optional(),
  execution_logs: z.string().optional(),
  language: z.enum(['en', 'ta', 'hi']).optional(),
  islm_profile: z.record(z.any()).optional(),
  course_track: z.string().optional(),
});

export const pedagogicalEventSchema = z.object({
  type: z.string().min(1),
  conceptId: z.string().optional(),
  topicId: z.string().optional(),
  payload: z.record(z.any()).optional(),
  synthetic: z.boolean().optional(),
});

export function validateBody(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const messages = result.error.errors.map(e => `${e.path.join('.') || 'body'}: ${e.message}`).join('; ');
      return sendError(res, 400, 'VALIDATION_ERROR', messages, req);
    }
    req.body = result.data;
    next();
  };
}

export function validateQuery(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      const messages = result.error.errors.map(e => `${e.path.join('.') || 'query'}: ${e.message}`).join('; ');
      return sendError(res, 400, 'VALIDATION_ERROR', messages, req);
    }
    req.query = result.data as any;
    next();
  };
}
