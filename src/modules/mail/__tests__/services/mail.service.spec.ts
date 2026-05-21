// Libraries
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { createMockI18nService } from '../../../../../test/utils/mockI18nService';
import { I18nService } from 'nestjs-i18n';

// Interfaces
import type { EmailResult, IEmailProvider } from '../../interfaces/mail-provider.interface';

// Services
import { RetryService } from '@/common/services/retry.service';
import { MailService } from '../../services/mail.service';
import { TemplateService } from '../../services/template.service';

describe('MailService', () => {
  let service: MailService;
  let emailProvider: jest.Mocked<IEmailProvider>;
  let templateService: jest.Mocked<TemplateService>;
  let retryService: jest.Mocked<RetryService>;
  let configService: jest.Mocked<ConfigService>;
  let i18nService: any;

  const to = 'recipient@example.com';
  const subject = 'Test Email';
  const html = '<h1>Test HTML</h1>';
  const text = 'Test Text';

  beforeEach(async () => {
    const mockEmailProvider: jest.Mocked<IEmailProvider> = {
      send: jest.fn(),
    };

    const mockTemplateService: jest.Mocked<TemplateService> = {
      render: jest.fn(),
    } as any;

    const mockRetryService: jest.Mocked<RetryService> = {
      executeWithRetry: jest.fn(),
    } as any;

    const mockConfigService: jest.Mocked<ConfigService> = {
      get: jest.fn((key: string, defaultValue?: any) => {
        if (key === 'MAIL_RETRY_MAX_ATTEMPTS') return 5;
        if (key === 'MAIL_RETRY_BASE_DELAY') return 2000;
        return defaultValue;
      }),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MailService,
        {
          provide: 'IEmailProvider',
          useValue: mockEmailProvider,
        },
        {
          provide: TemplateService,
          useValue: mockTemplateService,
        },
        {
          provide: RetryService,
          useValue: mockRetryService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: I18nService,
          useValue: createMockI18nService(),
        },
      ],
    }).compile();

    service = module.get<MailService>(MailService);
    emailProvider = module.get('IEmailProvider');
    templateService = module.get(TemplateService);
    retryService = module.get(RetryService);
    configService = module.get(ConfigService);
    i18nService = module.get(I18nService);

    jest.clearAllMocks();
  });

  describe('sendEmail', () => {
    it('should delegate to RetryService.executeWithRetry() and return void on success', async () => {
      // Arrange
      const mockResult: EmailResult = {
        messageId: 'test-message-id-123',
        success: true,
      };

      retryService.executeWithRetry.mockImplementation(async (operation) => {
        return await operation();
      });
      emailProvider.send.mockResolvedValue(mockResult);

      // Act
      await service.sendEmail(to, subject, html, text);

      // Assert
      expect(retryService.executeWithRetry).toHaveBeenCalledWith(expect.any(Function), {
        maxAttempts: 5,
        baseDelay: 2000,
        context: `Email Send: ${to} - ${subject}`,
      });
      expect(emailProvider.send).toHaveBeenCalledWith(to, subject, html, text);
    });

    it('should throw BadRequestException if provider returns success: false', async () => {
      // Arrange
      const mockResult: EmailResult = {
        messageId: 'test-message-id-456',
        success: false,
      };

      retryService.executeWithRetry.mockImplementation(async (operation) => {
        return await operation();
      });
      emailProvider.send.mockResolvedValue(mockResult);

      // Act & Assert
      await expect(service.sendEmail(to, subject, html)).rejects.toThrow(BadRequestException);
    });

    it('should retry on network error and succeed on second attempt (AC-6.5.5.2)', async () => {
      // Arrange
      const mockResult: EmailResult = {
        messageId: 'test-message-id-retry',
        success: true,
      };

      let attemptCount = 0;
      emailProvider.send.mockImplementation(async () => {
        attemptCount++;
        if (attemptCount === 1) {
          throw new Error('Network timeout');
        }
        return mockResult;
      });

      retryService.executeWithRetry.mockImplementation(async (operation) => {
        // Simulate retry: first call fails, second succeeds
        try {
          return await operation();
        } catch (error) {
          // Retry
          return await operation();
        }
      });

      // Act
      await service.sendEmail(to, subject, html);

      // Assert
      expect(retryService.executeWithRetry).toHaveBeenCalled();
      expect(attemptCount).toBe(2);
    });

    it('should throw BadRequestException after retry exhaustion (AC-6.5.5.7)', async () => {
      // Arrange
      const retryError = new Error('Network timeout');
      retryService.executeWithRetry.mockRejectedValue(retryError);

      // Act & Assert
      await expect(service.sendEmail(to, subject, html)).rejects.toThrow(BadRequestException);
      expect(retryService.executeWithRetry).toHaveBeenCalled();
    });

    it('should wrap provider BadRequestException and re-throw it', async () => {
      // Arrange
      const providerError = new BadRequestException('Invalid email address');
      retryService.executeWithRetry.mockRejectedValue(providerError);

      // Act & Assert
      await expect(service.sendEmail(to, subject, html)).rejects.toThrow(BadRequestException);
      expect(retryService.executeWithRetry).toHaveBeenCalled();
    });
  });

  describe('sendTemplateEmail', () => {
    const templateName = 'verification';
    const templateData = {
      firstName: 'John',
      verificationLink: 'https://example.com/verify?token=abc123',
    };
    const renderedHtml = '<h1>Hello John</h1><a href="https://example.com/verify?token=abc123">Verify</a>';

    it('should wrap template rendering + email send together in retry (AC-6.5.5.3)', async () => {
      // Arrange
      const mockResult: EmailResult = {
        messageId: 'test-message-id-123',
        success: true,
      };

      retryService.executeWithRetry.mockImplementation(async (operation) => {
        return await operation();
      });
      templateService.render.mockResolvedValue(renderedHtml);
      emailProvider.send.mockResolvedValue(mockResult);

      // Act
      await service.sendTemplateEmail(to, subject, templateName, templateData);

      // Assert
      expect(retryService.executeWithRetry).toHaveBeenCalledWith(expect.any(Function), {
        maxAttempts: 5,
        baseDelay: 2000,
        context: `Template Email: ${templateName} to ${to}`,
      });
      expect(templateService.render).toHaveBeenCalledWith(templateName, templateData);
      expect(emailProvider.send).toHaveBeenCalledWith(to, subject, renderedHtml);
    });

    it('should retry template email on rendering + send failure (AC-6.5.5.3)', async () => {
      // Arrange
      const mockResult: EmailResult = {
        messageId: 'test-message-id-retry',
        success: true,
      };

      let attemptCount = 0;
      templateService.render.mockImplementation(async () => {
        attemptCount++;
        if (attemptCount === 1) {
          throw new Error('Template rendering failed');
        }
        return renderedHtml;
      });

      retryService.executeWithRetry.mockImplementation(async (operation) => {
        // Simulate retry: first call fails, second succeeds
        try {
          return await operation();
        } catch (error) {
          // Retry
          return await operation();
        }
      });

      emailProvider.send.mockResolvedValue(mockResult);

      // Act
      await service.sendTemplateEmail(to, subject, templateName, templateData);

      // Assert
      expect(retryService.executeWithRetry).toHaveBeenCalled();
      expect(attemptCount).toBe(2);
    });

    it('should throw BadRequestException after template email retry exhaustion (AC-6.5.5.3)', async () => {
      // Arrange
      const retryError = new Error('Template rendering failed');
      retryService.executeWithRetry.mockRejectedValue(retryError);

      // Act & Assert
      await expect(service.sendTemplateEmail(to, subject, templateName, templateData)).rejects.toThrow(
        BadRequestException,
      );
      expect(retryService.executeWithRetry).toHaveBeenCalled();
    });

    it('should wrap template rendering NotFoundException and re-throw it', async () => {
      // Arrange
      const templateError = new NotFoundException('Template not found');
      retryService.executeWithRetry.mockImplementation(async (operation) => {
        return await operation();
      });
      templateService.render.mockRejectedValue(templateError);

      // Act & Assert
      await expect(service.sendTemplateEmail(to, subject, templateName, templateData)).rejects.toThrow(
        NotFoundException,
      );
      expect(templateService.render).toHaveBeenCalled();
      expect(emailProvider.send).not.toHaveBeenCalled();
    });

    it('should wrap template rendering BadRequestException and re-throw it', async () => {
      // Arrange
      const templateError = new BadRequestException('Template compilation failed');
      retryService.executeWithRetry.mockImplementation(async (operation) => {
        return await operation();
      });
      templateService.render.mockRejectedValue(templateError);

      // Act & Assert
      await expect(service.sendTemplateEmail(to, subject, templateName, templateData)).rejects.toThrow(
        BadRequestException,
      );
      expect(templateService.render).toHaveBeenCalled();
      expect(emailProvider.send).not.toHaveBeenCalled();
    });
  });
});
