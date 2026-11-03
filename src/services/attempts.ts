import { AttemptRecord } from '../types';

export function isRepeatedError(
  attempts: AttemptRecord[],
  conceptId: string,
  errorCategory?: string
): boolean {
  if (!errorCategory) return false;
  return attempts.some(
    a => a.conceptId === conceptId && a.errorCategory === errorCategory && !a.passed
  );
}

export function isTransferTaskUnlocked(conceptAttempts: AttemptRecord[]): boolean {
  // Transfer task unlocks when student achieves at least 2 consecutive passed attempts
  const passedCount = conceptAttempts.filter(a => a.passed).length;
  return passedCount >= 2;
}

export function calculateScaffoldingFadingIndex(
  attempts: AttemptRecord[],
  currentTier = 1
): number {
  if (attempts.length === 0) return 0.2;
  const recent = attempts.slice(-10);
  const independentPassed = recent.filter(a => a.passed && a.tierUsed === 1).length;
  const rawIndex = independentPassed / recent.length;
  return +(Math.max(0.1, Math.min(1.0, rawIndex)).toFixed(2));
}
