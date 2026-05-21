// NestJS imports
// Libraries
import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
// Third-party imports
import * as Sentry from '@sentry/node';
import { Request, Response } from 'express';
import { I18nService } from 'nestjs-i18n';

/**
 * Global exception filter that captures all unhandled exceptions
 * and sends them to Sentry with enriched context (user, request details)
 *
 * Execution order: Guards → Interceptors → Controller → Filters (on error)
 * This filter runs AFTER LoggingInterceptor, so requests are already logged
 */
@Catch()
export class SentryExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(SentryExceptionFilter.name);

  constructor(private readonly i18n: I18nService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    // Extract status code
    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    // Extract normalized error response/message
    const rawErrorResponse = exception instanceof HttpException ? exception.getResponse() : 'Internal server error';
    const normalizedErrorResponse =
      typeof rawErrorResponse === 'string' ? { message: rawErrorResponse } : (rawErrorResponse as Record<string, any>);
    const message =
      normalizedErrorResponse?.message ||
      (exception instanceof HttpException ? exception.message : 'Internal server error');

    // Log error with stack trace
    this.logger.error(
      `Exception caught: ${message} (Status: ${status}, Method: ${request.method}, URL: ${request.url})`,
      exception instanceof Error ? exception.stack : undefined,
    );

    // Set user context if authenticated (from JWT guard)
    const user = (request as any).user;
    if (user) {
      Sentry.setUser({
        id: user.userId || user.id || user.sub,
      });
    }

    // Set request context for error reproduction and capture exception
    // Wrap in try-catch to handle test environment where Sentry may not be initialized
    try {
      if (typeof Sentry.withScope === 'function') {
        Sentry.withScope((scope) => {
          scope.setContext('request', {
            method: request.method,
            url: request.url,
            headers: {
              'user-agent': request.headers['user-agent'],
              'x-request-id': (request as any).requestId,
            },
            query: request.query,
          });

          // Add request ID as tag for correlation with logs
          if ((request as any).requestId) {
            scope.setTag('requestId', (request as any).requestId);
          }

          // Capture exception in Sentry (async, non-blocking)
          Sentry.captureException(exception);
        });
      } else {
        // Fallback for test environment or when Sentry is not initialized
        Sentry.captureException(exception);
      }
    } catch (error) {
      // Silently fail in test environment - don't let Sentry errors break the app
      this.logger.warn('Failed to capture exception in Sentry:', error);
    }

    // AC-8.5-2.4: Send formatted HTTP error response in standard format
    // Format: { success: false, status: number, message: string, errors?: array }
    const errorResponse: any = {
      success: false,
      status,
      message,
    };

    // Add validation errors array if present (from class-validator)
    if (normalizedErrorResponse?.errors || Array.isArray(normalizedErrorResponse?.message)) {
      errorResponse.errors = Array.isArray(normalizedErrorResponse.message)
        ? normalizedErrorResponse.message
        : normalizedErrorResponse.errors;
    }

    // Add metadata for debugging (not part of standard format, but useful)
    errorResponse.timestamp = new Date().toISOString();
    errorResponse.requestId = (request as any).requestId;

    response.status(status).json(errorResponse);
  }
}
