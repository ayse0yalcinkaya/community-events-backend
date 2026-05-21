// Libraries
import { Test, TestingModule } from '@nestjs/testing';

// Configs
import { winstonLogger } from '../../../config/logger.config';

// Services
import { LoggerService } from '../logger.service';
// Mock winston logger
jest.mock('../../../config/logger.config', () => ({
  winstonLogger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('LoggerService', () => {
  let service: LoggerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LoggerService],
    }).compile();

    service = module.get<LoggerService>(LoggerService);

    // Clear all mock calls before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('log method (AC-7.3.3)', () => {
    it('should call winston.info with message only', () => {
      const message = 'Test log message';
      service.log(message);

      expect(winstonLogger.info).toHaveBeenCalledTimes(1);
      expect(winstonLogger.info).toHaveBeenCalledWith(message, {
        context: undefined,
      });
    });

    it('should call winston.info with message and context (AC-7.3.2)', () => {
      const message = 'User created';
      const context = {
        module: 'UsersService',
        method: 'create',
        userId: '123',
      };
      service.log(message, context);

      expect(winstonLogger.info).toHaveBeenCalledTimes(1);
      expect(winstonLogger.info).toHaveBeenCalledWith(message, { context });
    });

    it('should pass context with requestId for request tracking (AC-7.3.2)', () => {
      const message = 'Request received';
      const context = {
        module: 'AuthController',
        method: 'login',
        requestId: 'req-uuid-123',
      };
      service.log(message, context);

      expect(winstonLogger.info).toHaveBeenCalledWith(message, { context });
    });
  });

  describe('error method (AC-7.3.3)', () => {
    it('should call winston.error with message only', () => {
      const message = 'Error occurred';
      service.error(message);

      expect(winstonLogger.error).toHaveBeenCalledTimes(1);
      expect(winstonLogger.error).toHaveBeenCalledWith(message, {
        context: undefined,
        stack: undefined,
      });
    });

    it('should call winston.error with message and stack trace', () => {
      const message = 'Database connection failed';
      const stack = 'Error: Connection timeout\n  at Database.connect...';
      service.error(message, stack);

      expect(winstonLogger.error).toHaveBeenCalledTimes(1);
      expect(winstonLogger.error).toHaveBeenCalledWith(message, {
        context: undefined,
        stack,
      });
    });

    it('should call winston.error with message, stack, and context (AC-7.3.2)', () => {
      const message = 'Failed to create user';
      const stack = 'Error: Validation failed\n  at UserService.create...';
      const context = {
        module: 'UsersService',
        method: 'create',
        userId: '123',
      };
      service.error(message, stack, context);

      expect(winstonLogger.error).toHaveBeenCalledTimes(1);
      expect(winstonLogger.error).toHaveBeenCalledWith(message, {
        context,
        stack,
      });
    });
  });

  describe('warn method (AC-7.3.3)', () => {
    it('should call winston.warn with message only', () => {
      const message = 'Warning: Low disk space';
      service.warn(message);

      expect(winstonLogger.warn).toHaveBeenCalledTimes(1);
      expect(winstonLogger.warn).toHaveBeenCalledWith(message, {
        context: undefined,
      });
    });

    it('should call winston.warn with message and context (AC-7.3.2)', () => {
      const message = 'Deprecated API called';
      const context = {
        module: 'ApiController',
        method: 'oldEndpoint',
        requestId: 'req-789',
      };
      service.warn(message, context);

      expect(winstonLogger.warn).toHaveBeenCalledTimes(1);
      expect(winstonLogger.warn).toHaveBeenCalledWith(message, { context });
    });
  });

  describe('debug method (AC-7.3.3)', () => {
    it('should call winston.debug with message only', () => {
      const message = 'Debug: Processing request';
      service.debug(message);

      expect(winstonLogger.debug).toHaveBeenCalledTimes(1);
      expect(winstonLogger.debug).toHaveBeenCalledWith(message, {
        context: undefined,
      });
    });

    it('should call winston.debug with message and context (AC-7.3.2)', () => {
      const message = 'Cache hit for key';
      const context = {
        module: 'CacheService',
        method: 'get',
        key: 'user:123',
      };
      service.debug(message, context);

      expect(winstonLogger.debug).toHaveBeenCalledTimes(1);
      expect(winstonLogger.debug).toHaveBeenCalledWith(message, { context });
    });
  });

  describe('verbose method (NestJS interface requirement)', () => {
    it('should call winston.debug (maps verbose to debug level)', () => {
      const message = 'Verbose: Detailed operation info';
      service.verbose(message);

      expect(winstonLogger.debug).toHaveBeenCalledTimes(1);
      expect(winstonLogger.debug).toHaveBeenCalledWith(message, {
        context: undefined,
      });
    });

    it('should call winston.debug with message and context', () => {
      const message = 'Query executed';
      const context = {
        module: 'DatabaseService',
        method: 'query',
        query: 'SELECT * FROM users',
      };
      service.verbose(message, context);

      expect(winstonLogger.debug).toHaveBeenCalledTimes(1);
      expect(winstonLogger.debug).toHaveBeenCalledWith(message, { context });
    });
  });

  describe('Context object structure (AC-7.3.2)', () => {
    it('should support all standard context fields', () => {
      const message = 'Operation completed';
      const context = {
        module: 'TestModule',
        method: 'testMethod',
        requestId: 'req-123',
        userId: 'user-456',
      };
      service.log(message, context);

      expect(winstonLogger.info).toHaveBeenCalledWith(message, { context });
    });

    it('should support custom context fields', () => {
      const message = 'Custom operation';
      const context = {
        module: 'CustomService',
        customField1: 'value1',
        customField2: 123,
        customField3: true,
      };
      service.log(message, context);

      expect(winstonLogger.info).toHaveBeenCalledWith(message, { context });
    });
  });

  describe('Multiple log calls', () => {
    it('should handle multiple sequential log calls', () => {
      service.log('Message 1');
      service.warn('Message 2');
      service.error('Message 3');
      service.debug('Message 4');

      expect(winstonLogger.info).toHaveBeenCalledTimes(1);
      expect(winstonLogger.warn).toHaveBeenCalledTimes(1);
      expect(winstonLogger.error).toHaveBeenCalledTimes(1);
      expect(winstonLogger.debug).toHaveBeenCalledTimes(1);
    });
  });
});
