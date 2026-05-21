// Libraries
import { Controller, Get, HttpStatus, Logger, Res } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';

// Services
import { PrismaService } from '../database/prisma.service';
import { S3Service } from '../modules/files/services/s3.service';

// Guards/Decorators
import { Public } from '../common/decorators/public.decorator';

@ApiTags('Health')
@Controller()
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly s3Service: S3Service,
  ) {}

  @Get('health/db')
  @Public()
  @ApiOperation({ summary: 'Database health check' })
  @ApiResponse({
    status: 200,
    description: 'Database is connected',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        database: { type: 'string', example: 'connected' },
        responseTime: { type: 'number', example: 23 },
        timestamp: { type: 'string', example: '2025-11-06T11:30:00.000Z' },
      },
    },
  })
  @ApiResponse({
    status: 503,
    description: 'Database is disconnected',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'error' },
        database: { type: 'string', example: 'disconnected' },
        responseTime: { type: 'number', example: 5000 },
        timestamp: { type: 'string', example: '2025-11-06T11:30:00.000Z' },
        error: { type: 'string', example: 'Database connection failed' },
      },
    },
  })
  async healthCheckDb(@Res() res: Response) {
    const startTime = Date.now();

    try {
      // Simple database query to test connection
      await this.prisma.$queryRaw`SELECT 1`;
      const responseTime = Date.now() - startTime;

      this.logger.log(`Database health check: OK (${responseTime}ms)`);

      return res.status(HttpStatus.OK).json({
        status: 'ok',
        database: 'connected',
        responseTime,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      this.logger.warn(`Database health check: FAILED (${responseTime}ms) - ${errorMessage}`);

      return res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
        status: 'error',
        database: 'disconnected',
        responseTime,
        timestamp: new Date().toISOString(),
        error: 'Database connection failed',
      });
    }
  }

  @Get('health/services')
  @Public()
  @ApiOperation({
    summary: 'Comprehensive service health check (stub for future)',
  })
  @ApiResponse({
    status: 200,
    description: 'Services health status',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        services: {
          type: 'object',
          properties: {
            database: {
              type: 'object',
              properties: {
                status: { type: 'string', example: 'healthy' },
                responseTime: { type: 'number', example: 23 },
              },
            },
          },
        },
        timestamp: { type: 'string', example: '2025-11-06T11:30:00.000Z' },
      },
    },
  })
  async healthCheckServices() {
    // Check database health
    const startTime = Date.now();
    let dbStatus = 'healthy';
    let dbResponseTime = 0;

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      dbResponseTime = Date.now() - startTime;
      this.logger.log(`Services health check - Database: OK (${dbResponseTime}ms)`);
    } catch (error) {
      dbResponseTime = Date.now() - startTime;
      dbStatus = 'unhealthy';
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Services health check - Database: FAILED (${dbResponseTime}ms) - ${errorMessage}`);
    }

    // TODO: Add Redis health check
    // TODO: Add S3 health check (can integrate existing checkS3Health)
    // TODO: Add Sentry health check

    const overallStatus = dbStatus === 'healthy' ? 'ok' : 'degraded';

    return {
      status: overallStatus,
      services: {
        database: {
          status: dbStatus,
          responseTime: dbResponseTime,
        },
        // Future services will be added here
      },
      timestamp: new Date().toISOString(),
    };
  }

  @Get('health/s3')
  @Public()
  @ApiOperation({ summary: 'S3 service health check' })
  @ApiResponse({ status: 200, description: 'S3 connection is healthy' })
  @ApiResponse({ status: 503, description: 'S3 connection failed' })
  async checkS3Health() {
    try {
      const isHealthy = await this.s3Service.testConnection();

      if (isHealthy) {
        this.logger.log('S3 health check: OK');
        return {
          status: 'ok',
          s3: {
            status: 'up',
            message: 'S3 connection is healthy',
          },
        };
      } else {
        this.logger.warn('S3 health check: Service Unavailable');
        return {
          status: 'error',
          s3: {
            status: 'down',
            message: 'S3 connection failed',
          },
        };
      }
    } catch (error) {
      this.logger.error('S3 health check error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        status: 'error',
        s3: {
          status: 'down',
          error: errorMessage,
        },
      };
    }
  }

  @Get('health')
  @Public()
  @ApiOperation({ summary: 'Basic liveness check' })
  @ApiResponse({
    status: 200,
    description: 'Application is running',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        timestamp: { type: 'string', example: '2025-11-06T11:30:00.000Z' },
      },
    },
  })
  healthCheck() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
