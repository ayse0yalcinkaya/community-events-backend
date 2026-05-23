// Libraries
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import * as Sentry from '@sentry/node';
import { User, NotificationSenderType, NotificationStatus, Prisma } from '@prisma/client';

// DTOs
import { QueryNotificationDto } from '../dto/query-notification.dto';

// Enums
import { NotificationChannel } from '../enums/notification-channel.enum';
import { NotificationType } from '../enums/notification-type.enum';
import { SmsType } from '../../sms/enums/sms-type.enum';

// Services
import { PrismaService } from '../../../database/prisma.service';
import { NotificationPreferencesService } from './notification-preferences.service';
import { MailService } from '../../mail/services/mail.service';
import { SmsService } from '../../sms/services/sms.service';
import { FirebaseService } from './firebase.service';
import { DeviceTokenService } from './device-token.service';
/**
 * Notification Service
 *
 * Unified notification service that orchestrates multi-channel notification sending
 * based on user preferences. Supports EMAIL, SMS, and PUSH channels.
 *
 * Features:
 * - Multi-channel sending (EMAIL, SMS, PUSH)
 * - User preference filtering (only enabled channels)
 * - Partial success handling (one channel failure doesn't block others)
 * - Async fire-and-forget pattern (non-blocking)
 * - Notification history tracking
 */
