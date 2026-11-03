import { getDb } from '../db/connection.ts';
import { FlashcardDbRecord } from './types.ts';
import { PaginationOptions, PaginatedResult, encodeCursor, decodeCursor, sanitizeLimit } from '../utils/pagination.ts';

function rowToCard(row: any): FlashcardDbRecord & { box?: number; dueTimestamp?: string } {
  return {
    id: row.id,
    studentId: row.student_id,
    conceptId: row.concept_id,
    conceptName: row.concept_name,
    track: row.track,
    leitnerBox: row.leitner_box as any,
    box: row.leitner_box,
    easeFactor: row.ease_factor,
    intervalDays: row.interval_days,
    repetitions: row.repetitions,
    dueDate: row.due_date,
    dueTimestamp: row.due_date,
    lastReviewed: row.last_reviewed,
    cardJson: row.card_json ? JSON.parse(row.card_json) : {},
    updatedAt: row.updated_at,
  };
}

export const flashcardRepository = {
  findById(id: string): FlashcardDbRecord | null {
    const db = getDb();
    const row = db.prepare('SELECT * FROM flashcards WHERE id = ?').get(id);
    return row ? rowToCard(row) : null;
  },

  upsert(card: {
    id: string;
    studentId: string;
    conceptId: string;
    conceptName: string;
    track: string;
    leitnerBox: 1 | 2 | 3 | 4;
    easeFactor: number;
    intervalDays: number;
    repetitions: number;
    dueDate: string;
    lastReviewed?: string | null;
    cardJson?: any;
  }): FlashcardDbRecord {
    const db = getDb();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO flashcards (
        id, student_id, concept_id, concept_name, track,
        leitner_box, ease_factor, interval_days, repetitions,
        due_date, last_reviewed, card_json, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        concept_name = excluded.concept_name,
        leitner_box = excluded.leitner_box,
        ease_factor = excluded.ease_factor,
        interval_days = excluded.interval_days,
        repetitions = excluded.repetitions,
        due_date = excluded.due_date,
        last_reviewed = excluded.last_reviewed,
        card_json = excluded.card_json,
        updated_at = excluded.updated_at
    `).run(
      card.id,
      card.studentId,
      card.conceptId,
      card.conceptName || card.conceptId,
      card.track || 'Web Application Development',
      card.leitnerBox ?? (card as any).box ?? 1,
      card.easeFactor ?? 2.5,
      card.intervalDays ?? 1,
      card.repetitions ?? 0,
      card.dueDate || (card as any).dueTimestamp || now,
      card.lastReviewed || null,
      JSON.stringify(card.cardJson || {}),
      now
    );

    return this.findById(card.id)!;
  },

  findByStudentPaginated(
    studentId: string,
    options?: PaginationOptions
  ): PaginatedResult<FlashcardDbRecord> {
    const db = getDb();
    const limit = sanitizeLimit(options?.limit);
    const cursor = decodeCursor(options?.cursor);

    let query = 'SELECT * FROM flashcards WHERE student_id = ?';
    const params: any[] = [studentId];

    if (cursor) {
      query += ' AND (due_date < ? OR (due_date = ? AND id < ?))';
      params.push(cursor.ts, cursor.ts, cursor.id);
    }

    query += ' ORDER BY due_date ASC, id ASC LIMIT ?';
    params.push(limit + 1);

    const rows = db.prepare(query).all(...params) as any[];
    const hasMore = rows.length > limit;
    const items = (hasMore ? rows.slice(0, limit) : rows).map(rowToCard);

    let nextCursor: string | null = null;
    if (hasMore && items.length > 0) {
      const last = items[items.length - 1];
      nextCursor = encodeCursor({ ts: last.dueDate, id: last.id });
    }

    const totalCount = (db.prepare('SELECT COUNT(*) as count FROM flashcards WHERE student_id = ?').get(studentId) as any)?.count || 0;

    return {
      items,
      nextCursor,
      hasMore,
      totalCount,
    };
  },

  findDueCards(studentId: string, asOfDate: Date = new Date()): FlashcardDbRecord[] {
    const db = getDb();
    const rows = db.prepare('SELECT * FROM flashcards WHERE student_id = ? AND due_date <= ? ORDER BY due_date ASC')
      .all(studentId, asOfDate.toISOString());
    return rows.map(rowToCard);
  },

  listAllByStudent(studentId: string): FlashcardDbRecord[] {
    const db = getDb();
    const rows = db.prepare('SELECT * FROM flashcards WHERE student_id = ? ORDER BY due_date ASC, id ASC').all(studentId);
    return rows.map(rowToCard);
  },

  deleteById(id: string): boolean {
    const db = getDb();
    const res = db.prepare('DELETE FROM flashcards WHERE id = ?').run(id);
    return res.changes > 0;
  },

  deleteByStudentId(studentId: string): number {
    const db = getDb();
    const res = db.prepare('DELETE FROM flashcards WHERE student_id = ?').run(studentId);
    return res.changes;
  },
};
