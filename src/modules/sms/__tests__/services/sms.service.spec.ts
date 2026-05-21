// Libraries
import { InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { createMockI18nService } from '../../../../../test/utils/mockI18nService';
import { createMockLogger } from '../../../../../test/utils/mockLogger';
import { I18nService } from 'nestjs-i18n';

// Enums
import { SmsStatus } from '../../enums/sms-status.enum';
import { SmsType } from '../../enums/sms-type.enum';

// Services
import { RetryService } from '@/common/services/retry.service';
import { PrismaService } from '../../../../database/prisma.service';
import { FonivaService } from '../../services/foniva.service';
import { SmsService } from '../../services/sms.service';

describe('SmsService', () => {
  let service: SmsService;
  let prismaService: {
    sMS: {
      create: jest.Mock;
      update: jest.Mock;
      findUnique: jest.Mock;
      findMany: jest.Mock;
    };
  };
  let fonivaService: jest.Mocked<FonivaService>;
  let retryService: jest.Mocked<RetryService>;
  let configService: jest.Mocked<ConfigService>;
  let i18nService: any;

  const mockDomainID = '00000000-0000-0000-0000-000000000001';
  const phoneNumber = '+905551234567';
  const message = 'Test SMS message';
  const type = SmsType.OTP;

  const mockSmsRecord = {
    id: 'sms-123',

    phoneNumber,
    message,
    type,
    status: SmsStatus.PENDING,
    provider: 'FONIVA',
    providerId: null,
    attemptCount: 0,
    errorMessage: null,
    sentAt: null,
    deliveredAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockRetryService: jest.Mocked<RetryService> = {
      executeWithRetry: jest.fn(),
    } as any;

    const mockConfigService: jest.Mocked<ConfigService> = {
      get: jest.fn((key: string, defaultValue?: any) => {
        if (key === 'SMS_RETRY_MAX_ATTEMPTS') return 5;
        if (key === 'SMS_RETRY_BASE_DELAY') return 2000;
        return defaultValue;
      }),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SmsService,
        {
          provide: PrismaService,
          useValue: {
            sMS: {
              create: jest.fn(),
              update: jest.fn(),
              findUnique: jest.fn(),
              findMany: jest.fn(),
            },
          },
        },
        {
          provide: FonivaService,
          useValue: {
            sendSms: jest.fn(),
          },
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
        {
          provide: 'Logger',
          useValue: createMockLogger(),
        },
      ],
    }).compile();

    service = module.get<SmsService>(SmsService);
    prismaService = module.get(PrismaService);
    fonivaService = module.get(FonivaService);
    retryService = module.get(RetryService);
    configService = module.get(ConfigService);
    i18nService = module.get(I18nService);

    jest.clearAllMocks();
  });

  describe('sendSms', () => {
    it('should wrap FonivaService.sendSms() with RetryService and return updated record on success (AC-6.5.5.5)', async () => {
      // Arrange
      const createdSms = { ...mockSmsRecord };
      const updatedSms = {
        ...createdSms,
        status: SmsStatus.SENT,
        providerId: 'foniva-msg-123',
        sentAt: expect.any(Date),
      };
      const fonivaResult = {
        providerId: 'foniva-msg-123',
        success: true,
      };

      prismaService.sMS.create.mockResolvedValue(createdSms as any);
      prismaService.sMS.update.mockResolvedValue(updatedSms as any);
      retryService.executeWithRetry.mockImplementation(async (operation) => {
        return await operation();
      });
      fonivaService.sendSms.mockResolvedValue(fonivaResult);

      // Act
      const result = await service.sendSms(phoneNumber, message, type);

      // Assert
      expect(retryService.executeWithRetry).toHaveBeenCalledWith(expect.any(Function), {
        maxAttempts: 5,
        baseDelay: 2000,
        context: `SMS Send: ${phoneNumber} - ${message.substring(0, 50)}...`,
      });
      expect(fonivaService.sendSms).toHaveBeenCalledWith(phoneNumber, message, type, createdSms.id);
      expect(result.status).toBe(SmsStatus.SENT);
    });

    it('should retry on network error and succeed on second attempt (AC-6.5.5.5)', async () => {
      // Arrange
      const createdSms = { ...mockSmsRecord };
      const updatedSms = {
        ...createdSms,
        status: SmsStatus.SENT,
        providerId: 'foniva-msg-retry',
        sentAt: expect.any(Date),
      };

      let attemptCount = 0;
      retryService.executeWithRetry.mockImplementation(async (operation) => {
        attemptCount++;
        if (attemptCount === 1) {
          throw new Error('Network timeout');
        }
        return await operation();
      });

      prismaService.sMS.create.mockResolvedValue(createdSms as any);
      prismaService.sMS.update.mockResolvedValue(updatedSms as any);
      fonivaService.sendSms.mockResolvedValue({
        providerId: 'foniva-msg-retry',
        success: true,
      });

      // Act
      const result = await service.sendSms(phoneNumber, message, type);

      // Assert
      expect(retryService.executeWithRetry).toHaveBeenCalled();
      expect(result.status).toBe(SmsStatus.SENT);
    });

    it('should update SMS record with FAILED status after retry exhaustion (AC-6.5.5.8)', async () => {
      // Arrange
      const createdSms = { ...mockSmsRecord };
      const updatedSms = {
        ...createdSms,
        status: SmsStatus.FAILED,
        errorMessage: 'Network error',
        attemptCount: 1,
      };
      const error = new Error('Network error');

      prismaService.sMS.create.mockResolvedValue(createdSms as any);
      prismaService.sMS.update.mockResolvedValue(updatedSms as any);
      retryService.executeWithRetry.mockRejectedValue(error);

      // Act
      const result = await service.sendSms(phoneNumber, message, type);

      // Assert
      expect(retryService.executeWithRetry).toHaveBeenCalled();
      expect(prismaService.sMS.update).toHaveBeenCalledWith({
        where: { id: createdSms.id },
        data: {
          status: SmsStatus.FAILED,
          errorMessage: 'Network error',
          attemptCount: 1,
        },
      });
      expect(result.status).toBe(SmsStatus.FAILED);
    });
  });

  describe('retrySms', () => {
    it('should use RetryService for retrying and calculate remaining attempts correctly (AC-6.5.5.6)', async () => {
      // Arrange
      const existingSms = {
        ...mockSmsRecord,
        id: 'sms-123',
        status: SmsStatus.FAILED,
        attemptCount: 1,
        errorMessage: 'Previous error',
      };
      const updatedSms = {
        ...existingSms,
        status: SmsStatus.SENT,
        providerId: 'foniva-msg-456',
        sentAt: expect.any(Date),
        attemptCount: 2,
        errorMessage: null,
      };
      const fonivaResult = {
        providerId: 'foniva-msg-456',
        success: true,
      };

      prismaService.sMS.findUnique.mockResolvedValue(existingSms as any);
      prismaService.sMS.update.mockResolvedValue(updatedSms as any);
      retryService.executeWithRetry.mockImplementation(async (operation) => {
        return await operation();
      });
      fonivaService.sendSms.mockResolvedValue(fonivaResult);

      // Act
      const result = await service.retrySms('sms-123');

      // Assert
      expect(retryService.executeWithRetry).toHaveBeenCalledWith(expect.any(Function), {
        maxAttempts: 2, // 3 - attemptCount (3 - 1 = 2 remaining)
        baseDelay: 2000,
        context: `SMS Retry: ${existingSms.id} (attempt 2/3)`,
      });
      expect(fonivaService.sendSms).toHaveBeenCalledWith(
        existingSms.phoneNumber,
        existingSms.message,
        existingSms.type,
        existingSms.id,
      );
      expect(result.status).toBe(SmsStatus.SENT);
    });

    it('should throw InternalServerErrorException when SMS not found', async () => {
      // Arrange
      prismaService.sMS.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.retrySms('non-existent-id')).rejects.toThrow(InternalServerErrorException);
    });

    it('should throw InternalServerErrorException when attemptCount >= 3', async () => {
      // Arrange
      const existingSms = {
        ...mockSmsRecord,
        attemptCount: 3,
      };

      prismaService.sMS.findUnique.mockResolvedValue(existingSms as any);

      // Act & Assert
      await expect(service.retrySms('sms-123')).rejects.toThrow(InternalServerErrorException);
    });

    it('should update SMS record with FAILED status after retry exhaustion (AC-6.5.5.6)', async () => {
      // Arrange
      const existingSms = {
        ...mockSmsRecord,
        status: SmsStatus.FAILED,
        attemptCount: 1,
      };
      const updatedSms = {
        ...existingSms,
        status: SmsStatus.FAILED,
        attemptCount: 2,
        errorMessage: 'Retry failed',
      };
      const error = new Error('Retry failed');

      prismaService.sMS.findUnique.mockResolvedValue(existingSms as any);
      prismaService.sMS.update.mockResolvedValue(updatedSms as any);
      retryService.executeWithRetry.mockRejectedValue(error);

      // Act
      const result = await service.retrySms('sms-123');

      // Assert
      expect(retryService.executeWithRetry).toHaveBeenCalled();
      expect(prismaService.sMS.update).toHaveBeenCalledWith({
        where: { id: 'sms-123' },
        data: {
          status: SmsStatus.FAILED,
          errorMessage: 'Retry failed',
          attemptCount: 2,
        },
      });
      expect(result.status).toBe(SmsStatus.FAILED);
    });
  });

  describe('getStats', () => {
    it('should calculate statistics correctly with all statuses', async () => {
      // Arrange
      const smsRecords = [
        {
          ...mockSmsRecord,
          id: '1',
          status: SmsStatus.SENT,
          type: SmsType.OTP,
        },
        {
          ...mockSmsRecord,
          id: '2',
          status: SmsStatus.DELIVERED,
          type: SmsType.OTP,
        },
        {
          ...mockSmsRecord,
          id: '3',
          status: SmsStatus.FAILED,
          type: SmsType.OTP,
        },
        {
          ...mockSmsRecord,
          id: '4',
          status: SmsStatus.DELIVERED,
          type: SmsType.NOTIFICATION,
        },
        {
          ...mockSmsRecord,
          id: '5',
          status: SmsStatus.SENT,
          type: SmsType.NOTIFICATION,
        },
      ];

      prismaService.sMS.findMany.mockResolvedValue(smsRecords as any);

      // Act
      const result = await service.getStats();

      // Assert
      expect(prismaService.sMS.findMany).toHaveBeenCalledWith({
        where: {},
      });
      expect(result.total).toEqual({
        sent: 2,
        delivered: 2,
        failed: 1,
      });
      expect(result.successRate).toBe(100); // delivered / sent = 2/2 = 100%
      expect(result.byType[SmsType.OTP]).toEqual({
        sent: 1,
        delivered: 1,
        failed: 1,
      });
      expect(result.byType[SmsType.NOTIFICATION]).toEqual({
        sent: 1,
        delivered: 1,
        failed: 0,
      });
    });

    it('should apply date range filtering', async () => {
      // Arrange
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-12-31');
      const smsRecords: any[] = [];

      prismaService.sMS.findMany.mockResolvedValue(smsRecords);

      // Act
      await service.getStats(startDate, endDate);

      // Assert
      expect(prismaService.sMS.findMany).toHaveBeenCalledWith({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      });
    });

    it('should apply type filtering', async () => {
      // Arrange
      const smsRecords: any[] = [];
      prismaService.sMS.findMany.mockResolvedValue(smsRecords);

      // Act
      await service.getStats(undefined, undefined, SmsType.OTP);

      // Assert
      expect(prismaService.sMS.findMany).toHaveBeenCalledWith({
        where: {
          type: SmsType.OTP,
        },
      });
    });

    it('should calculate success rate as 0 when no SMS sent', async () => {
      // Arrange
      const smsRecords: any[] = [];
      prismaService.sMS.findMany.mockResolvedValue(smsRecords);

      // Act
      const result = await service.getStats();

      // Assert
      expect(result.successRate).toBe(0);
    });

    it('should round success rate to 2 decimal places', async () => {
      // Arrange
      const smsRecords = [
        { ...mockSmsRecord, id: '1', status: SmsStatus.SENT },
        { ...mockSmsRecord, id: '2', status: SmsStatus.SENT },
        { ...mockSmsRecord, id: '3', status: SmsStatus.DELIVERED },
      ];

      prismaService.sMS.findMany.mockResolvedValue(smsRecords as any);

      // Act
      const result = await service.getStats();

      // Assert
      expect(result.successRate).toBe(50); // 1 delivered / 2 sent = 50%
    });
  });
});
