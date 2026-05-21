// Libraries
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { I18nService } from 'nestjs-i18n';
import { SendGridProvider } from './providers/sendgrid.provider';

// Interfaces
import { IEmailProvider } from './interfaces/mail-provider.interface';

// Services
import { MailService } from './services/mail.service';
import { TemplateService } from './services/template.service';

/**
 * Email Provider Factory
 * Creates email provider instance based on MAIL_PROVIDER environment variable
 * @param configService - ConfigService instance for environment variable access
 * @param i18nService - I18nService instance for error message translation
 * @returns IEmailProvider instance
 */
function provideEmailProvider(configService: ConfigService, i18nService: I18nService): IEmailProvider {
  const provider = configService.get<string>('MAIL_PROVIDER', 'sendgrid');

  switch (provider.toLowerCase()) {
    case 'sendgrid':
      return new SendGridProvider(configService, i18nService);
    default:
      throw new Error(`Unsupported mail provider: ${provider}`);
  }
}

/**
 * Mail Module
 * Provides email sending functionality via configurable email providers:
 * - Dynamic provider injection via MAIL_PROVIDER environment variable
 * - Provider-agnostic MailService for application use
 * - Easy provider switching (SendGrid → AWS SES in future)
 */
@Module({
  providers: [
    // Factory provider for dynamic email provider injection
    {
      provide: 'IEmailProvider',
      useFactory: (configService: ConfigService, i18nService: I18nService) => {
        return provideEmailProvider(configService, i18nService);
      },
      inject: [ConfigService, I18nService],
    },
    // TemplateService for template rendering
    TemplateService,
    // MailService depends on IEmailProvider and TemplateService
    MailService,
  ],
  exports: [MailService], // Export for use in Auth module (email verification, password reset)
})
export class MailModule {}
