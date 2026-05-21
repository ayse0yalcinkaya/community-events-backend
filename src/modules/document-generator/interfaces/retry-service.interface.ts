/**
 * Retry Options Interface
 */
export interface RetryOptions {
  /**
   * Maximum number of retry attempts (default: 3)
   */
  maxAttempts?: number;

  /**
   * Base delay for exponential backoff in milliseconds (default: 1000)
   */
  baseDelay?: number;

  /**
   * Context string for logging (e.g., 'PDF Generation: invoice')
   */
  context?: string;

  /**
   * Optional callback on retry
   */
  onRetry?: (attempt: number, error: any) => void;
}

/**
 * Retry Service Interface
 *
 * Interface for generic retry service with exponential backoff.
 * Implemented by RetryService (Story 6.5-2).
 */
export interface IRetryService {
  /**
   * Execute operation with retry logic
   *
   * @param operation - Async operation to execute
   * @param options - Optional retry configuration
   * @returns Promise resolving to operation result
   * @throws Error if all retry attempts fail
   */
  executeWithRetry<T>(operation: () => Promise<T>, options?: RetryOptions): Promise<T>;
}
