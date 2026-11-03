import { getDb } from '../db/connection.ts';
import { StudyPlanDbRecord } from './types.ts';
import { PaginationOptions, PaginatedResult, encodeCursor, decodeCursor, sanitizeLimit } from '../utils/pagination.ts';

function rowToPlan(row: any): StudyPlanDbRecord {
  return {
    id: row.id,
    studentId: row.student_id,
    title: row.title,
    status: row.status,
    goals: row.goals_json ? JSON.parse(row.goals_json) : [],
    schedule: row.schedule_json ? JSON.parse(row.schedule_json) : [],
    meta: row.meta_json ? JSON.parse(row.meta_json) : {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const studyPlanRepository = {
  findById(id: string): StudyPlanDbRecord | null {
    const db = getDb();
    const row = db.prepare('SELECT * FROM study_plans WHERE id = ?').get(id);
    return row ? rowToPlan(row) : null;
  },

  findLatestByStudent(studentId: string): StudyPlanDbRecord | null {
    const db = getDb();
    const row = db.prepare('SELECT * FROM study_plans WHERE student_id = ? ORDER BY updated_at DESC LIMIT 1').get(studentId);
    return row ? rowToPlan(row) : null;
  },

  upsert(plan: {
    id?: string;
    studentId: string;
    title: string;
    status?: string;
    goals?: any[];
    schedule?: any[];
    meta?: Record<string, any>;
  }): StudyPlanDbRecord {
    const db = getDb();
    const now = new Date().toISOString();
    const id = plan.id || `plan_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    db.prepare(`
      INSERT INTO study_plans (id, student_id, title, status, goals_json, schedule_json, meta_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        status = excluded.status,
        goals_json = excluded.goals_json,
        schedule_json = excluded.schedule_json,
        meta_json = excluded.meta_json,
        updated_at = excluded.updated_at
    `).run(
      id,
      plan.studentId,
      plan.title,
      plan.status || 'active',
      JSON.stringify(plan.goals || []),
      JSON.stringify(plan.schedule || []),
      JSON.stringify(plan.meta || {}),
      now,
      now
    );

    return this.findById(id)!;
  },

  findByStudentPaginated(
    studentId: string,
    options?: PaginationOptions
  ): PaginatedResult<StudyPlanDbRecord> {
    const db = getDb();
    const limit = sanitizeLimit(options?.limit);
    const cursor = decodeCursor(options?.cursor);

    let query = 'SELECT * FROM study_plans WHERE student_id = ?';
    const params: any[] = [studentId];

    if (cursor) {
      query += ' AND (updated_at < ? OR (updated_at = ? AND id < ?))';
      params.push(cursor.ts, cursor.ts, cursor.id);
    }

    query += ' ORDER BY updated_at DESC, id DESC LIMIT ?';
    params.push(limit + 1);

    const rows = db.prepare(query).all(...params) as any[];
    const hasMore = rows.length > limit;
    const items = (hasMore ? rows.slice(0, limit) : rows).map(rowToPlan);

    let nextCursor: string | null = null;
    if (hasMore && items.length > 0) {
      const last = items[items.length - 1];
      nextCursor = encodeCursor({ ts: last.updatedAt, id: last.id });
    }

    const totalCount = (db.prepare('SELECT COUNT(*) as count FROM study_plans WHERE student_id = ?').get(studentId) as any)?.count || 0;

    return {
      items,
      nextCursor,
      hasMore,
      totalCount,
    };
  },

  deleteById(id: string): boolean {
    const db = getDb();
    const res = db.prepare('DELETE FROM study_plans WHERE id = ?').run(id);
    return res.changes > 0;
  },

  deleteByStudentId(studentId: string): number {
    const db = getDb();
    const res = db.prepare('DELETE FROM study_plans WHERE student_id = ?').run(studentId);
    return res.changes;
  },
};
