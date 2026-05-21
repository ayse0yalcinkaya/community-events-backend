// Libraries
import { Injectable } from '@nestjs/common';

// Interfaces
import { RetryOptions } from './interfaces/retry-options.interface';

// Services
import { LoggerService } from '../logger/logger.service';

/**
 * AC-6.5.2.1: RetryService - Exponential Backoff Retry Service
 *
 * Provides generic retry mechanism with exponential backoff for async operations.
 * Handles transient failures automatically with configurable retry attempts and delays.
 *
 * Features:
 * - Generic type support for any Promise return type
 * - Configurable max attempts (default: 3)
 * - Configurable base delay (default: 1000ms)
 * - Exponential backoff: 2^(attempt-1) * baseDelay
 * - Logging integration with context strings
 * - Optional retry callback for custom handling
 *
 * @example
 * ```typescript
 * const result = await retryService.executeWithRetry(
 *   () => s3Service.upload(file),
 *   { context: 'S3 upload: invoice-001.pdf', maxAttempts: 5 }
 * );
 * ```
 */
@Injectable()
export class RetryService {
  /**
   * AC-6.5.2.1: Default max attempts constant
   * Default maximum number of retry attempts: 3
   */
  private readonly DEFAULT_MAX_ATTEMPTS = 3;

  /**
   * AC-6.5.2.1: Default base delay constant
   * Default base delay for exponential backoff: 1000ms (1 second)
   */
  private readonly DEFAULT_BASE_DELAY = 1000;

  constructor(private readonly logger: LoggerService) {}

  /**
   * AC-6.5.2.2: Execute operation with retry logic
   *
   * Executes an async operation with exponential backoff retry mechanism.
   * First attempt executes immediately, subsequent attempts wait with exponential delay.
   *
   * Retry Logic:
   * - Attempt 1: Execute immediately (no delay)
   * - Attempt 2: Wait baseDelay (2^0 * baseDelay), retry
   * - Attempt 3: Wait 2*baseDelay (2^1 * baseDelay), retry
   * - Success → Return result
   * - All attempts fail → Throw last error
   *
   * @param operation - Async operation to execute (returns Promise<T>)
   * @param options - Optional retry configuration
   * @returns Promise resolving to operation result
   * @throws Error if all retry attempts fail (throws last error)
   *
   * @example
   * ```typescript
   * // Simple usage with defaults
   * const result = await retryService.executeWithRetry(() => apiCall());
   *
   * // Custom configuration
   * const result = await retryService.executeWithRetry(
   *   () => s3Service.upload(file),
   *   {
   *     maxAttempts: 5,
   *     baseDelay: 2000,
   *     context: 'S3 upload: invoice-001.pdf',
   *     onRetry: (attempt, error) => console.log(`Retry ${attempt}`)
   *   }
   * );
   * ```
   */
  async executeWithRetry<T>(operation: () => Promise<T>, options?: RetryOptions): Promise<T> {
    const maxAttempts = options?.maxAttempts ?? this.DEFAULT_MAX_ATTEMPTS;
    const baseDelay = options?.baseDelay ?? this.DEFAULT_BASE_DELAY;
    const context = options?.context ?? 'Retry operation';
    const onRetry = options?.onRetry;

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        // Log attempt
        this.logger.log(`[${context}] Attempt ${attempt}/${maxAttempts}`, {
          module: RetryService.name,
          method: 'executeWithRetry',
          attempt,
          maxAttempts,
          context,
        });

        // Execute operation
        const result = await operation();

        // Success on retry (not first attempt)
        if (attempt > 1) {
          this.logger.log(`[${context}] Succeeded on attempt ${attempt}/${maxAttempts}`, {
            module: RetryService.name,
            method: 'executeWithRetry',
            attempt,
            maxAttempts,
            context,
          });
        }

        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // If this is the last attempt, throw error
        if (attempt === maxAttempts) {
          this.logger.error(`[${context}] All ${maxAttempts} attempts failed`, lastError.stack, {
            module: RetryService.name,
            method: 'executeWithRetry',
            attempt,
            maxAttempts,
            context,
            error: lastError.message,
          });
          throw lastError;
        }

        // Calculate delay for next attempt
        const delay = this.calculateDelay(attempt + 1, baseDelay);

        // Log retry delay
        this.logger.log(`[${context}] Waiting ${delay}ms before retry attempt ${attempt + 1}`, {
          module: RetryService.name,
          method: 'executeWithRetry',
          attempt,
          nextAttempt: attempt + 1,
          delay,
          context,
          error: lastError.message,
        });

        // Invoke optional callback
        if (onRetry) {
          try {
            onRetry(attempt, lastError);
          } catch (callbackError) {
            // Log callback error but don't fail retry
            this.logger.warn(
              `[${context}] onRetry callback threw error: ${callbackError instanceof Error ? callbackError.message : String(callbackError)}`,
              {
                module: RetryService.name,
                method: 'executeWithRetry',
                attempt,
                context,
              },
            );
          }
        }

        // Wait before retry (exponential backoff)
        await this.sleep(delay);
      }
    }

    // This should never be reached, but TypeScript requires it
    throw lastError || new Error('Retry execution failed');
  }

  /**
   * AC-6.5.2.3: Calculate exponential backoff delay
   *
   * Formula: delay = 2^(attempt-2) * baseDelay
   * Delay sequence: 0ms → baseDelay → 2*baseDelay → 4*baseDelay...
   *
   * @param attempt - Current attempt number (1-indexed)
   * @param baseDelay - Base delay in milliseconds
   * @returns Delay in milliseconds (0 for first attempt, exponential for subsequent)
   *
   * @example
   * ```typescript
   * calculateDelay(1, 1000) // 0ms (first attempt, no delay)
   * calculateDelay(2, 1000) // 1000ms (2^0 * 1000)
   * calculateDelay(3, 1000) // 2000ms (2^1 * 1000)
   * calculateDelay(4, 1000) // 4000ms (2^2 * 1000)
   * ```
   */
  private calculateDelay(attempt: number, baseDelay: number): number {
    // First attempt: no delay (immediate execution)
    if (attempt === 1) {
      return 0;
    }

    // Subsequent attempts: exponential backoff
    // Formula: 2^(attempt-2) * baseDelay
    // attempt=2: 2^0 * baseDelay = 1 * baseDelay = baseDelay
    // attempt=3: 2^1 * baseDelay = 2 * baseDelay = 2*baseDelay
    // attempt=4: 2^2 * baseDelay = 4 * baseDelay = 4*baseDelay
    return Math.pow(2, attempt - 2) * baseDelay;
  }

  /**
   * Sleep utility for delay
   *
   * @param ms - Milliseconds to sleep
   * @returns Promise that resolves after delay
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
