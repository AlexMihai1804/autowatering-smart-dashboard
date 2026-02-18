/**
 * Structured logging utility.
 *
 * Emits JSON lines so CloudWatch Logs Insights can query structured fields:
 *   requestId, route, uid, statusCode, latencyMs, errorCode, level, ...
 *
 * Usage:
 *   const log = createLogger(requestId, route, uid);
 *   log.info('Processing payment');
 *   log.warn('Stripe degraded', { retries: 2 });
 *   log.error('Failed to charge', { errorCode: 'stripe_timeout' });
 *   log.metric({ statusCode: 200, latencyMs: 42 });
 */

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

export interface StructuredLog {
    level: LogLevel;
    timestamp: string;
    requestId?: string;
    route?: string;
    uid?: string;
    message: string;
    [key: string]: unknown;
}

export interface Logger {
    debug(message: string, extra?: Record<string, unknown>): void;
    info(message: string, extra?: Record<string, unknown>): void;
    warn(message: string, extra?: Record<string, unknown>): void;
    error(message: string, extra?: Record<string, unknown>): void;
    metric(fields: Record<string, unknown>): void;
}

function emit(entry: StructuredLog): void {
    // JSON line → CloudWatch will auto-parse fields
    process.stdout.write(JSON.stringify(entry) + '\n');
}

export function createLogger(requestId?: string, route?: string, uid?: string): Logger {
    function log(level: LogLevel, message: string, extra?: Record<string, unknown>): void {
        const entry: StructuredLog = {
            level,
            timestamp: new Date().toISOString(),
            requestId,
            route,
            uid,
            message,
            ...extra
        };
        emit(entry);
    }

    return {
        debug: (msg, extra) => log('DEBUG', msg, extra),
        info: (msg, extra) => log('INFO', msg, extra),
        warn: (msg, extra) => log('WARN', msg, extra),
        error: (msg, extra) => log('ERROR', msg, extra),
        metric: (fields) => log('INFO', 'metric', fields)
    };
}

/**
 * Request-scoped logger factory — call once per incoming request.
 */
export function requestLogger(event: {
    requestContext?: { requestId?: string; http?: { method?: string; path?: string } };
}): Logger {
    const requestId = event.requestContext?.requestId;
    const method = event.requestContext?.http?.method;
    const path = event.requestContext?.http?.path;
    const route = method && path ? `${method} ${path}` : undefined;
    return createLogger(requestId, route);
}
