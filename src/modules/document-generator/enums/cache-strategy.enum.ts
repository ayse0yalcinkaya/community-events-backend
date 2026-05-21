/**
 * Cache Strategy Enum
 *
 * Defines the caching strategies available for document generation.
 * Used by DocumentGeneratorService to determine cache behavior.
 */
export enum CacheStrategy {
  /**
   * Cache based on template name and data hash
   * Default strategy - uses SHA-256 hash of template + data
   */
  TEMPLATE_HASH = 'TEMPLATE_HASH',

  /**
   * No caching - always generate new document
   * Useful for dynamic content that should never be cached
   */
  NO_CACHE = 'NO_CACHE',
}
