// Libraries
import * as Sentry from '@sentry/node';

// Services
import { LoggerService } from '../common/logger/logger.service';

export interface SentryConfig {
  dsn: string;
  environment: string;
  tracesSampleRate: number;
  debug: boolean;
}

/**
 * Get Sentry configuration from environment variables
 * Returns null if SENTRY_DSN is not configured
 */
export function getSentryConfig(): SentryConfig | null {
  const dsn = process.env.SENTRY_DSN;
  const logger = new LoggerService();
  if (!dsn) {
    logger.warn('SENTRY_DSN not configured - Sentry error tracking disabled', {
      module: 'SentryConfig',
    });
    return null;
  }

  return {
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT || 'development',
    tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1'),
    debug: process.env.SENTRY_DEBUG === 'true',
  };
}

/**
 * List of sensitive field names that should be scrubbed
 */
const SENSITIVE_FIELDS = [
  'password',
  'token',
  'secret',
  'apikey',
  'creditcard',
  'authorization',
  'accesstoken',
  'refreshtoken',
];

/**
 * Recursively scrub sensitive data from an object
 * Replaces sensitive field values with '[REDACTED]'
 */
function scrubSensitiveData(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map(scrubSensitiveData);
  }

  const scrubbed = { ...obj };
  for (const key of Object.keys(scrubbed)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_FIELDS.some((field) => lowerKey.includes(field))) {
      scrubbed[key] = '[REDACTED]';
    } else if (typeof scrubbed[key] === 'object' && scrubbed[key] !== null) {
      scrubbed[key] = scrubSensitiveData(scrubbed[key]);
    }
  }
  return scrubbed;
}

/**
 * Initialize Sentry error tracking
 * Must be called BEFORE NestFactory.create() to catch early bootstrap errors
 */
export function initializeSentry(): void {
  const config = getSentryConfig();
  const logger = new LoggerService();

  if (!config) {
    return; // Sentry disabled
  }

  try {
    Sentry.init({
      dsn: config.dsn,
      environment: config.environment,
      tracesSampleRate: config.tracesSampleRate,
      debug: config.debug,

      // Enable automatic breadcrumbs for HTTP requests and console logs
      integrations: [new Sentry.Integrations.Http({ tracing: true }), new Sentry.Integrations.Console()],

      // Scrub sensitive data before sending to Sentry
      beforeSend(event) {
        // Scrub request body
        if (event.request?.data) {
          event.request.data = scrubSensitiveData(event.request.data);
        }

        // Scrub sensitive headers (Authorization, Cookie)
        if (event.request?.headers) {
          delete event.request.headers['authorization'];
          delete event.request.headers['cookie'];
          delete event.request.headers['Authorization'];
          delete event.request.headers['Cookie'];
        }

        return event;
      },
    });

    logger.log('✅ Sentry initialized successfully', {
      module: 'SentryConfig',
      environment: config.environment,
    });
  } catch (error) {
    logger.error('❌ Failed to initialize Sentry:', error instanceof Error ? error.message : String(error), {
      module: 'SentryConfig',
    });
    // Application continues even if Sentry fails to initialize
  }
}
