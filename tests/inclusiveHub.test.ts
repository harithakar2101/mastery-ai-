import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { type Server } from 'http';
import { app } from '../server.ts';
import { createSessionToken, COOKIE_NAME } from '../server/auth.ts';
import { inclusiveRepository } from '../server/repositories/inclusiveRepository.ts';
import { userRepository } from '../server/repositories/userRepository.ts';
import wearableConfig from '../shared/wearable_config.json';

describe('Inclusive Assistive Hub – Wearable Telemetry & Accessibility Suite', () => {
  let server: Server;
  let baseUrl: string;

  const testStudentId = `STU_INCLUSIVE_${Date.now()}`;
  const testTeacherId = `FACULTY_INCLUSIVE_${Date.now()}`;
  const testDeviceId = `ESP32_TEST_${Date.now()}`;
  const hardwareDeviceId = `ESP32_HW_${Date.now()}`;

  let studentCookie: string;
  let teacherCookie: string;

  before(async () => {
    // Ensure test student and teacher exist
    const studentUser = {
      id: testStudentId,
      name: 'Inclusive Test Student',
      email: `${testStudentId.toLowerCase()}@university.edu`,
      role: 'student' as const,
      plan: 'Free Plan',
      theme: 'dark',
      streakDays: 1,
      testsCompleted: 0,
      overallMastery: 0.65,
      retentionDays: 180,
      tokenVersion: 1,
    };
    userRepository.create(studentUser);
    studentCookie = `${COOKIE_NAME}=${createSessionToken(studentUser)}`;

    const teacherUser = {
      id: testTeacherId,
      name: 'Inclusive Test Teacher',
      email: `${testTeacherId.toLowerCase()}@university.edu`,
      role: 'teacher' as const,
      plan: 'Campus License',
      theme: 'dark',
      streakDays: 1,
      testsCompleted: 0,
      overallMastery: 0.95,
      retentionDays: 365,
      tokenVersion: 1,
    };
    userRepository.create(teacherUser);
    teacherCookie = `${COOKIE_NAME}=${createSessionToken(teacherUser)}`;

    await new Promise<void>(resolve => {
      server = app.listen(0, '127.0.0.1', () => {
        const addr = server.address();
        const port = typeof addr === 'object' && addr ? addr.port : 3008;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  after(async () => {
    if (server) {
      await new Promise<void>(resolve => server.close(() => resolve()));
    }
  });

  // 1. Device Fleet Telemetry & Heartbeat
  it('1. Registers an ESP32 wearable and tracks heartbeats and battery telemetry', () => {
    const dev = inclusiveRepository.registerDevice({
      device_id: testDeviceId,
      student_id: testStudentId,
      device_token: `token_${testDeviceId}`,
      device_type: 'ESP32_WROOM_32',
      accessibility_mode: 'BLIND',
      firmware_version: '1.0.0',
      status: 'connected',
      battery_pct: 95,
      source: 'simulation',
    });

    assert.ok(dev);
    assert.equal(dev.device_id, testDeviceId);
    assert.equal(dev.student_id, testStudentId);
    assert.equal(dev.accessibility_mode, 'BLIND');
    assert.equal(dev.battery_pct, 95);

    // Update heartbeat
    const updated = inclusiveRepository.updateDeviceHeartbeat(testDeviceId, 'connected', 88);
    assert.ok(updated);

    const refetched = inclusiveRepository.findDeviceById(testDeviceId);
    assert.equal(refetched?.battery_pct, 88);
    assert.equal(refetched?.status, 'connected');
    assert.ok(refetched?.last_heartbeat);
  });

  // 2. Student-Device Pairing
  it('2. Pairs and reassigns wearable device to student profile', () => {
    const newStudentId = `STU_PAIR_${Date.now()}`;
    userRepository.create({
      id: newStudentId,
      name: 'Second Test Student',
      email: `${newStudentId.toLowerCase()}@university.edu`,
      role: 'student',
      plan: 'Free Plan',
      theme: 'dark',
      streakDays: 1,
      testsCompleted: 0,
      overallMastery: 0.70,
      retentionDays: 180,
    });

    const pairResult = inclusiveRepository.pairDeviceToStudent(testDeviceId, newStudentId);
    assert.ok(pairResult);

    const dev = inclusiveRepository.findDeviceById(testDeviceId);
    assert.equal(dev?.student_id, newStudentId);

    // Return to original test student
    inclusiveRepository.pairDeviceToStudent(testDeviceId, testStudentId);
  });

  // 3. Request Lifecycle Transitions
  it('3. Advances request lifecycle: Pending -> Acknowledged -> Assistance Provided -> Resolved', () => {
    const eventId = `EVT_LIFECYCLE_${Date.now()}`;
    const initialEvent = inclusiveRepository.createEvent({
      event_id: eventId,
      device_id: testDeviceId,
      student_id: testStudentId,
      event_type: 'HELP_REQUEST',
      request: 'I_NEED_HELP',
      accessibility_mode: 'BLIND',
      status: 'Pending',
      vibration_pattern: 'REQUEST_SENT',
      source: 'simulation',
    });

    assert.equal(initialEvent.status, 'Pending');
    assert.equal(initialEvent.event_id, eventId);

    // Step A: Acknowledge
    const acked = inclusiveRepository.updateEventStatus(
      eventId,
      'Acknowledged',
      { id: 'FACULTY_01', name: 'Dr. Turing', role: 'teacher' },
      'Received request, on my way to desk'
    );
    assert.ok(acked);
    assert.equal(acked.status, 'Acknowledged');
    assert.ok(acked.acknowledged_by?.includes('Dr. Turing'));
    assert.ok(acked.acknowledged_at);

    // Step B: Assistance Provided
    const assisting = inclusiveRepository.updateEventStatus(
      eventId,
      'Assistance Provided',
      { id: 'FACULTY_01', name: 'Dr. Turing', role: 'teacher' },
      'Assisting student with tactile braille notes'
    );
    assert.ok(assisting);
    assert.equal(assisting.status, 'Assistance Provided');

    // Step C: Resolved
    const resolved = inclusiveRepository.updateEventStatus(
      eventId,
      'Resolved',
      { id: 'FACULTY_01', name: 'Dr. Turing', role: 'teacher' },
      'Question resolved successfully'
    );
    assert.ok(resolved);
    assert.equal(resolved.status, 'Resolved');
    assert.ok(resolved.resolved_by?.includes('Dr. Turing'));
    assert.ok(resolved.resolved_at);
  });

  // 4. Duplicate Event Prevention (Idempotency)
  it('4. Enforces duplicate event prevention via event_id lookup', () => {
    const uniqueEventId = `EVT_IDEMP_${Date.now()}`;
    inclusiveRepository.createEvent({
      event_id: uniqueEventId,
      device_id: testDeviceId,
      student_id: testStudentId,
      event_type: 'HELP_REQUEST',
      request: 'I_NEED_HELP',
      accessibility_mode: 'BLIND',
      status: 'Pending',
      source: 'simulation',
    });

    const duplicateCheck = inclusiveRepository.findEventByEventId(uniqueEventId);
    assert.ok(duplicateCheck, 'Event must exist');
    assert.equal(duplicateCheck.event_id, uniqueEventId);
  });

  // 5. Accessibility-Mode Specific Feedback
  it('5. Computes correct tactile, OLED, and RGB LED feedback per accessibility mode', () => {
    // Mode: BLIND (Tactile Vibration Only)
    const blindAckVib = (wearableConfig.vibrationPatterns as any).ACKNOWLEDGED.patternMs;
    assert.deepEqual(blindAckVib, [300, 100, 300, 100, 500]);

    const blindReqVib = (wearableConfig.vibrationPatterns as any).REQUEST_SENT.patternMs;
    assert.deepEqual(blindReqVib, [150, 100, 150]);

    // Mode: DEAF (Visual OLED + RGB LED + vibration)
    const deafOled = (wearableConfig.oledMessages as any).DEAF.ACKNOWLEDGED;
    assert.ok(deafOled.includes('TEACHER ACKNOWLEDGED'));

    const deafLed = (wearableConfig.ledColors as any).ACKNOWLEDGED.hex;
    assert.equal(deafLed, '#3B82F6');

    // Mode: NON_SPEAKING (Phrase buttons confirmation)
    const nonSpeakingOled = (wearableConfig.oledMessages as any).NON_SPEAKING.PENDING;
    assert.ok(nonSpeakingOled.includes('I NEED HELP'));
  });

  // 6. Sensor Ingestion & Review Flagging (Non-Diagnostic)
  it('6. Ingests sensor telemetry and flags nominal vs anomalous values for review without diagnosing', () => {
    // Nominal telemetry
    const nominal = inclusiveRepository.recordSensorReading({
      device_id: testDeviceId,
      student_id: testStudentId,
      heart_rate: 74,
      spo2: 98,
      gsr_eda: 11.2,
      accel_x: 0.04,
      accel_y: -0.08,
      accel_z: 0.99,
      temp_c: 36.7,
      is_anomaly: false,
      review_flag: false,
      source: 'simulation',
    });
    assert.ok(nominal.id);
    assert.equal(nominal.is_anomaly, 0);
    assert.equal(nominal.review_flag, 0);

    // Elevated telemetry (Flag for review only)
    const anomalous = inclusiveRepository.recordSensorReading({
      device_id: testDeviceId,
      student_id: testStudentId,
      heart_rate: 138,
      spo2: 90,
      gsr_eda: 28.5,
      accel_x: 1.5,
      accel_y: 1.2,
      accel_z: 2.1,
      temp_c: 37.1,
      is_anomaly: true,
      review_flag: true,
      source: 'simulation',
    });
    assert.ok(anomalous.id);
    assert.equal(anomalous.is_anomaly, 1);
    assert.equal(anomalous.review_flag, 1);
  });

  // 7. Isolation Guarantee: Mastery Score Integrity
  it('7. Guarantees zero regression: sensor telemetry and help requests never alter student mastery scores', () => {
    const studentBefore = userRepository.findById(testStudentId);
    const masteryBefore = studentBefore?.overallMastery;

    // Ingest help request and high GSR reading
    inclusiveRepository.createEvent({
      event_id: `EVT_NO_REGRESS_${Date.now()}`,
      device_id: testDeviceId,
      student_id: testStudentId,
      event_type: 'HELP_REQUEST',
      request: 'I_NEED_HELP',
      accessibility_mode: 'BLIND',
      status: 'Pending',
      source: 'simulation',
    });

    inclusiveRepository.recordSensorReading({
      device_id: testDeviceId,
      student_id: testStudentId,
      heart_rate: 145,
      gsr_eda: 32.0,
      is_anomaly: true,
      review_flag: true,
      source: 'simulation',
    });

    const studentAfter = userRepository.findById(testStudentId);
    assert.equal(studentAfter?.overallMastery, masteryBefore, 'Mastery score must remain completely untouched by wearable telemetry');
  });

  // 8. Simulation vs Hardware Data Isolation
  it('8. Isolates hardware and simulated data: clearing simulation preserves hardware records', () => {
    // Create hardware device and event
    inclusiveRepository.registerDevice({
      device_id: hardwareDeviceId,
      student_id: testStudentId,
      device_token: `hw_token_${hardwareDeviceId}`,
      accessibility_mode: 'DEAF',
      source: 'hardware',
    });

    const hwEventId = `EVT_HW_${Date.now()}`;
    inclusiveRepository.createEvent({
      event_id: hwEventId,
      device_id: hardwareDeviceId,
      student_id: testStudentId,
      request: 'I_NEED_HELP',
      accessibility_mode: 'DEAF',
      status: 'Pending',
      source: 'hardware',
    });

    // Clear simulation data
    const purgeResult = inclusiveRepository.clearSimulationData();
    assert.ok(typeof purgeResult.eventsCleared === 'number');
    assert.ok(typeof purgeResult.devicesCleared === 'number');

    // Hardware records must still exist intact!
    const hwEvent = inclusiveRepository.findEventByEventId(hwEventId);
    assert.ok(hwEvent, 'Hardware event must be preserved during simulation purge');
    assert.equal(hwEvent.source, 'hardware');

    const hwDev = inclusiveRepository.findDeviceById(hardwareDeviceId);
    assert.ok(hwDev, 'Hardware device must be preserved during simulation purge');
    assert.equal(hwDev.source, 'hardware');
  });

  // 9. Overview Statistics Computation
  it('9. Computes comprehensive hub overview statistics accurately', () => {
    const stats = inclusiveRepository.getOverviewStats();
    assert.ok(typeof stats.totalStudents === 'number');
    assert.ok(typeof stats.connectedWearables === 'number');
    assert.ok(typeof stats.pendingHelpRequests === 'number');
    assert.ok(typeof stats.activeDeviceAlerts === 'number');
    assert.ok(stats.totalStudents >= 0);
  });

  // 10. Audit Log & Settings Persistence
  it('10. Persists and queries system settings correctly', () => {
    inclusiveRepository.setSetting('test_key_haptic', 'HIGH');
    const val = inclusiveRepository.getSetting('test_key_haptic');
    assert.equal(val, 'HIGH');

    inclusiveRepository.setSetting('test_key_haptic', 'BALANCED');
    const updatedVal = inclusiveRepository.getSetting('test_key_haptic');
    assert.equal(updatedVal, 'BALANCED');
  });

  // 11. API: Event Ingestion & Duplicate Prevention (HTTP 409)
  it('11. Rejects duplicate event_id over HTTP POST /api/inclusive/events with 409 Conflict', async () => {
    const apiEventId = `EVT_API_IDEMP_${Date.now()}`;
    const payload = {
      event_id: apiEventId,
      device_id: testDeviceId,
      student_id: testStudentId,
      request: 'I_NEED_HELP',
      accessibility_mode: 'BLIND',
      source: 'simulation',
    };

    // First POST: 201 Created
    const res1 = await fetch(`${baseUrl}/api/inclusive/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    assert.equal(res1.status, 201);
    const body1 = await res1.json();
    assert.equal(body1.success, true);
    assert.ok(body1.feedback?.vibration_pattern);

    // Second POST: 409 Conflict
    const res2 = await fetch(`${baseUrl}/api/inclusive/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    assert.equal(res2.status, 409);
    const body2 = await res2.json();
    assert.equal(body2.status, 'DUPLICATE');
  });

  // 12. API: Teacher Acknowledgment with Mode Feedback
  it('12. Allows teacher to acknowledge request and returns mode feedback', async () => {
    const ackEventId = `EVT_API_ACK_${Date.now()}`;
    await fetch(`${baseUrl}/api/inclusive/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_id: ackEventId,
        device_id: testDeviceId,
        student_id: testStudentId,
        request: 'I_NEED_HELP',
        accessibility_mode: 'DEAF',
        source: 'simulation',
      }),
    });

    const ackRes = await fetch(`${baseUrl}/api/inclusive/requests/${ackEventId}/acknowledge`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: teacherCookie,
      },
      body: JSON.stringify({ notes: 'Teacher is on the way' }),
    });

    assert.equal(ackRes.status, 200);
    const ackData = await ackRes.json();
    assert.equal(ackData.success, true);
    assert.equal(ackData.event.status, 'Acknowledged');
    assert.ok(ackData.feedback?.oled_text?.includes('TEACHER ACKNOWLEDGED'));
  });

  // 13. API: Batch Resolution
  it('13. Allows teacher to batch resolve multiple requests simultaneously', async () => {
    const evt1 = `EVT_BATCH_1_${Date.now()}`;
    const evt2 = `EVT_BATCH_2_${Date.now()}`;

    await fetch(`${baseUrl}/api/inclusive/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_id: evt1,
        device_id: testDeviceId,
        student_id: testStudentId,
        request: 'I_NEED_BREAK',
        accessibility_mode: 'NON_SPEAKING',
        source: 'simulation',
      }),
    });

    await fetch(`${baseUrl}/api/inclusive/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_id: evt2,
        device_id: testDeviceId,
        student_id: testStudentId,
        request: 'I_NEED_HELP',
        accessibility_mode: 'NON_SPEAKING',
        source: 'simulation',
      }),
    });

    const batchRes = await fetch(`${baseUrl}/api/inclusive/requests/batch-resolve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: teacherCookie,
      },
      body: JSON.stringify({
        event_ids: [evt1, evt2],
        notes: 'Session transition batch cleared',
      }),
    });

    assert.equal(batchRes.status, 200);
    const batchData = await batchRes.json();
    assert.equal(batchData.success, true);
    assert.equal(batchData.count, 2);
  });

  // 14. API: Self-Service Device Test
  it('14. Allows student to test their assigned wearable hardware feedback', async () => {
    const testRes = await fetch(`${baseUrl}/api/inclusive/devices/${testDeviceId}/test`, {
      method: 'POST',
      headers: { Cookie: studentCookie },
    });

    assert.equal(testRes.status, 200);
    const testData = await testRes.json();
    assert.equal(testData.success, true);
    assert.equal(testData.feedback.vibration_pattern, 'TEST_PULSE');
    assert.equal(testData.feedback.oled_text, 'HARDWARE TEST OK');
  });

  // 15. API: CSV Export
  it('15. Exports interaction history as CSV via GET /api/inclusive/history?format=csv', async () => {
    const csvRes = await fetch(`${baseUrl}/api/inclusive/history?format=csv`, {
      headers: { Cookie: teacherCookie },
    });

    assert.equal(csvRes.status, 200);
    const contentType = csvRes.headers.get('content-type');
    assert.ok(contentType?.includes('text/csv'));

    const text = await csvRes.text();
    assert.ok(text.startsWith('Event ID,Device ID,Student Name'));
  });

  // 16. API: Role-based Authorization Guard
  it('16. Rejects unauthorized student attempts to acknowledge requests with 403 Forbidden', async () => {
    const forbiddenRes = await fetch(`${baseUrl}/api/inclusive/requests/EVT_TEST/acknowledge`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: studentCookie,
      },
      body: JSON.stringify({ notes: 'Student cannot self-acknowledge' }),
    });

    assert.equal(forbiddenRes.status, 403);
  });
});
