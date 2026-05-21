// Enums
import { CacheStrategy } from '../enums/cache-strategy.enum';

/**
 * S3 Options Interface
 *
 * Configuration for S3 file upload operations.
 */
export interface S3Options {
  /**
   * S3 folder path (e.g., 'documents/invoices')
   * Will be used as prefix for the S3 key
   */
  path: string;

  /**
   * Optional filename
   * If not provided, auto-generated UUID + extension will be used
   */
  filename?: string;

  /**
   * MIME type (e.g., 'application/pdf', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
   * If not provided, auto-detected based on document type
   */
  contentType?: string;

  /**
   * Access Control List (ACL) setting
   * Default: 'public-read'
   */
  acl?: 'private' | 'public-read' | 'public-read-write';
}

/**
 * Document Generator Options Interface
 *
 * Configuration options for document generation.
 * Used by DocumentGeneratorService.generate() method.
 */
export interface DocumentGeneratorOptions {
  /**
   * Template/adapter name
   * For PDF: template name (e.g., 'invoice')
   * For Excel: adapter name (e.g., 'sales-report')
   */
  templateName: string;

  /**
   * Data to be used for document generation
   * Passed to adapter.generate() method
   */
  data: any;

  /**
   * Language code for internationalization (e.g., 'en', 'tr')
   * Passed to adapter.generate() method
   */
  lang: string;

  /**
   * S3 upload options
   */
  s3Options: S3Options;

  /**
   * Cache strategy
   * Default: CacheStrategy.TEMPLATE_HASH
   */
  cacheStrategy?: CacheStrategy;

  /**
   * Cache TTL in milliseconds
   * Default: 3600000 (1 hour)
   */
  cacheTtl?: number;

  /**
   * Optional metadata
   * Included in GenerationResult for tracking purposes
   */
  metadata?: any;
}
