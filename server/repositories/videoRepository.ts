import { getDb } from '../db/connection.ts';
import { RenderedVideoDbRecord } from './types.ts';

export const videoRepository = {
  create(record: {
    id: string;
    studentId: string;
    title: string;
    conceptId?: string;
    topic: string;
    durationSeconds: number;
    storyboard: any;
    renderSettings?: Record<string, any>;
    videoUrl?: string;
    vttContent?: string;
    shareToken: string;
    provider?: 'canvas_browser' | 'gemini_veo';
    createdAt?: string;
  }): RenderedVideoDbRecord {
    const db = getDb();
    const createdAt = record.createdAt || new Date().toISOString();
    const provider = record.provider || 'canvas_browser';
    const storyboardJson = typeof record.storyboard === 'string' ? record.storyboard : JSON.stringify(record.storyboard);
    const renderSettingsJson = JSON.stringify(record.renderSettings || {});

    db.prepare(`
      INSERT INTO rendered_videos (
        id, student_id, title, concept_id, topic, duration_seconds,
        storyboard_json, render_settings_json, video_url, vtt_content,
        share_token, provider, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        concept_id = excluded.concept_id,
        topic = excluded.topic,
        duration_seconds = excluded.duration_seconds,
        storyboard_json = excluded.storyboard_json,
        render_settings_json = excluded.render_settings_json,
        video_url = excluded.video_url,
        vtt_content = excluded.vtt_content,
        share_token = excluded.share_token,
        provider = excluded.provider
    `).run(
      record.id,
      record.studentId,
      record.title,
      record.conceptId || null,
      record.topic,
      record.durationSeconds,
      storyboardJson,
      renderSettingsJson,
      record.videoUrl || null,
      record.vttContent || null,
      record.shareToken,
      provider,
      createdAt
    );

    return {
      id: record.id,
      studentId: record.studentId,
      title: record.title,
      conceptId: record.conceptId,
      topic: record.topic,
      durationSeconds: record.durationSeconds,
      storyboard: record.storyboard,
      renderSettings: record.renderSettings || {},
      videoUrl: record.videoUrl,
      vttContent: record.vttContent,
      shareToken: record.shareToken,
      provider,
      createdAt,
    };
  },

  findById(id: string): RenderedVideoDbRecord | null {
    const db = getDb();
    const row = db.prepare('SELECT * FROM rendered_videos WHERE id = ?').get(id) as any;
    if (!row) return null;
    return this.mapRow(row);
  },

  findByShareToken(shareToken: string): RenderedVideoDbRecord | null {
    const db = getDb();
    const row = db.prepare('SELECT * FROM rendered_videos WHERE share_token = ?').get(shareToken) as any;
    if (!row) return null;
    return this.mapRow(row);
  },

  listByStudent(studentId: string): RenderedVideoDbRecord[] {
    const db = getDb();
    const rows = db.prepare(
      'SELECT * FROM rendered_videos WHERE student_id = ? ORDER BY created_at DESC'
    ).all(studentId) as any[];
    return rows.map(r => this.mapRow(r));
  },

  delete(id: string, studentId?: string): boolean {
    const db = getDb();
    let query = 'DELETE FROM rendered_videos WHERE id = ?';
    const params: any[] = [id];
    if (studentId) {
      query += ' AND student_id = ?';
      params.push(studentId);
    }
    const res = db.prepare(query).run(...params);
    return res.changes > 0;
  },

  mapRow(row: any): RenderedVideoDbRecord {
    let storyboard: any = {};
    let renderSettings: any = {};
    try {
      storyboard = JSON.parse(row.storyboard_json || '{}');
    } catch {
      storyboard = {};
    }
    try {
      renderSettings = JSON.parse(row.render_settings_json || '{}');
    } catch {
      renderSettings = {};
    }

    return {
      id: row.id,
      studentId: row.student_id,
      title: row.title,
      conceptId: row.concept_id || undefined,
      topic: row.topic,
      durationSeconds: Number(row.duration_seconds),
      storyboard,
      renderSettings,
      videoUrl: row.video_url || undefined,
      vttContent: row.vtt_content || undefined,
      shareToken: row.share_token,
      provider: row.provider || 'canvas_browser',
      createdAt: row.created_at,
    };
  },
};
