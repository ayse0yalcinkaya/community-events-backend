// Libraries
import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as Sentry from '@sentry/node';
import { I18nService } from 'nestjs-i18n';

// DTOs
import { QueryNotificationDto } from '../dto/query-notification.dto';

// Enums
import { SmsType } from '../../sms/enums/sms-type.enum';
import { NotificationChannel } from '../enums/notification-channel.enum';
import { NotificationType } from '../enums/notification-type.enum';
import { Platform } from '../enums/platform.enum';

// Services
import { PrismaService } from '../../../database/prisma.service';
import { MailService } from '../../mail/services/mail.service';
import { SmsService } from '../../sms/services/sms.service';
import { DeviceTokenService } from './device-token.service';
import { FirebaseService } from './firebase.service';
import { NotificationPreferencesService } from './notification-preferences.service';
import { NotificationService } from './notification.service';
// Mock Sentry
jest.mock('@sentry/node', () => ({
  captureException: jest.fn(),
}));

describe('NotificationService', () => {
  let service: NotificationService;
  let prismaService: jest.Mocked<PrismaService>;
  let notificationPreferencesService: jest.Mocked<NotificationPreferencesService>;
  let mailService: jest.Mocked<MailService>;
  let smsService: jest.Mocked<SmsService>;
  let firebaseService: jest.Mocked<FirebaseService>;
  let deviceTokenService: jest.Mocked<DeviceTokenService>;
  let i18nService: any;

  const mockDomainID = '00000000-0000-0000-0000-000000000001';
  const mockUserID = '11111111-1111-1111-1111-111111111111';

  const mockUser = {
    id: mockUserID,
    email: 'test@example.com',
    phoneNumber: '+905551234567',
  };

  const mockPreferencesAllEnabled = [
    {
      id: 'pref-1',

      userID: mockUserID,
      channel: NotificationChannel.EMAIL,
      enabled: true,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    },
    {
      id: 'pref-2',

      userID: mockUserID,
      channel: NotificationChannel.SMS,
      enabled: true,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    },
    {
      id: 'pref-3',

      userID: mockUserID,
      channel: NotificationChannel.PUSH,
      enabled: false,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    },
  ];

  const mockPreferencesEmailOnly = [
    {
      id: 'pref-1',

      userID: mockUserID,
      channel: NotificationChannel.EMAIL,
      enabled: true,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    },
    {
      id: 'pref-2',

      userID: mockUserID,
      channel: NotificationChannel.SMS,
      enabled: false,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    },
    {
      id: 'pref-3',

      userID: mockUserID,
      channel: NotificationChannel.PUSH,
      enabled: false,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findFirst: jest.fn(),
            },
            notification: {
              create: jest.fn(),
              findMany: jest.fn(),
              count: jest.fn(),
            },
            notificationLog: {
              create: jest.fn(),
            },
          },
        },
        {
          provide: NotificationPreferencesService,
          useValue: {
            getPreferences: jest.fn(),
          },
        },
        {
          provide: MailService,
          useValue: {
            sendEmail: jest.fn(),
            sendTemplateEmail: jest.fn(),
          },
        },
        {
          provide: SmsService,
          useValue: {
            sendSms: jest.fn(),
          },
        },
        {
          provide: FirebaseService,
          useValue: {
            sendPush: jest.fn(),
          },
        },
        {
          provide: DeviceTokenService,
          useValue: {
            getUserTokens: jest.fn(),
            invalidateToken: jest.fn(),
          },
        },
        {
          provide: I18nService,
          useFactory: () => ({
            translate: jest.fn().mockResolvedValue('User not found'),
            t: jest.fn().mockResolvedValue('User not found'),
          }),
        },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
    prismaService = module.get(PrismaService);
    notificationPreferencesService = module.get(NotificationPreferencesService);
    mailService = module.get(MailService);
    smsService = module.get(SmsService);
    firebaseService = module.get(FirebaseService);
    deviceTokenService = module.get(DeviceTokenService);
    i18nService = module.get(I18nService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('send', () => {
    it('should send notification to all enabled channels (EMAIL, SMS)', async () => {
      // Arrange
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(mockUser as any);
      notificationPreferencesService.getPreferences.mockResolvedValue(mockPreferencesAllEnabled as any);
      mailService.sendEmail.mockResolvedValue(undefined);
      smsService.sendSms.mockResolvedValue({
        id: 'sms-1',

        phoneNumber: mockUser.phoneNumber,
        message: 'Test message',
        type: SmsType.NOTIFICATION,
        status: 'SENT' as any,
        provider: 'FONIVA',
        providerId: 'provider-1',
        sentAt: new Date(),
        attemptCount: 0,
        createdAt: new Date(),
      } as any);
      (prismaService.notificationLog.create as jest.Mock).mockResolvedValue({
        id: 'notif-1',

        userID: mockUserID,
        type: NotificationType.GENERAL,
        channel: NotificationChannel.EMAIL,
        title: 'Test Title',
        message: 'Test message',
        data: null,
        sent: true,
        sentAt: new Date(),
        createdAt: new Date(),
      } as any);

      // Act
      await service.send(mockUserID, NotificationType.GENERAL, 'Test Title', 'Test message');

      // Wait for async operations to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Assert
      expect(prismaService.user.findFirst).toHaveBeenCalledWith({
        where: {
          id: mockUserID,

          deletedAt: null,
        },
        select: {
          id: true,
          email: true,
          phoneNumber: true,
        },
      });
      expect(notificationPreferencesService.getPreferences).toHaveBeenCalledWith(mockUserID);
      expect(mailService.sendEmail).toHaveBeenCalledWith(mockUser.email, 'Test Title', 'Test message');
      expect(smsService.sendSms).toHaveBeenCalledWith(mockUser.phoneNumber, 'Test message', SmsType.NOTIFICATION);
    });

    it('should filter preferences and only send to enabled channels (EMAIL only)', async () => {
      // Arrange
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(mockUser as any);
      notificationPreferencesService.getPreferences.mockResolvedValue(mockPreferencesEmailOnly as any);
      mailService.sendEmail.mockResolvedValue(undefined);
      (prismaService.notificationLog.create as jest.Mock).mockResolvedValue({
        id: 'notif-1',

        userID: mockUserID,
        type: NotificationType.GENERAL,
        channel: NotificationChannel.EMAIL,
        title: 'Test Title',
        message: 'Test message',
        data: null,
        sent: true,
        sentAt: new Date(),
        createdAt: new Date(),
      } as any);

      // Act
      await service.send(mockUserID, NotificationType.GENERAL, 'Test Title', 'Test message');

      // Wait for async operations to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Assert
      expect(mailService.sendEmail).toHaveBeenCalled();
      expect(smsService.sendSms).not.toHaveBeenCalled();
    });

    it('should handle partial success (EMAIL succeeds, SMS fails)', async () => {
      // Arrange
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(mockUser as any);
      notificationPreferencesService.getPreferences.mockResolvedValue(mockPreferencesAllEnabled as any);
      mailService.sendEmail.mockResolvedValue(undefined);
      smsService.sendSms.mockRejectedValue(new Error('SMS sending failed'));
      (prismaService.notificationLog.create as jest.Mock).mockResolvedValue({
        id: 'notif-1',

        userID: mockUserID,
        type: NotificationType.GENERAL,
        channel: NotificationChannel.EMAIL,
        title: 'Test Title',
        message: 'Test message',
        data: null,
        sent: true,
        sentAt: new Date(),
        createdAt: new Date(),
      } as any);

      // Act
      await service.send(mockUserID, NotificationType.GENERAL, 'Test Title', 'Test message');

      // Wait for async operations to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Assert
      expect(mailService.sendEmail).toHaveBeenCalled();
      expect(smsService.sendSms).toHaveBeenCalled();
      // Both channels should attempt to create notification records
      expect(prismaService.notificationLog.create).toHaveBeenCalled();
    });

    it('should use async fire-and-forget pattern (non-blocking)', async () => {
      // Arrange
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(mockUser as any);
      notificationPreferencesService.getPreferences.mockResolvedValue(mockPreferencesAllEnabled as any);
      mailService.sendEmail.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 1000)));
      smsService.sendSms.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 1000)));

      // Act
      const startTime = Date.now();
      await service.send(mockUserID, NotificationType.GENERAL, 'Test Title', 'Test message');
      const endTime = Date.now();

      // Assert
      // Method should return immediately without waiting for channel sends
      expect(endTime - startTime).toBeLessThan(100); // Should return in < 100ms
    });

    it('should create notification records for each channel attempt', async () => {
      // Arrange
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(mockUser as any);
      notificationPreferencesService.getPreferences.mockResolvedValue(mockPreferencesAllEnabled as any);
      mailService.sendEmail.mockResolvedValue(undefined);
      smsService.sendSms.mockResolvedValue({
        id: 'sms-1',

        phoneNumber: mockUser.phoneNumber,
        message: 'Test message',
        type: SmsType.NOTIFICATION,
        status: 'SENT' as any,
        provider: 'FONIVA',
        providerId: 'provider-1',
        sentAt: new Date(),
        attemptCount: 0,
        createdAt: new Date(),
      } as any);
      (prismaService.notificationLog.create as jest.Mock).mockResolvedValue({
        id: 'notif-1',

        userID: mockUserID,
        type: NotificationType.GENERAL,
        channel: NotificationChannel.EMAIL,
        title: 'Test Title',
        message: 'Test message',
        data: null,
        sent: true,
        sentAt: new Date(),
        createdAt: new Date(),
      } as any);

      // Act
      await service.send(mockUserID, NotificationType.GENERAL, 'Test Title', 'Test message');

      // Wait for async operations to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Assert
      // Should create notification records for EMAIL and SMS channels
      expect(prismaService.notificationLog.create).toHaveBeenCalledTimes(2);
    });

    it('should handle user not found gracefully (fire-and-forget pattern)', async () => {
      // Arrange
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(null);

      // Act
      await service.send(mockUserID, NotificationType.GENERAL, 'Test Title', 'Test message');

      // Wait for async operations to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Assert
      // Fire-and-forget pattern: Exception is caught and logged, not thrown
      expect(prismaService.user.findFirst).toHaveBeenCalled();
      expect(notificationPreferencesService.getPreferences).not.toHaveBeenCalled();
      expect(Sentry.captureException).toHaveBeenCalled();
    });

    it('should handle email channel failure gracefully', async () => {
      // Arrange
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(mockUser as any);
      notificationPreferencesService.getPreferences.mockResolvedValue(mockPreferencesEmailOnly as any);
      mailService.sendEmail.mockRejectedValue(new Error('Email sending failed'));
      (prismaService.notificationLog.create as jest.Mock).mockResolvedValue({
        id: 'notif-1',

        userID: mockUserID,
        type: NotificationType.GENERAL,
        channel: NotificationChannel.EMAIL,
        title: 'Test Title',
        message: 'Test message',
        data: null,
        sent: false,
        sentAt: null,
        createdAt: new Date(),
      } as any);

      // Act
      await service.send(mockUserID, NotificationType.GENERAL, 'Test Title', 'Test message');

      // Wait for async operations to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Assert
      expect(mailService.sendEmail).toHaveBeenCalled();
      expect(prismaService.notificationLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          sent: false,
          sentAt: null,
        }),
      });
      expect(Sentry.captureException).toHaveBeenCalled();
    });

    it('should skip email channel if user email is not set', async () => {
      // Arrange
      const userWithoutEmail = {
        ...mockUser,
        email: null,
      };
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(userWithoutEmail as any);
      notificationPreferencesService.getPreferences.mockResolvedValue(mockPreferencesEmailOnly as any);
      (prismaService.notificationLog.create as jest.Mock).mockResolvedValue({
        id: 'notif-1',

        userID: mockUserID,
        type: NotificationType.GENERAL,
        channel: NotificationChannel.EMAIL,
        title: 'Test Title',
        message: 'Test message',
        data: null,
        sent: false,
        sentAt: null,
        createdAt: new Date(),
      } as any);

      // Act
      await service.send(mockUserID, NotificationType.GENERAL, 'Test Title', 'Test message');

      // Wait for async operations to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Assert
      expect(mailService.sendEmail).not.toHaveBeenCalled();
      expect(prismaService.notificationLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          sent: false,
        }),
      });
    });

    it('should skip SMS channel if user phoneNumber is not set', async () => {
      // Arrange
      const userWithoutPhone = {
        ...mockUser,
        phoneNumber: null,
      };
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(userWithoutPhone as any);
      notificationPreferencesService.getPreferences.mockResolvedValue(mockPreferencesAllEnabled as any);
      mailService.sendEmail.mockResolvedValue(undefined);
      (prismaService.notificationLog.create as jest.Mock).mockResolvedValue({
        id: 'notif-1',

        userID: mockUserID,
        type: NotificationType.GENERAL,
        channel: NotificationChannel.SMS,
        title: 'Test Title',
        message: 'Test message',
        data: null,
        sent: false,
        sentAt: null,
        createdAt: new Date(),
      } as any);

      // Act
      await service.send(mockUserID, NotificationType.GENERAL, 'Test Title', 'Test message');

      // Wait for async operations to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Assert
      expect(smsService.sendSms).not.toHaveBeenCalled();
      expect(prismaService.notificationLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          sent: false,
        }),
      });
    });

    it('should send push notification when PUSH channel enabled', async () => {
      // Arrange
      process.env.FIREBASE_ENABLED = 'true';
      const mockPreferencesPushEnabled = [
        {
          id: 'pref-3',

          userID: mockUserID,
          channel: NotificationChannel.PUSH,
          enabled: true,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        },
      ];
      const mockDeviceTokens = [
        {
          id: 'token-1',

          userID: mockUserID,
          token: 'fcm-token-1',
          platform: Platform.iOS,
          createdAt: new Date('2024-01-01'),
        },
      ];

      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(mockUser as any);
      notificationPreferencesService.getPreferences.mockResolvedValue(mockPreferencesPushEnabled as any);
      deviceTokenService.getUserTokens.mockResolvedValue(mockDeviceTokens as any);
      firebaseService.sendPush.mockResolvedValue(undefined);
      (prismaService.notificationLog.create as jest.Mock).mockResolvedValue({
        id: 'notif-1',

        userID: mockUserID,
        type: NotificationType.GENERAL,
        channel: NotificationChannel.PUSH,
        title: 'Test Title',
        message: 'Test message',
        data: null,
        sent: true,
        sentAt: new Date(),
        createdAt: new Date(),
      } as any);

      // Act
      await service.send(mockUserID, NotificationType.GENERAL, 'Test Title', 'Test message');

      // Wait for async operations to complete
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Assert
      expect(deviceTokenService.getUserTokens).toHaveBeenCalledWith(mockUserID);
      expect(firebaseService.sendPush).toHaveBeenCalledWith('fcm-token-1', 'Test Title', 'Test message', undefined);
      expect(prismaService.notificationLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          channel: NotificationChannel.PUSH,
          sent: true,
        }),
      });
    });

    it('should handle invalid token and invalidate it', async () => {
      // Arrange
      process.env.FIREBASE_ENABLED = 'true';
      const mockPreferencesPushEnabled = [
        {
          id: 'pref-3',

          userID: mockUserID,
          channel: NotificationChannel.PUSH,
          enabled: true,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        },
      ];
      const mockDeviceTokens = [
        {
          id: 'token-1',

          userID: mockUserID,
          token: 'invalid-token',
          platform: Platform.iOS,
          createdAt: new Date('2024-01-01'),
        },
      ];

      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(mockUser as any);
      notificationPreferencesService.getPreferences.mockResolvedValue(mockPreferencesPushEnabled as any);
      deviceTokenService.getUserTokens.mockResolvedValue(mockDeviceTokens as any);
      const invalidTokenError = new Error('Invalid device token');
      firebaseService.sendPush.mockRejectedValue(invalidTokenError);
      deviceTokenService.invalidateToken.mockResolvedValue(undefined);
      (prismaService.notificationLog.create as jest.Mock).mockResolvedValue({
        id: 'notif-1',

        userID: mockUserID,
        type: NotificationType.GENERAL,
        channel: NotificationChannel.PUSH,
        title: 'Test Title',
        message: 'Test message',
        data: null,
        sent: false,
        sentAt: null,
        createdAt: new Date(),
      } as any);

      // Act
      await service.send(mockUserID, NotificationType.GENERAL, 'Test Title', 'Test message');

      // Wait for async operations to complete
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Assert
      expect(deviceTokenService.invalidateToken).toHaveBeenCalledWith('invalid-token');
      expect(prismaService.notificationLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          sent: false,
        }),
      });
    });

    it('should skip PUSH channel if FIREBASE_ENABLED=false', async () => {
      // Arrange
      process.env.FIREBASE_ENABLED = 'false';
      const mockPreferencesPushEnabled = [
        {
          id: 'pref-3',

          userID: mockUserID,
          channel: NotificationChannel.PUSH,
          enabled: true,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        },
      ];

      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(mockUser as any);
      notificationPreferencesService.getPreferences.mockResolvedValue(mockPreferencesPushEnabled as any);
      (prismaService.notificationLog.create as jest.Mock).mockResolvedValue({
        id: 'notif-1',

        userID: mockUserID,
        type: NotificationType.GENERAL,
        channel: NotificationChannel.PUSH,
        title: 'Test Title',
        message: 'Test message',
        data: null,
        sent: false,
        sentAt: null,
        createdAt: new Date(),
      } as any);

      // Act
      await service.send(mockUserID, NotificationType.GENERAL, 'Test Title', 'Test message');

      // Wait for async operations to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Assert
      expect(deviceTokenService.getUserTokens).not.toHaveBeenCalled();
      expect(firebaseService.sendPush).not.toHaveBeenCalled();
      expect(prismaService.notificationLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          sent: false,
        }),
      });
    });
  });

  describe('getNotificationHistory', () => {
    const mockNotifications = [
      {
        id: 'notif-1',
        userID: mockUserID,
        subject: 'Test Subject 1',
        message: 'Test Message 1',
        read: false,
        createdAt: new Date('2024-06-15'),
        updatedAt: new Date('2024-06-15'),
      },
      {
        id: 'notif-2',
        userID: mockUserID,
        subject: 'Test Subject 2',
        message: 'Test Message 2',
        read: true,
        createdAt: new Date('2024-06-10'),
        updatedAt: new Date('2024-06-12'),
      },
    ];

    it('should return paginated notifications', async () => {
      const query = new QueryNotificationDto();
      query.page = 1;
      query.limit = 10;

      (prismaService.notification.findMany as jest.Mock).mockResolvedValue(mockNotifications);
      (prismaService.notification.count as jest.Mock).mockResolvedValue(2);

      const result = await service.getNotificationHistory(mockUserID, query);

      expect(result).toEqual({ items: mockNotifications, count: 2 });
      expect(prismaService.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userID: mockUserID },
          skip: 0,
          take: 10,
          orderBy: { createdAt: 'desc' },
        }),
      );
    });

    it('should search notifications by subject and message', async () => {
      const query = new QueryNotificationDto();
      query.search = 'test';

      (prismaService.notification.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.notification.count as jest.Mock).mockResolvedValue(0);

      await service.getNotificationHistory(mockUserID, query);

      expect(prismaService.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userID: mockUserID,
            OR: [
              { subject: { contains: 'test', mode: 'insensitive' } },
              { message: { contains: 'test', mode: 'insensitive' } },
            ],
          }),
        }),
      );
    });

    it('should filter notifications by isRead', async () => {
      const query = new QueryNotificationDto();
      query.isRead = false;

      (prismaService.notification.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.notification.count as jest.Mock).mockResolvedValue(0);

      await service.getNotificationHistory(mockUserID, query);

      expect(prismaService.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userID: mockUserID,
            read: false,
          }),
        }),
      );
    });

    it('should filter notifications by createdFrom date', async () => {
      const createdFrom = new Date('2024-01-01');
      const query = new QueryNotificationDto();
      query.createdFrom = createdFrom;

      (prismaService.notification.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.notification.count as jest.Mock).mockResolvedValue(0);

      await service.getNotificationHistory(mockUserID, query);

      expect(prismaService.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userID: mockUserID,
            createdAt: { gte: createdFrom },
          }),
        }),
      );
    });

    it('should filter notifications by created date range', async () => {
      const createdFrom = new Date('2024-01-01');
      const createdTo = new Date('2024-12-31');
      const query = new QueryNotificationDto();
      query.createdFrom = createdFrom;
      query.createdTo = createdTo;

      (prismaService.notification.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.notification.count as jest.Mock).mockResolvedValue(0);

      await service.getNotificationHistory(mockUserID, query);

      expect(prismaService.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userID: mockUserID,
            createdAt: { gte: createdFrom, lte: createdTo },
          }),
        }),
      );
    });

    it('should filter notifications by updatedFrom date', async () => {
      const updatedFrom = new Date('2024-06-01');
      const query = new QueryNotificationDto();
      query.updatedFrom = updatedFrom;

      (prismaService.notification.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.notification.count as jest.Mock).mockResolvedValue(0);

      await service.getNotificationHistory(mockUserID, query);

      expect(prismaService.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userID: mockUserID,
            updatedAt: { gte: updatedFrom },
          }),
        }),
      );
    });

    it('should sort notifications by specified field', async () => {
      const query = new QueryNotificationDto();
      query.sortBy = 'subject';
      query.sortOrder = 'asc' as any;

      (prismaService.notification.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.notification.count as jest.Mock).mockResolvedValue(0);

      await service.getNotificationHistory(mockUserID, query);

      expect(prismaService.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { subject: 'asc' },
        }),
      );
    });

    it('should default to createdAt desc when no sorting specified', async () => {
      const query = new QueryNotificationDto();

      (prismaService.notification.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.notification.count as jest.Mock).mockResolvedValue(0);

      await service.getNotificationHistory(mockUserID, query);

      expect(prismaService.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
        }),
      );
    });
  });
});
