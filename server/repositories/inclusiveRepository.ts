import { getDb } from '../db/connection.ts';

export interface WearableDeviceRecord {
  id: string;
  device_id: string;
  student_id: string | null;
  student_name?: string | null;
  device_token: string;
  device_type: string;
  accessibility_mode: 'BLIND' | 'DEAF' | 'NON_SPEAKING';
  firmware_version: string;
  status: 'connected' | 'disconnected' | 'pairing';
  battery_pct: number;
  last_heartbeat: string | null;
  source: 'simulation' | 'hardware';
  created_at: string;
  updated_at: string;
}

export interface WearableEventRecord {
  id: string;
  event_id: string;
  device_id: string;
  student_id: string | null;
  student_name?: string | null;
  event_type: string;
  request: 'I_NEED_HELP' | 'I_NEED_BREAK' | 'CANCEL' | 'ACKNOWLEDGE';
  accessibility_mode: 'BLIND' | 'DEAF' | 'NON_SPEAKING';
  status: 'Pending' | 'Acknowledged' | 'Assistance Provided' | 'Resolved' | 'Cancelled';
  vibration_pattern: string | null;
  led_color: string | null;
  oled_text: string | null;
  acknowledged_at: string | null;
  acknowledged_by: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  source: 'simulation' | 'hardware';
  timestamp: string;
  created_at: string;
  updated_at: string;
}

export interface SensorReadingRecord {
  id: string;
  device_id: string;
  student_id: string | null;
  student_name?: string | null;
  heart_rate: number | null;
  spo2: number | null;
  gsr_eda: number | null;
  accel_x: number | null;
  accel_y: number | null;
  accel_z: number | null;
  temp_c: number | null;
  is_anomaly: number;
  review_flag: number;
  source: 'simulation' | 'hardware';
  timestamp: string;
  created_at: string;
}

export interface WearableAuditLogRecord {
  id: string;
  event_id: string;
  previous_status: string | null;
  new_status: string;
  actor_id: string;
  actor_name: string;
  actor_role: string;
  notes: string | null;
  timestamp: string;
}

