import { getDb } from '../db/connection.ts';

export const dkmStateRepository = {
  findByStudentId(studentId: string): any[] | null {
    const db = getDb();
    const row = db.prepare('SELECT nodes_json FROM dkm_states WHERE student_id = ?').get(studentId) as { nodes_json: string } | undefined;
    if (!row || !row.nodes_json) return null;
    try {
      return JSON.parse(row.nodes_json);
    } catch {
      return null;
    }
  },

  upsert(studentId: string, nodes: any[]): void {
    const db = getDb();
    const now = new Date().toISOString();
    const nodesJson = JSON.stringify(nodes || []);

    db.prepare(`
      INSERT INTO dkm_states (student_id, nodes_json, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(student_id) DO UPDATE SET
        nodes_json = excluded.nodes_json,
        updated_at = excluded.updated_at
    `).run(studentId, nodesJson, now);
  },

  deleteByStudentId(studentId: string): boolean {
    const db = getDb();
    const res = db.prepare('DELETE FROM dkm_states WHERE student_id = ?').run(studentId);
    return res.changes > 0;
  },
};
