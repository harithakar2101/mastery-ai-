import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { quotaRepository } from '../server/repositories/quotaRepository.ts';
import { auditLogRepository } from '../server/repositories/auditLogRepository.ts';
import { redactPII, trackError } from '../server/logger.ts';
import { userRepository } from '../server/repositories/userRepository.ts';

describe('AI Quotas, PII Redaction & Audit Logging Suite', () => {
  const testStudentId = `CSE_TEST_QUOTA_${Date.now()}`;
  const testTeacherId = `FACULTY_TEST_QUOTA_${Date.now()}`;

  before(() => {
    // Ensure test users exist
    userRepository.create({
      id: testStudentId,
      name: 'Test Quota Student',
      email: `${testStudentId.toLowerCase()}@university.edu`,
      role: 'student',
      plan: 'Free Plan',
      theme: 'dark',
      streakDays: 1,
      testsCompleted: 0,
      overallMastery: 0.50,
      retentionDays: 180,
    });

    userRepository.create({
      id: testTeacherId,
      name: 'Test Quota Teacher',
      email: `${testTeacherId.toLowerCase()}@university.edu`,
      role: 'teacher',
      plan: 'Campus License',
      theme: 'dark',
      streakDays: 1,
      testsCompleted: 0,
      overallMastery: 0.90,
      retentionDays: 365,
    });
  });

  it('1. Enforces student daily limit of 50 calls and teacher limit of 500 calls', () => {
    const studentLimits = quotaRepository.getLimits('student');
    assert.equal(studentLimits.requestLimit, 50);
    assert.equal(studentLimits.uploadLimitBytes, 25 * 1024 * 1024);

    const teacherLimits = quotaRepository.getLimits('teacher');
    assert.equal(teacherLimits.requestLimit, 500);
    assert.equal(teacherLimits.uploadLimitBytes, 100 * 1024 * 1024);
  });

  it('2. Correctly flags daily quota exhaustion when 50 requests reached', () => {
    // Initial status
    const initialStatus = quotaRepository.checkQuota(testStudentId, 'student');
    assert.equal(initialStatus.allowed, true);
    assert.equal(initialStatus.limit, 50);

    // Consume remaining quota
    quotaRepository.incrementUsage(testStudentId, 50, 15000, 1024 * 1024);

    const exhaustedStatus = quotaRepository.checkQuota(testStudentId, 'student');
    assert.equal(exhaustedStatus.allowed, false, 'Should deny request when quota is exhausted');
    assert.equal(exhaustedStatus.remainingRequests, 0);
    assert.ok(exhaustedStatus.resetAt, 'Must provide reset timestamp');
  });

  it('3. Computes administrative usage metrics and estimated Gemini Flash costs', () => {
    const summary = quotaRepository.getAdminUsageSummary();
    assert.ok(summary.today, 'Summary must include today metrics');
    assert.ok(summary.allTime, 'Summary must include all-time totals');
    assert.ok(typeof summary.allTime.estimatedCostUsd === 'number', 'Must estimate cost');
  });

  it('4. Automatically redacts PII (emails, tokens, passwords, keys) in logs', () => {
    const sensitivePayload = {
      userEmail: 'student.smith@university.edu',
      password: 'SuperSecretPassword123!',
      sessionCookie: 'cognicse_session=eyJhbGciOiJIUzI1NiJ9.test',
      apiKey: 'AIzaSyD-1234567890abcdefghijklmnopqrstuv',
      unrelatedField: 'Calculus III Matrix Operations',
    };

    const redacted = redactPII(sensitivePayload);

    assert.ok(!JSON.stringify(redacted).includes('SuperSecretPassword123!'), 'Password must be masked');
    assert.ok(!JSON.stringify(redacted).includes('student.smith@university.edu'), 'Full email must be masked');
    assert.ok(JSON.stringify(redacted).includes('***@***'), 'Email must follow masked pattern');
    assert.ok(!JSON.stringify(redacted).includes('AIzaSyD-1234567890abcdefghijklmnopqrstuv'), 'API key must be redacted');
    assert.equal(redacted.unrelatedField, 'Calculus III Matrix Operations', 'Non-PII field preserved');
  });

  it('5. Records structured audit logs for administrative actions', () => {
    const logRecord = auditLogRepository.log({
      userId: testTeacherId,
      userRole: 'teacher',
      action: 'TEACHER_APPROVE_INTERVENTION',
      resourceType: 'intervention',
      resourceId: 'int_sample_test',
      details: { conceptId: 'web_apache_docroot', approved: true },
      ipAddress: '127.0.0.1',
    });

    assert.ok(logRecord.id);
    assert.equal(logRecord.action, 'TEACHER_APPROVE_INTERVENTION');

    const recentLogs = auditLogRepository.listRecent(10);
    assert.ok(recentLogs.some(l => l.id === logRecord.id), 'Recorded log must appear in recent listing');
  });

  it('6. Supports user data retention preference configuration', () => {
    const updated = userRepository.update(testStudentId, { retentionDays: 90 });
    assert.equal(updated?.retentionDays, 90, 'User retention period should update to 90 days');

    const fetched = userRepository.findById(testStudentId);
    assert.equal(fetched?.retentionDays, 90);
  });

  it('7. Error tracking hook executes without throwing unhandled exceptions', () => {
    assert.doesNotThrow(() => {
      trackError(new Error('Sample simulated error for audit verification'), {
        source: 'quotasAudit.test.ts',
        studentId: testStudentId,
      });
    });
  });
});
