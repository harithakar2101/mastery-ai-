import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticate, requireRole } from './authMiddleware.ts';
import { inclusiveRepository } from './repositories/inclusiveRepository.ts';
import { sendError } from './auth.ts';
import { validateBody } from './validation.ts';
import wearableConfig from '../shared/wearable_config.json';
import { logger, trackError } from './logger.ts';

export const inclusiveRouter = Router();

// SSE Clients for real-time live updates
interface SSEClient {
  id: string;
  res: Response;
  userId?: string;
  role?: string;
}
let sseClients: SSEClient[] = [];

function broadcastInclusiveUpdate(event: string, data: any) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  sseClients.forEach(client => {
    try {
      client.res.write(payload);
    } catch {
      // client dropped
    }
  });
}

// Heartbeat for SSE stream every 15 seconds
setInterval(() => {
  sseClients = sseClients.filter(c => {
    try {
      c.res.write(': keepalive\n\n');
      return true;
    } catch {
      return false;
    }
  });
}, 15000).unref();

// Validation Schemas
const eventSubmissionSchema = z.object({
  event_id: z.string().min(1, 'event_id is required'),
  device_id: z.string().min(1, 'device_id is required'),
  student_id: z.string().optional().nullable(),
  event_type: z.string().default('HELP_REQUEST'),
  request: z.enum(['I_NEED_HELP', 'I_NEED_BREAK', 'CANCEL', 'ACKNOWLEDGE']),
  accessibility_mode: z.enum(['BLIND', 'DEAF', 'NON_SPEAKING']),
  timestamp: z.string().optional(),
  source: z.enum(['simulation', 'hardware']).default('hardware'),
});

const sensorReadingSchema = z.object({
  device_id: z.string().min(1),
  student_id: z.string().optional().nullable(),
  heart_rate: z.number().min(30).max(220).optional().nullable(),
  spo2: z.number().min(50).max(100).optional().nullable(),
  gsr_eda: z.number().min(0).max(100).optional().nullable(),
  accel_x: z.number().optional().nullable(),
  accel_y: z.number().optional().nullable(),
  accel_z: z.number().optional().nullable(),
  temp_c: z.number().min(30).max(45).optional().nullable(),
  source: z.enum(['simulation', 'hardware']).default('hardware'),
  timestamp: z.string().optional(),
});

const deviceRegisterSchema = z.object({
  device_id: z.string().min(1),
  student_id: z.string().optional().nullable(),
  device_token: z.string().min(1),
  device_type: z.string().default('ESP32_WROOM_32'),
  accessibility_mode: z.enum(['BLIND', 'DEAF', 'NON_SPEAKING']),
  firmware_version: z.string().default('1.0.0'),
  status: z.enum(['connected', 'disconnected', 'pairing']).default('connected'),
  battery_pct: z.number().min(0).max(100).default(100),
  source: z.enum(['simulation', 'hardware']).default('hardware'),
});

const heartbeatSchema = z.object({
  device_id: z.string().min(1),
  status: z.enum(['connected', 'disconnected']),
  battery_pct: z.number().min(0).max(100).optional(),
});

