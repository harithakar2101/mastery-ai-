import { getDb } from '../db/connection.ts';
import { InterventionDbRecord } from './types.ts';
import { PaginationOptions, PaginatedResult, encodeCursor, decodeCursor, sanitizeLimit } from '../utils/pagination.ts';

function rowToIntervention(row: any): InterventionDbRecord {
  return {
    id: row.id,
    studentId: row.student_id,
    studentName: row.student_name || undefined,
    conceptId: row.concept_id || undefined,
    conceptName: row.concept_name || undefined,
    tier: row.tier ?? 1,
    issueType: row.issue_type || 'CONCEPTUAL_GAP',
    refusalReason: row.refusal_reason || undefined,
    tutorMessage: row.tutor_message || undefined,
    socraticQuestion: row.socratic_question || undefined,
    status: row.status as any,
    outcome: row.outcome as any,
    approvedAt: row.approved_at || undefined,
    outcomeRecordedAt: row.outcome_recorded_at || undefined,
    timestamp: row.ts,
    ts: row.ts,
    synthetic: Boolean(row.synthetic),
  };
}

export const interventionRepository = {
  create(item: Partial<InterventionDbRecord> & { studentId: string }): InterventionDbRecord {
    const db = getDb();
    const id = item.id || `int_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const ts = item.ts || item.timestamp || now;

    const stmt = db.prepare(`
      INSERT INTO interventions (
        id, student_id, student_name, concept_id, concept_name, tier, issue_type,
        refusal_reason, tutor_message, socratic_question, status,
        outcome, approved_at, outcome_recorded_at, ts, created_at, synthetic
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      item.studentId,
      item.studentName || null,
      item.conceptId || null,
      item.conceptName || null,
      item.tier ?? 1,
      item.issueType || 'CONCEPTUAL_GAP',
      item.refusalReason || null,
      item.tutorMessage || null,
      item.socraticQuestion || null,
      item.status || 'suggested',
      item.outcome || 'pending',
      item.approvedAt || null,
      item.outcomeRecordedAt || null,
      ts,
      now,
      item.synthetic ? 1 : 0
    );

    return this.findById(id)!;
  },

  findById(id: string): InterventionDbRecord | null {
    const db = getDb();
    const row = db.prepare('SELECT * FROM interventions WHERE id = ?').get(id);
    return row ? rowToIntervention(row) : null;
  },

  update(id: string, updates: Partial<InterventionDbRecord>): InterventionDbRecord | null {
    const db = getDb();
    const current = this.findById(id);
    if (!current) return null;

    const merged = { ...current, ...updates };

    const stmt = db.prepare(`
      UPDATE interventions SET
        student_name = ?,
        concept_id = ?,
        tier = ?,
        issue_type = ?,
        refusal_reason = ?,
        tutor_message = ?,
        socratic_question = ?,
        status = ?,
        outcome = ?,
        approved_at = ?,
        outcome_recorded_at = ?
      WHERE id = ?
    `);

    stmt.run(
      merged.studentName || null,
      merged.conceptId || null,
      merged.tier ?? 1,
      merged.issueType,
      merged.refusalReason || null,
      merged.tutorMessage || null,
      merged.socraticQuestion || null,
      merged.status,
      merged.outcome || null,
      merged.approvedAt || null,
      merged.outcomeRecordedAt || null,
      id
    );

    return this.findById(id);
  },

  listByStudentPaginated(
    studentId: string,
    options?: PaginationOptions
  ): PaginatedResult<InterventionDbRecord> {
    const db = getDb();
    const limit = sanitizeLimit(options?.limit);
    const cursor = decodeCursor(options?.cursor);

    let query = 'SELECT * FROM interventions WHERE student_id = ?';
    const params: any[] = [studentId];

    if (cursor) {
      query += ' AND (ts < ? OR (ts = ? AND id < ?))';
      params.push(cursor.ts, cursor.ts, cursor.id);
    }

    query += ' ORDER BY ts DESC, id DESC LIMIT ?';
    params.push(limit + 1);

    const rows = db.prepare(query).all(...params) as any[];
    const hasMore = rows.length > limit;
    const items = (hasMore ? rows.slice(0, limit) : rows).map(rowToIntervention);

    let nextCursor: string | null = null;
    if (hasMore && items.length > 0) {
      const last = items[items.length - 1];
      nextCursor = encodeCursor({ ts: last.ts, id: last.id });
    }

    const totalCount = (db.prepare('SELECT COUNT(*) as count FROM interventions WHERE student_id = ?').get(studentId) as any)?.count || 0;

    return {
      items,
      nextCursor,
      hasMore,
      totalCount,
    };
  },

  listAllPaginated(options?: PaginationOptions & { status?: string }): PaginatedResult<InterventionDbRecord> {
    const db = getDb();
    const limit = sanitizeLimit(options?.limit);
    const cursor = decodeCursor(options?.cursor);

    let query = 'SELECT * FROM interventions';
    const params: any[] = [];
    const conditions: string[] = [];

    if (options?.status) {
      conditions.push('status = ?');
      params.push(options.status);
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
    const items = (hasMore ? rows.slice(0, limit) : rows).map(rowToIntervention);

    let nextCursor: string | null = null;
    if (hasMore && items.length > 0) {
      const last = items[items.length - 1];
      nextCursor = encodeCursor({ ts: last.ts, id: last.id });
    }

    const countQuery = options?.status
      ? 'SELECT COUNT(*) as count FROM interventions WHERE status = ?'
      : 'SELECT COUNT(*) as count FROM interventions';
    const countParams = options?.status ? [options.status] : [];
    const totalCount = (db.prepare(countQuery).get(...countParams) as any)?.count || 0;

    return {
      items,
      nextCursor,
      hasMore,
      totalCount,
    };
  },

  findApprovedPendingForConcept(studentId: string, conceptId?: string): InterventionDbRecord | null {
    const db = getDb();
    let query = `
      SELECT * FROM interventions
      WHERE student_id = ?
        AND status = 'Teacher-approved'
        AND (outcome IS NULL OR outcome = 'pending')
    `;
    const params: any[] = [studentId];

    if (conceptId) {
      query += ' AND (concept_id IS NULL OR concept_id = ?)';
      params.push(conceptId);
    }

    query += ' ORDER BY ts DESC LIMIT 1';

    const row = db.prepare(query).get(...params);
    return row ? rowToIntervention(row) : null;
  },

  deleteByStudentId(studentId: string): number {
    const db = getDb();
    const res = db.prepare('DELETE FROM interventions WHERE student_id = ?').run(studentId);
    return res.changes;
  },

  deleteSynthetic(): number {
    const db = getDb();
    const res = db.prepare('DELETE FROM interventions WHERE synthetic = 1').run();
    return res.changes;
  },

  count(): number {
    const db = getDb();
    const res = db.prepare('SELECT COUNT(*) as count FROM interventions').get() as any;
    return res?.count || 0;
  },
};
