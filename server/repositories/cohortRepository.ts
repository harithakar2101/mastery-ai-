import { getDb } from '../db/connection.ts';

function rowToCohort(row: any): any {
  return {
    id: row.id,
    name: row.name,
    studentsCount: row.students_count ?? 0,
    averageMastery: row.average_mastery ?? 0.50,
    activeInterventions: row.active_interventions ?? 0,
    track: row.track,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const cohortRepository = {
  findById(id: string): any | null {
    const db = getDb();
    const row = db.prepare('SELECT * FROM cohorts WHERE id = ?').get(id);
    return row ? rowToCohort(row) : null;
  },

  findAll(): any[] {
    const db = getDb();
    const rows = db.prepare('SELECT * FROM cohorts ORDER BY name ASC').all();
    return rows.map(rowToCohort);
  },

  upsert(cohort: {
    id: string;
    name: string;
    studentsCount?: number;
    averageMastery?: number;
    activeInterventions?: number;
    track: string;
  }): any {
    const db = getDb();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO cohorts (id, name, students_count, average_mastery, active_interventions, track, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        students_count = excluded.students_count,
        average_mastery = excluded.average_mastery,
        active_interventions = excluded.active_interventions,
        track = excluded.track,
        updated_at = excluded.updated_at
    `).run(
      cohort.id,
      cohort.name,
      cohort.studentsCount ?? 0,
      cohort.averageMastery ?? 0.50,
      cohort.activeInterventions ?? 0,
      cohort.track || 'Web Application Development',
      now,
      now
    );

    return this.findById(cohort.id);
  },

  deleteById(id: string): boolean {
    const db = getDb();
    const res = db.prepare('DELETE FROM cohorts WHERE id = ?').run(id);
    return res.changes > 0;
  },
};
