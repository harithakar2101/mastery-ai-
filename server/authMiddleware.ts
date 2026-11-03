import { type Request, type Response, type NextFunction } from 'express';
import { verifySessionToken, COOKIE_NAME, sendError, type AuthUser } from './auth.ts';
import { readStore, type UserRole } from './store.ts';

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  const existing = req.headers['x-request-id'] as string;
  const requestId = existing || `req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  req.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);
  next();
}

function extractToken(req: Request): string | null {
  // 1. Try httpOnly cookie first
  if (req.cookies && req.cookies[COOKIE_NAME]) {
    return req.cookies[COOKIE_NAME];
  }

  // 2. Try Authorization: Bearer <token>
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }

  return null;
}

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (!token) {
    return sendError(res, 401, 'UNAUTHORIZED', 'Authentication required: missing session token', req);
  }

  const result = verifySessionToken(token);
  if (!result.valid || !result.payload) {
    return sendError(res, 401, 'UNAUTHORIZED', `Invalid session token: ${result.reason || 'verification failed'}`, req);
  }

  const store = readStore();
  const user = store.users.find(u => u.id === result.payload!.userId);

  if (!user) {
    return sendError(res, 401, 'UNAUTHORIZED', 'User associated with session not found', req);
  }

  // Token revocation check: if user clicked "sign out everywhere", tokenVersion incremented
  const currentTokenVersion = user.tokenVersion || 1;
  if (result.payload.tokenVersion !== currentTokenVersion) {
    return sendError(res, 401, 'UNAUTHORIZED', 'Session revoked: user signed out on all devices', req);
  }

  req.user = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    tokenVersion: currentTokenVersion,
    degree: user.degree,
    plan: user.plan || 'Free Plan',
  };

  next();
}

export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return sendError(res, 401, 'UNAUTHORIZED', 'Authentication required', req);
    }

    if (!allowedRoles.includes(req.user.role)) {
      return sendError(
        res,
        403,
        'FORBIDDEN',
        `Insufficient privileges: route requires [${allowedRoles.join(', ')}], current role is '${req.user.role}'`,
        req
      );
    }

    next();
  };
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (!token) return next();

  const result = verifySessionToken(token);
  if (!result.valid || !result.payload) return next();

  const store = readStore();
  const user = store.users.find(u => u.id === result.payload!.userId);
  if (!user) return next();

  const currentTokenVersion = user.tokenVersion || 1;
  if (result.payload.tokenVersion !== currentTokenVersion) return next();

  req.user = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    tokenVersion: currentTokenVersion,
    degree: user.degree,
    plan: user.plan || 'Free Plan',
  };

  next();
}
