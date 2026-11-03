import { getDb } from '../db/connection.ts';
import { SessionDbRecord } from './types.ts';
import { PaginationOptions, PaginatedResult, encodeCursor, decodeCursor, sanitizeLimit } from '../utils/pagination.ts';

function rowToSession(row: any): SessionDbRecord {
  return {
    id: row.id,
    studentId: row.student_id,
    title: row.title,
    messages: row.messages_json ? JSON.parse(row.messages_json) : [],
    ts: row.ts,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const sessionRepository = {
  findById(id: string): SessionDbRecord | null {
    const db = getDb();
    const row = db.prepare('SELECT * FROM sessions WHERE id = ?').get(id);
    return row ? rowToSession(row) : null;
  },

  upsert(session: { id: string; studentId: string; title: string; messages: any[]; ts?: string }): SessionDbRecord {
    const db = getDb();
    const now = new Date().toISOString();
    const ts = session.ts || now;
    const messagesJson = JSON.stringify(session.messages || []);

    db.prepare(`
      INSERT INTO sessions (id, student_id, title, messages_json, ts, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        student_id = excluded.student_id,
        title = excluded.title,
        messages_json = excluded.messages_json,
        ts = excluded.ts,
        updated_at = excluded.updated_at
    `).run(session.id, session.studentId, session.title || 'Chat Session', messagesJson, ts, now, now);

    return this.findById(session.id)!;
  },

  replaceForStudent(studentId: string, sessions: Array<{ id: string; studentId?: string; title?: string; messages?: any[]; ts?: string }>): void {
    const db = getDb();
    const runTx = db.transaction(() => {
      db.prepare('DELETE FROM sessions WHERE student_id = ?').run(studentId);
      const now = new Date().toISOString();
      const stmt = db.prepare(`
        INSERT INTO sessions (id, student_id, title, messages_json, ts, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      for (const s of sessions) {
        stmt.run(
          s.id || `sess_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          studentId,
          s.title || 'Chat Session',
          JSON.stringify(s.messages || []),
          s.ts || now,
          now,
          now
        );
      }
    });
    runTx();
  },

  findByStudentPaginated(
    studentId: string,
    options?: PaginationOptions
  ): PaginatedResult<SessionDbRecord> {
    const db = getDb();
    const limit = sanitizeLimit(options?.limit);
    const cursor = decodeCursor(options?.cursor);

    let query = 'SELECT * FROM sessions WHERE student_id = ?';
    const params: any[] = [studentId];

    if (cursor) {
      query += ' AND (ts < ? OR (ts = ? AND id < ?))';
      params.push(cursor.ts, cursor.ts, cursor.id);
    }

    query += ' ORDER BY ts DESC, id DESC LIMIT ?';
    params.push(limit + 1);

    const rows = db.prepare(query).all(...params) as any[];
    const hasMore = rows.length > limit;
    const items = (hasMore ? rows.slice(0, limit) : rows).map(rowToSession);

    let nextCursor: string | null = null;
    if (hasMore && items.length > 0) {
      const last = items[items.length - 1];
      nextCursor = encodeCursor({ ts: last.ts, id: last.id });
    }

    const totalCount = (db.prepare('SELECT COUNT(*) as count FROM sessions WHERE student_id = ?').get(studentId) as any)?.count || 0;

    return {
      items,
      nextCursor,
      hasMore,
      totalCount,
    };
  },

  listAllForStudent(studentId: string): SessionDbRecord[] {
    const db = getDb();
    const rows = db.prepare('SELECT * FROM sessions WHERE student_id = ? ORDER BY ts ASC').all(studentId);
    return rows.map(rowToSession);
  },

  deleteByStudentId(studentId: string): number {
    const db = getDb();
    const res = db.prepare('DELETE FROM sessions WHERE student_id = ?').run(studentId);
    return res.changes;
  },
};
