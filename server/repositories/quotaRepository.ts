import { getDb } from '../db/connection.ts';

export interface QuotaStatus {
  allowed: boolean;
  requestCount: number;
  limit: number;
  remainingRequests: number;
  uploadBytes: number;
  uploadLimitBytes: number;
  resetAt: string;
}

export const quotaRepository = {
  getTodayString(): string {
    return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  },

  getResetAt(): string {
    const d = new Date();
    d.setUTCHours(24, 0, 0, 0);
    return d.toISOString();
  },

  getLimits(role = 'student') {
    if (role === 'admin' || role === 'teacher') {
      return { requestLimit: 500, uploadLimitBytes: 100 * 1024 * 1024 }; // 500 calls, 100MB
    }
    return { requestLimit: 50, uploadLimitBytes: 25 * 1024 * 1024 }; // 50 calls, 25MB
  },

  getDailyRecord(userId: string, dateStr?: string) {
    const db = getDb();
    const date = dateStr || this.getTodayString();
    const row = db.prepare('SELECT * FROM ai_quotas WHERE user_id = ? AND date = ?').get(userId, date) as any;
    if (!row) {
      return {
        id: `quota_${userId}_${date}`,
        userId,
        date,
        requestCount: 0,
        tokensUsed: 0,
        uploadBytes: 0,
      };
    }
    return {
      id: row.id,
      userId: row.user_id,
      date: row.date,
      requestCount: Number(row.request_count || 0),
      tokensUsed: Number(row.tokens_used || 0),
      uploadBytes: Number(row.upload_bytes || 0),
    };
  },

  checkQuota(userId: string, role = 'student', incomingUploadBytes = 0): QuotaStatus {
    const record = this.getDailyRecord(userId);
    const { requestLimit, uploadLimitBytes } = this.getLimits(role);

    const hasRequestsRemaining = record.requestCount < requestLimit;
    const hasUploadRemaining = (record.uploadBytes + incomingUploadBytes) <= uploadLimitBytes;
    const allowed = hasRequestsRemaining && hasUploadRemaining;

    return {
      allowed,
      requestCount: record.requestCount,
      limit: requestLimit,
      remainingRequests: Math.max(0, requestLimit - record.requestCount),
      uploadBytes: record.uploadBytes,
      uploadLimitBytes,
      resetAt: this.getResetAt(),
    };
  },

  incrementUsage(userId: string, requests = 1, tokens = 0, uploadBytes = 0) {
    const db = getDb();
    const date = this.getTodayString();
    const now = new Date().toISOString();
    const id = `quota_${userId}_${date}`;

    db.prepare(`
      INSERT INTO ai_quotas (id, user_id, date, request_count, tokens_used, upload_bytes, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id, date) DO UPDATE SET
        request_count = request_count + excluded.request_count,
        tokens_used = tokens_used + excluded.tokens_used,
        upload_bytes = upload_bytes + excluded.upload_bytes,
        updated_at = excluded.updated_at
    `).run(
      id,
      userId,
      date,
      requests,
      tokens,
      uploadBytes,
      now
    );
  },

  getAdminUsageSummary() {
    const db = getDb();
    const date = this.getTodayString();

    const todayAgg = db.prepare(`
      SELECT
        COUNT(DISTINCT user_id) as active_users,
        SUM(request_count) as total_requests,
        SUM(tokens_used) as total_tokens,
        SUM(upload_bytes) as total_upload_bytes
      FROM ai_quotas
      WHERE date = ?
    `).get(date) as any;

    const allTimeAgg = db.prepare(`
      SELECT
        SUM(request_count) as total_requests,
        SUM(tokens_used) as total_tokens,
        SUM(upload_bytes) as total_upload_bytes
      FROM ai_quotas
    `).get() as any;

    const totalTokens = Number(allTimeAgg?.total_tokens || 0);
    // Estimated cost: blended rate ~$0.25 per 1,000,000 tokens for Gemini Flash
    const estimatedCostUsd = Math.round((totalTokens / 1_000_000) * 0.25 * 100) / 100;

    const topConsumers = db.prepare(`
      SELECT user_id, date, request_count, tokens_used, upload_bytes
      FROM ai_quotas
      ORDER BY request_count DESC
      LIMIT 10
    `).all() as any[];

    return {
      today: {
        date,
        activeUsers: Number(todayAgg?.active_users || 0),
        totalRequests: Number(todayAgg?.total_requests || 0),
        totalTokens: Number(todayAgg?.total_tokens || 0),
        totalUploadMb: Math.round((Number(todayAgg?.total_upload_bytes || 0) / (1024 * 1024)) * 10) / 10,
      },
      allTime: {
        totalRequests: Number(allTimeAgg?.total_requests || 0),
        totalTokens,
        estimatedCostUsd,
      },
      topConsumers: topConsumers.map(r => ({
        userId: r.user_id,
        date: r.date,
        requests: r.request_count,
        tokens: r.tokens_used,
        uploadMb: Math.round((r.upload_bytes / (1024 * 1024)) * 10) / 10,
      })),
    };
  },
};
