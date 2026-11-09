/**
 * Production-Safe Logger
 * 
 * Only logs in development or when DEBUG_LOGS is enabled.
 * Prevents sensitive information leakage in production.
 */

const isDev = process.env.NODE_ENV === 'development';
const debugEnabled = process.env.DEBUG_LOGS === 'true';
const shouldLog = isDev || debugEnabled;

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerOptions {
  /** Always log regardless of environment */
  force?: boolean;
  /** Additional context data */
  context?: Record<string, unknown>;
}

/**
 * Sanitize data to remove sensitive fields before logging
 */
function sanitize(data: unknown): unknown {
  if (data === null || data === undefined) return data;
  
  if (typeof data === 'string') {
    // Mask potential tokens/secrets
    if (data.length > 20 && /^(sk_|pk_|user_|sess_)/.test(data)) {
      return data.substring(0, 10) + '...[REDACTED]';
    }
    return data;
  }
  
  if (Array.isArray(data)) {
    return data.map(sanitize);
  }
  
  if (typeof data === 'object') {
    const sanitized: Record<string, unknown> = {};
    const sensitiveKeys = [
      'password', 'secret', 'token', 'key', 'authorization',
      'cookie', 'session', 'credential', 'apiKey', 'api_key',
      'stripe_customer_id', 'stripeCustomerId'
    ];
    
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      const lowerKey = key.toLowerCase();
      if (sensitiveKeys.some(sk => lowerKey.includes(sk))) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = sanitize(value);
      }
    }
    return sanitized;
  }
  
  return data;
}

/**
 * Format log message with timestamp and context
 */
function formatMessage(
  level: LogLevel,
  prefix: string,
  message: string,
  context?: Record<string, unknown>
): string {
  const timestamp = new Date().toISOString();
  const contextStr = context ? ` ${JSON.stringify(sanitize(context))}` : '';
  return `[${timestamp}] [${level.toUpperCase()}] [${prefix}] ${message}${contextStr}`;
}

/**
 * Create a namespaced logger
 */
export function createLogger(prefix: string) {
  return {
    debug(message: string, options?: LoggerOptions) {
      if (shouldLog || options?.force) {
        console.log(formatMessage('debug', prefix, message, options?.context));
      }
    },
    
    info(message: string, options?: LoggerOptions) {
      if (shouldLog || options?.force) {
        console.info(formatMessage('info', prefix, message, options?.context));
      }
    },
    
    warn(message: string, options?: LoggerOptions) {
      // Warnings always logged
      console.warn(formatMessage('warn', prefix, message, options?.context));
    },
    
    error(message: string, error?: Error | unknown, options?: LoggerOptions) {
      // Errors always logged
      const errorContext = error instanceof Error 
        ? { errorMessage: error.message, errorName: error.name }
        : { error: sanitize(error) };
      console.error(formatMessage('error', prefix, message, { ...options?.context, ...errorContext }));
    },
  };
}

/**
 * Default logger for general use
 */
export const logger = createLogger('App');

/**
 * API-specific logger
 */
export const apiLogger = createLogger('API');

/**
 * Auth-specific logger
 */
export const authLogger = createLogger('Auth');
