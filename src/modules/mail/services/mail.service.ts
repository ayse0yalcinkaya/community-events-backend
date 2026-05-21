// Libraries
import { BadRequestException, Injectable, Inject, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { I18nService } from 'nestjs-i18n';

// Interfaces
import type { EmailResult, IEmailProvider } from '../interfaces/mail-provider.interface';

// Services
import { RetryService } from '@/common/services/retry.service';
import { TemplateService } from './template.service';

/**
 * Mail Service
 * Provider-agnostic email service that delegates to IEmailProvider interface
 *
 * This service abstracts away provider-specific details and provides
 * a consistent interface for email sending across the application.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly mailRetryMaxAttempts: number;
  private readonly mailRetryBaseDelay: number;

  constructor(
    @Inject('IEmailProvider')
    private readonly emailProvider: IEmailProvider,
    private readonly i18n: I18nService,
    private readonly templateService: TemplateService,
    private readonly retryService: RetryService,
    private readonly configService: ConfigService,
  ) {
    // AC-6.5.5.9: Load retry configuration from environment
    this.mailRetryMaxAttempts = this.configService.get<number>('MAIL_RETRY_MAX_ATTEMPTS', 5);
    this.mailRetryBaseDelay = this.configService.get<number>('MAIL_RETRY_BASE_DELAY', 2000);
  }

  /**
   * Send an email via the configured email provider
   * AC-6.5.5.2: Integrated with RetryService for automatic retry on transient failures
   * @param to - Recipient email address
   * @param subject - Email subject
   * @param html - HTML email content
   * @param text - Optional plain text email content (fallback for non-HTML clients)
   * @returns Promise resolving to void on success
   * @throws BadRequestException on provider failures or retry exhaustion
   */
  async sendEmail(to: string, subject: string, html: string, text?: string): Promise<void> {
    try {
      this.logger.debug(`Sending email to ${to} (subject: ${subject})`);

      // AC-6.5.5.2: Wrap email provider send with RetryService
      const result: EmailResult = await this.retryService.executeWithRetry(
        async () => await this.emailProvider.send(to, subject, html, text),
        {
          maxAttempts: this.mailRetryMaxAttempts,
          baseDelay: this.mailRetryBaseDelay,
          context: `Email Send: ${to} - ${subject}`,
        },
      );

      if (!result.success) {
        this.logger.error(`Email sending failed (messageId: ${result.messageId})`);
        throw new BadRequestException(this.i18n.t('errors.EMAIL_SEND_FAILED'));
      }

      this.logger.log(`Email sent successfully (messageId: ${result.messageId})`);
    } catch (error) {
      // AC-6.5.5.7: Error handling with retry exhaustion
      // Log error for debugging
      this.logger.error(`Email sending failed: ${error instanceof Error ? error.message : String(error)}`, {
        to,
        subject,
        error: error instanceof Error ? error.stack : undefined,
      });

      // Re-throw BadRequestException as-is (from provider or validation)
      if (error instanceof BadRequestException) {
        throw error;
      }

      // Wrap RetryService errors (retry exhaustion) in BadRequestException with i18n message
      throw new BadRequestException(this.i18n.t('errors.EMAIL_SEND_FAILED'));
    }
  }

  /**
   * Send an email using a Handlebars template
   * AC-6.5.5.3: Template rendering + email send wrapped together in retry
   * @param to - Recipient email address
   * @param subject - Email subject
   * @param templateName - Name of the template file (without .hbs extension)
   * @param data - Data object to pass to template (e.g., { firstName: 'John', verificationLink: '...' })
   * @returns Promise resolving to void on success
   * @throws BadRequestException on template rendering, email sending failures, or retry exhaustion
   */
  async sendTemplateEmail(to: string, subject: string, templateName: string, data: object): Promise<void> {
    try {
      this.logger.debug(`Rendering template email: ${templateName} to ${to} (subject: ${subject})`);

      // AC-6.5.5.3: Wrap template rendering + email send together in retry
      await this.retryService.executeWithRetry(
        async () => {
          // Render template to HTML
          const html = await this.templateService.render(templateName, data);

          // Send email with rendered HTML content
          const result: EmailResult = await this.emailProvider.send(to, subject, html);

          if (!result.success) {
            this.logger.error(`Template email sending failed (messageId: ${result.messageId})`);
            throw new BadRequestException(this.i18n.t('errors.EMAIL_SEND_FAILED'));
          }

          this.logger.log(`Template email sent successfully (messageId: ${result.messageId})`);

          return result;
        },
        {
          maxAttempts: this.mailRetryMaxAttempts,
          baseDelay: this.mailRetryBaseDelay,
          context: `Template Email: ${templateName} to ${to}`,
        },
      );
    } catch (error) {
      // AC-6.5.5.7: Error handling with retry exhaustion
      // Log error for debugging
      this.logger.error(`Template email sending failed: ${error instanceof Error ? error.message : String(error)}`, {
        to,
        subject,
        templateName,
        error: error instanceof Error ? error.stack : undefined,
      });

      // Re-throw BadRequestException or NotFoundException as-is
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }

      // Wrap RetryService errors (retry exhaustion) in BadRequestException with i18n message
      throw new BadRequestException(this.i18n.t('errors.EMAIL_SEND_FAILED'));
    }
  }
}
