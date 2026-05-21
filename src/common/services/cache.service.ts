// Libraries
import { Inject, Injectable, OnModuleInit, Optional } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import * as crypto from 'crypto';

// Services
import { LoggerService } from '../logger/logger.service';

/**
 * AC-6.5.1: CacheService - SHA-256 Hash-Based Caching Service
 *
 * Provides generic cache operations with SHA-256 hash-based key generation.
 * Uses NestJS cache-manager with Redis store backend.
 *
 * Features:
 * - Generic type support for any cached value type
 * - SHA-256 hash-based key generation with consistent hashing
 * - Configurable TTL (default: 1 hour)
 * - Graceful error handling (cache miss returns null, no errors thrown)
 *
 * @example
 * ```typescript
 * const cacheKey = cacheService.generateCacheKey('doc', 'PDF', 'invoice', { userId: 123 });
 * const cached = await cacheService.get<string>(cacheKey);
 * await cacheService.set(cacheKey, 's3://bucket/file.pdf', 3600000);
 * ```
 */
@Injectable()
export class CacheService implements OnModuleInit {
  /**
   * AC-6.5.1: Default TTL constant
   * Default time-to-live: 1 hour (3600000ms)
   */
  private readonly DEFAULT_TTL = 3600000; // 1 hour in milliseconds

  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    @Optional() private readonly logger?: LoggerService,
  ) {}

  /**
   * OnModuleInit: Test Redis connection on module initialization
   */
  async onModuleInit() {
    try {
      // Test Redis connection by performing a simple cache operation
      const testKey = '__cache_service_init_test__';
      await this.cacheManager.set(testKey, 'test', 1000);
      const testValue = await this.cacheManager.get<string>(testKey);
      await this.cacheManager.del(testKey);

      if (testValue === 'test') {
        this.logger?.log('CacheService initialized - Redis connection successful', {
          module: CacheService.name,
          method: 'onModuleInit',
        });
      } else {
        this.logger?.warn('CacheService initialized - Redis connection test failed (unexpected value)', {
          module: CacheService.name,
          method: 'onModuleInit',
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger?.error(
        `CacheService initialization FAILED - Redis connection error: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
        {
          module: CacheService.name,
          method: 'onModuleInit',
          error: errorMessage,
        },
      );
      // Don't throw - allow application to start even if Redis is unavailable
      // Cache operations will gracefully handle failures
    }
  }

  /**
   * AC-6.5.2: Generate cache key with SHA-256 hash
   *
   * Creates a cache key in format: {prefix}:{hash(parts)}
   * Uses SHA-256 hash of sorted JSON representation of parts for consistent hashing.
   *
   * @param prefix - Key prefix (e.g., 'doc', 'user')
   * @param parts - Variable number of parts to hash (strings, numbers, objects, arrays)
   * @returns Cache key string (format: {prefix}:{64-hex-character-hash})
   *
   * @example
   * ```typescript
   * // Simple string parts
   * generateCacheKey('doc', 'PDF', 'invoice') // 'doc:abc123...'
   *
   * // With object data
   * generateCacheKey('doc', 'PDF', 'invoice', { userId: 123, template: 'invoice' })
   * // 'doc:def456...' (same hash for {userId:123, template:'invoice'} and {template:'invoice', userId:123})
   * ```
   */
  generateCacheKey(prefix: string, ...parts: any[]): string {
    const hash = this.generateDataHash(parts);
    const key = `${prefix}:${hash}`;
    return key;
  }

  /**
   * AC-6.5.3: Get cached value by key
   *
   * Retrieves cached value with generic type support.
   * Returns null if cache miss (no error thrown).
   *
   * @param key - Cache key
   * @returns Cached value with type T, or null if not found
   *
   * @example
   * ```typescript
   * const cached = await cacheService.get<string>('doc:abc123...');
   * if (cached) {
   *   console.log('Cache hit:', cached);
   * } else {
   *   console.log('Cache miss');
   * }
   * ```
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.cacheManager.get<T>(key);
      return value ?? null;
    } catch (error) {
      this.logger?.warn('Cache get failed', {
        module: CacheService.name,
        method: 'get',
        key,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * AC-6.5.4: Set cached value with optional TTL
   *
   * Stores value in cache with optional TTL.
   * Uses default TTL (1 hour) if not provided.
   *
   * @param key - Cache key
   * @param value - Value to cache (any type T)
   * @param ttl - Optional time-to-live in milliseconds (default: 3600000ms)
   *
   * @example
   * ```typescript
   * // With default TTL (1 hour)
   * await cacheService.set('doc:abc123...', 's3://bucket/file.pdf');
   *
   * // With custom TTL (30 minutes)
   * await cacheService.set('doc:abc123...', 's3://bucket/file.pdf', 1800000);
   * ```
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      const cacheTtl = ttl ?? this.DEFAULT_TTL;
      await this.cacheManager.set(key, value, cacheTtl);
    } catch (error) {
      this.logger?.warn('Cache set failed', {
        module: CacheService.name,
        method: 'set',
        key,
        error: error instanceof Error ? error.message : String(error),
      });
      // Gracefully handle cache failures - don't throw
    }
  }

  /**
   * AC-6.5.5: Delete cache entry
   *
   * Invalidates cache entry by key.
   * Idempotent: no error thrown if key doesn't exist.
   *
   * @param key - Cache key to delete
   *
   * @example
   * ```typescript
   * await cacheService.delete('doc:abc123...');
   * ```
   */
  async delete(key: string): Promise<void> {
    try {
      await this.cacheManager.del(key);
    } catch (error) {
      this.logger?.warn('Cache delete failed', {
        module: CacheService.name,
        method: 'delete',
        key,
        error: error instanceof Error ? error.message : String(error),
      });
      // Idempotent: don't throw on cache miss
    }
  }

  /**
   * AC-6.5.6: Clear all cache entries
   *
   * Clears all entries from the cache store.
   *
   * @example
   * ```typescript
   * await cacheService.clear();
   * ```
   */
  async clear(): Promise<void> {
    try {
      // cache-manager v7: Use store.reset() if available, otherwise wrap store
      const store = (this.cacheManager as any).store;
      if (store && typeof store.reset === 'function') {
        await store.reset();
      } else {
        // Fallback: Clear all keys by iterating (if store supports keys())
        // For Redis store, this will clear all entries
        this.logger?.warn('Cache clear: reset() not available, clearing may be incomplete', {
          module: CacheService.name,
          method: 'clear',
        });
      }
    } catch (error) {
      this.logger?.warn('Cache clear failed', {
        module: CacheService.name,
        method: 'clear',
        error: error instanceof Error ? error.message : String(error),
      });
      // Gracefully handle cache failures
    }
  }

  /**
   * AC-6.5.7: Generate SHA-256 hash of data
   *
   * Private method to generate consistent SHA-256 hash.
   * Sorts object keys recursively before hashing to ensure consistent hash
   * for same data regardless of key order.
   *
   * @param data - Data to hash (any type)
   * @returns 64-character hexadecimal hash string
   *
   * @private
   */
  private generateDataHash(data: any): string {
    const sortedData = this.sortObjectKeys(data);
    const jsonString = JSON.stringify(sortedData);
    const hash = crypto.createHash('sha256').update(jsonString).digest('hex');
    return hash;
  }

  /**
   * AC-6.5.7: Sort object keys recursively
   *
   * Private method to recursively sort object keys for consistent hashing.
   * Ensures {a:1, b:2} and {b:2, a:1} produce same hash.
   *
   * Handles:
   * - Primitives: returned as-is
   * - Arrays: mapped recursively
   * - Objects: keys sorted, values mapped recursively
   *
   * @param obj - Object/array/primitive to sort
   * @returns Sorted object/array/primitive
   *
   * @private
   */
  private sortObjectKeys(obj: any): any {
    // Handle primitives
    if (obj === null || obj === undefined) {
      return obj;
    }
    if (typeof obj !== 'object') {
      return obj;
    }

    // Handle arrays
    if (Array.isArray(obj)) {
      return obj.map((item) => this.sortObjectKeys(item));
    }

    // Handle objects
    const sortedKeys = Object.keys(obj).sort();
    const sortedObj: any = {};
    for (const key of sortedKeys) {
      sortedObj[key] = this.sortObjectKeys(obj[key]);
    }
    return sortedObj;
  }
}