@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationPreferencesService: NotificationPreferencesService,
    private readonly mailService: MailService,
    private readonly smsService: SmsService,
    private readonly firebaseService: FirebaseService,
    private readonly deviceTokenService: DeviceTokenService,
    private readonly i18n: I18nService,
  ) {}

  /**
   * Send notification to user via enabled channels
   * Fetches user preferences, filters enabled channels, and sends via each channel
   * Uses async fire-and-forget pattern (non-blocking)
   *
   * @param userID User UUID
   * @param type Notification type (verification, password-reset, otp, general, etc.)
   * @param title Notification title
   * @param message Notification message content
   * @param data Optional data object (JSON) for template rendering or additional context
   * @returns Promise resolving to void (fire-and-forget pattern)
   */
  async send(userID: string, type: NotificationType, title: string, message: string, data?: object): Promise<void> {
    this.logger.log(`Sending notification to user: ${userID} (type: ${type})`);

    try {
      // Fetch user to get email and phoneNumber
      const user = await this.prisma.user.findFirst({
        where: {
          id: userID,
          deletedAt: null, // Exclude soft-deleted users
        },
        select: {
          id: true,
          email: true,
          phoneNumber: true,
        },
      });

      if (!user) {
        throw new NotFoundException(await this.i18n.translate('users.USER_NOT_FOUND'));
      }

      // Fetch user notification preferences
      const preferences = await this.notificationPreferencesService.getPreferences(userID);

      // Filter enabled channels
      const enabledChannels = preferences.filter((pref) => pref.type === type && pref.enabled).map((pref) => pref.channel);

      this.logger.log(`Enabled channels for user ${userID}: ${enabledChannels.join(', ')}`);

      // Avoid external email/SMS/push retries during Jest runs.
      if (process.env.SKIP_EXTERNAL_NOTIFICATION_DELIVERY === 'true') {
        await Promise.all(
          enabledChannels.map((channel) => this.createNotificationRecord(user.id, type, channel, title, message, data, true)),
        );
        return;
      }

      // Send to each enabled channel (async fire-and-forget pattern)
      // Don't await - let each channel send independently
      enabledChannels.forEach((channel) => {
        // Fire-and-forget: Don't await, catch errors internally
        this.sendToChannel(channel, user, type, title, message, data).catch((error) => {
          // Error already logged in sendToChannel, just prevent unhandled rejection
          this.logger.error(
            `Unhandled error in channel ${channel} for user ${userID}`,
            error instanceof Error ? error.stack : String(error),
          );
        });
      });
    } catch (error) {
      // Log error but don't throw (fire-and-forget pattern)
      this.logger.error(
        `Failed to send notification to user ${userID}: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );

      // Send to Sentry for error tracking
      try {
        Sentry.captureException(error, {
          tags: {
            service: 'NotificationService',
            method: 'send',
            userID,
            type,
          },
          extra: {
            title,
            message,
            data,
          },
        });
      } catch (sentryError) {
        // Silently fail if Sentry is not initialized (test environment)
        this.logger.warn('Failed to capture exception in Sentry:', sentryError);
      }
    }
  }

  /**
   * Send notification to a specific channel
   * Private method that handles channel-specific sending logic
   *
   * @param channel Notification channel (EMAIL, SMS, PUSH)
   * @param user User entity (with email and phoneNumber)
   * @param type Notification type
   * @param title Notification title
   * @param message Notification message
   * @param data Optional data object
   */
  private async sendToChannel(
    channel: NotificationChannel,
    user: Pick<User, 'id' | 'email' | 'phoneNumber'>,
    type: NotificationType,
    title: string,
    message: string,
    data?: object,
  ): Promise<void> {
    try {
      switch (channel) {
        case NotificationChannel.EMAIL:
          await this.sendToEmailChannel(user, type, title, message, data);
          break;
        case NotificationChannel.SMS:
          await this.sendToSmsChannel(user, type, title, message, data);
          break;
        case NotificationChannel.PUSH:
          await this.sendToPushChannel(user, type, title, message, data);
          break;
        default:
          this.logger.warn(`Unknown channel: ${channel}`);
      }
    } catch (error) {
      // Error handling is done in individual channel methods
      // This catch is just for safety
      this.logger.error(
        `Failed to send to channel ${channel} for user ${user.id}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  /**
   * Send notification via EMAIL channel
   * Uses MailService.sendEmail() or MailService.sendTemplateEmail()
   * Creates Notification record with sent status
   *
   * @param user User entity
   * @param domainID Domain UUID
   * @param type Notification type
   * @param title Notification title
   * @param message Notification message
   * @param data Optional data object (for template rendering)
   */
  private async sendToEmailChannel(
    user: Pick<User, 'id' | 'email' | 'phoneNumber'>,

    type: NotificationType,
    title: string,
    message: string,
    data?: object,
  ): Promise<void> {
    if (!user.email) {
      this.logger.warn(`Cannot send email to user ${user.id}: email not set`);
      // Create notification record with sent: false
      await this.createNotificationRecord(
        user.id,

        type,
        NotificationChannel.EMAIL,
        title,
        message,
        data,
        false,
        'Email not set',
      );
      return;
    }

    try {
      // Use template email if data is provided, otherwise use plain email
      if (data) {
        // Try to use template if templateName is in data
        const templateName = (data as any).templateName;
        if (templateName) {
          await this.mailService.sendTemplateEmail(user.email, title, templateName, data);
        } else {
          // Use plain email with HTML content
          await this.mailService.sendEmail(user.email, title, message);
        }
      } else {
        // Use plain email
        await this.mailService.sendEmail(user.email, title, message);
      }

      // Create notification record with sent: true
      await this.createNotificationRecord(
        user.id,

        type,
        NotificationChannel.EMAIL,
        title,
        message,
        data,
        true,
      );

      this.logger.log(`Email notification sent successfully to user ${user.id} (email: ${user.email})`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Create notification record with sent: false
      await this.createNotificationRecord(
        user.id,

        type,
        NotificationChannel.EMAIL,
        title,
        message,
        data,
        false,
        errorMessage,
      );

      // Log error
      this.logger.error(
        `Failed to send email notification to user ${user.id}: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );

      // Send to Sentry
      try {
        Sentry.captureException(error, {
          tags: {
            service: 'NotificationService',
            method: 'sendToEmailChannel',
            userID: user.id,

            type,
            channel: NotificationChannel.EMAIL,
          },
        });
      } catch (sentryError) {
        this.logger.warn('Failed to capture exception in Sentry:', sentryError);
      }
    }
  }

  /**
   * Send notification via SMS channel
   * Uses SmsService.sendSms() with type: NOTIFICATION
   * Creates Notification record with sent status
   *
   * @param user User entity
   * @param domainID Domain UUID
   * @param type Notification type
   * @param title Notification title (not used for SMS)
   * @param message Notification message (SMS content)
   * @param data Optional data object
   */
  private async sendToSmsChannel(
    user: Pick<User, 'id' | 'email' | 'phoneNumber'>,

    type: NotificationType,
    title: string,
    message: string,
    data?: object,
  ): Promise<void> {
    if (!user.phoneNumber) {
      this.logger.warn(`Cannot send SMS to user ${user.id}: phoneNumber not set`);
      // Create notification record with sent: false
      await this.createNotificationRecord(
        user.id,

        type,
        NotificationChannel.SMS,
        title,
        message,
        data,
        false,
        'Phone number not set',
      );
      return;
    }

    try {
      // Send SMS via SmsService (type: NOTIFICATION)
      await this.smsService.sendSms(user.phoneNumber, message, SmsType.NOTIFICATION);

      // Create notification record with sent: true
      await this.createNotificationRecord(user.id, type, NotificationChannel.SMS, title, message, data, true);

      this.logger.log(`SMS notification sent successfully to user ${user.id} (phone: ${user.phoneNumber})`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Create notification record with sent: false
      await this.createNotificationRecord(
        user.id,

        type,
        NotificationChannel.SMS,
        title,
        message,
        data,
        false,
        errorMessage,
      );

      // Log error
      this.logger.error(
        `Failed to send SMS notification to user ${user.id}: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );

      // Send to Sentry
      try {
        Sentry.captureException(error, {
          tags: {
            service: 'NotificationService',
            method: 'sendToSmsChannel',
            userID: user.id,

            type,
            channel: NotificationChannel.SMS,
          },
        });
      } catch (sentryError) {
        this.logger.warn('Failed to capture exception in Sentry:', sentryError);
      }
    }
  }

  /**
   * Send notification via PUSH channel
   * Fetches user device tokens and sends push notification via FirebaseService
   * Handles partial success: one token failure doesn't block others
   *
   * @param user User entity
   * @param domainID Domain UUID
   * @param type Notification type
   * @param title Notification title
   * @param body Notification body/message
   * @param data Optional data object
   */
  private async sendToPushChannel(
    user: Pick<User, 'id' | 'email' | 'phoneNumber'>,

    type: NotificationType,
    title: string,
    message: string,
    data?: object,
  ): Promise<void> {
    // Check if Firebase is enabled (environment variable)
    const firebaseEnabled = process.env.FIREBASE_ENABLED === 'true';

    if (!firebaseEnabled) {
      this.logger.debug(`Firebase push notifications disabled, skipping PUSH channel for user ${user.id}`);
      // Create notification record with sent: false
      await this.createNotificationRecord(
        user.id,

        type,
        NotificationChannel.PUSH,
        title,
        message,
        data,
        false,
        'Firebase not enabled',
      );
      return;
    }

    try {
      // Fetch user device tokens
      const deviceTokens = await this.deviceTokenService.getUserTokens(user.id);

      if (deviceTokens.length === 0) {
        this.logger.debug(`No device tokens found for user ${user.id}, skipping PUSH channel`);
        // Create notification record with sent: false
        await this.createNotificationRecord(
          user.id,

          type,
          NotificationChannel.PUSH,
          title,
          message,
          data,
          false,
          'No device tokens registered',
        );
        return;
      }

      this.logger.log(`Sending push notification to ${deviceTokens.length} device(s) for user ${user.id}`);

      // Send push notification to each device token
      // Use async fire-and-forget pattern: don't await, handle errors individually
      const sendPromises = deviceTokens.map(async (deviceToken) => {
        try {
          await this.firebaseService.sendPush(deviceToken.token, title, message, data);

          // Create notification record with sent: true for this token
          await this.createNotificationRecord(
            user.id,

            type,
            NotificationChannel.PUSH,
            title,
            message,
            data,
            true,
            undefined,
          );

          this.logger.log(
            `Push notification sent successfully to device ${deviceToken.id} (platform: ${deviceToken.platform})`,
          );
        } catch (error: any) {
          // Handle invalid token error
          if (error.message === 'Invalid device token') {
            this.logger.warn(`Invalid device token detected: ${deviceToken.token.substring(0, 20)}..., invalidating`);

            // Invalidate token (remove from database)
            try {
              await this.deviceTokenService.invalidateToken(deviceToken.token);
            } catch (invalidateError) {
              this.logger.error(
                `Failed to invalidate token: ${invalidateError instanceof Error ? invalidateError.message : String(invalidateError)}`,
              );
            }
          }

          // Create notification record with sent: false for this token
          await this.createNotificationRecord(
            user.id,

            type,
            NotificationChannel.PUSH,
            title,
            message,
            data,
            false,
            error instanceof Error ? error.message : String(error),
          );

          // Log error but don't throw (partial success handling)
          this.logger.error(
            `Failed to send push notification to device ${deviceToken.id}: ${error instanceof Error ? error.message : String(error)}`,
          );

          // Log to Sentry (already logged in FirebaseService, but log here for context)
          try {
            Sentry.captureException(error, {
              tags: {
                module: 'NotificationService',
                action: 'sendToPushChannel',
                deviceTokenId: deviceToken.id,
                platform: deviceToken.platform,
              },
            });
          } catch (sentryError) {
            this.logger.warn('Failed to capture exception in Sentry:', sentryError);
          }
        }
      });

      // Wait for all promises to complete (but don't throw on individual failures)
      await Promise.allSettled(sendPromises);

      this.logger.log(`Push notification sending completed for user ${user.id} (${deviceTokens.length} device(s))`);
    } catch (error) {
      // Handle unexpected errors (e.g., database errors)
      this.logger.error(
        `Unexpected error in sendToPushChannel for user ${user.id}: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );

      // Create notification record with sent: false
      await this.createNotificationRecord(
        user.id,

        type,
        NotificationChannel.PUSH,
        title,
        message,
        data,
        false,
        error instanceof Error ? error.message : String(error),
      );

      // Log to Sentry
      try {
        Sentry.captureException(error, {
          tags: {
            module: 'NotificationService',
            action: 'sendToPushChannel',
            errorType: 'unexpected',
          },
        });
      } catch (sentryError) {
        this.logger.warn('Failed to capture exception in Sentry:', sentryError);
      }
    }
  }

  /**
   * Create Notification record in database
   * Helper method to track notification history
   *
   * @param userID User UUID
   * @param domainID Domain UUID
   * @param type Notification type
   * @param channel Notification channel
   * @param title Notification title
   * @param message Notification message
   * @param data Optional data object
   * @param sent Whether notification was sent successfully
   * @param errorMessage Optional error message if sent: false
   */
  private async createNotificationRecord(
    userID: string,

    type: NotificationType,
    channel: NotificationChannel,
    title: string,
    message: string,
    data?: object,
    sent: boolean = false,
    errorMessage?: string,
  ): Promise<void> {
    try {
      await this.prisma.notificationLog.create({
        data: {
          userID,
          type, // Integer enum value
          channel,
          title,
          message,
          data: data as any, // Fix for Prisma InputJsonValue typing
          sent,
          sentAt: sent ? new Date() : null,
        },
      });

      this.logger.debug(`Notification record created (user: ${userID}, channel: ${channel}, sent: ${sent})`);
    } catch (error) {
      // Log error but don't throw (notification sending should not fail due to DB error)
      this.logger.error(
        `Failed to create notification record: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );

      // Send to Sentry
      try {
        Sentry.captureException(error, {
          tags: {
            service: 'NotificationService',
            method: 'createNotificationRecord',
            userID,

            type,
            channel,
          },
        });
      } catch (sentryError) {
        this.logger.warn('Failed to capture exception in Sentry:', sentryError);
      }
    }
  }

  /**
   * Create In-App Notification (Tablo: Notification)
   */
  async createInAppNotification(
    userID: string,
    senderType: NotificationSenderType,
    subject: string,
    message: string,
    senderID?: string,
  ): Promise<void> {
    try {
      await this.prisma.notification.create({
        data: {
          userID,
          senderType,
          senderID,
          subject,
          message,
          read: false,
          status: NotificationStatus.SENT,
        },
      });
      this.logger.log(`In-app notification created for user ${userID}`);
    } catch (error) {
      this.logger.error(
        `Failed to create in-app notification: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Get notification history for a user with filtering and pagination
   */
  async getNotificationHistory(userID: string, query: QueryNotificationDto) {
    const where: Prisma.NotificationWhereInput = {
      userID,
    };

    // Search in subject and message
    if (query.search) {
      where.OR = [
        { subject: { contains: query.search, mode: 'insensitive' } },
        { message: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    // Filter by read status
    if (query.isRead !== undefined) {
      where.read = query.isRead;
    }

    // Filter by createdAt date range
    if (query.createdFrom || query.createdTo) {
      where.createdAt = {
        ...(query.createdFrom ? { gte: query.createdFrom } : {}),
        ...(query.createdTo ? { lte: query.createdTo } : {}),
      };
    }

    // Filter by updatedAt date range
    if (query.updatedFrom || query.updatedTo) {
      where.updatedAt = {
        ...(query.updatedFrom ? { gte: query.updatedFrom } : {}),
        ...(query.updatedTo ? { lte: query.updatedTo } : {}),
      };
    }

    // Sorting
    const orderBy: any = query.sortBy ? { [query.sortBy]: query.sortOrder || 'asc' } : { createdAt: 'desc' };

    const [items, count] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        skip: query.skip,
        take: query.take,
        orderBy,
      }),
      this.prisma.notification.count({ where }),
    ]);

    return { items, count };
  }

  /**
   * Mark a single notification as read
   * @param id Notification UUID
   * @param userID User UUID (for ownership verification)
   * @returns Updated notification
   * @throws NotFoundException if notification not found or doesn't belong to user
   */
  async markAsRead(id: string, userID: string) {
    const notification = await this.prisma.notification.findFirst({
      where: {
        id,
        userID,
      },
    });

    if (!notification) {
      throw new NotFoundException(await this.i18n.translate('notifications.NOT_FOUND'));
    }

    const updated = await this.prisma.notification.update({
      where: { id },
      data: {
        read: true,
        status: NotificationStatus.READ,
      },
    });

    this.logger.log(`Notification ${id} marked as read for user ${userID}`);
    return updated;
  }

  /**
   * Mark multiple notifications as read
   * @param ids Array of notification UUIDs
   * @param userID User UUID (for ownership verification)
   * @returns Object with updatedCount
   */
  async markManyAsRead(ids: string[], userID: string): Promise<{ updatedCount: number }> {
    const result = await this.prisma.notification.updateMany({
      where: {
        id: { in: ids },
        userID,
        read: false,
      },
      data: {
        read: true,
        status: NotificationStatus.READ,
      },
    });

    this.logger.log(`${result.count} notifications marked as read for user ${userID}`);
    return { updatedCount: result.count };
  }

  /**
   * Mark all unread notifications as read for a user
   * @param userID User UUID
   * @returns Object with updatedCount
   */
  async markAllAsRead(userID: string): Promise<{ updatedCount: number }> {
    const result = await this.prisma.notification.updateMany({
      where: {
        userID,
        read: false,
      },
      data: {
        read: true,
        status: NotificationStatus.READ,
      },
    });

    this.logger.log(`All notifications (${result.count}) marked as read for user ${userID}`);
    return { updatedCount: result.count };
  }
}
