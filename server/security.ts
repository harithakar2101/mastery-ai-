import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { type Request, type Response, type NextFunction } from 'express';
import { sendError } from './auth.ts';

// 1. Helmet configuration suited for Vite React SPA and iframe preview
export const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
      imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
      connectSrc: ["'self'", 'ws:', 'wss:', 'https:'],
      mediaSrc: ["'self'", 'blob:', 'data:'],
      frameAncestors: ["'self'", 'https:', 'http:'],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
});

// 2. Strict CORS allow-list
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  process.env.APP_URL || '',
].filter(Boolean);

export function corsMiddleware(req: Request, res: Response, next: NextFunction) {
  const origin = req.headers.origin;

  if (origin) {
    const isAllowed =
      ALLOWED_ORIGINS.includes(origin) ||
      origin.includes('.run.app') ||
      origin.includes('localhost') ||
      origin.includes('127.0.0.1');

    if (isAllowed) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Request-Id');
    }
  }

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  next();
}

const isTest = process.env.NODE_ENV === 'test';

// 3. Multi-tier Rate Limiters with standard error JSON format
export const globalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: isTest ? 5000 : 300,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    sendError(res, 429, 'RATE_LIMIT_EXCEEDED', 'Too many requests across system. Please slow down.', req);
  },
});

export const authLimiter = rateLimit({
  windowMs: isTest ? 1000 : 15 * 60 * 1000, // 15 minutes
  max: isTest ? 1000 : 25, // Stricter limit on auth routes to prevent brute-force attacks
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    sendError(res, 429, 'RATE_LIMIT_EXCEEDED', 'Too many authentication attempts. Please try again after 15 minutes.', req);
  },
});

export const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: isTest ? 1000 : 30, // Stricter limit on AI routes
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    sendError(res, 429, 'RATE_LIMIT_EXCEEDED', 'AI generation rate limit reached. Please wait a few seconds before submitting another prompt.', req);
  },
});
