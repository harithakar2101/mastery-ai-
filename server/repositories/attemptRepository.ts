import { getDb } from '../db/connection.ts';
import { AttemptDbRecord } from './types.ts';
import { PaginationOptions, PaginatedResult, encodeCursor, decodeCursor, sanitizeLimit } from '../utils/pagination.ts';

function rowToAttempt(row: any): AttemptDbRecord {
  return {
    id: row.id,
    studentId: row.student_id,
    conceptId: row.concept_id || undefined,
    kind: row.kind || 'code_lab',
    passed: Boolean(row.passed),
    tierUsed: row.tier_used ?? 1,
    hintsRequested: row.hints_requested ?? 0,
    durationSec: row.duration_sec ?? 0,
    errorCategory: row.error_category || undefined,
    repeatedError: Boolean(row.repeated_error),
    codeSnippet: row.code_snippet || undefined,
    language: row.language || undefined,
    details: row.details || undefined,
    ts: row.ts,
    timestamp: row.ts,
    isSuccess: Boolean(row.passed),
    synthetic: Boolean(row.synthetic),
  };
}

export const attemptRepository = {
  create(attempt: Partial<AttemptDbRecord> & { studentId: string }): AttemptDbRecord {
    const db = getDb();
    const id = attempt.id || `att_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const ts = attempt.ts || attempt.timestamp || now;

    const stmt = db.prepare(`
      INSERT INTO attempts (
        id, student_id, concept_id, kind, passed, tier_used,
        hints_requested, duration_sec, error_category, repeated_error,
        code_snippet, language, details, ts, created_at, synthetic
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      attempt.studentId,
      attempt.conceptId || null,
      attempt.kind || 'code_lab',
      attempt.passed ? 1 : 0,
      attempt.tierUsed ?? 1,
      attempt.hintsRequested ?? 0,
      attempt.durationSec ?? 0,
      attempt.errorCategory || null,
      attempt.repeatedError ? 1 : 0,
      attempt.codeSnippet || null,
      attempt.language || null,
      attempt.details || null,
      ts,
      now,
      attempt.synthetic ? 1 : 0
    );

    return this.findById(id)!;
  },

  findById(id: string): AttemptDbRecord | null {
    const db = getDb();
    const row = db.prepare('SELECT * FROM attempts WHERE id = ?').get(id);
    return row ? rowToAttempt(row) : null;
  },

  listByStudentPaginated(
    studentId: string,
    options?: PaginationOptions & { conceptId?: string }
  ): PaginatedResult<AttemptDbRecord> {
    const db = getDb();
    const limit = sanitizeLimit(options?.limit);
    const cursor = decodeCursor(options?.cursor);

    let query = 'SELECT * FROM attempts WHERE student_id = ?';
    const params: any[] = [studentId];

    if (options?.conceptId) {
      query += ' AND concept_id = ?';
      params.push(options.conceptId);
    }

    if (cursor) {
      query += ' AND (ts < ? OR (ts = ? AND id < ?))';
      params.push(cursor.ts, cursor.ts, cursor.id);
    }

    query += ' ORDER BY ts DESC, id DESC LIMIT ?';
    params.push(limit + 1);

    const rows = db.prepare(query).all(...params) as any[];
    const hasMore = rows.length > limit;
    const items = (hasMore ? rows.slice(0, limit) : rows).map(rowToAttempt);

    let nextCursor: string | null = null;
    if (hasMore && items.length > 0) {
      const last = items[items.length - 1];
      nextCursor = encodeCursor({ ts: last.ts, id: last.id });
    }

    const countQuery = options?.conceptId
      ? 'SELECT COUNT(*) as count FROM attempts WHERE student_id = ? AND concept_id = ?'
      : 'SELECT COUNT(*) as count FROM attempts WHERE student_id = ?';
    const countParams = options?.conceptId ? [studentId, options.conceptId] : [studentId];
    const totalCount = (db.prepare(countQuery).get(...countParams) as any)?.count || 0;

    return {
      items,
      nextCursor,
      hasMore,
      totalCount,
    };
  },

  listByStudentAndConcept(studentId: string, conceptId: string): AttemptDbRecord[] {
    const db = getDb();
    const rows = db.prepare('SELECT * FROM attempts WHERE student_id = ? AND concept_id = ? ORDER BY ts ASC')
      .all(studentId, conceptId);
    return rows.map(rowToAttempt);
  },

  listAllForStudent(studentId: string): AttemptDbRecord[] {
    const db = getDb();
    const rows = db.prepare('SELECT * FROM attempts WHERE student_id = ? ORDER BY ts ASC').all(studentId);
    return rows.map(rowToAttempt);
  },

  listByStudent(studentId: string): AttemptDbRecord[] {
    return this.listAllForStudent(studentId);
  },

  listAll(): AttemptDbRecord[] {
    const db = getDb();
    const rows = db.prepare('SELECT * FROM attempts ORDER BY ts ASC').all();
    return rows.map(rowToAttempt);
  },

  deleteByStudentId(studentId: string): number {
    const db = getDb();
    const res = db.prepare('DELETE FROM attempts WHERE student_id = ?').run(studentId);
    return res.changes;
  },

  deleteSynthetic(): number {
    const db = getDb();
    const res = db.prepare('DELETE FROM attempts WHERE synthetic = 1').run();
    return res.changes;
  },

  count(): number {
    const db = getDb();
    const res = db.prepare('SELECT COUNT(*) as count FROM attempts').get() as any;
    return res?.count || 0;
  },
};
