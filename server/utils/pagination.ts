export interface PaginationOptions {
  limit?: number;
  cursor?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
  totalCount?: number;
}

export interface CursorPayload {
  ts: string;
  id: string;
}

export function encodeCursor(payload: CursorPayload): string {
  const json = JSON.stringify([payload.ts, payload.id]);
  return Buffer.from(json, 'utf-8').toString('base64url');
}

export function decodeCursor(cursor?: string | null): CursorPayload | null {
  if (!cursor || typeof cursor !== 'string') return null;
  try {
    const raw = Buffer.from(cursor, 'base64url').toString('utf-8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length >= 2) {
      return { ts: String(parsed[0]), id: String(parsed[1]) };
    }
    return null;
  } catch {
    return null;
  }
}

export function sanitizeLimit(limit?: number | string, defaultLimit = 20, maxLimit = 100): number {
  const parsed = Number(limit);
  if (isNaN(parsed) || parsed <= 0) return defaultLimit;
  return Math.min(Math.floor(parsed), maxLimit);
}
