// Libraries
import * as winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
/**
 * Log entry interface - defines the structure of log messages
 * AC-7.3.2: JSON structured with timestamp, level, message, context
 */
export interface LogEntry {
  timestamp: string; // ISO 8601 format (UTC)
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  context?: {
    module?: string; // Service/Controller name
    method?: string; // Method name
    requestId?: string; // UUID for request tracking
    userId?: string; // Authenticated user ID
    [key: string]: any; // Additional context fields
  };
  stack?: string; // Error stack trace (only for errors)
}

/**
 * AC-7.3.7: Sensitive field names that must be excluded from logs
 * These fields will be replaced with '[REDACTED]' to protect sensitive data
 */
const SENSITIVE_FIELDS = [
  'password',
  'token',
  'secret',
  'apiKey',
  'creditCard',
  'authorization',
  'accessToken',
  'refreshToken',
];

/**
 * AC-7.3.7: Sanitize context object to remove sensitive data
 * Recursively traverses object and replaces sensitive field values with '[REDACTED]'
 *
 * @param obj - Object to sanitize (can be nested)
 * @returns Sanitized copy of the object
 */
export function sanitizeContext(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  // Handle non-object types (strings, numbers, etc.)
  if (typeof obj !== 'object') {
    return obj;
  }

  // Handle arrays recursively
  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeContext(item));
  }

  // Handle circular references
  const seen = new WeakSet();
  const sanitizeRecursive = (value: any): any => {
    if (value === null || value === undefined) {
      return value;
    }

    if (typeof value !== 'object') {
      return value;
    }

    if (seen.has(value)) {
      return '[Circular]';
    }

    seen.add(value);

    if (Array.isArray(value)) {
      return value.map((item) => sanitizeRecursive(item));
    }

    const sanitized: any = {};
    for (const [key, val] of Object.entries(value)) {
      // Check if field name matches sensitive field (case-insensitive)
      const isSensitive = SENSITIVE_FIELDS.some((field) => field.toLowerCase() === key.toLowerCase());

      if (isSensitive) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof val === 'object' && val !== null) {
        sanitized[key] = sanitizeRecursive(val);
      } else {
        sanitized[key] = val;
      }
    }

    return sanitized;
  };

  return sanitizeRecursive(obj);
}

/**
 * AC-7.3.2: JSON format for production logs
 * Structured format with timestamp, level, message, context for machine parsing
 */
const jsonFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }), // ISO 8601 UTC
  winston.format.errors({ stack: true }), // Include stack traces for errors
  winston.format.printf(({ timestamp, level, message, context, stack, ...meta }) => {
    // Sanitize context before logging
    const sanitizedContext = sanitizeContext(context);
    const sanitizedMeta = sanitizeContext(meta);

    const logEntry: any = {
      timestamp,
      level,
      message,
    };

    // Add context if present
    if (sanitizedContext && Object.keys(sanitizedContext).length > 0) {
      logEntry.context = sanitizedContext;
    }

    // Add additional metadata if present
    if (Object.keys(sanitizedMeta).length > 0) {
      logEntry.meta = sanitizedMeta;
    }

    // Add stack trace for errors
    if (stack) {
      logEntry.stack = stack;
    }

    return JSON.stringify(logEntry);
  }),
);

/**
 * AC-7.3.4: Pretty format for development console output
 * Colorized and human-readable format for better development experience
 */
const prettyFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(({ timestamp, level, message, context, stack }) => {
    let log = `${timestamp} [${level}] ${message}`;

    // Add sanitized context if present
    if (context) {
      const sanitized = sanitizeContext(context);
      log += ` | ${JSON.stringify(sanitized)}`;
    }

    // Add stack trace for errors
    if (stack) {
      log += `\n${stack}`;
    }

    return log;
  }),
);

/**
 * AC-7.3.4: Console transport for development environment
 * Only active when NODE_ENV is not 'production'
 * Features: colorized output, pretty-printed format
 */
const consoleTransport = new winston.transports.Console({
  format: prettyFormat,
});

/**
 * AC-7.3.5, AC-7.3.8: File transport with daily rotation for production
 * Features:
 * - Writes to logs/ directory
 * - Filename pattern: app-YYYY-MM-DD.log
 * - Automatic rotation at midnight
 * - Max file size: 20MB (configurable via LOG_MAX_SIZE)
 * - Retention: 14 days (configurable via LOG_MAX_FILES)
 * - Async non-blocking writes
 */
const fileTransport = new DailyRotateFile({
  dirname: process.env.LOG_DIR || 'logs',
  filename: 'app-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  maxSize: process.env.LOG_MAX_SIZE || '20m',
  maxFiles: process.env.LOG_MAX_FILES || '14d',
  format: jsonFormat,
  auditFile: 'logs/.audit.json', // Track rotation history
  createSymlink: false, // Don't create symlink to current log file
});

/**
 * AC-7.3.3, AC-7.3.6: Create Winston logger instance
 * Log levels: debug, info, warn, error
 * Log level is environment-based:
 * - Development: 'debug' (default)
 * - Production: 'info' (default)
 * - Configurable via LOG_LEVEL environment variable
 */
const transports: winston.transport[] = [];

// AC-7.3.4: Console transport only in development
if (process.env.NODE_ENV !== 'production') {
  transports.push(consoleTransport);
}

// AC-7.3.5: File transport in production (or when explicitly enabled)
if (process.env.NODE_ENV === 'production' || process.env.ENABLE_FILE_LOGGING === 'true') {
  transports.push(fileTransport);
}

// AC-7.3.6: Environment-based log level with fallback
const logLevel = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug');

/**
 * Winston logger instance configured with all requirements
 * AC-7.3.1: Usable globally via dependency injection
 */
export const winstonLogger = winston.createLogger({
  level: logLevel,
  format: jsonFormat, // Default format
  transports,
  exitOnError: false, // Don't exit on uncaught exceptions
  silent: process.env.NODE_ENV === 'test', // Silent during tests
});

// Log configuration on startup (only in non-production environments)
if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') {
  winstonLogger.info('Winston logger initialized', {
    context: {
      module: 'WinstonConfig',
      logLevel,
      environment: process.env.NODE_ENV || 'development',
      transports: transports.map((t) => t.constructor.name),
    },
  });
}
