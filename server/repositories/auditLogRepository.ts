import { getDb } from '../db/connection.ts';
import { logger } from '../logger.ts';

export interface AuditLogRecord {
  id: string;
  userId?: string;
  userRole?: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  details: Record<string, any>;
  ipAddress?: string;
  ts: string;
}

export const auditLogRepository = {
  log(entry: {
    userId?: string;
    userRole?: string;
    action: string;
    resourceType?: string;
    resourceId?: string;
    details?: any;
    ipAddress?: string;
  }): AuditLogRecord {
    const db = getDb();
    const id = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const ts = new Date().toISOString();

    db.prepare(`
      INSERT INTO audit_logs (
        id, user_id, user_role, action, resource_type, resource_id, details_json, ip_address, ts
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      entry.userId || null,
      entry.userRole || null,
      entry.action,
      entry.resourceType || null,
      entry.resourceId || null,
      JSON.stringify(entry.details || {}),
      entry.ipAddress || null,
      ts
    );

    logger.info({
      msg: `[AUDIT LOG] ${entry.action}`,
      action: entry.action,
      userId: entry.userId,
      userRole: entry.userRole,
      resourceType: entry.resourceType,
      resourceId: entry.resourceId,
    });

    return {
      id,
      userId: entry.userId,
      userRole: entry.userRole,
      action: entry.action,
      resourceType: entry.resourceType,
      resourceId: entry.resourceId,
      details: entry.details || {},
      ipAddress: entry.ipAddress,
      ts,
    };
  },

  listRecent(limit = 100): AuditLogRecord[] {
    const db = getDb();
    const rows = db.prepare('SELECT * FROM audit_logs ORDER BY ts DESC LIMIT ?').all(limit) as any[];
    return rows.map(r => ({
      id: r.id,
      userId: r.user_id || undefined,
      userRole: r.user_role || undefined,
      action: r.action,
      resourceType: r.resource_type || undefined,
      resourceId: r.resource_id || undefined,
      details: r.details_json ? JSON.parse(r.details_json) : {},
      ipAddress: r.ip_address || undefined,
      ts: r.ts,
    }));
  },
};