// 1. Realtime SSE Stream for Live Dashboard Updates
inclusiveRouter.get('/stream', (req: Request, res: Response) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  const clientId = `client_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const newClient: SSEClient = { id: clientId, res };
  sseClients.push(newClient);

  // Send initial connected event
  res.write(`event: connected\ndata: ${JSON.stringify({ clientId, timestamp: new Date().toISOString() })}\n\n`);

  req.on('close', () => {
    sseClients = sseClients.filter(c => c.id !== clientId);
  });
});

// 2. ESP32 Event Ingestion (Wearable Contract)
inclusiveRouter.post('/events', async (req: Request, res: Response) => {
  try {
    const parseResult = eventSubmissionSchema.safeParse(req.body);
    if (!parseResult.success) {
      return sendError(res, 400, 'INVALID_PAYLOAD', parseResult.error.errors[0]?.message || 'Invalid payload', req);
    }
    const data = parseResult.data;

    // Duplicate Prevention (5-minute window or duplicate ID check)
    const existing = inclusiveRepository.findEventByEventId(data.event_id);
    if (existing) {
      return res.status(409).json({
        success: false,
        status: 'DUPLICATE',
        message: 'Duplicate event_id detected. Event already recorded.',
        event_id: data.event_id,
      });
    }

    // Verify or auto-register device
    let device = inclusiveRepository.findDeviceById(data.device_id);
    if (!device) {
      device = inclusiveRepository.registerDevice({
        device_id: data.device_id,
        student_id: data.student_id,
        device_token: `token_${data.device_id}`,
        accessibility_mode: data.accessibility_mode,
        source: data.source,
      });
    }

    // Determine tactile & visual feedback from config
    const reqKey = data.request;
    const mode = data.accessibility_mode;
    const vibKey = reqKey === 'CANCEL' ? 'CANCELLED' : (reqKey === 'ACKNOWLEDGE' ? 'ACKNOWLEDGED' : 'REQUEST_SENT');
    const patternMs = (wearableConfig.vibrationPatterns as any)[vibKey]?.patternMs || [150, 100, 150];
    const ledColor = reqKey === 'CANCEL' ? '#64748B' : '#EAB308';
    const oledText = (wearableConfig.oledMessages as any)[mode]?.PENDING || 'REQUEST SUBMITTED';

    // Create event record
    const newEvent = inclusiveRepository.createEvent({
      event_id: data.event_id,
      device_id: data.device_id,
      student_id: data.student_id || device.student_id,
      event_type: data.event_type,
      request: data.request,
      accessibility_mode: data.accessibility_mode,
      status: data.request === 'CANCEL' ? 'Cancelled' : 'Pending',
      vibration_pattern: vibKey,
      led_color: ledColor,
      oled_text: oledText,
      source: data.source,
      timestamp: data.timestamp,
    });

    // Broadcast to SSE
    broadcastInclusiveUpdate('new_request', {
      event: newEvent,
      overview: inclusiveRepository.getOverviewStats(),
    });

    logger.info('Wearable event processed successfully', {
      event_id: data.event_id,
      device_id: data.device_id,
      request: data.request,
      source: data.source,
    });

    return res.status(201).json({
      success: true,
      status: 'DELIVERED',
      event_id: data.event_id,
      event: newEvent,
      feedback: {
        vibration_pattern: vibKey,
        pattern_ms: patternMs,
        led_color: ledColor,
        oled_text: oledText,
      },
    });
  } catch (err: any) {
    trackError(err, { endpoint: '/api/inclusive/events' });
    return sendError(res, 500, 'INGESTION_ERROR', err?.message || 'Failed to process event', req);
  }
});

// 3. Sensor Data Ingestion
inclusiveRouter.post('/sensors', async (req: Request, res: Response) => {
  try {
    const parseResult = sensorReadingSchema.safeParse(req.body);
    if (!parseResult.success) {
      return sendError(res, 400, 'INVALID_SENSOR_DATA', parseResult.error.errors[0]?.message || 'Invalid sensor reading', req);
    }
    const data = parseResult.data;

    // Noise filtering and review flagging
    let isAnomaly = false;
    let reviewFlag = false;

    // Check physiological limits (Flag for review only; never diagnose)
    if (data.heart_rate && (data.heart_rate > 130 || data.heart_rate < 48)) {
      isAnomaly = true;
      reviewFlag = true;
    }
    if (data.spo2 && data.spo2 < 92) {
      isAnomaly = true;
      reviewFlag = true;
    }
    if (data.gsr_eda && data.gsr_eda > 25.0) {
      reviewFlag = true;
    }

    const reading = inclusiveRepository.recordSensorReading({
      device_id: data.device_id,
      student_id: data.student_id,
      heart_rate: data.heart_rate ?? undefined,
      spo2: data.spo2 ?? undefined,
      gsr_eda: data.gsr_eda ?? undefined,
      accel_x: data.accel_x ?? undefined,
      accel_y: data.accel_y ?? undefined,
      accel_z: data.accel_z ?? undefined,
      temp_c: data.temp_c ?? undefined,
      is_anomaly: isAnomaly,
      review_flag: reviewFlag,
      source: data.source,
      timestamp: data.timestamp,
    });

    broadcastInclusiveUpdate('sensor_reading', reading);

    return res.status(201).json({
      success: true,
      reading_id: reading.id,
      is_anomaly: isAnomaly,
      review_flag: reviewFlag,
      note: 'Sensor readings cannot confirm stress, discomfort or learning state. Student-initiated requests remain the primary signal.',
    });
  } catch (err: any) {
    trackError(err, { endpoint: '/api/inclusive/sensors' });
    return sendError(res, 500, 'SENSOR_ERROR', err?.message || 'Failed to record sensor reading', req);
  }
});

// 4. Device Registration
inclusiveRouter.post('/devices/register', validateBody(deviceRegisterSchema), (req: Request, res: Response) => {
  try {
    const dev = inclusiveRepository.registerDevice(req.body);
    broadcastInclusiveUpdate('device_updated', dev);
    return res.status(201).json({ success: true, device: dev });
  } catch (err: any) {
    return sendError(res, 500, 'DEVICE_REGISTER_FAILED', err?.message || 'Registration failed', req);
  }
});

// 5. Device Heartbeat
inclusiveRouter.post('/devices/heartbeat', validateBody(heartbeatSchema), (req: Request, res: Response) => {
  const { device_id, status, battery_pct } = req.body;
  const updated = inclusiveRepository.updateDeviceHeartbeat(device_id, status, battery_pct);
  if (!updated) {
    return sendError(res, 404, 'DEVICE_NOT_FOUND', `Device ${device_id} not found`, req);
  }
  const device = inclusiveRepository.findDeviceById(device_id);
  broadcastInclusiveUpdate('device_updated', device);
  return res.json({ success: true, device });
});

// Self-service Device Test Pattern
inclusiveRouter.post('/devices/:id/test', authenticate, (req: Request, res: Response) => {
  const deviceId = req.params.id;
  const device = inclusiveRepository.findDeviceById(deviceId);
  if (!device) {
    return sendError(res, 404, 'DEVICE_NOT_FOUND', `Device ${deviceId} not found`, req);
  }

  // Permission check: student can only test their assigned device
  if (req.user!.role === 'student' && device.student_id !== req.user!.id) {
    return sendError(res, 403, 'FORBIDDEN', 'You can only test your own assigned wearable', req);
  }

  const testFeedback = {
    vibration_pattern: 'TEST_PULSE',
    pattern_ms: [250, 100, 250],
    led_color: '#8B5CF6',
    oled_text: 'HARDWARE TEST OK',
  };

  broadcastInclusiveUpdate('device_test_triggered', {
    device_id: deviceId,
    accessibility_mode: device.accessibility_mode,
    feedback: testFeedback,
    timestamp: new Date().toISOString(),
  });

  return res.json({
    success: true,
    message: `Test signal broadcast to device ${deviceId}`,
    feedback: testFeedback,
  });
});

// 6. Overview Dashboard Stats
inclusiveRouter.get('/overview', (req: Request, res: Response) => {
  const stats = inclusiveRepository.getOverviewStats();
  const recentEvents = inclusiveRepository.listEvents({ limit: 10 });
  const devices = inclusiveRepository.listDevices();
  return res.json({
    success: true,
    stats,
    recentEvents,
    devices,
  });
});

// 7. Requests Queue (Filtered by role)
inclusiveRouter.get('/requests', authenticate, (req: Request, res: Response) => {
  const user = req.user!;
  const { status, source, limit } = req.query;

  // Students can only see their own requests
  const studentFilter = user.role === 'student' ? user.id : undefined;

  const events = inclusiveRepository.listEvents({
    studentId: studentFilter,
    status: status ? String(status) : undefined,
    source: source ? String(source) : undefined,
    limit: limit ? Number(limit) : 50,
  });

  return res.json({ success: true, events });
});

// 8. Request Status Transitions (Teacher / Admin Protected)
inclusiveRouter.post('/requests/:id/acknowledge', authenticate, requireRole('teacher', 'admin'), (req: Request, res: Response) => {
  const user = req.user!;
  const eventId = req.params.id;
  const updated = inclusiveRepository.updateEventStatus(
    eventId,
    'Acknowledged',
    { id: user.id, name: user.name, role: user.role },
    req.body.notes
  );

  if (!updated) {
    return sendError(res, 404, 'EVENT_NOT_FOUND', 'Request event not found', req);
  }

  const feedback = {
    vibration_pattern: 'ACKNOWLEDGED',
    pattern_ms: (wearableConfig.vibrationPatterns as any).ACKNOWLEDGED.patternMs,
    led_color: '#3B82F6',
    oled_text: (wearableConfig.oledMessages as any)[updated.accessibility_mode]?.ACKNOWLEDGED || 'TEACHER ACKNOWLEDGED',
  };

  broadcastInclusiveUpdate('request_acknowledged', { event: updated, feedback });

  return res.json({ success: true, event: updated, feedback });
});

inclusiveRouter.post('/requests/:id/assistance-provided', authenticate, requireRole('teacher', 'admin'), (req: Request, res: Response) => {
  const user = req.user!;
  const eventId = req.params.id;
  const updated = inclusiveRepository.updateEventStatus(
    eventId,
    'Assistance Provided',
    { id: user.id, name: user.name, role: user.role },
    req.body.notes
  );

  if (!updated) {
    return sendError(res, 404, 'EVENT_NOT_FOUND', 'Request event not found', req);
  }

  broadcastInclusiveUpdate('request_updated', { event: updated });
  return res.json({ success: true, event: updated });
});

inclusiveRouter.post('/requests/:id/resolve', authenticate, requireRole('teacher', 'admin'), (req: Request, res: Response) => {
  const user = req.user!;
  const eventId = req.params.id;
  const updated = inclusiveRepository.updateEventStatus(
    eventId,
    'Resolved',
    { id: user.id, name: user.name, role: user.role },
    req.body.notes
  );

  if (!updated) {
    return sendError(res, 404, 'EVENT_NOT_FOUND', 'Request event not found', req);
  }

  const feedback = {
    vibration_pattern: 'RESOLVED',
    pattern_ms: (wearableConfig.vibrationPatterns as any).RESOLVED.patternMs,
    led_color: '#10B981',
    oled_text: (wearableConfig.oledMessages as any)[updated.accessibility_mode]?.RESOLVED || 'ALL CLEAR - RESOLVED',
  };

  broadcastInclusiveUpdate('request_resolved', { event: updated, feedback });
  return res.json({ success: true, event: updated, feedback });
});

inclusiveRouter.post('/requests/batch-resolve', authenticate, requireRole('teacher', 'admin'), (req: Request, res: Response) => {
  const user = req.user!;
  const { event_ids, notes } = req.body;
  if (!Array.isArray(event_ids) || event_ids.length === 0) {
    return sendError(res, 400, 'INVALID_PAYLOAD', 'event_ids array is required', req);
  }

  const resolvedEvents: any[] = [];
  for (const eventId of event_ids) {
    const updated = inclusiveRepository.updateEventStatus(
      eventId,
      'Resolved',
      { id: user.id, name: user.name, role: user.role },
      notes || 'Batch resolved by teacher'
    );
    if (updated) {
      resolvedEvents.push(updated);
    }
  }

  broadcastInclusiveUpdate('batch_resolved', { count: resolvedEvents.length, event_ids });
  return res.json({ success: true, count: resolvedEvents.length, resolved: resolvedEvents });
});

inclusiveRouter.post('/requests/:id/cancel', authenticate, (req: Request, res: Response) => {
  const user = req.user!;
  const eventId = req.params.id;
  const existing = inclusiveRepository.findEventByEventId(eventId);

  if (!existing) {
    return sendError(res, 404, 'EVENT_NOT_FOUND', 'Request event not found', req);
  }

  // Students can cancel only their own request
  if (user.role === 'student' && existing.student_id !== user.id) {
    return sendError(res, 403, 'FORBIDDEN', 'You can only cancel your own request', req);
  }

  const updated = inclusiveRepository.updateEventStatus(
    eventId,
    'Cancelled',
    { id: user.id, name: user.name, role: user.role },
    req.body.notes || 'Cancelled by user'
  );

  const feedback = {
    vibration_pattern: 'CANCELLED',
    pattern_ms: (wearableConfig.vibrationPatterns as any).CANCELLED.patternMs,
    led_color: '#64748B',
    oled_text: 'REQUEST CANCELLED',
  };

  broadcastInclusiveUpdate('request_cancelled', { event: updated, feedback });
  return res.json({ success: true, event: updated, feedback });
});

// 9. Devices List & Pairing (Teacher/Admin or self-student)
inclusiveRouter.get('/devices', authenticate, (req: Request, res: Response) => {
  const user = req.user!;
  const { source } = req.query;

  if (user.role === 'student') {
    const devices = inclusiveRepository.listDevices({ studentId: user.id });
    return res.json({ success: true, devices });
  }

  const devices = inclusiveRepository.listDevices({ source: source ? String(source) : undefined });
  return res.json({ success: true, devices });
});

inclusiveRouter.post('/devices/pair', authenticate, requireRole('teacher', 'admin'), (req: Request, res: Response) => {
  const { device_id, student_id } = req.body;
  if (!device_id || !student_id) {
    return sendError(res, 400, 'MISSING_FIELDS', 'device_id and student_id are required', req);
  }

  const paired = inclusiveRepository.pairDeviceToStudent(device_id, student_id);
  if (!paired) {
    return sendError(res, 404, 'DEVICE_NOT_FOUND', `Device ${device_id} not found`, req);
  }

  const device = inclusiveRepository.findDeviceById(device_id);
  broadcastInclusiveUpdate('device_updated', device);
  return res.json({ success: true, device });
});

// Self-service Device Test Pattern
inclusiveRouter.post('/devices/:id/test', authenticate, (req: Request, res: Response) => {
  const deviceId = req.params.id;
  const device = inclusiveRepository.findDeviceById(deviceId);
  if (!device) {
    return sendError(res, 404, 'DEVICE_NOT_FOUND', `Device ${deviceId} not found`, req);
  }

  // Permission check: student can only test their assigned device
  if (req.user!.role === 'student' && device.student_id !== req.user!.id) {
    return sendError(res, 403, 'FORBIDDEN', 'You can only test your own assigned wearable', req);
  }

  const testFeedback = {
    vibration_pattern: 'TEST_PULSE',
    pattern_ms: [250, 100, 250],
    led_color: '#8B5CF6',
    oled_text: 'HARDWARE TEST OK',
  };

  broadcastInclusiveUpdate('device_test_triggered', {
    device_id: deviceId,
    accessibility_mode: device.accessibility_mode,
    feedback: testFeedback,
    timestamp: new Date().toISOString(),
  });

  return res.json({
    success: true,
    message: `Test signal broadcast to device ${deviceId}`,
    feedback: testFeedback,
  });
});

// 10. Sensor Data Query
inclusiveRouter.get('/sensors', authenticate, (req: Request, res: Response) => {
  const { device_id, source, limit } = req.query;
  const readings = inclusiveRepository.listRecentSensorReadings({
    deviceId: device_id ? String(device_id) : undefined,
    source: source ? String(source) : undefined,
    limit: limit ? Number(limit) : 50,
  });
  return res.json({ success: true, readings });
});

// 11. Interaction History & CSV Export
inclusiveRouter.get('/history', authenticate, (req: Request, res: Response) => {
  const { studentId, deviceId, status, source, format, limit } = req.query;
  const user = req.user!;

  const studentFilter = user.role === 'student' ? user.id : (studentId ? String(studentId) : undefined);

  const events = inclusiveRepository.listEvents({
    studentId: studentFilter,
    deviceId: deviceId ? String(deviceId) : undefined,
    status: status ? String(status) : undefined,
    source: source ? String(source) : undefined,
    limit: limit ? Number(limit) : 200,
  });

  if (format === 'csv') {
    const csvHeader = 'Event ID,Device ID,Student Name,Request,Accessibility Mode,Status,Source,Timestamp,Acknowledged By,Resolved By\n';
    const rows = events.map(e =>
      `"${e.event_id}","${e.device_id}","${e.student_name || 'N/A'}","${e.request}","${e.accessibility_mode}","${e.status}","${e.source}","${e.timestamp}","${e.acknowledged_by || ''}","${e.resolved_by || ''}"`
    ).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="inclusive_hub_history_${Date.now()}.csv"`);
    return res.send(csvHeader + rows);
  }

  return res.json({ success: true, events });
});

