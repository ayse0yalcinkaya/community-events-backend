// NestJS imports
// Libraries
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';

// Third-party imports
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

// Local imports
import { I18nService } from 'nestjs-i18n';

/**
 * TransformResponseInterceptor - Global interceptor for standardizing API responses
 *
 * Transforms all successful controller responses to a consistent format:
 * - Single object: { success: true, status: 200, data: object, message: string }
 * - Array: { success: true, status: 200, data: array, message: string }
 * - Paginated: { success: true, status: 200, data: array, count: number, message: string }
 *
 * Pagination input patterns supported:
 * - { items: [], count: number } or { items: [], meta: object }
 * - { data: [], count: number } (CLAUDE.md standard)
 *
 * Error responses are NOT transformed (handled by exception filters)
 *
 * @see AC-8.5-2.4 - Standard response format
 * @see AC-8.5-2.7 - i18n integration
 * @see AC-8.5-2.8 - Exception filter compatibility
 * @see AC-8.5-2.9 - Automatic response type detection
 */
@Injectable()
export class TransformResponseInterceptor implements NestInterceptor {
  constructor(private readonly i18nService: I18nService) {}

  /**
   * Intercept HTTP response and transform to standard format
   *
   * @param context - ExecutionContext providing access to request/response objects
   * @param next - CallHandler to continue request processing
   * @returns Observable stream of transformed response
   */
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const response = ctx.getResponse();

    return next.handle().pipe(
      map((data) => {
        // Extract status code from response
        const statusCode = response.statusCode;

        // Detect response type and transform accordingly
        return this.transformResponse(data, statusCode);
      }),
    );
  }

  /**
   * Transform response based on data structure
   *
   * Detection patterns:
   * 1. Paginated: { items: [], count/meta } or { data: [], count }
   * 2. Array: data is Array
   * 3. Single object: data is object or primitive
   *
   * @param data - Controller response data
   * @param statusCode - HTTP status code
   * @returns Transformed response in standard format
   */
  private transformResponse(data: any, statusCode: number): any {
    // Handle null/undefined data
    if (data === null || data === undefined) {
      return {
        success: true,
        status: statusCode,
        data: null,
        message: this.getDefaultMessage(statusCode),
      };
    }

    // Detect paginated response pattern: { items: [], meta/count } or { data: [], count }
    if (this.isPaginatedResponse(data)) {
      // Extract array from either 'items' or 'data' property
      const paginatedData = data.items ?? data.data;

      const response: any = {
        success: true,
        status: statusCode,
        data: paginatedData,
        message: this.getDefaultMessage(statusCode),
      };

      // Include meta if present, otherwise fall back to count
      if (data.meta) {
        response.meta = data.meta;
      } else if (data.count !== undefined) {
        response.count = data.count;
      }

      return response;
    }

    // Detect array response
    if (Array.isArray(data)) {
      return {
        success: true,
        status: statusCode,
        data,
        message: this.getDefaultMessage(statusCode),
      };
    }

    // Detect if data is already wrapped (manual wrapping from controller)
    // If so, preserve custom message but ensure standard format
    if (this.isAlreadyWrapped(data)) {
      return {
        success: data.success !== false,
        status: data.status || statusCode,
        data: data.data,
        count: data.count,
        message: data.message || this.getDefaultMessage(statusCode),
      };
    }

    // Single object response (default)
    // Check if the data object has a custom message
    const message =
      data && typeof data === 'object' && data.message ? data.message : this.getDefaultMessage(statusCode);

    return {
      success: true,
      status: statusCode,
      data,
      message,
    };
  }

  /**
   * Check if response is paginated
   * Supports two patterns:
   * - { items: [], count: number } or { items: [], meta: object }
   * - { data: [], count: number } (CLAUDE.md standard pattern)
   *
   * @param data - Response data
   * @returns True if data matches paginated pattern
   */
  private isPaginatedResponse(data: any): boolean {
    if (!data || typeof data !== 'object') return false;

    const hasCount = 'count' in data && typeof data.count === 'number';
    const hasMeta = 'meta' in data && typeof data.meta === 'object';

    // Pattern 1: { items: [], count/meta }
    if ('items' in data && Array.isArray(data.items) && (hasCount || hasMeta)) {
      return true;
    }

    // Pattern 2: { data: [], count } - CLAUDE.md standard
    if ('data' in data && Array.isArray(data.data) && hasCount) {
      return true;
    }

    return false;
  }

  /**
   * Check if response is already wrapped in standard format
   * (For backwards compatibility with controllers that manually wrap)
   *
   * @param data - Response data
   * @returns True if data has success/status/data structure
   */
  private isAlreadyWrapped(data: any): boolean {
    return data && typeof data === 'object' && 'success' in data && 'data' in data;
  }

  /**
   * Get default success message based on HTTP status code
   * Uses i18n service for translation
   *
   * @param statusCode - HTTP status code
   * @returns Translated default message
   */
  private getDefaultMessage(statusCode: number): string {
    const messageKey = this.getMessageKey(statusCode);
    return this.i18nService.t(messageKey);
  }

  /**
   * Map HTTP status code to i18n message key
   *
   * @param statusCode - HTTP status code
   * @returns i18n message key
   */
  private getMessageKey(statusCode: number): string {
    switch (statusCode) {
      case 201:
        return 'success.CREATED';
      case 204:
        return 'success.NO_CONTENT';
      case 200:
      default:
        return 'success.OPERATION_SUCCESSFUL';
    }
  }
}
