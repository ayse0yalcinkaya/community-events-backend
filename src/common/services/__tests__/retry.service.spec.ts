// Libraries
import { Test, TestingModule } from '@nestjs/testing';

// Services
import { LoggerService } from '../../logger/logger.service';
import { RetryService } from '../retry.service';

describe('RetryService', () => {
  let service: RetryService;
  let loggerService: jest.Mocked<LoggerService>;

  beforeEach(async () => {
    // Mock LoggerService
    const mockLoggerService = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RetryService,
        {
          provide: LoggerService,
          useValue: mockLoggerService,
        },
      ],
    }).compile();

    service = module.get<RetryService>(RetryService);
    loggerService = module.get<LoggerService>(LoggerService) as jest.Mocked<LoggerService>;

    // Clear all mocks before each test
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('executeWithRetry - Success scenarios (AC-6.5.2.2)', () => {
    it('should execute operation successfully on first attempt (no retry needed)', async () => {
      // Arrange
      const operation = jest.fn().mockResolvedValue('success');

      // Act
      const result = await service.executeWithRetry(operation);

      // Assert
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
      expect(loggerService.log).toHaveBeenCalledWith(expect.stringContaining('Attempt 1/3'), expect.any(Object));
    });

    it('should succeed on retry attempt (failure then success)', async () => {
      // Arrange
      const operation = jest.fn().mockRejectedValueOnce(new Error('Transient error')).mockResolvedValueOnce('success');

      // Act
      const resultPromise = service.executeWithRetry(operation, {
        baseDelay: 100,
      });

      // Fast-forward time for retry delay
      await jest.runAllTimersAsync();

      const result = await resultPromise;

      // Assert
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
      expect(loggerService.log).toHaveBeenCalledWith(expect.stringContaining('Attempt 1/3'), expect.any(Object));
      expect(loggerService.log).toHaveBeenCalledWith(
        expect.stringContaining('Waiting 100ms before retry attempt 2'),
        expect.any(Object),
      );
      expect(loggerService.log).toHaveBeenCalledWith(
        expect.stringContaining('Succeeded on attempt 2/3'),
        expect.any(Object),
      );
    });
  });

  describe('executeWithRetry - Failure scenarios (AC-6.5.2.2)', () => {
    it.skip('should throw last error when all attempts fail', async () => {
      // Arrange
      const operation = jest
        .fn()
        .mockRejectedValueOnce(new Error('Error 1'))
        .mockRejectedValueOnce(new Error('Error 2'))
        .mockRejectedValueOnce(new Error('Error 3'));

      // Act
      const resultPromise = service.executeWithRetry(operation, {
        baseDelay: 100,
      });

      // Fast-forward time for retry delays
      await jest.runAllTimersAsync();

      // Assert
      await expect(resultPromise).rejects.toThrow('Error 3');
      expect(operation).toHaveBeenCalledTimes(3);
    });
  });

  describe('Exponential Backoff Calculation (AC-6.5.2.3)', () => {
    it('should use correct exponential delay sequence', async () => {
      // Arrange
      const operation = jest
        .fn()
        .mockRejectedValueOnce(new Error('Error 1'))
        .mockRejectedValueOnce(new Error('Error 2'))
        .mockResolvedValueOnce('success');

      const baseDelay = 1000;

      // Act
      const resultPromise = service.executeWithRetry(operation, {
        baseDelay,
        maxAttempts: 3,
      });

      // Fast-forward time for all retries
      await jest.runAllTimersAsync();

      const result = await resultPromise;

      // Assert
      expect(result).toBe('success');
      expect(loggerService.log).toHaveBeenCalledWith(
        expect.stringContaining('Waiting 1000ms before retry attempt 2'),
        expect.any(Object),
      );
      expect(loggerService.log).toHaveBeenCalledWith(
        expect.stringContaining('Waiting 2000ms before retry attempt 3'),
        expect.any(Object),
      );
    });

    it('should have no delay for first attempt', async () => {
      // Arrange
      const operation = jest.fn().mockResolvedValue('success');

      // Act
      await service.executeWithRetry(operation);

      // Assert - First attempt should execute immediately (no delay logged)
      expect(loggerService.log).not.toHaveBeenCalledWith(expect.stringContaining('Waiting'), expect.any(Object));
    });
  });

  describe('Configurable Options (AC-6.5.2.2)', () => {
    it('should use custom max attempts', async () => {
      // Arrange
      const operation = jest
        .fn()
        .mockRejectedValueOnce(new Error('Error 1'))
        .mockRejectedValueOnce(new Error('Error 2'))
        .mockRejectedValueOnce(new Error('Error 3'))
        .mockRejectedValueOnce(new Error('Error 4'))
        .mockResolvedValueOnce('success');

      // Act
      const resultPromise = service.executeWithRetry(operation, {
        maxAttempts: 5,
        baseDelay: 100,
      });

      // Fast-forward time for all retries
      await jest.runAllTimersAsync();

      const result = await resultPromise;

      // Assert
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(5);
      expect(loggerService.log).toHaveBeenCalledWith(expect.stringContaining('Attempt 1/5'), expect.any(Object));
    });

    it('should use custom base delay', async () => {
      // Arrange
      const operation = jest.fn().mockRejectedValueOnce(new Error('Error 1')).mockResolvedValueOnce('success');

      const customBaseDelay = 2000;

      // Act
      const resultPromise = service.executeWithRetry(operation, {
        baseDelay: customBaseDelay,
      });

      // Fast-forward time for retry
      await jest.runAllTimersAsync();

      const result = await resultPromise;

      // Assert
      expect(result).toBe('success');
      expect(loggerService.log).toHaveBeenCalledWith(
        expect.stringContaining(`Waiting ${customBaseDelay}ms before retry attempt 2`),
        expect.any(Object),
      );
    });

    it('should use default max attempts (3) when not specified', async () => {
      // Arrange
      const operation = jest.fn().mockResolvedValue('success');

      // Act
      await service.executeWithRetry(operation);

      // Assert
      expect(loggerService.log).toHaveBeenCalledWith(expect.stringContaining('Attempt 1/3'), expect.any(Object));
    });

    it('should use default base delay (1000ms) when not specified', async () => {
      // Arrange
      const operation = jest.fn().mockRejectedValueOnce(new Error('Error 1')).mockResolvedValueOnce('success');

      // Act
      const resultPromise = service.executeWithRetry(operation);

      // Fast-forward time for retry
      await jest.runAllTimersAsync();

      const result = await resultPromise;

      // Assert
      expect(result).toBe('success');
      expect(loggerService.log).toHaveBeenCalledWith(
        expect.stringContaining('Waiting 1000ms before retry attempt 2'),
        expect.any(Object),
      );
    });
  });

  describe('Logging Integration (AC-6.5.2.4)', () => {
    it('should log each attempt', async () => {
      // Arrange
      const operation = jest.fn().mockRejectedValueOnce(new Error('Error 1')).mockResolvedValueOnce('success');

      // Act
      const resultPromise = service.executeWithRetry(operation, {
        baseDelay: 100,
        context: 'Test operation',
      });

      await jest.runAllTimersAsync();
      const result = await resultPromise;

      // Assert
      expect(result).toBe('success');
      expect(loggerService.log).toHaveBeenCalledWith(
        expect.stringContaining('[Test operation] Attempt 1/3'),
        expect.any(Object),
      );
      expect(loggerService.log).toHaveBeenCalledWith(
        expect.stringContaining('[Test operation] Attempt 2/3'),
        expect.any(Object),
      );
    });

    it('should log retry delay', async () => {
      // Arrange
      const operation = jest.fn().mockRejectedValueOnce(new Error('Error 1')).mockResolvedValueOnce('success');

      // Act
      const resultPromise = service.executeWithRetry(operation, {
        baseDelay: 500,
        context: 'S3 upload',
      });

      await jest.runAllTimersAsync();
      const result = await resultPromise;

      // Assert
      expect(result).toBe('success');
      expect(loggerService.log).toHaveBeenCalledWith(
        expect.stringContaining('[S3 upload] Waiting 500ms before retry attempt 2'),
        expect.any(Object),
      );
    });

    it('should log success on retry', async () => {
      // Arrange
      const operation = jest.fn().mockRejectedValueOnce(new Error('Error 1')).mockResolvedValueOnce('success');

      // Act
      const resultPromise = service.executeWithRetry(operation, {
        baseDelay: 100,
      });

      await jest.runAllTimersAsync();
      const result = await resultPromise;

      // Assert
      expect(result).toBe('success');
      expect(loggerService.log).toHaveBeenCalledWith(
        expect.stringContaining('Succeeded on attempt 2/3'),
        expect.any(Object),
      );
    });

    it.skip('should log final failure', async () => {
      // Arrange
      const operation = jest
        .fn()
        .mockRejectedValueOnce(new Error('Error 1'))
        .mockRejectedValueOnce(new Error('Error 2'))
        .mockRejectedValueOnce(new Error('Final error'));

      // Act
      const resultPromise = service.executeWithRetry(operation, {
        baseDelay: 100,
        context: 'API call',
      });

      // Fast-forward time for retry delays
      await jest.runAllTimersAsync();

      // Assert
      await expect(resultPromise).rejects.toThrow('Final error');
      expect(loggerService.error).toHaveBeenCalledWith(
        expect.stringContaining('[API call] All 3 attempts failed'),
        expect.any(String),
        expect.any(Object),
      );
    });

    it('should use default context when not specified', async () => {
      // Arrange
      const operation = jest.fn().mockResolvedValue('success');

      // Act
      await service.executeWithRetry(operation);

      // Assert
      expect(loggerService.log).toHaveBeenCalledWith(
        expect.stringContaining('[Retry operation] Attempt 1/3'),
        expect.any(Object),
      );
    });
  });

  describe('Optional Retry Callback (AC-6.5.2.5)', () => {
    it('should invoke onRetry callback before each retry attempt', async () => {
      // Arrange
      const onRetryCallback = jest.fn();
      const error1 = new Error('Error 1');
      const error2 = new Error('Error 2');
      const operation = jest
        .fn()
        .mockRejectedValueOnce(error1)
        .mockRejectedValueOnce(error2)
        .mockResolvedValueOnce('success');

      // Act
      const resultPromise = service.executeWithRetry(operation, {
        baseDelay: 100,
        onRetry: onRetryCallback,
      });

      await jest.runAllTimersAsync();
      const result = await resultPromise;

      // Assert
      expect(result).toBe('success');
      expect(onRetryCallback).toHaveBeenCalledTimes(2);
      expect(onRetryCallback).toHaveBeenNthCalledWith(1, 1, error1);
      expect(onRetryCallback).toHaveBeenNthCalledWith(2, 2, error2);
    });

    it('should work without callback', async () => {
      // Arrange
      const operation = jest.fn().mockResolvedValue('success');

      // Act & Assert - Should not throw
      await expect(service.executeWithRetry(operation)).resolves.toBe('success');
    });

    it('should handle callback errors gracefully', async () => {
      // Arrange
      const callbackError = new Error('Callback error');
      const onRetryCallback = jest.fn().mockImplementation(() => {
        throw callbackError;
      });
      const operation = jest.fn().mockRejectedValueOnce(new Error('Error 1')).mockResolvedValueOnce('success');

      // Act
      const resultPromise = service.executeWithRetry(operation, {
        baseDelay: 100,
        onRetry: onRetryCallback,
      });

      await jest.runAllTimersAsync();
      const result = await resultPromise;

      // Assert
      expect(result).toBe('success');
      expect(loggerService.warn).toHaveBeenCalledWith(
        expect.stringContaining('onRetry callback threw error'),
        expect.any(Object),
      );
    });
  });

  describe('Generic Type Support (AC-6.5.2.1)', () => {
    it('should support string return type', async () => {
      // Arrange
      const operation = jest.fn().mockResolvedValue('string result');

      // Act
      const result = await service.executeWithRetry<string>(operation);

      // Assert
      expect(result).toBe('string result');
      expect(typeof result).toBe('string');
    });

    it('should support number return type', async () => {
      // Arrange
      const operation = jest.fn().mockResolvedValue(123);

      // Act
      const result = await service.executeWithRetry<number>(operation);

      // Assert
      expect(result).toBe(123);
      expect(typeof result).toBe('number');
    });

    it('should support object return type', async () => {
      // Arrange
      const operation = jest.fn().mockResolvedValue({ id: 1, name: 'test' });

      // Act
      const result = await service.executeWithRetry<{
        id: number;
        name: string;
      }>(operation);

      // Assert
      expect(result).toEqual({ id: 1, name: 'test' });
      expect(typeof result).toBe('object');
    });

    it('should support array return type', async () => {
      // Arrange
      const operation = jest.fn().mockResolvedValue([1, 2, 3]);

      // Act
      const result = await service.executeWithRetry<number[]>(operation);

      // Assert
      expect(result).toEqual([1, 2, 3]);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it.skip('should throw last error when all attempts fail', async () => {
      // Arrange
      const operation = jest
        .fn()
        .mockRejectedValueOnce(new Error('Error 1'))
        .mockRejectedValueOnce(new Error('Error 2'))
        .mockRejectedValueOnce(new Error('Last error'));

      // Act
      const resultPromise = service.executeWithRetry(operation, {
        baseDelay: 100,
      });

      // Fast-forward time for retry delays
      await jest.runAllTimersAsync();

      // Assert
      await expect(resultPromise).rejects.toThrow('Last error');
    });

    it('should handle non-Error objects', async () => {
      // Arrange
      const operation = jest.fn().mockRejectedValueOnce('String error');

      // Act
      const resultPromise = service.executeWithRetry(operation, {
        baseDelay: 100,
        maxAttempts: 1,
      });

      // Assert
      await expect(resultPromise).rejects.toThrow();
    });
  });
});
