// Configs
import { sanitizeContext } from '../logger.config';
// Mock winston and winston-daily-rotate-file before importing logger.config
jest.mock('winston', () => ({
  format: {
    combine: jest.fn(),
    timestamp: jest.fn(),
    errors: jest.fn(),
    printf: jest.fn(),
    colorize: jest.fn(),
    json: jest.fn(),
  },
  transports: {
    Console: jest.fn(),
  },
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  })),
}));

jest.mock('winston-daily-rotate-file', () => {
  return jest.fn();
});

describe('Logger Configuration', () => {
  describe('sanitizeContext', () => {
    it('should return null/undefined values as-is', () => {
      expect(sanitizeContext(null)).toBeNull();
      expect(sanitizeContext(undefined)).toBeUndefined();
    });

    it('should return primitive values as-is', () => {
      expect(sanitizeContext('test')).toBe('test');
      expect(sanitizeContext(123)).toBe(123);
      expect(sanitizeContext(true)).toBe(true);
    });

    it('should redact password field (AC-7.3.7)', () => {
      const input = { username: 'john', password: 'secret123' };
      const result = sanitizeContext(input);
      expect(result.username).toBe('john');
      expect(result.password).toBe('[REDACTED]');
    });

    it('should redact token field (AC-7.3.7)', () => {
      const input = { userId: '123', token: 'abc-xyz-token' };
      const result = sanitizeContext(input);
      expect(result.userId).toBe('123');
      expect(result.token).toBe('[REDACTED]');
    });

    it('should redact secret field (AC-7.3.7)', () => {
      const input = { appId: 'app1', secret: 'my-secret-key' };
      const result = sanitizeContext(input);
      expect(result.appId).toBe('app1');
      expect(result.secret).toBe('[REDACTED]');
    });

    it('should redact apiKey field (AC-7.3.7)', () => {
      const input = { service: 'stripe', apiKey: 'sk_test_123' };
      const result = sanitizeContext(input);
      expect(result.service).toBe('stripe');
      expect(result.apiKey).toBe('[REDACTED]');
    });

    it('should redact creditCard field (AC-7.3.7)', () => {
      const input = { userId: '123', creditCard: '4242-4242-4242-4242' };
      const result = sanitizeContext(input);
      expect(result.userId).toBe('123');
      expect(result.creditCard).toBe('[REDACTED]');
    });

    it('should redact authorization field (AC-7.3.7)', () => {
      const input = { request: 'GET /api', authorization: 'Bearer token123' };
      const result = sanitizeContext(input);
      expect(result.request).toBe('GET /api');
      expect(result.authorization).toBe('[REDACTED]');
    });

    it('should redact accessToken and refreshToken fields (AC-7.3.7)', () => {
      const input = {
        userId: '123',
        accessToken: 'access-token-123',
        refreshToken: 'refresh-token-456',
      };
      const result = sanitizeContext(input);
      expect(result.userId).toBe('123');
      expect(result.accessToken).toBe('[REDACTED]');
      expect(result.refreshToken).toBe('[REDACTED]');
    });

    it('should be case-insensitive for sensitive field names (AC-7.3.7)', () => {
      const input = {
        Password: 'test123',
        TOKEN: 'abc',
        Secret: 'xyz',
        ApiKey: 'key',
      };
      const result = sanitizeContext(input);
      expect(result.Password).toBe('[REDACTED]');
      expect(result.TOKEN).toBe('[REDACTED]');
      expect(result.Secret).toBe('[REDACTED]');
      expect(result.ApiKey).toBe('[REDACTED]');
    });

    it('should handle nested objects recursively (AC-7.3.7)', () => {
      const input = {
        user: {
          id: '123',
          name: 'John',
          credentials: {
            password: 'secret',
            apiKey: 'key123',
          },
        },
      };
      const result = sanitizeContext(input);
      expect(result.user.id).toBe('123');
      expect(result.user.name).toBe('John');
      expect(result.user.credentials.password).toBe('[REDACTED]');
      expect(result.user.credentials.apiKey).toBe('[REDACTED]');
    });

    it('should handle arrays recursively (AC-7.3.7)', () => {
      const input = {
        users: [
          { id: '1', password: 'pass1' },
          { id: '2', password: 'pass2' },
        ],
      };
      const result = sanitizeContext(input);
      expect(result.users[0].id).toBe('1');
      expect(result.users[0].password).toBe('[REDACTED]');
      expect(result.users[1].id).toBe('2');
      expect(result.users[1].password).toBe('[REDACTED]');
    });

    it('should handle circular references gracefully (AC-7.3.7)', () => {
      const input: any = { id: '123', name: 'test' };
      input.self = input; // Create circular reference

      const result = sanitizeContext(input);
      expect(result.id).toBe('123');
      expect(result.name).toBe('test');
      expect(result.self).toBe('[Circular]');
    });

    it('should handle deeply nested circular references', () => {
      const input: any = {
        level1: {
          level2: {
            id: '123',
            password: 'secret',
          },
        },
      };
      input.level1.level2.circular = input.level1; // Create circular reference

      const result = sanitizeContext(input);
      expect(result.level1.level2.id).toBe('123');
      expect(result.level1.level2.password).toBe('[REDACTED]');
      expect(result.level1.level2.circular).toBe('[Circular]');
    });

    it('should handle mixed content (sensitive + non-sensitive)', () => {
      const input = {
        userId: '123',
        email: 'user@example.com',
        password: 'secret123',
        profile: {
          name: 'John Doe',
          token: 'abc-token',
          age: 30,
        },
        settings: {
          theme: 'dark',
          apiKey: 'key-123',
        },
      };
      const result = sanitizeContext(input);
      expect(result.userId).toBe('123');
      expect(result.email).toBe('user@example.com');
      expect(result.password).toBe('[REDACTED]');
      expect(result.profile.name).toBe('John Doe');
      expect(result.profile.token).toBe('[REDACTED]');
      expect(result.profile.age).toBe(30);
      expect(result.settings.theme).toBe('dark');
      expect(result.settings.apiKey).toBe('[REDACTED]');
    });

    it('should handle empty objects and arrays', () => {
      expect(sanitizeContext({})).toEqual({});
      expect(sanitizeContext([])).toEqual([]);
    });

    it('should not modify non-sensitive fields', () => {
      const input = {
        userId: '123',
        email: 'test@example.com',
        module: 'AuthService',
        method: 'login',
        requestId: 'req-123',
      };
      const result = sanitizeContext(input);
      expect(result).toEqual(input);
    });
  });
});