// 12. Clear Simulation Data
inclusiveRouter.post('/simulation/clear', authenticate, requireRole('teacher', 'admin'), (req: Request, res: Response) => {
  const result = inclusiveRepository.clearSimulationData();
  broadcastInclusiveUpdate('simulation_cleared', result);
  return res.json({ success: true, ...result });
});

// 13. Settings
inclusiveRouter.get('/settings', authenticate, (_req: Request, res: Response) => {
  return res.json({
    success: true,
    settings: {
      sensor_consent_enabled: inclusiveRepository.getSetting('sensor_consent_enabled', 'true') === 'true',
      audio_alerts_disabled: inclusiveRepository.getSetting('audio_alerts_disabled', 'true') === 'true',
      high_contrast_mode: inclusiveRepository.getSetting('high_contrast_mode', 'false') === 'true',
      data_retention_days: Number(inclusiveRepository.getSetting('data_retention_days', '180')),
    },
  });
});

inclusiveRouter.put('/settings', authenticate, requireRole('teacher', 'admin'), (req: Request, res: Response) => {
  const { sensor_consent_enabled, audio_alerts_disabled, high_contrast_mode, data_retention_days } = req.body;
  if (typeof sensor_consent_enabled === 'boolean') {
    inclusiveRepository.setSetting('sensor_consent_enabled', String(sensor_consent_enabled));
  }
  if (typeof audio_alerts_disabled === 'boolean') {
    inclusiveRepository.setSetting('audio_alerts_disabled', String(audio_alerts_disabled));
  }
  if (typeof high_contrast_mode === 'boolean') {
    inclusiveRepository.setSetting('high_contrast_mode', String(high_contrast_mode));
  }
  if (typeof data_retention_days === 'number') {
    inclusiveRepository.setSetting('data_retention_days', String(data_retention_days));
  }
  return res.json({ success: true, message: 'Settings updated successfully.' });
});

