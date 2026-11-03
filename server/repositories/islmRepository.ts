import { getDb } from '../db/connection.ts';
import { ISLMRecord } from './types.ts';
import { PaginationOptions, PaginatedResult, encodeCursor, decodeCursor, sanitizeLimit } from '../utils/pagination.ts';

function rowToIslm(row: any): ISLMRecord {
  return {
    student_id: row.student_id,
    name: row.name,
    email: row.email,
    role: row.role,
    course_track: row.course_track,
    overall_mastery: row.overall_mastery ?? 0.50,
    topic_mastery: row.topic_mastery ? JSON.parse(row.topic_mastery) : {},
    recent_misconceptions: row.recent_misconceptions ? JSON.parse(row.recent_misconceptions) : [],
    scaffolding_tier_required: row.scaffolding_tier_required ?? 1,
    error_count: row.error_count ?? 0,
    independent_solves: row.independent_solves ?? 0,
    scaffolding_fading_index: row.scaffolding_fading_index ?? 0.20,
    time_spent_mins: row.time_spent_mins ?? 0,
    history: row.history ? JSON.parse(row.history) : [],
    synthetic: Boolean(row.synthetic),
  };
}

export const islmRepository = {
  findByStudentId(studentId: string): ISLMRecord | null {
    const db = getDb();
    const row = db.prepare('SELECT * FROM islm WHERE student_id = ?').get(studentId);
    return row ? rowToIslm(row) : null;
  },

  upsert(islm: Partial<ISLMRecord> & { student_id: string }): ISLMRecord {
    const db = getDb();
    const existing = this.findByStudentId(islm.student_id);
    const now = new Date().toISOString();

    if (existing) {
      const merged: ISLMRecord = {
        ...existing,
        ...islm,
        student_id: islm.student_id,
        role: existing.role, // Server-authoritative role
      };

      const stmt = db.prepare(`
        UPDATE islm SET
          name = ?,
          email = ?,
          role = ?,
          course_track = ?,
          overall_mastery = ?,
          topic_mastery = ?,
          recent_misconceptions = ?,
          scaffolding_tier_required = ?,
          error_count = ?,
          independent_solves = ?,
          scaffolding_fading_index = ?,
          time_spent_mins = ?,
          history = ?,
          updated_at = ?
        WHERE student_id = ?
      `);

      stmt.run(
        merged.name,
        merged.email,
        merged.role,
        merged.course_track || 'Web Application Development',
        merged.overall_mastery ?? 0.50,
        JSON.stringify(merged.topic_mastery || {}),
        JSON.stringify(merged.recent_misconceptions || []),
        merged.scaffolding_tier_required ?? 1,
        merged.error_count ?? 0,
        merged.independent_solves ?? 0,
        merged.scaffolding_fading_index ?? 0.20,
        merged.time_spent_mins ?? 0,
        JSON.stringify(merged.history || []),
        now,
        islm.student_id
      );

      return this.findByStudentId(islm.student_id)!;
    } else {
      const stmt = db.prepare(`
        INSERT INTO islm (
          student_id, name, email, role, course_track, overall_mastery,
          topic_mastery, recent_misconceptions, scaffolding_tier_required,
          error_count, independent_solves, scaffolding_fading_index,
          time_spent_mins, history, updated_at, synthetic
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        islm.student_id,
        islm.name || 'Student',
        islm.email || `${islm.student_id.toLowerCase()}@university.edu`,
        islm.role || 'student',
        islm.course_track || 'Data Structures & Algorithms',
        islm.overall_mastery ?? 0.50,
        JSON.stringify(islm.topic_mastery || {}),
        JSON.stringify(islm.recent_misconceptions || []),
        islm.scaffolding_tier_required ?? 1,
        islm.error_count ?? 0,
        islm.independent_solves ?? 0,
        islm.scaffolding_fading_index ?? 0.20,
        islm.time_spent_mins ?? 0,
        JSON.stringify(islm.history || []),
        now,
        islm.synthetic ? 1 : 0
      );

      return this.findByStudentId(islm.student_id)!;
    }
  },

  listStudents(): ISLMRecord[] {
    const db = getDb();
    const rows = db.prepare("SELECT * FROM islm WHERE role = 'student' ORDER BY student_id ASC").all();
    return rows.map(rowToIslm);
  },

  listPaginated(options?: PaginationOptions & { role?: string }): PaginatedResult<ISLMRecord> {
    const db = getDb();
    const limit = sanitizeLimit(options?.limit);
    const cursor = decodeCursor(options?.cursor);

    let query = 'SELECT * FROM islm';
    const params: any[] = [];
    const conditions: string[] = [];

    if (options?.role) {
      conditions.push('role = ?');
      params.push(options.role);
    }

    if (cursor) {
      conditions.push('(updated_at < ? OR (updated_at = ? AND student_id < ?))');
      params.push(cursor.ts, cursor.ts, cursor.id);
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += ' ORDER BY updated_at DESC, student_id DESC LIMIT ?';
    params.push(limit + 1);

    const rows = db.prepare(query).all(...params) as any[];
    const hasMore = rows.length > limit;
    const items = (hasMore ? rows.slice(0, limit) : rows).map(rowToIslm);

    let nextCursor: string | null = null;
    if (hasMore && items.length > 0) {
      const last = items[items.length - 1];
      nextCursor = encodeCursor({ ts: (last as any).updated_at || new Date().toISOString(), id: last.student_id });
    }

    const totalCount = (db.prepare('SELECT COUNT(*) as count FROM islm').get() as any)?.count || 0;

    return {
      items,
      nextCursor,
      hasMore,
      totalCount,
    };
  },

  deleteByStudentId(studentId: string): boolean {
    const db = getDb();
    const res = db.prepare('DELETE FROM islm WHERE student_id = ?').run(studentId);
    return res.changes > 0;
  },

  deleteSynthetic(): number {
    const db = getDb();
    const res = db.prepare('DELETE FROM islm WHERE synthetic = 1').run();
    return res.changes;
  },
};
