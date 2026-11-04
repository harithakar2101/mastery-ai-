import { type Request, type Response, type NextFunction } from 'express';
import { quotaRepository } from './repositories/quotaRepository.ts';
import { sendError } from './auth.ts';

export function enforceAiQuota(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return next();
  }

  const userId = req.user.id;
  const role = req.user.role;
  const contentLength = Number(req.headers['content-length'] || 0);

  const status = quotaRepository.checkQuota(userId, role, contentLength);

  if (!status.allowed) {
    res.setHeader('Retry-After', '3600');
    return sendError(
      res,
      429,
      'DAILY_QUOTA_EXCEEDED',
      `Daily AI request limit reached (${status.limit} requests/day). Your quota will reset at ${status.resetAt}.`,
      req
    );
  }

  // Hook res.on('finish') to increment quota usage if call succeeded
  res.on('finish', () => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      // Estimate ~350 tokens per typical JSON completion or use response header
      quotaRepository.incrementUsage(userId, 1, 350, contentLength);
    }
  });

  next();
}
