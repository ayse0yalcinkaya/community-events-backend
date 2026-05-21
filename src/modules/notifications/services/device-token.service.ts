// Libraries
import { Injectable, Logger, ConflictException } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { DeviceToken } from '@prisma/client';

// Enums
import { Platform } from '../enums/platform.enum';

// Services
import { PrismaService } from '../../../database/prisma.service';

/**
 * Device Token Service
 *
 * Service for managing device tokens for push notifications.
 * Handles token registration, retrieval, and invalidation.
 *
 * Features:
 * - Token registration with uniqueness check
 * - Token retrieval by user
 * - Token invalidation (hard delete)
 */
@Injectable()
export class DeviceTokenService {
  private readonly logger = new Logger(DeviceTokenService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly i18n: I18nService,
  ) {}

  /**
   * Register device token for user
   * Creates new token or updates existing token if already registered
   *
   * @param userID User UUID
   * @param token FCM device token
   * @param platform Platform enum (iOS or Android)
   * @returns Created or updated DeviceToken entity
   * @throws ConflictException if token already exists for different user
   */
  async registerToken(userID: string, token: string, platform: Platform): Promise<DeviceToken> {
    this.logger.log(`Registering device token for user: ${userID} (platform: ${platform})`);

    try {
      // Check if token already exists
      const existingToken = await this.prisma.deviceToken.findUnique({
        where: { token },
      });

      if (existingToken) {
        // If token exists for same user, update platform if changed
        if (existingToken.userID === userID) {
          this.logger.log(`Token already registered for user ${userID}, updating platform if changed`);

          // Update platform if changed
          if (existingToken.platform !== platform) {
            return await this.prisma.deviceToken.update({
              where: { id: existingToken.id },
              data: { platform },
            });
          }

          // Return existing token
          return existingToken;
        }

        // Token exists for different user - this is a conflict
        this.logger.warn(`Token conflict: Token already registered for different user (${existingToken.userID})`);
        throw new ConflictException(await this.i18n.translate('common.ERROR'));
      }

      // Create new token
      const deviceToken = await this.prisma.deviceToken.create({
        data: {
          userID,
          token,
          platform,
        },
      });

      this.logger.log(`Device token registered successfully (id: ${deviceToken.id})`);

      return deviceToken;
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }

      this.logger.error(
        `Failed to register device token: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );

      throw error;
    }
  }

  /**
   * Get all active device tokens for user
   *
   * @param userID User UUID
   * @returns Array of DeviceToken entities
   */
  async getUserTokens(userID: string): Promise<DeviceToken[]> {
    this.logger.log(`Getting device tokens for user: ${userID}`);

    const tokens = await this.prisma.deviceToken.findMany({
      where: {
        userID,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    this.logger.log(`Found ${tokens.length} device tokens for user ${userID}`);

    return tokens;
  }

  /**
   * Invalidate device token (hard delete)
   * Removes token from database (e.g., when Firebase reports invalid token)
   *
   * @param token FCM device token to invalidate
   * @returns Promise resolving to void
   */
  async invalidateToken(token: string): Promise<void> {
    this.logger.log(`Invalidating device token: ${token.substring(0, 20)}...`);

    try {
      await this.prisma.deviceToken.delete({
        where: { token },
      });

      this.logger.log(`Device token invalidated successfully`);
    } catch (error: any) {
      // If token not found, log warning but don't throw (idempotent operation)
      if (error.code === 'P2025') {
        this.logger.warn(`Token not found for invalidation: ${token.substring(0, 20)}...`);
        return;
      }

      this.logger.error(
        `Failed to invalidate device token: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );

      throw error;
    }
  }
}
