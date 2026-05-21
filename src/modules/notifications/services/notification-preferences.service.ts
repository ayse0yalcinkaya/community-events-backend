// Libraries
import { Injectable, Logger } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { NotificationPreference } from '@prisma/client';

// DTOs
import { UpdateNotificationPreferenceDto } from '../dto/update-notification-preference.dto';

// Enums
import { NotificationChannel } from '../enums/notification-channel.enum';

// Services
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class NotificationPreferencesService {
  private readonly logger = new Logger(NotificationPreferencesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly i18n: I18nService,
  ) {}

  /**
   * Get user notification preferences
   * Creates default preferences if not exist (all channels enabled)
   * @param userID User UUID
   * @returns Array of notification preferences
   */
  async getPreferences(userID: string): Promise<NotificationPreference[]> {
    this.logger.log(`Getting preferences for user: ${userID}`);

    // Find existing preferences
    const preferences = await this.prisma.notificationPreference.findMany({
      where: {
        userID,
      },
      orderBy: {
        channel: 'asc',
      },
    });

    // If preferences exist, return them
    if (preferences.length > 0) {
      this.logger.log(`Found ${preferences.length} existing preferences`);
      return preferences;
    }

    // If no preferences exist, create default preferences (all channels enabled)
    this.logger.log('No preferences found, creating default preferences');
    return await this.createDefaultPreferences(userID);
  }

  /**
   * Bulk update notification preferences
   * Upsert pattern: create if not exist, update if exist
   * @param userID User UUID
   * @param preferences Array of preference updates
   * @returns Updated notification preferences array
   */
  async updatePreferences(
    userID: string,
    preferences: UpdateNotificationPreferenceDto[],
  ): Promise<NotificationPreference[]> {
    this.logger.log(`Updating preferences for user: ${userID} (${preferences.length} preferences)`);

    // Use transaction for atomic updates
    const updatedPreferences = await this.prisma.$transaction(
      preferences.map((pref) =>
        this.prisma.notificationPreference.upsert({
          where: {
            userID_channel: {
              userID,
              channel: pref.channel,
            },
          },
          create: {
            userID,
            channel: pref.channel,
            enabled: pref.enabled,
          },
          update: {
            enabled: pref.enabled,
          },
        }),
      ),
    );

    this.logger.log(`Successfully updated ${updatedPreferences.length} preferences`);

    // Return all preferences for the user (ordered by channel)
    return await this.prisma.notificationPreference.findMany({
      where: {
        userID,
      },
      orderBy: {
        channel: 'asc',
      },
    });
  }

  /**
   * Create default notification preferences for new user
   * Default: All channels enabled (EMAIL, SMS, PUSH)
   * @param userID User UUID
   * @returns Created notification preferences array
   */
  async createDefaultPreferences(userID: string): Promise<NotificationPreference[]> {
    this.logger.log(`Creating default preferences for user: ${userID}`);

    const channels = [NotificationChannel.EMAIL, NotificationChannel.SMS, NotificationChannel.PUSH];

    // Create all default preferences in a transaction
    const createdPreferences = await this.prisma.$transaction(
      channels.map((channel) =>
        this.prisma.notificationPreference.create({
          data: {
            userID,
            channel,
            enabled: true, // All channels enabled by default
          },
        }),
      ),
    );

    this.logger.log(`Created ${createdPreferences.length} default preferences (all enabled)`);

    return createdPreferences;
  }
}
