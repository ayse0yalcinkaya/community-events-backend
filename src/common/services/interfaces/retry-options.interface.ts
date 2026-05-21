/**
 * AC-6.5.2.2: RetryOptions Interface
 *
 * Configuration options for retry operations with exponential backoff.
 *
 * @example
 * ```typescript
 * const options: RetryOptions = {
 *   maxAttempts: 5,
 *   baseDelay: 2000,
 *   context: 'S3 upload: invoice-001.pdf',
 *   onRetry: (attempt, error) => console.log(`Retry attempt ${attempt}`)
 * };
 * ```
 */
export interface RetryOptions {
  /**
   * Maximum number of retry attempts (default: 3)
   */
  maxAttempts?: number;

  /**
   * Base delay in milliseconds for exponential backoff (default: 1000ms)
   * Formula: delay = 2^(attempt-1) * baseDelay
   */
  baseDelay?: number;

  /**
   * Context string for logging (e.g., 'S3 upload: invoice-001.pdf')
   * Used in log messages for debugging
   */
  context?: string;

  /**
   * Optional callback invoked before each retry attempt
   * @param attempt - Current attempt number (1-indexed)
   * @param error - Error that triggered the retry
   */
  onRetry?: (attempt: number, error: Error) => void;
}
