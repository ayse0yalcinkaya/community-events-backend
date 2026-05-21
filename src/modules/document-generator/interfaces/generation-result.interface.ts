/**
 * Generation Result Interface
 *
 * Result object returned by DocumentGeneratorService.generate() method.
 * Contains information about the generation process and the generated file.
 */
export interface GenerationResult {
  /**
   * Whether generation was successful
   */
  success: boolean;

  /**
   * S3 URL of the generated file
   * Format: https://{bucket}.s3.{region}.amazonaws.com/{key}
   * or pre-signed URL depending on ACL setting
   */
  fileUrl: string;

  /**
   * Whether the result was retrieved from cache
   * true: Cache hit - file was not regenerated
   * false: Cache miss - new file was generated
   */
  cached: boolean;

  /**
   * Timestamp when generation completed
   */
  generatedAt: Date;

  /**
   * File size in bytes
   * Only present if file was generated (not cached)
   */
  fileSize?: number;

  /**
   * Generation time in milliseconds
   * Only present if file was generated (not cached)
   */
  generationTime?: number;

  /**
   * Optional metadata from DocumentGeneratorOptions
   * Included for tracking purposes
   */
  metadata?: any;
}
