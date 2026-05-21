// Libraries
import { Global, Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { redisStore } from 'cache-manager-redis-store';

// Services
import { CacheService } from './services/cache.service';
import { RetryService } from './services/retry.service';

// Logger
import { LoggerModule } from './logger/logger.module';

/**
 * AC-6.5.9: CommonModule - Exports CacheService globally
 *
 * Provides CacheService to all modules via Global decorator.
 * Registers CacheModule with Redis store configuration.
 *
 * CacheModule Configuration:
 * - Store: Redis (cache-manager-redis-store)
 * - Redis client: ioredis
 * - Configuration: Environment variables (REDIS_HOST, REDIS_PORT, REDIS_PASSWORD, REDIS_DB)
 * - Default TTL: 3600 seconds (1 hour)
 */
@Global()
@Module({
  imports: [
    // AC-6.5.10: LoggerModule for logging services
    LoggerModule,
    // AC-6.5.8: CacheModule registration with Redis store
    CacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const redisConfig = configService.get('redis');

        if (!redisConfig) {
          throw new Error(
            'Redis configuration is required but not found. Please set REDIS_HOST and REDIS_PORT in your .env file.',
          );
        }

        const redisHost = redisConfig.host;
        const redisPort = redisConfig.port;
        const redisPassword = redisConfig.password;
        const redisDb = redisConfig.db || 0;
        const redisTtl = redisConfig.ttl || 3600;

        // Log Redis configuration (without password)
        const logger = configService.get('NODE_ENV') !== 'test' ? console : null;
        logger?.log(
          `[CommonModule] Redis configuration: host=${redisHost}, port=${redisPort}, db=${redisDb}, ttl=${redisTtl}s`,
        );

        return {
          store: redisStore,
          host: redisHost,
          port: redisPort,
          password: redisPassword,
          db: redisDb,
          ttl: redisTtl, // Default TTL: 1 hour in seconds
          // Connection pooling handled by ioredis
        };
      },
    }),
  ],
  providers: [CacheService, RetryService],
  exports: [CacheService, RetryService],
})
export class CommonModule {}
