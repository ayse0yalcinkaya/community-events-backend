/**
 * Cache Service Interface
 *
 * Interface for generic cache service with SHA-256 hash-based key generation.
 * Implemented by CacheService (Story 6.5-1).
 */
export interface ICacheService {
  /**
   * Generate cache key with SHA-256 hash
   *
   * @param prefix - Key prefix (e.g., 'document')
   * @param parts - Variable number of parts to hash
   * @returns Cache key string (format: {prefix}:{hash})
   */
  generateCacheKey(prefix: string, ...parts: any[]): string;

  /**
   * Get cached value by key
   *
   * @param key - Cache key
   * @returns Cached value with type T, or null if not found
   */
  get<T>(key: string): Promise<T | null>;

  /**
   * Set cached value with TTL
   *
   * @param key - Cache key
   * @param value - Value to cache (any type T)
   * @param ttl - Optional time to live in milliseconds
   * @returns Promise resolving when cache is set
   */
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
}
