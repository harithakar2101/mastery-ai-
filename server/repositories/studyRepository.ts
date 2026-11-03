import { getDb } from '../db/connection.ts';
import { PaginationOptions, PaginatedResult, encodeCursor, decodeCursor, sanitizeLimit } from '../utils/pagination.ts';

function rowToStudy(row: any): any {
  return {
    id: row.id,
    title: row.title,
    topicId: row.topic_id,
    topicName: row.topic_name,
    description: row.description || '',
    status: row.status || 'draft',
    arms: row.arms_json ? JSON.parse(row.arms_json) : [],
    items: row.items_json ? JSON.parse(row.items_json) : [],
    masteryThreshold: row.mastery_threshold ?? 90,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const studyRepository = {
  findById(id: string): any | null {
    const db = getDb();
    const row = db.prepare('SELECT * FROM studies WHERE id = ?').get(id);
    return row ? rowToStudy(row) : null;
  },

  findAll(): any[] {
    const db = getDb();
    const rows = db.prepare('SELECT * FROM studies ORDER BY created_at DESC').all();
    return rows.map(rowToStudy);
  },

  create(study: any): any {
    const db = getDb();
    const now = new Date().toISOString();
    const id = study.id || `study_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    db.prepare(`
      INSERT INTO studies (
        id, title, topic_id, topic_name, description, status,
        arms_json, items_json, mastery_threshold, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      study.title,
      study.topicId,
      study.topicName || study.topicId,
      study.description || '',
      study.status || 'draft',
      JSON.stringify(study.arms || []),
      JSON.stringify(study.items || []),
      Number(study.masteryThreshold) || 90,
      study.createdAt || now,
      study.updatedAt || now
    );

    return this.findById(id)!;
  },

  update(id: string, updates: any): any | null {
    const db = getDb();
    const current = this.findById(id);
    if (!current) return null;

    const merged = { ...current, ...updates, updatedAt: new Date().toISOString() };

    db.prepare(`
      UPDATE studies SET
        title = ?,
        topic_id = ?,
        topic_name = ?,
        description = ?,
        status = ?,
        arms_json = ?,
        items_json = ?,
        mastery_threshold = ?,
        updated_at = ?
      WHERE id = ?
    `).run(
      merged.title,
      merged.topicId,
      merged.topicName,
      merged.description,
      merged.status,
      JSON.stringify(merged.arms || []),
      JSON.stringify(merged.items || []),
      Number(merged.masteryThreshold) || 90,
      merged.updatedAt,
      id
    );

    return this.findById(id);
  },

  delete(id: string): boolean {
    const db = getDb();
    const res = db.prepare('DELETE FROM studies WHERE id = ?').run(id);
    return res.changes > 0;
  },

  listPaginated(options?: PaginationOptions): PaginatedResult<any> {
    const db = getDb();
    const limit = sanitizeLimit(options?.limit);
    const cursor = decodeCursor(options?.cursor);

    let query = 'SELECT * FROM studies';
    const params: any[] = [];

    if (cursor) {
      query += ' WHERE created_at < ? OR (created_at = ? AND id < ?)';
      params.push(cursor.ts, cursor.ts, cursor.id);
    }

    query += ' ORDER BY created_at DESC, id DESC LIMIT ?';
    params.push(limit + 1);

    const rows = db.prepare(query).all(...params) as any[];
    const hasMore = rows.length > limit;
    const items = (hasMore ? rows.slice(0, limit) : rows).map(rowToStudy);

    let nextCursor: string | null = null;
    if (hasMore && items.length > 0) {
      const last = items[items.length - 1];
      nextCursor = encodeCursor({ ts: last.createdAt, id: last.id });
    }

    const totalCount = (db.prepare('SELECT COUNT(*) as count FROM studies').get() as any)?.count || 0;

    return {
      items,
      nextCursor,
      hasMore,
      totalCount,
    };
  },
};
