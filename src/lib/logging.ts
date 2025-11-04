import { getRequestId } from '@/lib/runtime/request-context';
import { debugLogsEnabled } from '@/lib/observability/toggle';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function normalizeLevel(v: string | undefined): LogLevel {
  const s = (v || '').toLowerCase();
  if (s === 'debug' || s === 'info' || s === 'warn' || s === 'error') return s;
  return process.env.NODE_ENV === 'production' ? 'info' : 'debug';
}

const EFFECTIVE_LEVEL: LogLevel = normalizeLevel(process.env.LOG_LEVEL);
const FORMAT_PRETTY = (process.env.LOG_FORMAT || '').toLowerCase() === 'pretty';

// Case-insensitive redaction keys (exact name match)
const REDACT_KEYS = new Set(['apikey', 'authorization', 'password', 'token', 'secret', 'key']);

function isRedactionKey(key: string): boolean {
  return REDACT_KEYS.has(key.toLowerCase());
}

function redactScalar(val: unknown): unknown {
  if (val === null || val === undefined) return val;
  if (typeof val === 'string') return '[redacted]';
  if (typeof val === 'number' || typeof val === 'boolean') return '[redacted]';
  if (typeof val === 'object') return '[redacted]';
  return '[redacted]';
}

function sanitize(value: unknown, seen = new WeakSet<object>(), depth = 0): unknown {
  if (value === null || value === undefined) return value;
  if (depth > 8) return '[max-depth]';

  if (Array.isArray(value)) {
    return value.map((v) => sanitize(v, seen, depth + 1));
  }
  if (typeof value === 'object') {
    if (seen.has(value as object)) return '[circular]';
    seen.add(value as object);
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (isRedactionKey(k)) {
        out[k] = redactScalar(v);
      } else {
        out[k] = sanitize(v, seen, depth + 1);
      }
    }
    return out;
  }
  return value;
}

function shouldEmit(level: LogLevel): boolean {
  // Honor DEBUG_LOGS for debug level regardless of LOG_LEVEL
  if (level === 'debug' && !debugLogsEnabled()) return false;
  return LEVEL_ORDER[level] >= LEVEL_ORDER[EFFECTIVE_LEVEL];
}

function buildPayload(
  level: LogLevel,
  scope: string,
  event: string,
  fields?: Record<string, unknown>,
) {
  const ts = new Date().toISOString();
  const rid = getRequestId();
  const env = process.env.NODE_ENV || 'development';
  const base = {
    timestamp: ts,
    level,
    scope,
    event,
    env,
    ...(rid ? { request_id: rid } : {}),
  };
  if (!fields) return base;
  const extra = sanitize(fields) as Record<string, unknown>;
  return { ...base, ...extra };
}

function emit(level: LogLevel, scope: string, event: string, fields?: Record<string, unknown>) {
  if (!shouldEmit(level)) return;
  const payload = buildPayload(level, scope, event, fields);

  if (FORMAT_PRETTY) {
    const head = `[${(payload as any).timestamp}] ${level.toUpperCase()} ${scope}:${event}`;
    // Show a compact object without duplicating head fields
    const { timestamp, level: _lv, scope: _sc, event: _ev, ...rest } = payload as any;
    if (level === 'error') {
      console.error(head, rest);
    } else if (level === 'warn') {
      console.warn(head, rest);
    } else {
      console.log(head, rest);
    }
    return;
  }

  const line = JSON.stringify(payload);
  if (level === 'error') {
    console.error(line);
  } else if (level === 'warn') {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export const log = {
  debug(scope: string, event: string, fields?: Record<string, unknown>) {
    emit('debug', scope, event, fields);
  },
  info(scope: string, event: string, fields?: Record<string, unknown>) {
    emit('info', scope, event, fields);
  },
  warn(scope: string, event: string, fields?: Record<string, unknown>) {
    emit('warn', scope, event, fields);
  },
  error(scope: string, event: string, fields?: Record<string, unknown>) {
    emit('error', scope, event, fields);
  },
};

declare global {
  var __BOOKSITE_LOGGER_INITED__: boolean | undefined;
}

function initProcessHandlersOnce() {
  if (globalThis.__BOOKSITE_LOGGER_INITED__) return;
  globalThis.__BOOKSITE_LOGGER_INITED__ = true;
  try {
    process.on('unhandledRejection', (reason) => {
      log.error('process', 'unhandled_rejection', {
        reason: typeof reason === 'object' ? sanitize(reason as any) : String(reason),
      });
    });
    process.on('uncaughtException', (err) => {
      log.error('process', 'uncaught_exception', {
        name: (err as any)?.name,
        message: (err as any)?.message,
        stack: (err as any)?.stack,
      });
    });
  } catch {
    // noop (some environments may not allow process handlers)
  }
}

initProcessHandlersOnce();
