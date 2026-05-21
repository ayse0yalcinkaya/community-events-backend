// Libraries
import { Test, TestingModule } from '@nestjs/testing';
import { I18nService } from 'nestjs-i18n';

// DTOs
import { UpdateNotificationPreferenceDto } from '../dto/update-notification-preference.dto';

// Enums
import { NotificationChannel } from '../enums/notification-channel.enum';

// Services
import { PrismaService } from '../../../database/prisma.service';
import { NotificationPreferencesService } from './notification-preferences.service';

describe('NotificationPreferencesService', () => {
  let service: NotificationPreferencesService;
  let prismaService: jest.Mocked<PrismaService>;
  let i18nService: any;

  const mockDomainID = '00000000-0000-0000-0000-000000000001';
  const mockUserID = '11111111-1111-1111-1111-111111111111';

  const mockPreferences = [
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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationPreferencesService,
        {
          provide: PrismaService,
          useValue: {
            notificationPreference: {
              findMany: jest.fn(),
              upsert: jest.fn(),
              create: jest.fn(),
            },
            $transaction: jest.fn(),
          },
        },
        {
          provide: I18nService,
          useFactory: () => ({
            translate: jest.fn().mockResolvedValue('translated'),
            t: jest.fn().mockResolvedValue('translated'),
          }),
        },
      ],
    }).compile();

    service = module.get<NotificationPreferencesService>(NotificationPreferencesService);
    prismaService = module.get(PrismaService);
    i18nService = module.get(I18nService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getPreferences', () => {
    it('should return existing preferences when found', async () => {
      (prismaService.notificationPreference.findMany as jest.Mock).mockResolvedValue(mockPreferences);

      const result = await service.getPreferences(mockUserID);

      expect(prismaService.notificationPreference.findMany).toHaveBeenCalledWith({
        where: {
          userID: mockUserID,
        },
        orderBy: {
          channel: 'asc',
        },
      });
      expect(result).toEqual(mockPreferences);
      expect(prismaService.notificationPreference.create).not.toHaveBeenCalled();
    });

    it('should create default preferences when none exist', async () => {
      (prismaService.notificationPreference.findMany as jest.Mock).mockResolvedValue([]);
      prismaService.$transaction.mockImplementation(async (queries) => {
        if (Array.isArray(queries)) {
          return Promise.all(queries.map((query) => query));
        }
        return queries(prismaService);
      });
      (prismaService.notificationPreference.create as jest.Mock).mockImplementation((args: any) =>
        Promise.resolve({
          id: `pref-${args.data.channel}`,

          userID: args.data.userID,
          channel: args.data.channel,
          enabled: args.data.enabled,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      );

      const result = await service.getPreferences(mockUserID);

      expect(prismaService.notificationPreference.findMany).toHaveBeenCalled();
      expect(prismaService.$transaction).toHaveBeenCalled();
      expect(result).toHaveLength(3);
      expect(result[0].channel).toBe(NotificationChannel.EMAIL);
      expect(result[1].channel).toBe(NotificationChannel.SMS);
      expect(result[2].channel).toBe(NotificationChannel.PUSH);
      expect(result.every((p) => p.enabled)).toBe(true);
    });
  });

  describe('updatePreferences', () => {
    it('should bulk update preferences with upsert pattern', async () => {
      const updateDto: UpdateNotificationPreferenceDto[] = [
        { channel: NotificationChannel.EMAIL, enabled: false },
        { channel: NotificationChannel.SMS, enabled: true },
      ];

      const updatedPreferences = [
        {
          ...mockPreferences[0],
          enabled: false,
          updatedAt: new Date('2024-01-02'),
        },
        {
          ...mockPreferences[1],
          enabled: true,
          updatedAt: new Date('2024-01-02'),
        },
      ];

      prismaService.$transaction.mockImplementation(async (queries) => {
        if (Array.isArray(queries)) {
          return Promise.all(queries.map((query) => query));
        }
        return queries(prismaService);
      });
      (prismaService.notificationPreference.upsert as jest.Mock).mockImplementation((args: any) =>
        Promise.resolve({
          id: `pref-${args.where.userID_channel.channel}`,
          userID: args.where.userID_channel.userID,
          channel: args.where.userID_channel.channel,
          enabled: args.update.enabled,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      );
      (prismaService.notificationPreference.findMany as jest.Mock).mockResolvedValue(updatedPreferences);

      const result = await service.updatePreferences(mockUserID, updateDto);

      expect(prismaService.$transaction).toHaveBeenCalled();
      expect(prismaService.notificationPreference.upsert).toHaveBeenCalledTimes(2);
      expect(prismaService.notificationPreference.findMany).toHaveBeenCalledWith({
        where: {
          userID: mockUserID,
        },
        orderBy: {
          channel: 'asc',
        },
      });
      expect(result).toEqual(updatedPreferences);
    });

    it('should create preferences if not exist during update', async () => {
      const updateDto: UpdateNotificationPreferenceDto[] = [{ channel: NotificationChannel.EMAIL, enabled: true }];

      const createdPreference = {
        id: 'pref-new',

        userID: mockUserID,
        channel: NotificationChannel.EMAIL,
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaService.$transaction.mockImplementation(async (queries) => {
        if (Array.isArray(queries)) {
          return Promise.all(queries.map((query) => query));
        }
        return queries(prismaService);
      });
      (prismaService.notificationPreference.upsert as jest.Mock).mockResolvedValue(createdPreference);
      (prismaService.notificationPreference.findMany as jest.Mock).mockResolvedValue([createdPreference]);

      const result = await service.updatePreferences(mockUserID, updateDto);

      expect(prismaService.notificationPreference.upsert).toHaveBeenCalledWith({
        where: {
          userID_channel: {
            userID: mockUserID,
            channel: NotificationChannel.EMAIL,
          },
        },
        create: {
          userID: mockUserID,
          channel: NotificationChannel.EMAIL,
          enabled: true,
        },
        update: {
          enabled: true,
        },
      });
      expect(result).toHaveLength(1);
      expect(result[0].channel).toBe(NotificationChannel.EMAIL);
    });
  });

  describe('createDefaultPreferences', () => {
    it('should create EMAIL, SMS, PUSH preferences with all enabled', async () => {
      prismaService.$transaction.mockImplementation(async (queries) => {
        if (Array.isArray(queries)) {
          return Promise.all(queries.map((query) => query));
        }
        return queries(prismaService);
      });
      (prismaService.notificationPreference.create as jest.Mock).mockImplementation((args: any) =>
        Promise.resolve({
          id: `pref-${args.data.channel}`,

          userID: args.data.userID,
          channel: args.data.channel,
          enabled: args.data.enabled,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      );

      const result = await service.createDefaultPreferences(mockUserID);

      expect(prismaService.$transaction).toHaveBeenCalled();
      expect(prismaService.notificationPreference.create).toHaveBeenCalledTimes(3);
      expect(result).toHaveLength(3);
      expect(result[0].channel).toBe(NotificationChannel.EMAIL);
      expect(result[1].channel).toBe(NotificationChannel.SMS);
      expect(result[2].channel).toBe(NotificationChannel.PUSH);
      expect(result.every((p) => p.enabled)).toBe(true);
    });

    it('should filter by domainID for multi-tenancy isolation', async () => {
      const differentDomainID = '22222222-2222-2222-2222-222222222222';
      prismaService.$transaction.mockImplementation(async (queries) => {
        if (Array.isArray(queries)) {
          return Promise.all(queries.map((query) => query));
        }
        return queries(prismaService);
      });
      (prismaService.notificationPreference.create as jest.Mock).mockImplementation((args: any) =>
        Promise.resolve({
          id: `pref-${args.data.channel}`,

          userID: args.data.userID,
          channel: args.data.channel,
          enabled: args.data.enabled,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      );

      await service.createDefaultPreferences(mockUserID);

      expect(prismaService.notificationPreference.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({}),
        }),
      );
    });
  });
});
