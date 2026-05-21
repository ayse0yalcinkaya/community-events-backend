// Libraries
import { registerAs } from '@nestjs/config';

/**
 * Redis Configuration (Story 6.5.1: Common Cache Service)
 *
 * Redis cache store configuration for CacheService.
 * Uses environment variables for connection settings.
 */
export default registerAs('redis', () => {
  const host = process.env.REDIS_HOST;
  const port = process.env.REDIS_PORT;

  if (!host) {
    throw new Error('REDIS_HOST is required but not defined in environment variables');
  }

  if (!port) {
    throw new Error('REDIS_PORT is required but not defined in environment variables');
  }

  const parsedPort = parseInt(port, 10);
  if (isNaN(parsedPort)) {
    throw new Error(`REDIS_PORT must be a valid number, got: ${port}`);
  }

  const password = process.env.REDIS_PASSWORD;
  const db = parseInt(process.env.REDIS_DB || '0', 10);
  const ttl = parseInt(process.env.REDIS_TTL || '3600', 10); // Default: 1 hour in seconds

  return {
    host,
    port: parsedPort,
    password,
    db,
    ttl,
    // Connection options
    retryStrategy: (times: number) => {
      // Exponential backoff: 50ms, 100ms, 200ms, 400ms, 800ms, max 2000ms
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    enableOfflineQueue: false,
  };
});
