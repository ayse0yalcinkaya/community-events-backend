// Libraries
import { BadRequestException, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';

import { ConfigService } from '@nestjs/config';
import { I18nService } from 'nestjs-i18n';
import sgMail from '@sendgrid/mail';

// Interfaces
import { EmailResult, IEmailProvider } from '../interfaces/mail-provider.interface';

/**
 * SendGrid Email Provider
 * Implements IEmailProvider interface for SendGrid email sending
 */
@Injectable()
export class SendGridProvider implements IEmailProvider {
  private readonly logger = new Logger(SendGridProvider.name);
  private readonly apiKey: string;
  private readonly mailFrom: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly i18n: I18nService,
  ) {
    // Load SendGrid configuration from environment variables
    this.apiKey = this.configService.get<string>('SENDGRID_API_KEY') || '';
    this.mailFrom = this.configService.get<string>('MAIL_FROM') || 'noreply@example.com';

    // Validate required configuration
    if (!this.apiKey) {
      this.logger.error('SENDGRID_API_KEY is missing');
      throw new Error(this.i18n.t('errors.SENDGRID_CONFIG_MISSING'));
    }

    // Configure SendGrid SDK with API key
    sgMail.setApiKey(this.apiKey);

    this.logger.log('SendGridProvider initialized');
  }

  /**
   * Send an email via SendGrid
   * @param to - Recipient email address
   * @param subject - Email subject
   * @param html - HTML email content
   * @param text - Optional plain text email content
   * @returns Promise resolving to EmailResult with messageId and success status
   * @throws BadRequestException on invalid API key or request
   * @throws ServiceUnavailableException on network failures
   */
  async send(to: string, subject: string, html: string, text?: string): Promise<EmailResult> {
    try {
      this.logger.debug(`Sending email to ${to} (subject: ${subject})`);

      // Build SendGrid email message
      const msg = {
        to,
        from: this.mailFrom,
        subject,
        html,
        text: text || html.replace(/<[^>]*>/g, ''), // Fallback to plain text from HTML if text not provided
      };

      // Send email via SendGrid SDK
      const [response] = await sgMail.send(msg);

      // Extract message ID from SendGrid response
      // SendGrid response.headers['x-message-id'] contains the message ID
      const messageId = response.headers['x-message-id'] || response.headers['X-Message-Id'] || '';

      if (!messageId) {
        this.logger.warn('SendGrid response missing message ID', response.headers);
        // Still return success if email was sent (statusCode 202)
        if (response.statusCode === 202) {
          return {
            messageId: 'unknown',
            success: true,
          };
        }
      }

      this.logger.log(`Email sent successfully via SendGrid (messageId: ${messageId})`);

      return {
        messageId,
        success: true,
      };
    } catch (error: any) {
      // Handle SendGrid API errors
      if (error.response) {
        const { statusCode, body } = error.response;

        // Handle invalid API key (401 Unauthorized)
        if (statusCode === 401) {
          this.logger.error('SendGrid API authentication failed', {
            status: statusCode,
            body,
          });
          throw new BadRequestException(this.i18n.t('errors.SENDGRID_AUTH_FAILED'));
        }

        // Handle bad request (400 Bad Request)
        if (statusCode === 400) {
          this.logger.error('SendGrid API bad request', {
            status: statusCode,
            body,
          });
          throw new BadRequestException(this.i18n.t('errors.SENDGRID_BAD_REQUEST'));
        }

        // Handle other HTTP errors
        this.logger.error('SendGrid API error', {
          status: statusCode,
          body,
        });
        const errorMessage = this.i18n.t('errors.SENDGRID_API_ERROR_WITH_STATUS', {
          args: {
            status: statusCode,
            statusText: error.response.statusText || 'Unknown',
          },
        });
        throw new ServiceUnavailableException(errorMessage);
      }

      // Handle network failures
      if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        this.logger.error('SendGrid API network error', {
          message: error.message,
          code: error.code,
        });
        throw new ServiceUnavailableException(this.i18n.t('errors.SENDGRID_NETWORK_ERROR'));
      }

      // Handle other errors
      this.logger.error('Unexpected error in SendGridProvider.send', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw new ServiceUnavailableException(this.i18n.t('errors.EMAIL_SEND_FAILED'));
    }
  }
}
