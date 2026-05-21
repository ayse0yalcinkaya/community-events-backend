// Libraries
import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { I18nService } from 'nestjs-i18n';

// Enums
import { Platform } from '../enums/platform.enum';

// Services
import { PrismaService } from '../../../database/prisma.service';
import { DeviceTokenService } from './device-token.service';

describe('DeviceTokenService', () => {
  let service: DeviceTokenService;
  let prismaService: jest.Mocked<PrismaService>;
  let i18nService: any;

  const mockDomainID = '00000000-0000-0000-0000-000000000001';
  const mockUserID = '11111111-1111-1111-1111-111111111111';
  const mockToken = 'fcm-device-token-123456789';

  const mockDeviceToken = {
    id: 'token-id-1',

    userID: mockUserID,
    token: mockToken,
    platform: Platform.iOS,
    createdAt: new Date('2024-01-01'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeviceTokenService,
        {
          provide: PrismaService,
          useValue: {
            deviceToken: {
              findUnique: jest.fn(),
              create: jest.fn(),
              findMany: jest.fn(),
              delete: jest.fn(),
            },
          },
        },
        {
          provide: I18nService,
          useFactory: () => ({
            translate: jest.fn().mockResolvedValue('Error'),
            t: jest.fn().mockResolvedValue('Error'),
          }),
        },
      ],
    }).compile();

    service = module.get<DeviceTokenService>(DeviceTokenService);
    prismaService = module.get(PrismaService);
    i18nService = module.get(I18nService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('registerToken', () => {
    it('should register new device token successfully', async () => {
      (prismaService.deviceToken.findUnique as jest.Mock).mockResolvedValue(null);
      (prismaService.deviceToken.create as jest.Mock).mockResolvedValue(mockDeviceToken);

      const result = await service.registerToken(mockUserID, mockToken, Platform.iOS);

      expect(prismaService.deviceToken.findUnique).toHaveBeenCalledWith({
        where: { token: mockToken },
      });
      expect(prismaService.deviceToken.create).toHaveBeenCalledWith({
        data: {
          userID: mockUserID,
          token: mockToken,
          platform: Platform.iOS,
        },
      });
      expect(result).toEqual(mockDeviceToken);
    });

    it('should return existing token if already registered for same user', async () => {
      (prismaService.deviceToken.findUnique as jest.Mock).mockResolvedValue(mockDeviceToken);

      const result = await service.registerToken(mockUserID, mockToken, Platform.iOS);

      expect(prismaService.deviceToken.findUnique).toHaveBeenCalled();
      expect(prismaService.deviceToken.create).not.toHaveBeenCalled();
      expect(result).toEqual(mockDeviceToken);
    });

    it('should update platform if token exists with different platform', async () => {
      const existingToken = { ...mockDeviceToken, platform: Platform.Android };
      const updatedToken = { ...mockDeviceToken, platform: Platform.iOS };

      (prismaService.deviceToken.findUnique as jest.Mock).mockResolvedValue(existingToken);
      prismaService.deviceToken.update = jest.fn().mockResolvedValue(updatedToken);

      const result = await service.registerToken(mockUserID, mockToken, Platform.iOS);

      expect(prismaService.deviceToken.update).toHaveBeenCalledWith({
        where: { id: existingToken.id },
        data: { platform: Platform.iOS },
      });
      expect(result).toEqual(updatedToken);
    });

    it('should throw ConflictException if token exists for different user', async () => {
      const differentUserToken = {
        ...mockDeviceToken,
        userID: '22222222-2222-2222-2222-222222222222',
      };

      (prismaService.deviceToken.findUnique as jest.Mock).mockResolvedValue(differentUserToken);

      await expect(service.registerToken(mockUserID, mockToken, Platform.iOS)).rejects.toThrow(ConflictException);

      expect(prismaService.deviceToken.create).not.toHaveBeenCalled();
    });
  });

  describe('getUserTokens', () => {
    it('should return all device tokens for user', async () => {
      const tokens = [mockDeviceToken, { ...mockDeviceToken, id: 'token-id-2' }];

      (prismaService.deviceToken.findMany as jest.Mock).mockResolvedValue(tokens);

      const result = await service.getUserTokens(mockUserID);

      expect(prismaService.deviceToken.findMany).toHaveBeenCalledWith({
        where: {
          userID: mockUserID,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
      expect(result).toEqual(tokens);
    });

    it('should return empty array if no tokens found', async () => {
      (prismaService.deviceToken.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getUserTokens(mockUserID);

      expect(result).toEqual([]);
    });

    it('should filter by userID', async () => {
      (prismaService.deviceToken.findMany as jest.Mock).mockResolvedValue([]);

      await service.getUserTokens(mockUserID);

      expect(prismaService.deviceToken.findMany).toHaveBeenCalledWith({
        where: {
          userID: mockUserID,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    });
  });

  describe('invalidateToken', () => {
    it('should delete token successfully', async () => {
      (prismaService.deviceToken.delete as jest.Mock).mockResolvedValue(mockDeviceToken);

      await service.invalidateToken(mockToken);

      expect(prismaService.deviceToken.delete).toHaveBeenCalledWith({
        where: { token: mockToken },
      });
    });

    it('should handle token not found gracefully (idempotent)', async () => {
      const error = new Error('Record not found');
      (error as any).code = 'P2025';
      (prismaService.deviceToken.delete as jest.Mock).mockRejectedValue(error);

      await service.invalidateToken(mockToken);

      expect(prismaService.deviceToken.delete).toHaveBeenCalled();
      // Should not throw error
    });

    it('should throw error for other database errors', async () => {
      const error = new Error('Database error');
      (error as any).code = 'P2000';
      (prismaService.deviceToken.delete as jest.Mock).mockRejectedValue(error);

      await expect(service.invalidateToken(mockToken)).rejects.toThrow('Database error');
    });
  });
});
