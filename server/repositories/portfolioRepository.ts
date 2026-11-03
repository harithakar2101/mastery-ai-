import { getDb } from '../db/connection.ts';
import { PortfolioDbRecord } from './types.ts';
import { PaginationOptions, PaginatedResult, encodeCursor, decodeCursor, sanitizeLimit } from '../utils/pagination.ts';

function rowToPortfolio(row: any): PortfolioDbRecord {
  return {
    id: row.id,
    studentId: row.student_id,
    artifactType: row.artifact_type,
    title: row.title,
    content: row.content_json ? JSON.parse(row.content_json) : {},
    verified: Boolean(row.verified),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const portfolioRepository = {
  findById(id: string): PortfolioDbRecord | null {
    const db = getDb();
    const row = db.prepare('SELECT * FROM portfolio WHERE id = ?').get(id);
    return row ? rowToPortfolio(row) : null;
  },

  create(item: {
    id?: string;
    studentId: string;
    artifactType: string;
    title: string;
    content: any;
    verified?: boolean;
  }): PortfolioDbRecord {
    const db = getDb();
    const now = new Date().toISOString();
    const id = item.id || `port_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    db.prepare(`
      INSERT INTO portfolio (id, student_id, artifact_type, title, content_json, verified, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      item.studentId,
      item.artifactType,
      item.title,
      JSON.stringify(item.content || {}),
      item.verified ? 1 : 0,
      now,
      now
    );

    return this.findById(id)!;
  },

  upsert(item: {
    id?: string;
    studentId: string;
    artifactType?: string;
    title: string;
    content?: any;
    verified?: boolean;
    description?: string;
    score?: number;
    artifacts?: any[];
  }): PortfolioDbRecord {
    if (item.id && this.findById(item.id)) {
      return this.update(item.id, {
        title: item.title,
        artifactType: item.artifactType || 'project',
        content: item.content || { description: item.description, score: item.score, artifacts: item.artifacts },
        verified: item.verified,
      })!;
    }
    return this.create({
      id: item.id,
      studentId: item.studentId,
      artifactType: item.artifactType || 'project',
      title: item.title,
      content: item.content || { description: item.description, score: item.score, artifacts: item.artifacts },
      verified: item.verified,
    });
  },

  update(id: string, updates: Partial<PortfolioDbRecord>): PortfolioDbRecord | null {
    const db = getDb();
    const current = this.findById(id);
    if (!current) return null;

    const merged = { ...current, ...updates, updatedAt: new Date().toISOString() };

    db.prepare(`
      UPDATE portfolio SET
        artifact_type = ?,
        title = ?,
        content_json = ?,
        verified = ?,
        updated_at = ?
      WHERE id = ?
    `).run(
      merged.artifactType,
      merged.title,
      JSON.stringify(merged.content || {}),
      merged.verified ? 1 : 0,
      merged.updatedAt,
      id
    );

    return this.findById(id);
  },

  findByStudentPaginated(
    studentId: string,
    options?: PaginationOptions
  ): PaginatedResult<PortfolioDbRecord> {
    const db = getDb();
    const limit = sanitizeLimit(options?.limit);
    const cursor = decodeCursor(options?.cursor);

    let query = 'SELECT * FROM portfolio WHERE student_id = ?';
    const params: any[] = [studentId];

    if (cursor) {
      query += ' AND (created_at < ? OR (created_at = ? AND id < ?))';
      params.push(cursor.ts, cursor.ts, cursor.id);
    }

    query += ' ORDER BY created_at DESC, id DESC LIMIT ?';
    params.push(limit + 1);

    const rows = db.prepare(query).all(...params) as any[];
    const hasMore = rows.length > limit;
    const items = (hasMore ? rows.slice(0, limit) : rows).map(rowToPortfolio);

    let nextCursor: string | null = null;
    if (hasMore && items.length > 0) {
      const last = items[items.length - 1];
      nextCursor = encodeCursor({ ts: last.createdAt, id: last.id });
    }

    const totalCount = (db.prepare('SELECT COUNT(*) as count FROM portfolio WHERE student_id = ?').get(studentId) as any)?.count || 0;

    return {
      items,
      nextCursor,
      hasMore,
      totalCount,
    };
  },

  deleteById(id: string): boolean {
    const db = getDb();
    const res = db.prepare('DELETE FROM portfolio WHERE id = ?').run(id);
    return res.changes > 0;
  },

  deleteByStudentId(studentId: string): number {
    const db = getDb();
    const res = db.prepare('DELETE FROM portfolio WHERE student_id = ?').run(studentId);
    return res.changes;
  },
};
