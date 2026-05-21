// Libraries
import { ArgumentsHost, Logger } from '@nestjs/common';
import { Request } from 'express';
import {
  I18nValidationException,
  I18nValidationExceptionFilter as BaseI18nValidationExceptionFilter,
} from 'nestjs-i18n';
import { I18nValidationError } from 'nestjs-i18n/dist/interfaces';
import { I18nService } from 'nestjs-i18n';

/**
 * Custom exception filter for i18n validation errors.
 * Extends the built-in nestjs-i18n filter to provide project-standard response format.
 *
 * Features:
 * - Translates property names using properties.json (e.g., "description" → "Açıklama")
 * - Maintains flat string array format for errors
 * - Follows project response standard: { success, status, message, errors, timestamp, requestId }
 *
 * Language detection is handled by nestjs-i18n resolvers:
 * 1. ?lang=tr query parameter
 * 2. Accept-Language header
 * 3. Default fallback language
 */
export class I18nValidationExceptionFilter extends BaseI18nValidationExceptionFilter {
  private readonly logger = new Logger(I18nValidationExceptionFilter.name);

  constructor(private readonly i18nService: I18nService) {
    super({
      // Keep detailed errors to access property names for translation
      detailedErrors: true,
      // Custom response body formatter for project standard format
      responseBodyFormatter: (
        host: ArgumentsHost,
        exc: I18nValidationException,
        formattedErrors: string[] | I18nValidationError[] | object,
      ) => {
        const ctx = host.switchToHttp();
        const request = ctx.getRequest<Request>();
        const lang = (request as any).i18nLang || 'en';

        // Translate property names and flatten to string array
        const errors = this.translateAndFlattenErrors(formattedErrors as I18nValidationError[], lang);

        // Log validation error
        this.logger.warn(`Validation failed: ${errors.join(', ')} (Method: ${request.method}, URL: ${request.url})`);

        return {
          success: false,
          status: exc.getStatus(),
          message: this.i18nService.t('validation.VALIDATION_FAILED', { lang }) || 'Validation failed',
          errors,
          timestamp: new Date().toISOString(),
          requestId: (request as any).requestId,
        };
      },
    });
  }

  /**
   * Translates property names and flattens validation errors into a string array.
   * Replaces raw property names (e.g., "description") with translated labels (e.g., "Açıklama").
   */
  private translateAndFlattenErrors(errors: I18nValidationError[], lang: string): string[] {
    const result: string[] = [];

    for (const error of errors) {
      // Translate property name using properties.json
      const translatedProperty = this.i18nService.t(`properties.${error.property}`, {
        lang,
        defaultValue: error.property, // Fallback to original if translation not found
      });

      // Process each constraint message
      if (error.constraints) {
        for (const message of Object.values(error.constraints)) {
          // Replace the property name at the beginning of the message with translated version
          // Pattern: "description en az 10 karakter..." → "Açıklama en az 10 karakter..."
          const translatedMessage = message.replace(
            new RegExp(`^${this.escapeRegExp(error.property)}\\b`, 'i'),
            translatedProperty,
          );
          result.push(translatedMessage);
        }
      }

      // Handle nested validation errors (e.g., nested DTOs)
      if (error.children && error.children.length > 0) {
        result.push(...this.translateAndFlattenErrors(error.children as I18nValidationError[], lang));
      }
    }

    return result;
  }

  /**
   * Escapes special regex characters in a string.
   */
  private escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
