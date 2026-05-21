// Libraries
import { CallHandler, ExecutionContext } from '@nestjs/common';
import { of } from 'rxjs';

// Interceptors
import { LoggingInterceptor } from '../logging.interceptor';

// Services
import { LoggerService } from '../../logger/logger.service';

// Mock uuid module
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid-1234-5678-90ab'),
}));

describe('LoggingInterceptor', () => {
  let interceptor: LoggingInterceptor;
  let mockLogger: jest.Mocked<LoggerService>;
  let mockExecutionContext: jest.Mocked<ExecutionContext>;
  let mockCallHandler: jest.Mocked<CallHandler>;
  let mockRequest: any;
  let mockResponse: any;

  beforeEach(() => {
    // Mock LoggerService
    mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
    } as any;

    // Mock request object
    mockRequest = {
      method: 'GET',
      url: '/api/users',
      headers: {
        'user-agent': 'PostmanRuntime/7.32.0',
      },
    };

    // Mock response object
    mockResponse = {
      statusCode: 200,
      setHeader: jest.fn(),
    };

    // Mock ExecutionContext
    mockExecutionContext = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: () => mockRequest,
        getResponse: () => mockResponse,
      }),
    } as any;

    // Mock CallHandler
    mockCallHandler = {
      handle: jest.fn().mockReturnValue(of({})),
    } as any;

    // Create interceptor instance
    interceptor = new LoggingInterceptor(mockLogger);

    // Mock process.hrtime.bigint() for deterministic duration testing
    let callCount = 0;
    jest.spyOn(process.hrtime, 'bigint').mockImplementation(() => {
      callCount++;
      // First call (start): 0ns, Second call (end): 45,670,000ns (45.67ms)
      return BigInt(callCount === 1 ? 0 : 45_670_000);
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('AC-7.4.1: LoggingInterceptor Implementation', () => {
    it('should implement NestInterceptor interface', () => {
      expect(interceptor).toBeDefined();
      expect(interceptor.intercept).toBeDefined();
      expect(typeof interceptor.intercept).toBe('function');
    });

    it('should be injectable with LoggerService dependency', () => {
      expect(interceptor).toBeInstanceOf(LoggingInterceptor);
      expect((interceptor as any).logger).toBe(mockLogger);
    });
  });

  describe('AC-7.4.2: Request Logging', () => {
    it('should log incoming request with all required fields', (done) => {
      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe(() => {
        expect(mockLogger.log).toHaveBeenCalledWith(
          'Incoming request',
          expect.objectContaining({
            module: 'LoggingInterceptor',
            method: 'GET',
            url: '/api/users',
            userAgent: 'PostmanRuntime/7.32.0',
            requestId: expect.any(String),
            timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/),
          }),
        );
        done();
      });
    });

    it('should log request with "Unknown" user agent when header is missing', (done) => {
      mockRequest.headers = {}; // No user-agent header

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe(() => {
        expect(mockLogger.log).toHaveBeenCalledWith(
          'Incoming request',
          expect.objectContaining({
            userAgent: 'Unknown',
          }),
        );
        done();
      });
    });

    it('should extract method, URL, and user agent from request', (done) => {
      mockRequest.method = 'POST';
      mockRequest.url = '/api/users?page=1&limit=10';
      mockRequest.headers['user-agent'] = 'Mozilla/5.0';

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe(() => {
        expect(mockLogger.log).toHaveBeenCalledWith(
          'Incoming request',
          expect.objectContaining({
            method: 'POST',
            url: '/api/users?page=1&limit=10',
            userAgent: 'Mozilla/5.0',
          }),
        );
        done();
      });
    });

    it('should log request with ISO 8601 timestamp in UTC', (done) => {
      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe(() => {
        const logCall = mockLogger.log.mock.calls[0];
        const timestamp = logCall[1].timestamp;

        // Verify ISO 8601 format with UTC timezone (ends with Z)
        expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);

        // Verify it's a valid date
        const date = new Date(timestamp);
        expect(date).toBeInstanceOf(Date);
        expect(date.toISOString()).toBe(timestamp);
        done();
      });
    });
  });

  describe('AC-7.4.3: Response Logging with Duration', () => {
    it('should log outgoing response with status code and duration', (done) => {
      mockResponse.statusCode = 200;

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe(() => {
        expect(mockLogger.log).toHaveBeenCalledWith(
          'Outgoing response',
          expect.objectContaining({
            module: 'LoggingInterceptor',
            statusCode: 200,
            duration: 45.67, // Mocked duration in ms
            requestId: expect.any(String),
            timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/),
          }),
        );
        done();
      });
    });

    it('should calculate duration accurately using process.hrtime.bigint()', (done) => {
      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe(() => {
        const logCall = mockLogger.log.mock.calls[1]; // Second log call (response)
        const duration = logCall[1].duration;

        // Duration should be 45.67ms (from mocked hrtime: 45,670,000ns / 1,000,000)
        expect(duration).toBe(45.67);
        done();
      });
    });

    it('should round duration to 2 decimal places', (done) => {
      // Mock process.hrtime.bigint() to return different durations
      let callCount = 0;
      jest.spyOn(process.hrtime, 'bigint').mockImplementation(() => {
        callCount++;
        // Duration: 12.3456ms -> should round to 12.35ms
        return BigInt(callCount === 1 ? 0 : 12_345_600);
      });

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe(() => {
        const logCall = mockLogger.log.mock.calls[1];
        const duration = logCall[1].duration;

        expect(duration).toBe(12.35); // Rounded to 2 decimals
        done();
      });
    });

    it('should include method and URL in response log', (done) => {
      mockRequest.method = 'DELETE';
      mockRequest.url = '/api/users/123';

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe(() => {
        expect(mockLogger.log).toHaveBeenCalledWith(
          'Outgoing response',
          expect.objectContaining({
            method: 'DELETE',
            url: '/api/users/123',
          }),
        );
        done();
      });
    });
  });

  describe('AC-7.4.3: Conditional Log Levels Based on Status Code', () => {
    it('should use "log" level for 2xx status codes (success)', (done) => {
      mockResponse.statusCode = 200;

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe(() => {
        expect(mockLogger.log).toHaveBeenCalledWith('Outgoing response', expect.any(Object));
        expect(mockLogger.warn).not.toHaveBeenCalled();
        expect(mockLogger.error).not.toHaveBeenCalled();
        done();
      });
    });

    it('should use "log" level for 201 status code (created)', (done) => {
      mockResponse.statusCode = 201;

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe(() => {
        expect(mockLogger.log).toHaveBeenCalledWith('Outgoing response', expect.any(Object));
        done();
      });
    });

    it('should use "log" level for 3xx status codes (redirects)', (done) => {
      mockResponse.statusCode = 304; // Not Modified

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe(() => {
        expect(mockLogger.log).toHaveBeenCalledWith('Outgoing response', expect.any(Object));
        done();
      });
    });

    it('should use "warn" level for 4xx status codes (client errors)', (done) => {
      mockResponse.statusCode = 400;

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe(() => {
        expect(mockLogger.warn).toHaveBeenCalledWith('Outgoing response', expect.any(Object));
        expect(mockLogger.log).toHaveBeenCalledTimes(1); // Only request log
        expect(mockLogger.error).not.toHaveBeenCalled();
        done();
      });
    });

    it('should use "warn" level for 404 status code (not found)', (done) => {
      mockResponse.statusCode = 404;

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe(() => {
        expect(mockLogger.warn).toHaveBeenCalledWith('Outgoing response', expect.any(Object));
        done();
      });
    });

    it('should use "error" level for 5xx status codes (server errors)', (done) => {
      mockResponse.statusCode = 500;

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe(() => {
        expect(mockLogger.error).toHaveBeenCalledWith('Outgoing response', expect.any(Object));
        expect(mockLogger.log).toHaveBeenCalledTimes(1); // Only request log
        expect(mockLogger.warn).not.toHaveBeenCalled();
        done();
      });
    });

    it('should use "error" level for 503 status code (service unavailable)', (done) => {
      mockResponse.statusCode = 503;

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe(() => {
        expect(mockLogger.error).toHaveBeenCalledWith('Outgoing response', expect.any(Object));
        done();
      });
    });
  });

  describe('AC-7.4.4: Sensitive Data Protection', () => {
    it('should NOT log request body by default (security best practice)', (done) => {
      mockRequest.body = {
        username: 'testuser',
        password: 'secret123',
        email: 'test@example.com',
      };

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe(() => {
        const requestLogCall = mockLogger.log.mock.calls[0];
        const requestLogContext = requestLogCall[1];

        // Verify request body is NOT logged
        expect(requestLogContext).not.toHaveProperty('body');
        expect(requestLogContext).not.toHaveProperty('password');
        done();
      });
    });

    it('should NOT log response body by default (security best practice)', (done) => {
      mockResponse.body = {
        id: 1,
        username: 'testuser',
        accessToken: 'jwt-token-here',
      };

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe(() => {
        const responseLogCall = mockLogger.log.mock.calls[1];
        const responseLogContext = responseLogCall[1];

        // Verify response body is NOT logged
        expect(responseLogContext).not.toHaveProperty('body');
        expect(responseLogContext).not.toHaveProperty('accessToken');
        done();
      });
    });
  });

  describe('AC-7.4.5: X-Request-ID Header Support', () => {
    it('should generate UUID when X-Request-ID header is not present', (done) => {
      // No X-Request-ID header
      mockRequest.headers = { 'user-agent': 'TestAgent' };

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe(() => {
        // Verify request ID was generated
        expect(mockRequest.requestId).toBe('test-uuid-1234-5678-90ab');

        // Verify X-Request-ID was added to response headers
        expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Request-ID', 'test-uuid-1234-5678-90ab');
        done();
      });
    });

    it('should propagate existing X-Request-ID header from request', (done) => {
      mockRequest.headers['x-request-id'] = 'existing-request-id-from-client';

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe(() => {
        // Verify existing request ID was used
        expect(mockRequest.requestId).toBe('existing-request-id-from-client');

        // Verify X-Request-ID was added to response headers
        expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Request-ID', 'existing-request-id-from-client');
        done();
      });
    });

    it('should add X-Request-ID header to response', (done) => {
      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe(() => {
        expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Request-ID', expect.any(String));
        done();
      });
    });

    it('should store request ID in request object for lifecycle access', (done) => {
      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe(() => {
        expect(mockRequest.requestId).toBeDefined();
        expect(typeof mockRequest.requestId).toBe('string');
        done();
      });
    });
  });

  describe('AC-7.4.6: Request ID Correlation', () => {
    it('should include same requestId in both request and response logs', (done) => {
      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe(() => {
        const requestLogCall = mockLogger.log.mock.calls[0];
        const responseLogCall = mockLogger.log.mock.calls[1];

        const requestLogRequestId = requestLogCall[1].requestId;
        const responseLogRequestId = responseLogCall[1].requestId;

        // Verify same request ID in both logs
        expect(requestLogRequestId).toBe(responseLogRequestId);
        expect(requestLogRequestId).toBe('test-uuid-1234-5678-90ab');
        done();
      });
    });

    it('should include requestId in request log context', (done) => {
      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe(() => {
        const requestLogCall = mockLogger.log.mock.calls[0];
        const context = requestLogCall[1];

        expect(context).toHaveProperty('requestId');
        expect(typeof context.requestId).toBe('string');
        done();
      });
    });

    it('should include requestId in response log context', (done) => {
      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe(() => {
        const responseLogCall = mockLogger.log.mock.calls[1];
        const context = responseLogCall[1];

        expect(context).toHaveProperty('requestId');
        expect(typeof context.requestId).toBe('string');
        done();
      });
    });

    it('should enable correlation when existing request ID is propagated', (done) => {
      const existingRequestId = 'upstream-service-request-id-abc-123';
      mockRequest.headers['x-request-id'] = existingRequestId;

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe(() => {
        const requestLogCall = mockLogger.log.mock.calls[0];
        const responseLogCall = mockLogger.log.mock.calls[1];

        // Both logs should have the same propagated request ID
        expect(requestLogCall[1].requestId).toBe(existingRequestId);
        expect(responseLogCall[1].requestId).toBe(existingRequestId);
        done();
      });
    });
  });

  describe('Integration: Full Request Lifecycle', () => {
    it('should log request and response in correct order', (done) => {
      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe(() => {
        expect(mockLogger.log).toHaveBeenCalledTimes(2);

        // First call: request log
        expect(mockLogger.log).toHaveBeenNthCalledWith(1, 'Incoming request', expect.any(Object));

        // Second call: response log
        expect(mockLogger.log).toHaveBeenNthCalledWith(2, 'Outgoing response', expect.any(Object));
        done();
      });
    });

    it('should handle POST request with different user agent', (done) => {
      mockRequest.method = 'POST';
      mockRequest.url = '/api/auth/login';
      mockRequest.headers['user-agent'] = 'curl/7.64.1';
      mockResponse.statusCode = 201;

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe(() => {
        // Request log
        expect(mockLogger.log).toHaveBeenCalledWith(
          'Incoming request',
          expect.objectContaining({
            method: 'POST',
            url: '/api/auth/login',
            userAgent: 'curl/7.64.1',
          }),
        );

        // Response log
        expect(mockLogger.log).toHaveBeenCalledWith(
          'Outgoing response',
          expect.objectContaining({
            method: 'POST',
            url: '/api/auth/login',
            statusCode: 201,
          }),
        );
        done();
      });
    });

    it('should handle error response with warn log level', (done) => {
      mockRequest.method = 'GET';
      mockRequest.url = '/api/users/999999';
      mockResponse.statusCode = 404;

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe(() => {
        // Request log (info)
        expect(mockLogger.log).toHaveBeenCalledWith('Incoming request', expect.any(Object));

        // Response log (warn for 404)
        expect(mockLogger.warn).toHaveBeenCalledWith(
          'Outgoing response',
          expect.objectContaining({
            statusCode: 404,
          }),
        );
        done();
      });
    });

    it('should handle server error response with error log level', (done) => {
      mockRequest.method = 'POST';
      mockRequest.url = '/api/orders';
      mockResponse.statusCode = 500;

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe(() => {
        // Request log (info)
        expect(mockLogger.log).toHaveBeenCalledWith('Incoming request', expect.any(Object));

        // Response log (error for 500)
        expect(mockLogger.error).toHaveBeenCalledWith(
          'Outgoing response',
          expect.objectContaining({
            statusCode: 500,
          }),
        );
        done();
      });
    });
  });
});
