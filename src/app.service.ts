// Libraries
import { Injectable } from '@nestjs/common';

// Services
import { PrismaService } from './database/prisma.service';

@Injectable()
export class AppService {
  constructor(private readonly prismaService: PrismaService) {}

  getHello(): string {
    return 'Hello World!';
  }

  async healthCheck(): Promise<{ status: string; database: string }> {
    try {
      // Simple database connection test
      await this.prismaService.$queryRaw`SELECT 1 as value`;
      return {
        status: 'ok',
        database: 'connected',
      };
    } catch (error) {
      return {
        status: 'error',
        database: 'disconnected',
      };
    }
  }
}
