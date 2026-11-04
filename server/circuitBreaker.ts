import { logger } from './logger.ts';

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerOptions {
  name?: string;
  failureThreshold?: number;
  cooldownMs?: number;
}

export class CircuitBreaker {
  public readonly name: string;
  private state: CircuitState = 'CLOSED';
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime = 0;
  private readonly failureThreshold: number;
  private readonly cooldownMs: number;
  private totalTrips = 0;

  constructor(options: CircuitBreakerOptions = {}) {
    this.name = options.name || 'gemini-ai-circuit';
    this.failureThreshold = options.failureThreshold || 3;
    this.cooldownMs = options.cooldownMs || 25000;
  }

  getState(): CircuitState {
    if (this.state === 'OPEN') {
      const elapsed = Date.now() - this.lastFailureTime;
      if (elapsed >= this.cooldownMs) {
        this.state = 'HALF_OPEN';
        logger.info({
          msg: `[CircuitBreaker:${this.name}] Cooldown elapsed (${elapsed}ms). Transitioning to HALF_OPEN trial.`,
          state: 'HALF_OPEN',
        });
      }
    }
    return this.state;
  }

  canExecute(): boolean {
    return this.getState() !== 'OPEN';
  }

  recordSuccess() {
    if (this.state === 'HALF_OPEN') {
      this.state = 'CLOSED';
      this.failureCount = 0;
      logger.info({
        msg: `[CircuitBreaker:${this.name}] Trial request succeeded. Circuit CLOSED.`,
        state: 'CLOSED',
      });
    } else {
      this.failureCount = 0;
    }
    this.successCount++;
  }

  recordFailure(err?: any) {
    this.lastFailureTime = Date.now();
    this.failureCount++;

    if (this.state === 'HALF_OPEN' || this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
      this.totalTrips++;
      logger.warn({
        msg: `[CircuitBreaker:${this.name}] Failure threshold (${this.failureThreshold}) exceeded. Circuit tripped to OPEN. Fast-failing calls for ${this.cooldownMs}ms.`,
        state: 'OPEN',
        failureCount: this.failureCount,
        totalTrips: this.totalTrips,
        lastError: err?.message || String(err),
      });
    }
  }

  getStats() {
    return {
      name: this.name,
      state: this.getState(),
      failureCount: this.failureCount,
      successCount: this.successCount,
      totalTrips: this.totalTrips,
      cooldownMs: this.cooldownMs,
    };
  }

  reset() {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
  }
}

export const geminiCircuitBreaker = new CircuitBreaker({
  name: 'gemini-core',
  failureThreshold: 3,
  cooldownMs: 25000,
});
