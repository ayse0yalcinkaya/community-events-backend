// Libraries
import { HttpStatus, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

// Services
import { PrismaService } from '../src/database/prisma.service';

// Modules
import { AppModule } from '../src/app.module';

describe('Health Endpoints (E2E)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prismaService = moduleFixture.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /health', () => {
    it('should return 200 OK with correct structure', async () => {
      const response = await request(app.getHttpServer()).get('/health');

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body).toMatchObject({
        status: 'ok',
        timestamp: expect.any(String),
      });
    });

    it('should return valid ISO timestamp', async () => {
      const response = await request(app.getHttpServer()).get('/health');

      expect(response.status).toBe(HttpStatus.OK);
      expect(new Date(response.body.timestamp).toString()).not.toBe('Invalid Date');
    });

    it('should be accessible without authentication', async () => {
      // No Authorization header provided
      const response = await request(app.getHttpServer()).get('/health');

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body.status).toBe('ok');
    });

    it('should respond quickly (< 100ms)', async () => {
      const startTime = Date.now();
      const response = await request(app.getHttpServer()).get('/health');
      const responseTime = Date.now() - startTime;

      expect(response.status).toBe(HttpStatus.OK);
      expect(responseTime).toBeLessThan(100); // More lenient for E2E
    });

    it('should return consistent response structure on multiple calls', async () => {
      const responses = await Promise.all([
        request(app.getHttpServer()).get('/health'),
        request(app.getHttpServer()).get('/health'),
        request(app.getHttpServer()).get('/health'),
      ]);

      responses.forEach((response) => {
        expect(response.status).toBe(HttpStatus.OK);
        expect(response.body).toHaveProperty('status', 'ok');
        expect(response.body).toHaveProperty('timestamp');
      });
    });
  });

  describe('GET /health/db', () => {
    it('should return 200 OK when database is connected', async () => {
      const response = await request(app.getHttpServer()).get('/health/db');

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body).toMatchObject({
        status: 'ok',
        database: 'connected',
        responseTime: expect.any(Number),
        timestamp: expect.any(String),
      });
    });

    it('should measure and return response time', async () => {
      const response = await request(app.getHttpServer()).get('/health/db');

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body.responseTime).toBeGreaterThanOrEqual(0);
      expect(typeof response.body.responseTime).toBe('number');
    });

    it('should return valid ISO timestamp', async () => {
      const response = await request(app.getHttpServer()).get('/health/db');

      expect(response.status).toBe(HttpStatus.OK);
      expect(new Date(response.body.timestamp).toString()).not.toBe('Invalid Date');
    });

    it('should be accessible without authentication', async () => {
      // No Authorization header provided
      const response = await request(app.getHttpServer()).get('/health/db');

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body.database).toBe('connected');
    });

    it('should respond within acceptable time (< 100ms)', async () => {
      const startTime = Date.now();
      const response = await request(app.getHttpServer()).get('/health/db');
      const responseTime = Date.now() - startTime;

      expect(response.status).toBe(HttpStatus.OK);
      expect(responseTime).toBeLessThan(100);
    });

    it('should handle concurrent health checks', async () => {
      const responses = await Promise.all([
        request(app.getHttpServer()).get('/health/db'),
        request(app.getHttpServer()).get('/health/db'),
        request(app.getHttpServer()).get('/health/db'),
      ]);

      responses.forEach((response) => {
        expect(response.status).toBe(HttpStatus.OK);
        expect(response.body.database).toBe('connected');
        expect(response.body.responseTime).toBeGreaterThanOrEqual(0);
      });
    });

    it('should return 503 when database is disconnected', async () => {
      // Mock database failure by temporarily disconnecting
      jest.spyOn(prismaService, '$queryRaw').mockRejectedValueOnce(new Error('Connection refused'));

      const response = await request(app.getHttpServer()).get('/health/db');

      expect(response.status).toBe(HttpStatus.SERVICE_UNAVAILABLE);
      expect(response.body).toMatchObject({
        status: 'error',
        database: 'disconnected',
        responseTime: expect.any(Number),
        timestamp: expect.any(String),
        error: 'Database connection failed',
      });

      jest.restoreAllMocks();
    });

    it('should not expose sensitive error details', async () => {
      jest
        .spyOn(prismaService, '$queryRaw')
        .mockRejectedValueOnce(new Error('Connection to postgres://user:password@host:5432/db'));

      const response = await request(app.getHttpServer()).get('/health/db');

      expect(response.status).toBe(HttpStatus.SERVICE_UNAVAILABLE);
      expect(response.body.error).toBe('Database connection failed');
      expect(response.body.error).not.toContain('password');
      expect(response.body.error).not.toContain('postgres://');

      jest.restoreAllMocks();
    });
  });

  describe('GET /health/services', () => {
    it('should return 200 OK with services status', async () => {
      const response = await request(app.getHttpServer()).get('/health/services');

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body).toMatchObject({
        status: expect.stringMatching(/^(ok|degraded)$/),
        services: {
          database: {
            status: expect.stringMatching(/^(healthy|unhealthy)$/),
            responseTime: expect.any(Number),
          },
        },
        timestamp: expect.any(String),
      });
    });

    it('should return ok status when all services are healthy', async () => {
      const response = await request(app.getHttpServer()).get('/health/services');

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body.status).toBe('ok');
      expect(response.body.services.database.status).toBe('healthy');
    });

    it('should include database response time', async () => {
      const response = await request(app.getHttpServer()).get('/health/services');

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body.services.database.responseTime).toBeGreaterThanOrEqual(0);
    });

    it('should be accessible without authentication', async () => {
      const response = await request(app.getHttpServer()).get('/health/services');

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body).toHaveProperty('services');
    });

    it('should return degraded status when database fails', async () => {
      jest.spyOn(prismaService, '$queryRaw').mockRejectedValueOnce(new Error('Connection timeout'));

      const response = await request(app.getHttpServer()).get('/health/services');

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body.status).toBe('degraded');
      expect(response.body.services.database.status).toBe('unhealthy');

      jest.restoreAllMocks();
    });

    it('should have extensible services structure', async () => {
      const response = await request(app.getHttpServer()).get('/health/services');

      expect(response.status).toBe(HttpStatus.OK);
      expect(typeof response.body.services).toBe('object');
      expect(response.body.services).toHaveProperty('database');
      // Future: Can add more services (Redis, S3, etc.)
    });
  });

  describe('Health endpoints integration', () => {
    it('should not trigger authentication guards', async () => {
      const endpoints = ['/health', '/health/db', '/health/services'];

      const responses = await Promise.all(endpoints.map((endpoint) => request(app.getHttpServer()).get(endpoint)));

      responses.forEach((response) => {
        expect(response.status).not.toBe(HttpStatus.UNAUTHORIZED);
        expect(response.status).not.toBe(HttpStatus.FORBIDDEN);
      });
    });

    it('should not trigger logging interceptor errors', async () => {
      const response = await request(app.getHttpServer()).get('/health');

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body).not.toHaveProperty('error');
    });

    it('should maintain correct content type', async () => {
      const response = await request(app.getHttpServer()).get('/health');

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.headers['content-type']).toMatch(/application\/json/);
    });
  });

  describe('Load balancer compatibility', () => {
    it('should use standard HTTP status codes', async () => {
      const healthResponse = await request(app.getHttpServer()).get('/health');
      const dbResponse = await request(app.getHttpServer()).get('/health/db');

      expect([200, 503]).toContain(healthResponse.status);
      expect([200, 503]).toContain(dbResponse.status);
    });

    it('should support rapid polling (30 second intervals)', async () => {
      const startTime = Date.now();

      // Simulate load balancer polling 5 times
      for (let i = 0; i < 5; i++) {
        const response = await request(app.getHttpServer()).get('/health');
        expect(response.status).toBe(HttpStatus.OK);
      }

      const totalTime = Date.now() - startTime;
      expect(totalTime).toBeLessThan(500); // Should complete quickly
    });
  });
});
