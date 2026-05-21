// Libraries
import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { createMockI18nService } from '../../../../../test/utils/mockI18nService';
import { SendGridProvider } from '../../providers/sendgrid.provider';
import sgMail from '@sendgrid/mail';
import { I18nService } from 'nestjs-i18n';

// Mock SendGrid SDK
jest.mock('@sendgrid/mail', () => ({
  setApiKey: jest.fn(),
  send: jest.fn(),
}));

describe('SendGridProvider', () => {
  let provider: SendGridProvider;
  let configService: jest.Mocked<ConfigService>;
  let i18nService: any;

  const mockApiKey = 'SG.test-api-key-123';
  const mockMailFrom = 'test@example.com';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SendGridProvider,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'SENDGRID_API_KEY') return mockApiKey;
              if (key === 'MAIL_FROM') return mockMailFrom;
              return null;
            }),
          },
        },
        {
          provide: I18nService,
          useValue: createMockI18nService(),
        },
      ],
    }).compile();

    provider = module.get<SendGridProvider>(SendGridProvider);
    configService = module.get(ConfigService);
    i18nService = module.get(I18nService);

    jest.clearAllMocks();
  });

  describe('send', () => {
    const to = 'recipient@example.com';
    const subject = 'Test Email';
    const html = '<h1>Test HTML</h1>';
    const text = 'Test Text';

    it('should send email successfully and return EmailResult with messageId', async () => {
      // Arrange
      const mockMessageId = 'test-message-id-123';
      const mockResponse = [
        {
          statusCode: 202,
          headers: {
            'x-message-id': mockMessageId,
          },
        },
      ];

      (sgMail.send as jest.Mock).mockResolvedValue(mockResponse);

      // Act
      const result = await provider.send(to, subject, html, text);

      // Assert
      expect(result).toEqual({
        messageId: mockMessageId,
        success: true,
      });
      expect(sgMail.send).toHaveBeenCalledWith({
        to,
        from: mockMailFrom,
        subject,
        html,
        text,
      });
    });

    it('should generate plain text from HTML if text not provided', async () => {
      // Arrange
      const mockMessageId = 'test-message-id-456';
      const mockResponse = [
        {
          statusCode: 202,
          headers: {
            'x-message-id': mockMessageId,
          },
        },
      ];

      (sgMail.send as jest.Mock).mockResolvedValue(mockResponse);

      // Act
      const result = await provider.send(to, subject, html);

      // Assert
      expect(result.success).toBe(true);
      expect(sgMail.send).toHaveBeenCalledWith({
        to,
        from: mockMailFrom,
        subject,
        html,
        text: expect.stringContaining('Test HTML'), // Plain text extracted from HTML
      });
    });

    it('should handle invalid API key (401) and throw BadRequestException', async () => {
      // Arrange
      const error: any = {
        response: {
          statusCode: 401,
          statusText: 'Unauthorized',
          body: { errors: [{ message: 'Invalid API key' }] },
        },
      };

      (sgMail.send as jest.Mock).mockRejectedValue(error);

      // Act & Assert
      await expect(provider.send(to, subject, html)).rejects.toThrow(BadRequestException);
    });

    it('should handle bad request (400) and throw BadRequestException', async () => {
      // Arrange
      const error: any = {
        response: {
          statusCode: 400,
          statusText: 'Bad Request',
          body: { errors: [{ message: 'Invalid email address' }] },
        },
      };

      (sgMail.send as jest.Mock).mockRejectedValue(error);

      // Act & Assert
      await expect(provider.send(to, subject, html)).rejects.toThrow(BadRequestException);
    });

    it('should handle network failures and throw ServiceUnavailableException', async () => {
      // Arrange
      const error: any = {
        code: 'ENOTFOUND',
        message: 'Network error',
      };

      (sgMail.send as jest.Mock).mockRejectedValue(error);

      // Act & Assert
      await expect(provider.send(to, subject, html)).rejects.toThrow(ServiceUnavailableException);
    });

    it('should handle other HTTP errors and throw ServiceUnavailableException', async () => {
      // Arrange
      const error: any = {
        response: {
          statusCode: 500,
          statusText: 'Internal Server Error',
          body: { errors: [{ message: 'Server error' }] },
        },
      };

      (sgMail.send as jest.Mock).mockRejectedValue(error);

      // Act & Assert
      await expect(provider.send(to, subject, html)).rejects.toThrow(ServiceUnavailableException);
    });

    it('should handle missing messageId in response but still return success if statusCode is 202', async () => {
      // Arrange
      const mockResponse = [
        {
          statusCode: 202,
          headers: {},
        },
      ];

      (sgMail.send as jest.Mock).mockResolvedValue(mockResponse);

      // Act
      const result = await provider.send(to, subject, html);

      // Assert
      expect(result).toEqual({
        messageId: 'unknown',
        success: true,
      });
    });

    it('should handle unexpected errors and throw ServiceUnavailableException', async () => {
      // Arrange
      const error = new Error('Unexpected error');

      (sgMail.send as jest.Mock).mockRejectedValue(error);

      // Act & Assert
      await expect(provider.send(to, subject, html)).rejects.toThrow(ServiceUnavailableException);
    });
  });

  describe('constructor', () => {
    it('should throw error if SENDGRID_API_KEY is missing', async () => {
      // Arrange
      let errorThrown = false;

      try {
        // Act
        await Test.createTestingModule({
          providers: [
            SendGridProvider,
            {
              provide: ConfigService,
              useValue: {
                get: jest.fn((key: string) => {
                  if (key === 'MAIL_FROM') return mockMailFrom;
                  return null; // SENDGRID_API_KEY is missing
                }),
              },
            },
            {
              provide: I18nService,
              useValue: createMockI18nService(),
            },
          ],
        }).compile();
      } catch (error) {
        // Assert
        errorThrown = true;
        expect(error).toBeDefined();
      }

      expect(errorThrown).toBe(true);
    });
  });
});
