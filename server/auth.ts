import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { type Request, type Response, type NextFunction } from 'express';
import { readStore, writeStoreAtomically, type StoreUser, type UserRole } from './store.ts';

const SESSION_SECRET = process.env.SESSION_SECRET || 'mastery-ai_secure_session_signing_secret_key_2026';
export const COOKIE_NAME = 'mastery_session';
export const TEACHER_INVITE_CODE = process.env.TEACHER_INVITE_CODE || 'TEACHER_INVITE_2026';

export interface TokenPayload {
  userId: string;
  email: string;
  role: UserRole;
  tokenVersion: number;
  iat: number;
  exp: number;
  jti: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  tokenVersion: number;
  degree?: string;
  plan: string;
}

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      requestId?: string;
    }
  }
}

function base64UrlEncode(str: string): string {
  return Buffer.from(str, 'utf-8').toString('base64url');
}

function base64UrlDecode(str: string): string {
  return Buffer.from(str, 'base64url').toString('utf-8');
}

function signString(data: string): string {
  return crypto.createHmac('sha256', SESSION_SECRET).update(data).digest('base64url');
}

export function createSessionToken(user: { id: string; email: string; role: UserRole; tokenVersion?: number }): string {
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + 7 * 24 * 60 * 60; // 7 days
  const payload: TokenPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    tokenVersion: user.tokenVersion || 1,
    iat,
    exp,
    jti: crypto.randomBytes(12).toString('hex'),
  };

  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = signString(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export function verifySessionToken(token: string): { valid: boolean; payload?: TokenPayload; reason?: string } {
  if (!token || typeof token !== 'string') {
    return { valid: false, reason: 'Missing token' };
  }

  const parts = token.split('.');
  if (parts.length !== 2) {
    return { valid: false, reason: 'Malformed token structure' };
  }

  const [encodedPayload, signature] = parts;
  const expectedSignature = signString(encodedPayload);

  // Timing safe comparison to prevent timing attacks
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expectedSignature);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return { valid: false, reason: 'Invalid signature' };
  }

  try {
    const payload: TokenPayload = JSON.parse(base64UrlDecode(encodedPayload));
    const now = Math.floor(Date.now() / 1000);

    if (payload.exp < now) {
      return { valid: false, reason: 'Token expired' };
    }

    return { valid: true, payload };
  } catch (err) {
    return { valid: false, reason: 'Corrupt payload' };
  }
}

export async function hashPassword(plainText: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plainText, salt);
}

export async function verifyPassword(plainText: string, hash: string): Promise<boolean> {
  if (!plainText || !hash) return false;
  return bcrypt.compare(plainText, hash);
}

export function getCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  };
}

export function setSessionCookie(res: Response, token: string) {
  res.cookie(COOKIE_NAME, token, getCookieOptions());
}

export function clearSessionCookie(res: Response) {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  });
}

// Consistent Error Formatter helper
export function sendError(
  res: Response,
  statusCode: number,
  code: string,
  message: string,
  req?: Request
) {
  const requestId = req?.requestId || (req?.headers['x-request-id'] as string) || `req_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  return res.status(statusCode).json({
    error: {
      code,
      message,
      requestId,
    },
  });
}
