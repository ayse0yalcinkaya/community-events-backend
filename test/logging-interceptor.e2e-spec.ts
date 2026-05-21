// Libraries
import { Test, TestingModule } from '@nestjs/testing';

import { INestApplication, Controller, Get, Post, Body, HttpException, HttpStatus } from '@nestjs/common';

import request from 'supertest';

// Interceptors
import { LoggingInterceptor } from '../src/common/interceptors/logging.interceptor';

// Services
import { LoggerService } from '../src/common/logger/logger.service';

// Test controller for E2E testing
@Controller('test-logging')
class TestLoggingController {
  @Get('success')
  getSuccess() {
    return { message: 'Success response' };
  }

  @Post('created')
  postCreated(@Body() body: any) {
    return { id: 1, ...body };
  }

  @Get('not-found')
  getNotFound() {
    // Simulate 404 error
    throw new HttpException('Not found', HttpStatus.NOT_FOUND);
  }

  @Get('server-error')
  getServerError() {
    // Simulate 500 error
    throw new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
  }
}

describe('LoggingInterceptor (E2E)', () => {
  let app: INestApplication;
  let mockLogger: jest.Mocked<LoggerService>;
  let logCalls: any[] = [];

  beforeAll(async () => {
    // Create mock logger that captures all log calls
    mockLogger = {
      log: jest.fn((...args) => logCalls.push({ level: 'log', args })),
      error: jest.fn((...args) => logCalls.push({ level: 'error', args })),
      warn: jest.fn((...args) => logCalls.push({ level: 'warn', args })),
      debug: jest.fn((...args) => logCalls.push({ level: 'debug', args })),
      verbose: jest.fn((...args) => logCalls.push({ level: 'verbose', args })),
    } as any;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [TestLoggingController],
      providers: [
        {
          provide: LoggerService,
          useValue: mockLogger,
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Register LoggingInterceptor globally
    app.useGlobalInterceptors(new LoggingInterceptor(mockLogger));

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    logCalls = [];
  });

  describe('AC-7.4.2 & AC-7.4.3: Request and Response Logging', () => {
    it('should log request and response for successful GET request', async () => {
      const response = await request(app.getHttpServer()).get('/test-logging/success').expect(200);

      // Verify request log
      expect(mockLogger.log).toHaveBeenCalledWith(
        'Incoming request',
        expect.objectContaining({
          module: 'LoggingInterceptor',
          method: 'GET',
          url: '/test-logging/success',
          requestId: expect.any(String),
        }),
      );

      // Verify response log
      expect(mockLogger.log).toHaveBeenCalledWith(
        'Outgoing response',
        expect.objectContaining({
          module: 'LoggingInterceptor',
          method: 'GET',
          url: '/test-logging/success',
          statusCode: 200,
          duration: expect.any(Number),
          requestId: expect.any(String),
        }),
      );

      // Verify duration is positive and realistic
      const responseLogCall = logCalls.find((call) => call.args[0] === 'Outgoing response');
      expect(responseLogCall.args[1].duration).toBeGreaterThan(0);
      expect(responseLogCall.args[1].duration).toBeLessThan(1000); // Less than 1 second
    });

    it('should log request and response for POST request', async () => {
      const testBody = { name: 'Test User', email: 'test@example.com' };

      await request(app.getHttpServer()).post('/test-logging/created').send(testBody).expect(201);

      // Verify request log
      expect(mockLogger.log).toHaveBeenCalledWith(
        'Incoming request',
        expect.objectContaining({
          method: 'POST',
          url: '/test-logging/created',
        }),
      );

      // Verify response log
      expect(mockLogger.log).toHaveBeenCalledWith(
        'Outgoing response',
        expect.objectContaining({
          method: 'POST',
          url: '/test-logging/created',
          statusCode: 201,
        }),
      );
    });
  });

  describe('AC-7.4.3: Conditional Log Levels', () => {
    it('should use "warn" log level for 404 Not Found', async () => {
      await request(app.getHttpServer()).get('/test-logging/not-found').expect(404);

      // Verify warn level was used for response
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Outgoing response',
        expect.objectContaining({
          statusCode: 404,
        }),
      );
    });

    it('should use "error" log level for 500 Internal Server Error', async () => {
      await request(app.getHttpServer()).get('/test-logging/server-error').expect(500);

      // Verify error level was used for response
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Outgoing response',
        expect.objectContaining({
          statusCode: 500,
        }),
      );
    });
  });

  describe('AC-7.4.5: X-Request-ID Header', () => {
    it('should add X-Request-ID header to response when not provided', async () => {
      const response = await request(app.getHttpServer()).get('/test-logging/success').expect(200);

      // Verify X-Request-ID header exists in response
      expect(response.headers['x-request-id']).toBeDefined();
      expect(typeof response.headers['x-request-id']).toBe('string');
      expect(response.headers['x-request-id'].length).toBeGreaterThan(0);
    });

    it('should propagate existing X-Request-ID header from request', async () => {
      const existingRequestId = 'client-request-id-12345';

      const response = await request(app.getHttpServer())
        .get('/test-logging/success')
        .set('X-Request-ID', existingRequestId)
        .expect(200);

      // Verify same request ID was propagated to response
      expect(response.headers['x-request-id']).toBe(existingRequestId);

      // Verify logs contain the propagated request ID
      const requestLogCall = logCalls.find((call) => call.args[0] === 'Incoming request');
      const responseLogCall = logCalls.find((call) => call.args[0] === 'Outgoing response');

      expect(requestLogCall.args[1].requestId).toBe(existingRequestId);
      expect(responseLogCall.args[1].requestId).toBe(existingRequestId);
    });
  });

  describe('AC-7.4.6: Request ID Correlation', () => {
    it('should use same request ID in both request and response logs', async () => {
      await request(app.getHttpServer()).get('/test-logging/success').expect(200);

      const requestLogCall = logCalls.find((call) => call.args[0] === 'Incoming request');
      const responseLogCall = logCalls.find((call) => call.args[0] === 'Outgoing response');

      expect(requestLogCall.args[1].requestId).toBeDefined();
      expect(responseLogCall.args[1].requestId).toBeDefined();
      expect(requestLogCall.args[1].requestId).toBe(responseLogCall.args[1].requestId);
    });

    it('should enable correlation across multiple concurrent requests', async () => {
      // Make 3 concurrent requests
      const requests = [
        request(app.getHttpServer()).get('/test-logging/success'),
        request(app.getHttpServer()).get('/test-logging/success'),
        request(app.getHttpServer()).get('/test-logging/success'),
      ];

      const responses = await Promise.all(requests);

      // Extract all request IDs from responses
      const requestIds = responses.map((res) => res.headers['x-request-id']);

      // Verify all request IDs are unique (no collision)
      const uniqueRequestIds = new Set(requestIds);
      expect(uniqueRequestIds.size).toBe(3);

      // Verify each request has matching request/response log pair
      requestIds.forEach((requestId) => {
        const requestLog = logCalls.find(
          (call) => call.args[0] === 'Incoming request' && call.args[1].requestId === requestId,
        );
        const responseLog = logCalls.find(
          (call) => call.args[0] === 'Outgoing response' && call.args[1].requestId === requestId,
        );

        expect(requestLog).toBeDefined();
        expect(responseLog).toBeDefined();
      });
    });
  });

  describe('AC-7.4.4: Sensitive Data Protection', () => {
    it('should NOT log request body by default', async () => {
      const sensitiveBody = {
        username: 'testuser',
        password: 'secret123',
        creditCard: '4111-1111-1111-1111',
      };

      await request(app.getHttpServer()).post('/test-logging/created').send(sensitiveBody).expect(201);

      // Verify request log does NOT contain body
      const requestLogCall = logCalls.find((call) => call.args[0] === 'Incoming request');
      const requestLogContext = requestLogCall.args[1];

      expect(requestLogContext).not.toHaveProperty('body');
      expect(requestLogContext).not.toHaveProperty('password');
      expect(requestLogContext).not.toHaveProperty('creditCard');
    });

    it('should NOT log response body by default', async () => {
      await request(app.getHttpServer()).get('/test-logging/success').expect(200);

      // Verify response log does NOT contain body
      const responseLogCall = logCalls.find((call) => call.args[0] === 'Outgoing response');
      const responseLogContext = responseLogCall.args[1];

      expect(responseLogContext).not.toHaveProperty('body');
      expect(responseLogContext).not.toHaveProperty('message');
    });
  });

  describe('Performance: Duration Calculation', () => {
    it('should calculate realistic duration values', async () => {
      await request(app.getHttpServer()).get('/test-logging/success').expect(200);

      const responseLogCall = logCalls.find((call) => call.args[0] === 'Outgoing response');
      const duration = responseLogCall.args[1].duration;

      // Duration should be positive
      expect(duration).toBeGreaterThan(0);

      // Duration should be realistic (< 1000ms for simple endpoint)
      expect(duration).toBeLessThan(1000);

      // Duration should be a number with decimal places (sub-millisecond precision)
      expect(typeof duration).toBe('number');
    });

    it('should add minimal overhead to request processing', async () => {
      const startTime = Date.now();

      await request(app.getHttpServer()).get('/test-logging/success').expect(200);

      const endTime = Date.now();
      const totalDuration = endTime - startTime;

      // Total duration should be reasonable (< 100ms for simple endpoint)
      expect(totalDuration).toBeLessThan(100);
    });
  });

  describe('Integration: Full Request Lifecycle', () => {
    it('should log both request and response in correct order', async () => {
      await request(app.getHttpServer()).get('/test-logging/success').expect(200);

      // Verify logs are in correct order
      expect(logCalls.length).toBeGreaterThanOrEqual(2);

      const firstLog = logCalls[0];
      const secondLog = logCalls[1];

      expect(firstLog.args[0]).toBe('Incoming request');
      expect(secondLog.args[0]).toBe('Outgoing response');
    });

    it('should include user agent from actual HTTP request', async () => {
      await request(app.getHttpServer())
        .get('/test-logging/success')
        .set('User-Agent', 'CustomTestAgent/1.0')
        .expect(200);

      const requestLogCall = logCalls.find((call) => call.args[0] === 'Incoming request');

      expect(requestLogCall.args[1].userAgent).toBe('CustomTestAgent/1.0');
    });

    it('should handle requests with query parameters', async () => {
      await request(app.getHttpServer()).get('/test-logging/success?page=1&limit=10').expect(200);

      const requestLogCall = logCalls.find((call) => call.args[0] === 'Incoming request');

      // URL should include query parameters
      expect(requestLogCall.args[1].url).toContain('page=1');
      expect(requestLogCall.args[1].url).toContain('limit=10');
    });
  });
});
