// Libraries
import { BadRequestException, UnauthorizedException, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { createMockI18nService } from '../../../../../test/utils/mockI18nService';
import { I18nService } from 'nestjs-i18n';

// DTOs
import { SendSmsDto } from '../../dto/request/send-sms.dto';
import { DeliveryCallbackDto } from '../../dto/request/delivery-callback.dto';

// Enums
import { SmsStatus } from '../../enums/sms-status.enum';
import { SmsType } from '../../enums/sms-type.enum';

// Guards
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../../common/guards/permissions.guard';

// Services
import { PrismaService } from '../../../../database/prisma.service';
import { SmsService } from '../../services/sms.service';
import { AuthorizationService } from '../../../permissions/services/authorization.service';

// Controllers
import { SmsController } from '../../controllers/sms.controller';
describe('SmsController', () => {
  let controller: SmsController;
  let smsService: jest.Mocked<SmsService>;
  let prismaService: {
    sMS: {
      findFirst: jest.Mock;
      update: jest.Mock;
    };
  };
  let configService: jest.Mocked<ConfigService>;
  let validationPipe: ValidationPipe;

  const mockSmsRecord = {
    id: 'sms-123',
    phoneNumber: '+905551234567',
    message: 'Test SMS',
    type: SmsType.OTP,
    status: SmsStatus.SENT,
    provider: 'FONIVA',
    providerId: 'foniva-msg-123',
    attemptCount: 1,
    errorMessage: null,
    sentAt: new Date(),
    deliveredAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SmsController],
      providers: [
        {
          provide: SmsService,
          useValue: {
            sendSms: jest.fn(),
            getStats: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            sMS: {
              findFirst: jest.fn(),
              update: jest.fn(),
            },
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'foniva') {
                return {
                  apiKey: 'test-api-key',
                };
              }
              return null;
            }),
          },
        },
        {
          provide: I18nService,
          useValue: createMockI18nService(),
        },
        {
          provide: AuthorizationService,
          useValue: {
            hasPermission: jest.fn().mockResolvedValue(true),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: jest.fn(() => true),
      })
      .overrideGuard(PermissionsGuard)
      .useValue({
        canActivate: jest.fn(() => true),
      })
      .compile();

    controller = module.get<SmsController>(SmsController);
    smsService = module.get(SmsService);
    prismaService = module.get(PrismaService);
    configService = module.get(ConfigService);

    validationPipe = new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const validateSendDto = (payload: Partial<SendSmsDto>) =>
    validationPipe.transform(payload, {
      type: 'body',
      metatype: SendSmsDto,
      data: '',
    });

  describe('sendSms', () => {
    it('should send SMS successfully', async () => {
      const sendSmsDto: SendSmsDto = {
        phoneNumber: '+905551234567',
        message: 'Test SMS message',
        type: SmsType.OTP,
      };

      smsService.sendSms.mockResolvedValue({
        ...mockSmsRecord,
        message: sendSmsDto.message,
      } as any);

      const result = await controller.sendSms(sendSmsDto);

      expect(result).toMatchObject({
        id: mockSmsRecord.id,
        phoneNumber: sendSmsDto.phoneNumber,
        type: sendSmsDto.type,
      });
      expect(result.message).toBe(sendSmsDto.message);
      expect(smsService.sendSms).toHaveBeenCalledWith(sendSmsDto.phoneNumber, sendSmsDto.message, sendSmsDto.type);
    });

    it('should throw validation error for invalid phone number', async () => {
      const invalidDto: Partial<SendSmsDto> = {
        phoneNumber: 'invalid',
        message: 'Test SMS',
        type: SmsType.OTP,
      };

      await expect(validateSendDto(invalidDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw validation error for empty message', async () => {
      const invalidDto: Partial<SendSmsDto> = {
        phoneNumber: '+905551234567',
        message: '',
        type: SmsType.OTP,
      };

      await expect(validateSendDto(invalidDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('handleDeliveryCallback', () => {
    it('should update SMS status on valid webhook callback', async () => {
      const callbackDto: DeliveryCallbackDto = {
        providerId: 'foniva-msg-123',
        status: SmsStatus.DELIVERED,
      };

      prismaService.sMS.findFirst.mockResolvedValue(mockSmsRecord as any);
      prismaService.sMS.update.mockResolvedValue({
        ...mockSmsRecord,
        status: SmsStatus.DELIVERED,
        deliveredAt: new Date(),
      } as any);

      const response = await controller.handleDeliveryCallback(callbackDto, 'test-api-key');

      expect(response).toEqual({ success: true, message: expect.any(String) });
      expect(prismaService.sMS.findFirst).toHaveBeenCalledWith({ where: { providerId: callbackDto.providerId } });
      expect(prismaService.sMS.update).toHaveBeenCalledWith({
        where: { id: mockSmsRecord.id },
        data: {
          status: callbackDto.status,
          deliveredAt: expect.any(Date),
        },
      });
    });

    it('should return generic success when SMS record not found to prevent retries', async () => {
      prismaService.sMS.findFirst.mockResolvedValue(null);

      const callbackDto: DeliveryCallbackDto = {
        providerId: 'missing-id',
        status: SmsStatus.DELIVERED,
      };

      const response = await controller.handleDeliveryCallback(callbackDto, 'test-api-key');

      expect(response).toEqual({ success: false, message: expect.any(String) });
      expect(prismaService.sMS.update).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException for invalid webhook key', async () => {
      const callbackDto: DeliveryCallbackDto = {
        providerId: 'foniva-msg-123',
        status: SmsStatus.DELIVERED,
      };

      await expect(controller.handleDeliveryCallback(callbackDto, 'invalid-key')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('getStats', () => {
    it('should return SMS stats without filters', async () => {
      const mockStats = {
        total: { sent: 10, delivered: 8, failed: 2 },
        successRate: 80,
        byType: {
          [SmsType.OTP]: { sent: 5, delivered: 4, failed: 1 },
          [SmsType.NOTIFICATION]: { sent: 5, delivered: 4, failed: 1 },
        },
      };

      smsService.getStats.mockResolvedValue(mockStats as any);

      const response = await controller.getStats(undefined, undefined, undefined);

      expect(response).toEqual(mockStats);
      expect(smsService.getStats).toHaveBeenCalledWith(undefined, undefined, undefined);
    });

    it('should apply date range filtering', async () => {
      const startDate = '2025-01-01';
      const endDate = '2025-12-31';

      smsService.getStats.mockResolvedValue({} as any);

      await controller.getStats(startDate, endDate, undefined);

      expect(smsService.getStats).toHaveBeenCalledWith(new Date(startDate), new Date(endDate), undefined);
    });

    it('should apply type filtering when valid enum provided', async () => {
      smsService.getStats.mockResolvedValue({} as any);

      await controller.getStats(undefined, undefined, `${SmsType.OTP}`);

      expect(smsService.getStats).toHaveBeenCalledWith(undefined, undefined, SmsType.OTP);
    });
  });
});
