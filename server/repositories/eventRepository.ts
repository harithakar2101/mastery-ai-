import { getDb } from '../db/connection.ts';
import { PedagogicalEventRecord } from './types.ts';
import { PaginationOptions, PaginatedResult, encodeCursor, decodeCursor, sanitizeLimit } from '../utils/pagination.ts';

function rowToEvent(row: any): PedagogicalEventRecord {
  return {
    id: row.id,
    studentId: row.student_id,
    type: row.type,
    conceptId: row.concept_id || undefined,
    topicId: row.topic_id || undefined,
    payload: row.payload ? JSON.parse(row.payload) : {},
    synthetic: Boolean(row.synthetic),
    ts: row.ts,
    createdAt: row.created_at,
  };
}

export const eventRepository = {
  // Append-only event creation
  append(event: {
    id?: string;
    studentId: string;
    type: string;
    conceptId?: string;
    topicId?: string;
    payload?: Record<string, any>;
    synthetic?: boolean;
    ts?: string;
  }): PedagogicalEventRecord {
    const db = getDb();
    const id = event.id || `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const ts = event.ts || now;

    const stmt = db.prepare(`
      INSERT INTO events (id, student_id, type, concept_id, topic_id, payload, synthetic, ts, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      event.studentId,
      event.type,
      event.conceptId || null,
      event.topicId || null,
      JSON.stringify(event.payload || {}),
      event.synthetic ? 1 : 0,
      ts,
      now
    );

    return this.findById(id)!;
  },

  findById(id: string): PedagogicalEventRecord | null {
    const db = getDb();
    const row = db.prepare('SELECT * FROM events WHERE id = ?').get(id);
    return row ? rowToEvent(row) : null;
  },

  listByStudentPaginated(
    studentId: string,
    options?: PaginationOptions & { conceptId?: string; type?: string }
  ): PaginatedResult<PedagogicalEventRecord> {
    const db = getDb();
    const limit = sanitizeLimit(options?.limit);
    const cursor = decodeCursor(options?.cursor);

    let query = 'SELECT * FROM events WHERE student_id = ?';
    const params: any[] = [studentId];

    if (options?.conceptId) {
      query += ' AND concept_id = ?';
      params.push(options.conceptId);
    }

    if (options?.type) {
      query += ' AND type = ?';
      params.push(options.type);
    }

    if (cursor) {
      query += ' AND (ts < ? OR (ts = ? AND id < ?))';
      params.push(cursor.ts, cursor.ts, cursor.id);
    }

    query += ' ORDER BY ts DESC, id DESC LIMIT ?';
    params.push(limit + 1);

    const rows = db.prepare(query).all(...params) as any[];
    const hasMore = rows.length > limit;
    const items = (hasMore ? rows.slice(0, limit) : rows).map(rowToEvent);

    let nextCursor: string | null = null;
    if (hasMore && items.length > 0) {
      const last = items[items.length - 1];
      nextCursor = encodeCursor({ ts: last.ts, id: last.id });
    }

    const countQuery = 'SELECT COUNT(*) as count FROM events WHERE student_id = ?';
    const totalCount = (db.prepare(countQuery).get(studentId) as any)?.count || 0;

    return {
      items,
      nextCursor,
      hasMore,
      totalCount,
    };
  },

  listByStudyPaginated(
    studyId: string,
    options?: PaginationOptions
  ): PaginatedResult<PedagogicalEventRecord> {
    const db = getDb();
    const limit = sanitizeLimit(options?.limit, 50, 200);
    const cursor = decodeCursor(options?.cursor);

    // json_extract for studyId inside payload
    let query = "SELECT * FROM events WHERE json_extract(payload, '$.studyId') = ?";
    const params: any[] = [studyId];

    if (cursor) {
      query += ' AND (ts < ? OR (ts = ? AND id < ?))';
      params.push(cursor.ts, cursor.ts, cursor.id);
    }

    query += ' ORDER BY ts DESC, id DESC LIMIT ?';
    params.push(limit + 1);

    const rows = db.prepare(query).all(...params) as any[];
    const hasMore = rows.length > limit;
    const items = (hasMore ? rows.slice(0, limit) : rows).map(rowToEvent);

    let nextCursor: string | null = null;
    if (hasMore && items.length > 0) {
      const last = items[items.length - 1];
      nextCursor = encodeCursor({ ts: last.ts, id: last.id });
    }

    const countQuery = "SELECT COUNT(*) as count FROM events WHERE json_extract(payload, '$.studyId') = ?";
    const totalCount = (db.prepare(countQuery).get(studyId) as any)?.count || 0;

    return {
      items,
      nextCursor,
      hasMore,
      totalCount,
    };
  },

  listAllForStudy(studyId: string): PedagogicalEventRecord[] {
    const db = getDb();
    const rows = db.prepare("SELECT * FROM events WHERE json_extract(payload, '$.studyId') = ? ORDER BY ts ASC").all(studyId);
    return rows.map(rowToEvent);
  },

  listAllPaginated(options?: PaginationOptions & { synthetic?: boolean }): PaginatedResult<PedagogicalEventRecord> {
    const db = getDb();
    const limit = sanitizeLimit(options?.limit);
    const cursor = decodeCursor(options?.cursor);

    let query = 'SELECT * FROM events';
    const params: any[] = [];
    const conditions: string[] = [];

    if (options?.synthetic !== undefined) {
      conditions.push('synthetic = ?');
      params.push(options.synthetic ? 1 : 0);
    }

    if (cursor) {
      conditions.push('(ts < ? OR (ts = ? AND id < ?))');
      params.push(cursor.ts, cursor.ts, cursor.id);
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += ' ORDER BY ts DESC, id DESC LIMIT ?';
    params.push(limit + 1);

    const rows = db.prepare(query).all(...params) as any[];
    const hasMore = rows.length > limit;
    const items = (hasMore ? rows.slice(0, limit) : rows).map(rowToEvent);

    let nextCursor: string | null = null;
    if (hasMore && items.length > 0) {
      const last = items[items.length - 1];
      nextCursor = encodeCursor({ ts: last.ts, id: last.id });
    }

    const totalCount = (db.prepare('SELECT COUNT(*) as count FROM events').get() as any)?.count || 0;

    return {
      items,
      nextCursor,
      hasMore,
      totalCount,
    };
  },

  deleteById(id: string): boolean {
    const db = getDb();
    const res = db.prepare('DELETE FROM events WHERE id = ?').run(id);
    return res.changes > 0;
  },

  deleteByStudyId(studyId: string): number {
    const db = getDb();
    const res = db.prepare("DELETE FROM events WHERE json_extract(payload, '$.studyId') = ?").run(studyId);
    return res.changes;
  },

  deleteByStudentId(studentId: string): number {
    const db = getDb();
    const res = db.prepare('DELETE FROM events WHERE student_id = ?').run(studentId);
    return res.changes;
  },

  deleteSynthetic(): number {
    const db = getDb();
    const res = db.prepare('DELETE FROM events WHERE synthetic = 1').run();
    return res.changes;
  },

  count(): number {
    const db = getDb();
    const res = db.prepare('SELECT COUNT(*) as count FROM events').get() as any;
    return res?.count || 0;
  },
};
