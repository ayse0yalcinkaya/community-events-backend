// Libraries
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtStrategy } from './jwt.strategy';
import { I18nService } from 'nestjs-i18n';

// Interfaces
import { JwtPayload } from '../interfaces/jwt-payload.interface';

// Services
import { PrismaService } from '../../../database/prisma.service';
describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let prismaService: PrismaService;
  let configService: ConfigService;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'JWT_SECRET') return 'test-secret-key-min-32-characters-long';
      if (key === 'JWT_ACCESS_EXPIRATION') return '15m';
      return null;
    }),
  };

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
    },
  };

  const mockI18nService = {
    translate: jest.fn(async () => 'User not found or has been deleted'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: I18nService,
          useValue: mockI18nService,
        },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
    prismaService = module.get<PrismaService>(PrismaService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    mockI18nService.translate.mockClear();
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('validate', () => {
    const validPayload: JwtPayload = {
      sub: '123e4567-e89b-12d3-a456-426614174000',
      phoneNumber: '+905551234567',
      roles: ['admin'],
      userType: 'ADMIN',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    };

    it('should return user payload when user exists and not deleted', async () => {
      // Arrange
      const mockUser = {
        id: validPayload.sub,
        deletedAt: null,
      };
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      // Act
      const result = await strategy.validate(validPayload);

      // Assert
      expect(result).toEqual(validPayload);
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: validPayload.sub },
        select: {
          id: true,
          deletedAt: true,
        },
      });
    });

    it('should throw UnauthorizedException when user not found', async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(strategy.validate(validPayload)).rejects.toThrow(UnauthorizedException);
      await expect(strategy.validate(validPayload)).rejects.toThrow('User not found or has been deleted');
      expect(mockI18nService.translate).toHaveBeenCalledWith('errors.USER_NOT_FOUND_OR_DELETED');
    });

    it('should throw UnauthorizedException when user is soft-deleted', async () => {
      // Arrange
      const mockDeletedUser = {
        id: validPayload.sub,
        deletedAt: new Date(),
      };
      mockPrismaService.user.findUnique.mockResolvedValue(mockDeletedUser);

      // Act & Assert
      await expect(strategy.validate(validPayload)).rejects.toThrow(UnauthorizedException);
      await expect(strategy.validate(validPayload)).rejects.toThrow('User not found or has been deleted');
      expect(mockI18nService.translate).toHaveBeenCalledWith('errors.USER_NOT_FOUND_OR_DELETED');
    });

    it('should validate payload structure with all required fields', async () => {
      // Arrange
      const mockUser = {
        id: validPayload.sub,
        deletedAt: null,
      };
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      // Act
      const result = await strategy.validate(validPayload);

      // Assert - Verify all required fields are present
      expect(result).toHaveProperty('sub');
      expect(result).toHaveProperty('phoneNumber');
      expect(result).toHaveProperty('roles');
      expect(result).toHaveProperty('iat');
      expect(result).toHaveProperty('exp');
      expect(typeof result?.sub).toBe('string');
      expect(typeof result?.phoneNumber).toBe('string');
      expect(Array.isArray(result?.roles)).toBe(true);
      expect(typeof result?.iat).toBe('number');
      expect(typeof result?.exp).toBe('number');
    });

    it('should handle multiple roles in payload', async () => {
      // Arrange
      const multiRolePayload: JwtPayload = {
        ...validPayload,
        roles: ['admin', 'staff', 'manager'],
      };
      const mockUser = {
        id: multiRolePayload.sub,
        deletedAt: null,
      };
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      // Act
      const result = await strategy.validate(multiRolePayload);

      // Assert
      expect(result?.roles).toEqual(['admin', 'staff', 'manager']);
      expect(result?.roles).toHaveLength(3);
    });
  });
});