export const inclusiveRepository = {
  // Device Operations
  listDevices(filter: { source?: string; studentId?: string } = {}): WearableDeviceRecord[] {
    const db = getDb();
    let sql = `
      SELECT d.*, u.name as student_name
      FROM wearable_devices d
      LEFT JOIN users u ON d.student_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];
    if (filter.source) {
      sql += ` AND d.source = ?`;
      params.push(filter.source);
    }
    if (filter.studentId) {
      sql += ` AND d.student_id = ?`;
      params.push(filter.studentId);
    }
    sql += ` ORDER BY d.created_at DESC`;
    return db.prepare(sql).all(...params) as WearableDeviceRecord[];
  },

  findDeviceById(deviceId: string): WearableDeviceRecord | null {
    const db = getDb();
    const row = db.prepare(`
      SELECT d.*, u.name as student_name
      FROM wearable_devices d
      LEFT JOIN users u ON d.student_id = u.id
      WHERE d.device_id = ? OR d.id = ?
    `).get(deviceId, deviceId);
    return (row as WearableDeviceRecord) || null;
  },

  registerDevice(data: {
    device_id: string;
    student_id?: string | null;
    device_token: string;
    device_type?: string;
    accessibility_mode: 'BLIND' | 'DEAF' | 'NON_SPEAKING';
    firmware_version?: string;
    status?: 'connected' | 'disconnected' | 'pairing';
    battery_pct?: number;
    source?: 'simulation' | 'hardware';
  }): WearableDeviceRecord {
    const db = getDb();
    const now = new Date().toISOString();
    const id = `dev_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const source = data.source || 'hardware';
    const status = data.status || 'connected';
    const battery_pct = typeof data.battery_pct === 'number' ? data.battery_pct : 100;
    const firmware_version = data.firmware_version || '1.0.0';
    const device_type = data.device_type || 'ESP32_WROOM_32';

    db.prepare(`
      INSERT INTO wearable_devices (id, device_id, student_id, device_token, device_type, accessibility_mode, firmware_version, status, battery_pct, last_heartbeat, source, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(device_id) DO UPDATE SET
        student_id = excluded.student_id,
        device_token = excluded.device_token,
        accessibility_mode = excluded.accessibility_mode,
        status = excluded.status,
        battery_pct = excluded.battery_pct,
        last_heartbeat = excluded.last_heartbeat,
        updated_at = excluded.updated_at
    `).run(
      id,
      data.device_id,
      data.student_id || null,
      data.device_token,
      device_type,
      data.accessibility_mode,
      firmware_version,
      status,
      battery_pct,
      now,
      source,
      now,
      now
    );

    return this.findDeviceById(data.device_id)!;
  },

  updateDeviceHeartbeat(deviceId: string, status: 'connected' | 'disconnected', batteryPct?: number): boolean {
    const db = getDb();
    const now = new Date().toISOString();
    const result = db.prepare(`
      UPDATE wearable_devices
      SET status = ?,
          battery_pct = COALESCE(?, battery_pct),
          last_heartbeat = ?,
          updated_at = ?
      WHERE device_id = ?
    `).run(status, batteryPct ?? null, now, now, deviceId);
    return result.changes > 0;
  },

  pairDeviceToStudent(deviceId: string, studentId: string): boolean {
    const db = getDb();
    const now = new Date().toISOString();
    const result = db.prepare(`
      UPDATE wearable_devices
      SET student_id = ?, updated_at = ?
      WHERE device_id = ?
    `).run(studentId, now, deviceId);
    return result.changes > 0;
  },

  // Event & Request Operations
  listEvents(filter: {
    studentId?: string;
    deviceId?: string;
    status?: string;
    source?: string;
    limit?: number;
  } = {}): WearableEventRecord[] {
    const db = getDb();
    let sql = `
      SELECT e.*, u.name as student_name
      FROM wearable_events e
      LEFT JOIN users u ON e.student_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];
    if (filter.studentId) {
      sql += ` AND e.student_id = ?`;
      params.push(filter.studentId);
    }
    if (filter.deviceId) {
      sql += ` AND e.device_id = ?`;
      params.push(filter.deviceId);
    }
    if (filter.status) {
      sql += ` AND e.status = ?`;
      params.push(filter.status);
    }
    if (filter.source) {
      sql += ` AND e.source = ?`;
      params.push(filter.source);
    }
    sql += ` ORDER BY e.timestamp DESC`;
    if (filter.limit) {
      sql += ` LIMIT ?`;
      params.push(filter.limit);
    } else {
      sql += ` LIMIT 100`;
    }
    return db.prepare(sql).all(...params) as WearableEventRecord[];
  },

  findEventByEventId(eventId: string): WearableEventRecord | null {
    const db = getDb();
    const row = db.prepare(`
      SELECT e.*, u.name as student_name
      FROM wearable_events e
      LEFT JOIN users u ON e.student_id = u.id
      WHERE e.event_id = ? OR e.id = ?
    `).get(eventId, eventId);
    return (row as WearableEventRecord) || null;
  },

  createEvent(data: {
    event_id: string;
    device_id: string;
    student_id?: string | null;
    event_type?: string;
    request: 'I_NEED_HELP' | 'I_NEED_BREAK' | 'CANCEL' | 'ACKNOWLEDGE';
    accessibility_mode: 'BLIND' | 'DEAF' | 'NON_SPEAKING';
    status?: 'Pending' | 'Acknowledged' | 'Assistance Provided' | 'Resolved' | 'Cancelled';
    vibration_pattern?: string;
    led_color?: string;
    oled_text?: string;
    source?: 'simulation' | 'hardware';
    timestamp?: string;
  }): WearableEventRecord {
    const db = getDb();
    const id = `evt_w_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();
    const ts = data.timestamp || now;
    const status = data.status || 'Pending';
    const source = data.source || 'hardware';

    db.prepare(`
      INSERT INTO wearable_events (
        id, event_id, device_id, student_id, event_type, request, accessibility_mode,
        status, vibration_pattern, led_color, oled_text, source, timestamp, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.event_id,
      data.device_id,
      data.student_id || null,
      data.event_type || 'HELP_REQUEST',
      data.request,
      data.accessibility_mode,
      status,
      data.vibration_pattern || null,
      data.led_color || null,
      data.oled_text || null,
      source,
      ts,
      now,
      now
    );

    // Initial audit log
    this.createAuditLog({
      event_id: data.event_id,
      previous_status: null,
      new_status: status,
      actor_id: data.student_id || data.device_id,
      actor_name: `Student via ${data.device_id}`,
      actor_role: 'student',
      notes: `Event originated from ${data.device_id} (${source})`,
    });

    return this.findEventByEventId(data.event_id)!;
  },

  updateEventStatus(
    eventId: string,
    newStatus: 'Pending' | 'Acknowledged' | 'Assistance Provided' | 'Resolved' | 'Cancelled',
    actor: { id: string; name: string; role: string },
    notes?: string
  ): WearableEventRecord | null {
    const existing = this.findEventByEventId(eventId);
    if (!existing) return null;

    const db = getDb();
    const now = new Date().toISOString();

    let acknowledged_at = existing.acknowledged_at;
    let acknowledged_by = existing.acknowledged_by;
    let resolved_at = existing.resolved_at;
    let resolved_by = existing.resolved_by;

    if (newStatus === 'Acknowledged' && !acknowledged_at) {
      acknowledged_at = now;
      acknowledged_by = `${actor.name} (${actor.id})`;
    } else if (newStatus === 'Resolved' || newStatus === 'Cancelled') {
      resolved_at = now;
      resolved_by = `${actor.name} (${actor.id})`;
    }

    db.prepare(`
      UPDATE wearable_events
      SET status = ?,
          acknowledged_at = ?,
          acknowledged_by = ?,
          resolved_at = ?,
          resolved_by = ?,
          updated_at = ?
      WHERE event_id = ?
    `).run(newStatus, acknowledged_at, acknowledged_by, resolved_at, resolved_by, now, eventId);

    // Audit record
    this.createAuditLog({
      event_id: eventId,
      previous_status: existing.status,
      new_status: newStatus,
      actor_id: actor.id,
      actor_name: actor.name,
      actor_role: actor.role,
      notes: notes || `Status changed from ${existing.status} to ${newStatus}`,
    });

    return this.findEventByEventId(eventId);
  },

  createAuditLog(data: {
    event_id: string;
    previous_status: string | null;
    new_status: string;
    actor_id: string;
    actor_name: string;
    actor_role: string;
    notes?: string;
  }) {
    const db = getDb();
    const id = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    db.prepare(`
      INSERT INTO wearable_event_audit_logs (id, event_id, previous_status, new_status, actor_id, actor_name, actor_role, notes, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.event_id,
      data.previous_status,
      data.new_status,
      data.actor_id,
      data.actor_name,
      data.actor_role,
      data.notes || null,
      new Date().toISOString()
    );
  },

  listAuditLogs(eventId?: string): WearableAuditLogRecord[] {
    const db = getDb();
    if (eventId) {
      return db.prepare(`SELECT * FROM wearable_event_audit_logs WHERE event_id = ? ORDER BY timestamp DESC`).all(eventId) as WearableAuditLogRecord[];
    }
    return db.prepare(`SELECT * FROM wearable_event_audit_logs ORDER BY timestamp DESC LIMIT 100`).all() as WearableAuditLogRecord[];
  },

  // Sensor Operations
  recordSensorReading(data: {
    device_id: string;
    student_id?: string | null;
    heart_rate?: number;
    spo2?: number;
    gsr_eda?: number;
    accel_x?: number;
    accel_y?: number;
    accel_z?: number;
    temp_c?: number;
    is_anomaly?: boolean;
    review_flag?: boolean;
    source?: 'simulation' | 'hardware';
    timestamp?: string;
  }): SensorReadingRecord {
    const db = getDb();
    const id = `sens_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();
    const ts = data.timestamp || now;
    const isAnomaly = data.is_anomaly ? 1 : 0;
    const reviewFlag = data.review_flag ? 1 : 0;
    const source = data.source || 'hardware';

    db.prepare(`
      INSERT INTO sensor_readings (
        id, device_id, student_id, heart_rate, spo2, gsr_eda, accel_x, accel_y, accel_z, temp_c, is_anomaly, review_flag, source, timestamp, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.device_id,
      data.student_id || null,
      data.heart_rate ?? null,
      data.spo2 ?? null,
      data.gsr_eda ?? null,
      data.accel_x ?? null,
      data.accel_y ?? null,
      data.accel_z ?? null,
      data.temp_c ?? null,
      isAnomaly,
      reviewFlag,
      source,
      ts,
      now
    );

    return db.prepare(`SELECT * FROM sensor_readings WHERE id = ?`).get(id) as SensorReadingRecord;
  },

  listRecentSensorReadings(filter: { deviceId?: string; source?: string; limit?: number } = {}): SensorReadingRecord[] {
    const db = getDb();
    let sql = `
      SELECT s.*, u.name as student_name
      FROM sensor_readings s
      LEFT JOIN users u ON s.student_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];
    if (filter.deviceId) {
      sql += ` AND s.device_id = ?`;
      params.push(filter.deviceId);
    }
    if (filter.source) {
      sql += ` AND s.source = ?`;
      params.push(filter.source);
    }
    sql += ` ORDER BY s.timestamp DESC LIMIT ?`;
    params.push(filter.limit || 50);
    return db.prepare(sql).all(...params) as SensorReadingRecord[];
  },

  // Overview Statistics
  getOverviewStats() {
    const db = getDb();
    const totalStudents = (db.prepare(`SELECT COUNT(*) as count FROM users WHERE role = 'student'`).get() as any)?.count || 0;
    const connectedWearables = (db.prepare(`SELECT COUNT(*) as count FROM wearable_devices WHERE status = 'connected'`).get() as any)?.count || 0;
    const pendingHelpRequests = (db.prepare(`SELECT COUNT(*) as count FROM wearable_events WHERE status = 'Pending'`).get() as any)?.count || 0;
    const activeDeviceAlerts = (db.prepare(`SELECT COUNT(*) as count FROM sensor_readings WHERE review_flag = 1 OR is_anomaly = 1`).get() as any)?.count || 0;

    return {
      totalStudents,
      connectedWearables,
      pendingHelpRequests,
      activeDeviceAlerts,
    };
  },

  // Clear Simulation Data
  clearSimulationData() {
    const db = getDb();
    const evts = db.prepare(`DELETE FROM wearable_events WHERE source = 'simulation'`).run();
    const sensors = db.prepare(`DELETE FROM sensor_readings WHERE source = 'simulation'`).run();
    const devs = db.prepare(`DELETE FROM wearable_devices WHERE source = 'simulation'`).run();
    return {
      eventsCleared: evts.changes,
      sensorsCleared: sensors.changes,
      devicesCleared: devs.changes,
    };
  },

  // Settings
  getSetting(key: string, defaultValue: string = ''): string {
    const db = getDb();
    const row = db.prepare(`SELECT value FROM wearable_settings WHERE key = ?`).get(key) as any;
    return row?.value ?? defaultValue;
  },

  setSetting(key: string, value: string): void {
    const db = getDb();
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO wearable_settings (key, value, updated_at) VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    `).run(key, value, now);
  },
};
