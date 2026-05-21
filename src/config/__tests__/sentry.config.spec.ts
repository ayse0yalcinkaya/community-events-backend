// Libraries
import * as Sentry from '@sentry/node';

// Configs
import { getSentryConfig, initializeSentry, SentryConfig } from '../sentry.config';

// Services
import { LoggerService } from '../../common/logger/logger.service';

// Mock Sentry SDK
jest.mock('@sentry/node');

// Mock LoggerService
jest.mock('../../common/logger/logger.service');

describe('Sentry Configuration', () => {
  let originalEnv: NodeJS.ProcessEnv;
  let mockLogger: jest.Mocked<LoggerService>;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };

    // Create mock logger instance
    mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
      setContext: jest.fn(),
    } as any;

    // Mock LoggerService constructor to return our mock
    (LoggerService as jest.Mock).mockImplementation(() => mockLogger);

    // Clear all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('getSentryConfig', () => {
    it('should return config when SENTRY_DSN is present', () => {
      process.env.SENTRY_DSN = 'https://test@sentry.io/123';
      process.env.SENTRY_ENVIRONMENT = 'test';
      process.env.SENTRY_TRACES_SAMPLE_RATE = '0.5';
      process.env.SENTRY_DEBUG = 'true';

      const config = getSentryConfig();

      expect(config).toEqual({
        dsn: 'https://test@sentry.io/123',
        environment: 'test',
        tracesSampleRate: 0.5,
        debug: true,
      });
      expect(mockLogger.warn).not.toHaveBeenCalled();
    });

    it('should return null when SENTRY_DSN is missing', () => {
      delete process.env.SENTRY_DSN;

      const config = getSentryConfig();

      expect(config).toBeNull();
      expect(mockLogger.warn).toHaveBeenCalledWith('SENTRY_DSN not configured - Sentry error tracking disabled', {
        module: 'SentryConfig',
      });
    });

    it('should use default values for optional environment variables', () => {
      process.env.SENTRY_DSN = 'https://test@sentry.io/123';
      delete process.env.SENTRY_ENVIRONMENT;
      delete process.env.SENTRY_TRACES_SAMPLE_RATE;
      delete process.env.SENTRY_DEBUG;

      const config = getSentryConfig();

      expect(config).toEqual({
        dsn: 'https://test@sentry.io/123',
        environment: 'development',
        tracesSampleRate: 0.1,
        debug: false,
      });
    });

    it('should handle invalid SENTRY_TRACES_SAMPLE_RATE', () => {
      process.env.SENTRY_DSN = 'https://test@sentry.io/123';
      process.env.SENTRY_TRACES_SAMPLE_RATE = 'invalid';

      const config = getSentryConfig();

      expect(config?.tracesSampleRate).toBeNaN();
    });

    it('should parse SENTRY_DEBUG as boolean', () => {
      process.env.SENTRY_DSN = 'https://test@sentry.io/123';

      // Test true
      process.env.SENTRY_DEBUG = 'true';
      let config = getSentryConfig();
      expect(config?.debug).toBe(true);

      // Test false
      process.env.SENTRY_DEBUG = 'false';
      config = getSentryConfig();
      expect(config?.debug).toBe(false);

      // Test any other value
      process.env.SENTRY_DEBUG = 'yes';
      config = getSentryConfig();
      expect(config?.debug).toBe(false);
    });
  });

  describe('initializeSentry', () => {
    it('should call Sentry.init with correct configuration', () => {
      process.env.SENTRY_DSN = 'https://test@sentry.io/123';
      process.env.SENTRY_ENVIRONMENT = 'test';
      process.env.SENTRY_TRACES_SAMPLE_RATE = '0.5';
      process.env.SENTRY_DEBUG = 'true';

      initializeSentry();

      expect(Sentry.init).toHaveBeenCalledWith(
        expect.objectContaining({
          dsn: 'https://test@sentry.io/123',
          environment: 'test',
          tracesSampleRate: 0.5,
          debug: true,
        }),
      );

      expect(mockLogger.log).toHaveBeenCalledWith('✅ Sentry initialized successfully', {
        module: 'SentryConfig',
        environment: 'test',
      });
    });

    it('should enable automatic breadcrumbs via integrations', () => {
      process.env.SENTRY_DSN = 'https://test@sentry.io/123';

      initializeSentry();

      const initCall = (Sentry.init as jest.Mock).mock.calls[0][0];
      expect(initCall.integrations).toBeDefined();
      expect(Array.isArray(initCall.integrations)).toBe(true);
      expect(initCall.integrations).toHaveLength(2);
    });

    it('should configure beforeSend hook', () => {
      process.env.SENTRY_DSN = 'https://test@sentry.io/123';

      initializeSentry();

      const initCall = (Sentry.init as jest.Mock).mock.calls[0][0];
      expect(initCall.beforeSend).toBeDefined();
      expect(typeof initCall.beforeSend).toBe('function');
    });

    it('should not call Sentry.init when SENTRY_DSN is missing', () => {
      delete process.env.SENTRY_DSN;

      initializeSentry();

      expect(Sentry.init).not.toHaveBeenCalled();
    });

    it('should handle Sentry.init failure gracefully', () => {
      process.env.SENTRY_DSN = 'https://test@sentry.io/123';
      (Sentry.init as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Network error');
      });

      // Should not throw
      expect(() => initializeSentry()).not.toThrow();

      expect(mockLogger.error).toHaveBeenCalledWith('❌ Failed to initialize Sentry:', 'Network error', {
        module: 'SentryConfig',
      });
    });
  });

  describe('beforeSend hook - Sensitive Data Scrubbing', () => {
    let beforeSendHook: (event: any) => any;

    beforeEach(() => {
      process.env.SENTRY_DSN = 'https://test@sentry.io/123';
      initializeSentry();

      const initCall = (Sentry.init as jest.Mock).mock.calls[0][0];
      beforeSendHook = initCall.beforeSend;
    });

    it('should scrub password field from request data', () => {
      const event = {
        request: {
          data: {
            email: 'test@example.com',
            password: 'secret123',
            name: 'John Doe',
          },
        },
      };

      const scrubbedEvent = beforeSendHook(event);

      expect(scrubbedEvent.request.data.password).toBe('[REDACTED]');
      expect(scrubbedEvent.request.data.email).toBe('test@example.com');
      expect(scrubbedEvent.request.data.name).toBe('John Doe');
    });

    it('should scrub token field from request data', () => {
      const event = {
        request: {
          data: {
            accessToken: 'jwt-token-123',
            refreshToken: 'refresh-token-456',
          },
        },
      };

      const scrubbedEvent = beforeSendHook(event);

      expect(scrubbedEvent.request.data.accessToken).toBe('[REDACTED]');
      expect(scrubbedEvent.request.data.refreshToken).toBe('[REDACTED]');
    });

    it('should scrub sensitive fields case-insensitively', () => {
      const event = {
        request: {
          data: {
            PASSWORD: 'secret',
            ApiKey: 'key123',
            CreditCard: '1234-5678-9012-3456',
          },
        },
      };

      const scrubbedEvent = beforeSendHook(event);

      expect(scrubbedEvent.request.data.PASSWORD).toBe('[REDACTED]');
      expect(scrubbedEvent.request.data.ApiKey).toBe('[REDACTED]');
      expect(scrubbedEvent.request.data.CreditCard).toBe('[REDACTED]');
    });

    it('should scrub nested sensitive fields', () => {
      const event = {
        request: {
          data: {
            user: {
              email: 'test@example.com',
              password: 'secret123',
              profile: {
                apiKey: 'key123',
              },
            },
          },
        },
      };

      const scrubbedEvent = beforeSendHook(event);

      expect(scrubbedEvent.request.data.user.password).toBe('[REDACTED]');
      expect(scrubbedEvent.request.data.user.profile.apiKey).toBe('[REDACTED]');
      expect(scrubbedEvent.request.data.user.email).toBe('test@example.com');
    });

    it('should scrub sensitive fields in arrays', () => {
      const event = {
        request: {
          data: {
            users: [
              { email: 'user1@example.com', password: 'pass1' },
              { email: 'user2@example.com', password: 'pass2' },
            ],
          },
        },
      };

      const scrubbedEvent = beforeSendHook(event);

      expect(scrubbedEvent.request.data.users[0].password).toBe('[REDACTED]');
      expect(scrubbedEvent.request.data.users[1].password).toBe('[REDACTED]');
      expect(scrubbedEvent.request.data.users[0].email).toBe('user1@example.com');
    });

    it('should delete Authorization header', () => {
      const event = {
        request: {
          headers: {
            'user-agent': 'Mozilla/5.0',
            authorization: 'Bearer token123',
            Authorization: 'Bearer token456',
            'content-type': 'application/json',
          },
        },
      };

      const scrubbedEvent = beforeSendHook(event);

      expect(scrubbedEvent.request.headers.authorization).toBeUndefined();
      expect(scrubbedEvent.request.headers.Authorization).toBeUndefined();
      expect(scrubbedEvent.request.headers['user-agent']).toBe('Mozilla/5.0');
      expect(scrubbedEvent.request.headers['content-type']).toBe('application/json');
    });

    it('should delete Cookie header', () => {
      const event = {
        request: {
          headers: {
            cookie: 'sessionId=abc123',
            Cookie: 'refreshToken=xyz789',
          },
        },
      };

      const scrubbedEvent = beforeSendHook(event);

      expect(scrubbedEvent.request.headers.cookie).toBeUndefined();
      expect(scrubbedEvent.request.headers.Cookie).toBeUndefined();
    });

    it('should handle event without request data', () => {
      const event = {
        message: 'Some error',
      };

      const scrubbedEvent = beforeSendHook(event);

      expect(scrubbedEvent).toEqual(event);
    });

    it('should handle null and undefined values', () => {
      const event = {
        request: {
          data: null,
        },
      };

      const scrubbedEvent = beforeSendHook(event);

      expect(scrubbedEvent.request.data).toBeNull();
    });
  });
});
