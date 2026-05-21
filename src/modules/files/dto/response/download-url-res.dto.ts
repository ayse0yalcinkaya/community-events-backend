// Libraries
import { Expose } from 'class-transformer';

/**
 * Download URL Response DTO
 * Contains pre-signed S3 URL with expiration information
 */
export class DownloadUrlResDto {
  /**
   * Pre-signed S3 download URL (valid for 15 minutes)
   * URL contains AWS credentials - DO NOT log this value
   */
  @Expose()
  downloadUrl!: string;

  /**
   * Expiration timestamp in ISO 8601 format
   * Example: "2025-11-06T12:45:00.000Z"
   */
  @Expose()
  expiresAt!: string;

  /**
   * Time until expiration in seconds
   * Default: 900 (15 minutes)
   */
  @Expose()
  expiresIn!: number;
}
