// Libraries
import { HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Response } from 'express';

// Services
import { PrismaService } from '../../database/prisma.service';
import { S3Service } from '../../modules/files/services/s3.service';

// Controllers
import { HealthController } from '../health.controller';

describe('HealthController', () => {
  let controller: HealthController;
  let prismaService: PrismaService;
  let s3Service: S3Service;

  const mockPrismaService = {
    $queryRaw: jest.fn(),
  };

  const mockS3Service = {
    testConnection: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: S3Service,
          useValue: mockS3Service,
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    prismaService = module.get<PrismaService>(PrismaService);
    s3Service = module.get<S3Service>(S3Service);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('healthCheck', () => {
    it('should return status ok with timestamp', () => {
      const result = controller.healthCheck();

      expect(result).toHaveProperty('status', 'ok');
      expect(result).toHaveProperty('timestamp');
      expect(typeof result.timestamp).toBe('string');
      expect(new Date(result.timestamp).toString()).not.toBe('Invalid Date');
    });

    it('should return consistent structure', () => {
      const result = controller.healthCheck();

      expect(Object.keys(result)).toEqual(['status', 'timestamp']);
    });

    it('should execute quickly (< 10ms)', () => {
      const startTime = Date.now();
      controller.healthCheck();
      const executionTime = Date.now() - startTime;

      expect(executionTime).toBeLessThan(10);
    });
  });

  describe('healthCheckDb', () => {
    let mockResponse: Partial<Response>;

    beforeEach(() => {
      mockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
    });

    it('should return 200 OK when database is connected', async () => {
      mockPrismaService.$queryRaw.mockResolvedValueOnce([{ '?column?': 1 }]);

      await controller.healthCheckDb(mockResponse as Response);

      expect(mockPrismaService.$queryRaw).toHaveBeenCalledTimes(1);
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.OK);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'ok',
          database: 'connected',
          responseTime: expect.any(Number),
          timestamp: expect.any(String),
        }),
      );
    });

    it('should include response time in successful check', async () => {
      mockPrismaService.$queryRaw.mockResolvedValueOnce([{ '?column?': 1 }]);

      await controller.healthCheckDb(mockResponse as Response);

      const jsonCall = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(jsonCall.responseTime).toBeGreaterThanOrEqual(0);
      expect(jsonCall.responseTime).toBeLessThan(100);
    });

    it('should return 503 when database is disconnected', async () => {
      mockPrismaService.$queryRaw.mockRejectedValueOnce(new Error('Connection refused'));

      await controller.healthCheckDb(mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
          database: 'disconnected',
          responseTime: expect.any(Number),
          timestamp: expect.any(String),
          error: 'Database connection failed',
        }),
      );
    });

    it('should include response time in failed check', async () => {
      mockPrismaService.$queryRaw.mockRejectedValueOnce(new Error('Connection timeout'));

      await controller.healthCheckDb(mockResponse as Response);

      const jsonCall = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(jsonCall.responseTime).toBeGreaterThanOrEqual(0);
    });

    it('should not expose sensitive error details', async () => {
      mockPrismaService.$queryRaw.mockRejectedValueOnce(new Error('Connection to db.internal.company.com:5432 failed'));

      await controller.healthCheckDb(mockResponse as Response);

      const jsonCall = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(jsonCall.error).toBe('Database connection failed');
      expect(jsonCall.error).not.toContain('db.internal');
      expect(jsonCall.error).not.toContain('5432');
    });

    it('should have valid ISO timestamp in response', async () => {
      mockPrismaService.$queryRaw.mockResolvedValueOnce([{ '?column?': 1 }]);

      await controller.healthCheckDb(mockResponse as Response);

      const jsonCall = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(new Date(jsonCall.timestamp).toString()).not.toBe('Invalid Date');
    });
  });

  describe('healthCheckServices', () => {
    it('should return ok status when database is healthy', async () => {
      mockPrismaService.$queryRaw.mockResolvedValueOnce([{ '?column?': 1 }]);

      const result = await controller.healthCheckServices();

      expect(result).toMatchObject({
        status: 'ok',
        services: {
          database: {
            status: 'healthy',
            responseTime: expect.any(Number),
          },
        },
        timestamp: expect.any(String),
      });
    });

    it('should return degraded status when database is unhealthy', async () => {
      mockPrismaService.$queryRaw.mockRejectedValueOnce(new Error('Connection failed'));

      const result = await controller.healthCheckServices();

      expect(result).toMatchObject({
        status: 'degraded',
        services: {
          database: {
            status: 'unhealthy',
            responseTime: expect.any(Number),
          },
        },
        timestamp: expect.any(String),
      });
    });

    it('should measure database response time', async () => {
      mockPrismaService.$queryRaw.mockResolvedValueOnce([{ '?column?': 1 }]);

      const result = await controller.healthCheckServices();

      expect(result.services.database.responseTime).toBeGreaterThanOrEqual(0);
      expect(result.services.database.responseTime).toBeLessThan(100);
    });

    it('should have extensible services structure', async () => {
      mockPrismaService.$queryRaw.mockResolvedValueOnce([{ '?column?': 1 }]);

      const result = await controller.healthCheckServices();

      expect(result.services).toHaveProperty('database');
      expect(typeof result.services).toBe('object');
    });

    it('should include timestamp in ISO format', async () => {
      mockPrismaService.$queryRaw.mockResolvedValueOnce([{ '?column?': 1 }]);

      const result = await controller.healthCheckServices();

      expect(new Date(result.timestamp).toString()).not.toBe('Invalid Date');
    });
  });

  describe('checkS3Health', () => {
    it('should return ok status when S3 is healthy', async () => {
      mockS3Service.testConnection.mockResolvedValueOnce(true);

      const result = await controller.checkS3Health();

      expect(result).toMatchObject({
        status: 'ok',
        s3: {
          status: 'up',
          message: 'S3 connection is healthy',
        },
      });
    });

    it('should return error status when S3 connection fails', async () => {
      mockS3Service.testConnection.mockResolvedValueOnce(false);

      const result = await controller.checkS3Health();

      expect(result).toMatchObject({
        status: 'error',
        s3: {
          status: 'down',
          message: 'S3 connection failed',
        },
      });
    });

    it('should handle S3 exceptions gracefully', async () => {
      mockS3Service.testConnection.mockRejectedValueOnce(new Error('Network timeout'));

      const result = await controller.checkS3Health();

      expect(result).toMatchObject({
        status: 'error',
        s3: {
          status: 'down',
          error: 'Network timeout',
        },
      });
    });
  });

  describe('Public decorator metadata', () => {
    it('should have IS_PUBLIC_KEY metadata on healthCheck', () => {
      const metadata = Reflect.getMetadata('isPublic', controller.healthCheck);
      expect(metadata).toBe(true);
    });

    it('should have IS_PUBLIC_KEY metadata on healthCheckDb', () => {
      const metadata = Reflect.getMetadata('isPublic', controller.healthCheckDb);
      expect(metadata).toBe(true);
    });

    it('should have IS_PUBLIC_KEY metadata on healthCheckServices', () => {
      const metadata = Reflect.getMetadata('isPublic', controller.healthCheckServices);
      expect(metadata).toBe(true);
    });

    it('should have IS_PUBLIC_KEY metadata on checkS3Health', () => {
      const metadata = Reflect.getMetadata('isPublic', controller.checkS3Health);
      expect(metadata).toBe(true);
    });
  });
});
