/**
 * CogniCSE Structured Logger with PII Redaction
 * Standardized JSON logging with Request ID correlation and privacy sanitization
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  fatal: 50,
};

const CURRENT_LEVEL: LogLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';

// PII Redaction Patterns
const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
const TOKEN_REGEX = /(Bearer\s+[A-Za-z0-9\-._~+/]+=*)|(session_token=[^;\s]+)|(cognicse_session=[^;\s]+)/gi;
const PASSWORD_REGEX = /("password"\s*:\s*)"[^"]+"/gi;
const API_KEY_REGEX = /(AIza[0-9A-Za-z-_]{35})|(key-[0-9a-zA-Z]{32})/g;

export function redactPII(input: any): any {
  if (typeof input === 'string') {
    return input
      .replace(EMAIL_REGEX, (email) => {
        const [local, domain] = email.split('@');
        return `${local[0]}***@***.${domain.split('.').pop()}`;
      })
      .replace(TOKEN_REGEX, '$1=REDACTED')
      .replace(PASSWORD_REGEX, '$1"***REDACTED***"')
      .replace(API_KEY_REGEX, 'AIza***REDACTED***');
  }

  if (input !== null && typeof input === 'object') {
    if (Array.isArray(input)) {
      return input.map(redactPII);
    }
    const sanitized: Record<string, any> = {};
    for (const [k, v] of Object.entries(input)) {
      const lower = k.toLowerCase();
      if (lower.includes('password') || lower.includes('secret') || lower.includes('token') || lower.includes('cookie') || lower.includes('apikey')) {
        sanitized[k] = '[REDACTED]';
      } else if (lower.includes('email') && typeof v === 'string') {
        sanitized[k] = redactPII(v);
      } else {
        sanitized[k] = redactPII(v);
      }
    }
    return sanitized;
  }

  return input;
}

export interface LogPayload {
  msg: string;
  requestId?: string;
  userId?: string;
  err?: any;
  [key: string]: any;
}

export class StructuredLogger {
  private baseContext: Record<string, any>;

  constructor(context: Record<string, any> = {}) {
    this.baseContext = context;
  }

  child(extraContext: Record<string, any>): StructuredLogger {
    return new StructuredLogger({ ...this.baseContext, ...extraContext });
  }

  private log(level: LogLevel, msgOrPayload: string | LogPayload, extra?: Record<string, any>) {
    if (LOG_LEVEL_PRIORITY[level] < LOG_LEVEL_PRIORITY[CURRENT_LEVEL]) return;

    let payload: Record<string, any> = {};
    if (typeof msgOrPayload === 'string') {
      payload = { msg: msgOrPayload, ...(extra || {}) };
    } else {
      payload = { ...msgOrPayload, ...(extra || {}) };
    }

    const merged = {
      level,
      time: new Date().toISOString(),
      service: 'cognicse-engine',
      pid: process.pid,
      ...this.baseContext,
      ...payload,
    };

    if (merged.err && merged.err instanceof Error) {
      merged.err = {
        message: merged.err.message,
        name: merged.err.name,
        stack: merged.err.stack,
      };
    }

    const sanitized = redactPII(merged);
    const line = JSON.stringify(sanitized);

    if (level === 'error' || level === 'fatal') {
      console.error(line);
    } else if (level === 'warn') {
      console.warn(line);
    } else {
      console.log(line);
    }
  }

  debug(msg: string | LogPayload, extra?: Record<string, any>) {
    this.log('debug', msg, extra);
  }

  info(msg: string | LogPayload, extra?: Record<string, any>) {
    this.log('info', msg, extra);
  }

  warn(msg: string | LogPayload, extra?: Record<string, any>) {
    this.log('warn', msg, extra);
  }

  error(msg: string | LogPayload, extra?: Record<string, any>) {
    this.log('error', msg, extra);
  }

  fatal(msg: string | LogPayload, extra?: Record<string, any>) {
    this.log('fatal', msg, extra);
  }
}

export const logger = new StructuredLogger();

// Global Error Tracking Hook per Prompt
export function trackError(err: any, context?: Record<string, any>) {
  logger.error({
    msg: 'Unhandled Application Exception Detected',
    err,
    context: context ? redactPII(context) : undefined,
  });
}
