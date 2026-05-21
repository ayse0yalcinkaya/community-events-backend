// Libraries
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import * as Sentry from '@sentry/node';
import * as admin from 'firebase-admin';

// Services
import { RetryService } from '@/common/services/retry.service';
import { FirebaseService } from './firebase.service';

// Mock Sentry
jest.mock('@sentry/node', () => ({
  captureException: jest.fn(),
}));

// Mock Firebase Admin SDK
jest.mock('firebase-admin', () => {
  const mockMessaging = {
    send: jest.fn(),
  };

  const mockApp = {
    messaging: jest.fn(() => mockMessaging),
  };

  return {
    initializeApp: jest.fn(() => mockApp),
    credential: {
      cert: jest.fn(),
    },
    messaging: jest.fn(() => mockMessaging),
    app: jest.fn(() => mockApp),
  };
});

describe('FirebaseService', () => {
  let service: FirebaseService;
  let originalEnv: NodeJS.ProcessEnv;
  let mockConfigService: jest.Mocked<ConfigService>;
  let mockRetryService: jest.Mocked<RetryService>;

  beforeEach(() => {
    originalEnv = { ...process.env };
    jest.clearAllMocks();

    // Mock ConfigService
    mockConfigService = {
      get: jest.fn((key: string, defaultValue?: any) => {
        if (key === 'FIREBASE_RETRY_MAX_ATTEMPTS') return 5;
        if (key === 'FIREBASE_RETRY_BASE_DELAY') return 2000;
        return defaultValue;
      }),
    } as any;

    // Mock RetryService - default behavior: execute operation immediately
    mockRetryService = {
      executeWithRetry: jest.fn(async (operation) => await operation()),
    } as any;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('onModuleInit', () => {
    it('should skip initialization if FIREBASE_ENABLED=false', async () => {
      process.env.FIREBASE_ENABLED = 'false';
      process.env.FIREBASE_PROJECT_ID = 'test-project';
      process.env.FIREBASE_PRIVATE_KEY = 'test-key';
      process.env.FIREBASE_CLIENT_EMAIL = 'test@example.com';

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          FirebaseService,
          { provide: ConfigService, useValue: mockConfigService },
          { provide: RetryService, useValue: mockRetryService },
        ],
      }).compile();

      service = module.get<FirebaseService>(FirebaseService);
      await service.onModuleInit();

      expect(admin.initializeApp).not.toHaveBeenCalled();
    });

    it('should initialize Firebase Admin SDK when enabled', async () => {
      process.env.FIREBASE_ENABLED = 'true';
      process.env.FIREBASE_PROJECT_ID = 'test-project';
      process.env.FIREBASE_PRIVATE_KEY = 'test-key';
      process.env.FIREBASE_CLIENT_EMAIL = 'test@example.com';

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          FirebaseService,
          { provide: ConfigService, useValue: mockConfigService },
          { provide: RetryService, useValue: mockRetryService },
        ],
      }).compile();

      service = module.get<FirebaseService>(FirebaseService);
      await service.onModuleInit();

      expect(admin.initializeApp).toHaveBeenCalled();
    });

    it('should skip initialization if environment variables missing', async () => {
      process.env.FIREBASE_ENABLED = 'true';
      delete process.env.FIREBASE_PROJECT_ID;
      delete process.env.FIREBASE_PRIVATE_KEY;
      delete process.env.FIREBASE_CLIENT_EMAIL;

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          FirebaseService,
          { provide: ConfigService, useValue: mockConfigService },
          { provide: RetryService, useValue: mockRetryService },
        ],
      }).compile();

      service = module.get<FirebaseService>(FirebaseService);
      await service.onModuleInit();

      expect(admin.initializeApp).not.toHaveBeenCalled();
    });

    it('should load retry configuration from ConfigService', async () => {
      process.env.FIREBASE_ENABLED = 'true';
      process.env.FIREBASE_PROJECT_ID = 'test-project';
      process.env.FIREBASE_PRIVATE_KEY = 'test-key';
      process.env.FIREBASE_CLIENT_EMAIL = 'test@example.com';

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          FirebaseService,
          { provide: ConfigService, useValue: mockConfigService },
          { provide: RetryService, useValue: mockRetryService },
        ],
      }).compile();

      service = module.get<FirebaseService>(FirebaseService);

      expect(mockConfigService.get).toHaveBeenCalledWith('FIREBASE_RETRY_MAX_ATTEMPTS', 5);
      expect(mockConfigService.get).toHaveBeenCalledWith('FIREBASE_RETRY_BASE_DELAY', 2000);
    });
  });

  describe('sendPush', () => {
    beforeEach(async () => {
      process.env.FIREBASE_ENABLED = 'true';
      process.env.FIREBASE_PROJECT_ID = 'test-project';
      process.env.FIREBASE_PRIVATE_KEY = 'test-key';
      process.env.FIREBASE_CLIENT_EMAIL = 'test@example.com';

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          FirebaseService,
          { provide: ConfigService, useValue: mockConfigService },
          { provide: RetryService, useValue: mockRetryService },
        ],
      }).compile();

      service = module.get<FirebaseService>(FirebaseService);
      await service.onModuleInit();
    });

    it('should send push notification successfully on first attempt', async () => {
      const mockMessaging = admin.messaging();
      (mockMessaging.send as jest.Mock).mockResolvedValue('message-id-123');

      await service.sendPush('device-token-123', 'Test Title', 'Test Body', {
        key: 'value',
      });

      expect(mockRetryService.executeWithRetry).toHaveBeenCalledWith(expect.any(Function), {
        maxAttempts: 5,
        baseDelay: 2000,
        context: 'Firebase Notification: device-token-123...',
      });

      expect(mockMessaging.send).toHaveBeenCalledWith(
        expect.objectContaining({
          token: 'device-token-123',
          notification: {
            title: 'Test Title',
            body: 'Test Body',
          },
          data: {
            key: 'value',
          },
        }),
      );
    });

    it('should not retry for invalid token error (messaging/invalid-registration-token)', async () => {
      const mockMessaging = admin.messaging();
      const error = new Error('Invalid token');
      (error as any).code = 'messaging/invalid-registration-token';
      (mockMessaging.send as jest.Mock).mockRejectedValue(error);

      await expect(service.sendPush('invalid-token', 'Title', 'Body')).rejects.toThrow('Invalid device token');

      // Verify error classification: thrown immediately without retry
      expect(mockMessaging.send).toHaveBeenCalledTimes(1);
      expect(Sentry.captureException).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          tags: expect.objectContaining({
            module: 'FirebaseService',
            action: 'sendPush',
            errorType: 'invalid-token',
          }),
        }),
      );
    });

    it('should not retry for invalid argument error (messaging/invalid-argument)', async () => {
      const mockMessaging = admin.messaging();
      const error = new Error('Invalid argument');
      (error as any).code = 'messaging/invalid-argument';
      (mockMessaging.send as jest.Mock).mockRejectedValue(error);

      await expect(service.sendPush('device-token', 'Title', 'Body')).rejects.toThrow();

      // Verify error classification: thrown immediately without retry
      expect(mockMessaging.send).toHaveBeenCalledTimes(1);
    });

    it('should retry on network error (messaging/unavailable)', async () => {
      const mockMessaging = admin.messaging();
      const error = new Error('Service unavailable');
      (error as any).code = 'messaging/unavailable';

      // Simulate retry behavior: fail 2 times, succeed on 3rd
      let attemptCount = 0;
      mockRetryService.executeWithRetry.mockImplementation(async (operation: any) => {
        attemptCount++;
        if (attemptCount < 3) {
          (mockMessaging.send as jest.Mock).mockRejectedValueOnce(error);
        } else {
          (mockMessaging.send as jest.Mock).mockResolvedValueOnce('message-id-456');
        }
        return await operation();
      });

      await expect(service.sendPush('device-token', 'Title', 'Body')).rejects.toThrow('Firebase service unavailable');

      // Verify retry was attempted via RetryService
      expect(mockRetryService.executeWithRetry).toHaveBeenCalled();
      expect(Sentry.captureException).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          tags: expect.objectContaining({
            module: 'FirebaseService',
            action: 'sendPush',
            errorType: 'service-unavailable',
          }),
        }),
      );
    });

    it('should retry on server error', async () => {
      const mockMessaging = admin.messaging();
      const error = new Error('Server error');
      (error as any).code = 'messaging/server-error';
      (mockMessaging.send as jest.Mock).mockRejectedValue(error);

      // Mock RetryService to simulate retry behavior
      mockRetryService.executeWithRetry.mockRejectedValueOnce(error);

      await expect(service.sendPush('device-token', 'Title', 'Body')).rejects.toThrow();

      // Verify retry was attempted
      expect(mockRetryService.executeWithRetry).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({
          maxAttempts: 5,
          baseDelay: 2000,
        }),
      );
    });

    it('should handle retry exhaustion and throw last error', async () => {
      const mockMessaging = admin.messaging();
      const error = new Error('Network timeout');
      (mockMessaging.send as jest.Mock).mockRejectedValue(error);

      // Mock RetryService to simulate retry exhaustion
      mockRetryService.executeWithRetry.mockRejectedValueOnce(error);

      await expect(service.sendPush('device-token', 'Title', 'Body')).rejects.toThrow();

      // Verify RetryService was called with correct options
      expect(mockRetryService.executeWithRetry).toHaveBeenCalledWith(expect.any(Function), {
        maxAttempts: 5,
        baseDelay: 2000,
        context: 'Firebase Notification: device-token...',
      });
    });

    it('should preserve Sentry logging during retry', async () => {
      const mockMessaging = admin.messaging();
      const error = new Error('Service unavailable');
      (error as any).code = 'messaging/unavailable';
      (mockMessaging.send as jest.Mock).mockRejectedValue(error);

      await expect(service.sendPush('device-token', 'Title', 'Body')).rejects.toThrow();

      // Verify Sentry tracking is preserved
      expect(Sentry.captureException).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          tags: expect.objectContaining({
            module: 'FirebaseService',
            action: 'sendPush',
          }),
        }),
      );
    });

    it('should skip sending if FIREBASE_ENABLED=false', async () => {
      process.env.FIREBASE_ENABLED = 'false';

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          FirebaseService,
          { provide: ConfigService, useValue: mockConfigService },
          { provide: RetryService, useValue: mockRetryService },
        ],
      }).compile();

      const disabledService = module.get<FirebaseService>(FirebaseService);

      await disabledService.sendPush('device-token', 'Title', 'Body');

      const mockMessaging = admin.messaging();
      expect(mockMessaging.send).not.toHaveBeenCalled();
      expect(mockRetryService.executeWithRetry).not.toHaveBeenCalled();
    });

    it('should throw error if Firebase not initialized', async () => {
      process.env.FIREBASE_ENABLED = 'true';
      delete process.env.FIREBASE_PROJECT_ID;

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          FirebaseService,
          { provide: ConfigService, useValue: mockConfigService },
          { provide: RetryService, useValue: mockRetryService },
        ],
      }).compile();

      const uninitializedService = module.get<FirebaseService>(FirebaseService);
      await uninitializedService.onModuleInit();

      await expect(uninitializedService.sendPush('device-token', 'Title', 'Body')).rejects.toThrow(
        'Firebase Admin SDK not initialized',
      );

      expect(Sentry.captureException).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          tags: expect.objectContaining({
            module: 'FirebaseService',
            action: 'sendPush',
          }),
        }),
      );
    });
  });
});