// 14. Experimental ML Assistive Insights (Scaffold - Off by default)
inclusiveRouter.get('/insights', authenticate, requireRole('teacher', 'admin'), (req: Request, res: Response) => {
  const isEnabled = process.env.WEARABLE_ML_INSIGHTS === 'true' || 
    inclusiveRepository.getSetting('wearable_ml_insights_enabled', 'false') === 'true';

  const disclaimer = 'Experimental assistive suggestions based on pattern heuristics. Not a diagnostic tool or psychological assessment. Never modifies student mastery or ISLM cognitive parameters.';

  if (!isEnabled) {
    return res.json({
      success: true,
      enabled: false,
      disclaimer,
      insights: [],
      message: 'Wearable ML Assistive Insights is disabled (WEARABLE_ML_INSIGHTS=false). Enable in Settings or via environment variable.',
    });
  }

  // Generate lightweight assistive heuristic insights from recent telemetry
  const recentEvents = inclusiveRepository.listEvents({ limit: 50 });
  const recentSensors = inclusiveRepository.listRecentSensorReadings({ limit: 100 });
  const insights: any[] = [];

  // Group by student
  const studentEventMap = new Map<string, any[]>();
  for (const e of recentEvents) {
    if (!e.student_id) continue;
    const list = studentEventMap.get(e.student_id) || [];
    list.push(e);
    studentEventMap.set(e.student_id, list);
  }

  studentEventMap.forEach((events, studentId) => {
    const studentName = events[0]?.student_name || studentId;
    const helpRequests = events.filter(e => e.request === 'I_NEED_HELP');
    if (helpRequests.length >= 3) {
      insights.push({
        id: `insight_${studentId}_fatigue`,
        student_id: studentId,
        student_name: studentName,
        type: 'SUGGEST_BREAK',
        title: 'Frequent Help Requests Detected',
        description: `${studentName} has initiated ${helpRequests.length} help requests recently. A gentle 5-minute cognitive reset or micro-break may be beneficial.`,
        confidence: 0.85,
        reason: 'Multiple rapid assistance requests in the active session window',
        timestamp: new Date().toISOString(),
        is_experimental: true,
      });
    }

    const studentSensors = recentSensors.filter(s => s.student_id === studentId);
    const elevatedGSR = studentSensors.filter(s => (s.gsr_eda || 0) > 22.0);
    const motionSpikes = studentSensors.filter(s => (Math.abs(s.accel_x || 0) + Math.abs(s.accel_y || 0) + Math.abs(s.accel_z || 0)) > 2.8);

    if (elevatedGSR.length >= 2 && motionSpikes.length >= 2) {
      insights.push({
        id: `insight_${studentId}_stress_proxy`,
        student_id: studentId,
        student_name: studentName,
        type: 'CHECK_IN',
        title: 'Agitation / Restlessness Pattern',
        description: `Correlated skin conductance elevation and episodic movement detected for ${studentName}. Consider an empathetic, quiet teacher check-in.`,
        confidence: 0.76,
        reason: 'Co-occurrence of sustained elevated electrodermal activity and accelerometer spikes',
        timestamp: new Date().toISOString(),
        is_experimental: true,
      });
    }
  });

  return res.json({
    success: true,
    enabled: true,
    disclaimer,
    insights,
  });
});
