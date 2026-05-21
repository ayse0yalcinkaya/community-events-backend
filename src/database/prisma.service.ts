// NestJS imports
// Libraries
import { Injectable, OnModuleInit, OnModuleDestroy, INestApplication } from '@nestjs/common';

// Third-party imports
import { PrismaClient } from '@prisma/client';

// Local imports
import { LoggerService } from '../common/logger/logger.service';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private shutdownHookEnabled = false;

  constructor(private readonly logger: LoggerService) {
    super();
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('✅ Prisma connected to database', {
      module: 'PrismaService',
      database: process.env.DATABASE_URL,
      environment: process.env.NODE_ENV,
    });
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('👋 Prisma disconnected from database', {
      module: 'PrismaService',
    });
  }

  enableShutdownHooks(app: INestApplication) {
    if (process.env.NODE_ENV === 'test' || this.shutdownHookEnabled) {
      return;
    }

    this.shutdownHookEnabled = true;

    // Prisma 5.0+ requires process event listeners instead of $on('beforeExit')
    process.once('beforeExit', async () => {
      await app.close();
    });
  }
}
