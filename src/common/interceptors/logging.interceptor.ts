// NestJS imports
// Libraries
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';

// Third-party imports
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { v4 as uuidv4 } from 'uuid';

// Local imports
import { LoggerService } from '../logger/logger.service';

/**
 * AC-7.4.1: LoggingInterceptor - Global interceptor for request/response logging
 * Implements NestJS NestInterceptor interface to intercept HTTP requests and responses
 *
 * AC-7.4.2: Logs each request with: method, URL, user agent, request ID, timestamp
 * AC-7.4.3: Logs each response with: status code, duration (ms), timestamp
 * AC-7.4.5: X-Request-ID header support (generate or propagate)
 * AC-7.4.6: Request ID included in all log entries for correlation
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: LoggerService) {}

  /**
   * Intercept HTTP request/response lifecycle
   * Logs request start and response completion with duration calculation
   *
   * @param context - ExecutionContext providing access to request/response objects
   * @param next - CallHandler to continue request processing
   * @returns Observable stream of response
   */
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    // Extract HTTP context
    const ctx = context.switchToHttp();
    const request = ctx.getRequest();
    const response = ctx.getResponse();

    // AC-7.4.5: Generate or propagate X-Request-ID
    const requestId = request.headers['x-request-id'] || uuidv4();
    request.requestId = requestId; // Store in request for access throughout lifecycle
    response.setHeader('X-Request-ID', requestId); // Add to response headers

    // AC-7.4.2: Extract request details
    const { method, url, headers } = request;
    const userAgent = headers['user-agent'] || 'Unknown';

    // Record start time using high-precision timer (sub-millisecond accuracy)
    const startTime = process.hrtime.bigint();

    // AC-7.4.2: Log incoming request with all required fields
    this.logger.log('Incoming request', {
      module: 'LoggingInterceptor',
      method,
      url,
      userAgent,
      requestId,
      timestamp: new Date().toISOString(),
    });

    // Intercept response using RxJS tap and catchError operators
    return next.handle().pipe(
      tap(() => {
        // Calculate duration in milliseconds (high precision)
        const endTime = process.hrtime.bigint();
        const durationNs = Number(endTime - startTime);
        const durationMs = durationNs / 1_000_000; // Convert nanoseconds to milliseconds

        // AC-7.4.3: Extract response status code
        const statusCode = response.statusCode;

        // AC-7.4.3: Determine log level based on status code
        const logFunction = this.getLogLevel(statusCode);

        // AC-7.4.3, AC-7.4.6: Log outgoing response with status, duration, request ID
        logFunction('Outgoing response', {
          module: 'LoggingInterceptor',
          method,
          url,
          statusCode,
          duration: Math.round(durationMs * 100) / 100, // Round to 2 decimal places
          requestId,
          timestamp: new Date().toISOString(),
        });
      }),
      catchError((error) => {
        // Calculate duration even for errors
        const endTime = process.hrtime.bigint();
        const durationNs = Number(endTime - startTime);
        const durationMs = durationNs / 1_000_000;

        // Extract status code from error (HttpException or generic error)
        const statusCode = error.status || error.statusCode || 500;

        // Determine log level based on status code
        const logFunction = this.getLogLevel(statusCode);

        // Log error response
        logFunction('Outgoing response', {
          module: 'LoggingInterceptor',
          method,
          url,
          statusCode,
          duration: Math.round(durationMs * 100) / 100,
          requestId,
          timestamp: new Date().toISOString(),
        });

        // Re-throw the error to propagate it
        return throwError(() => error);
      }),
    );
  }

  /**
   * AC-7.4.3: Determine log level based on HTTP status code
   * - 2xx, 3xx: info (successful responses)
   * - 4xx: warn (client errors)
   * - 5xx: error (server errors)
   *
   * @param statusCode - HTTP status code
   * @returns Log level function from LoggerService
   */
  private getLogLevel(statusCode: number): (message: string, context?: any) => void {
    if (statusCode >= 500) return this.logger.error.bind(this.logger); // Server errors
    if (statusCode >= 400) return this.logger.warn.bind(this.logger); // Client errors
    return this.logger.log.bind(this.logger); // Success (2xx, 3xx)
  }
}
