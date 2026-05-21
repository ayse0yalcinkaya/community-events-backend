// Libraries
import { randomUUID } from 'crypto';
import { NotificationType } from '../../src/modules/notifications/enums/notification-type.enum';
import { NotificationChannel } from '../../src/modules/notifications/enums/notification-channel.enum';

export interface NotificationInput {
  userID?: string;
  type?: number;
  channel?: number;
  title?: string;
  message?: string;
  data?: any;
  sent?: boolean;
  sentAt?: Date | null;
}

/**
 * Notification Factory
 *
 * Creates notification records with realistic test data
 * Supports various notification types and channels
 */
export class NotificationFactory {
  // Use Enum values
  private static notificationTypes = [
    NotificationType.VERIFICATION,
    NotificationType.PASSWORD_RESET,
    NotificationType.OTP,
    NotificationType.GENERAL,
    NotificationType.ALERT,
    NotificationType.MARKETING,
  ];

  private static channels = [NotificationChannel.EMAIL, NotificationChannel.SMS, NotificationChannel.PUSH];

  /*
   * Map types to generic titles/messages since specific subtypes (WELCOME, etc.)
   * are not in the database Enum.
   */
  private static titles: Record<number, string> = {
    [NotificationType.VERIFICATION]: 'Verification Required',
    [NotificationType.PASSWORD_RESET]: 'Password Reset',
    [NotificationType.OTP]: 'One-Time Password',
    [NotificationType.GENERAL]: 'General Notification',
    [NotificationType.ALERT]: 'System Alert',
    [NotificationType.MARKETING]: 'Special Offer',
  };

  private static messages: Record<number, string> = {
    [NotificationType.VERIFICATION]: 'Please verify your account to continue.',
    [NotificationType.PASSWORD_RESET]: 'You have requested a password reset.',
    [NotificationType.OTP]: 'Your verification code is 123456.',
    [NotificationType.GENERAL]: 'We have an update regarding your account.',
    [NotificationType.ALERT]: 'Important system alert: Maintenance scheduled.',
    [NotificationType.MARKETING]: 'Check out our latest premium features!',
  };

  /**
   * Generate a single notification
   */
  static generate(overrides: NotificationInput = {}): any {
    const type = overrides.type !== undefined ? overrides.type : this.getRandomElement(this.notificationTypes);
    const channel = overrides.channel !== undefined ? overrides.channel : this.getRandomElement(this.channels);

    // Some notifications are more likely to be sent than others
    const sent = overrides.sent !== undefined ? overrides.sent : Math.random() > 0.3; // 70% chance of being sent

    const now = new Date();
    const sentAt = sent ? new Date(now.getTime() - Math.random() * 24 * 60 * 60 * 1000) : null;

    return {
      userID: overrides.userID || randomUUID(),
      type,
      channel,
      title: overrides.title || this.titles[type] || 'Notification',
      message: overrides.message || this.messages[type] || 'You have a new notification',
      data: overrides.data || null,
      sent,
      sentAt: overrides.sentAt !== undefined ? overrides.sentAt : sentAt,
      createdAt: now,
    };
  }

  /**
   * Generate multiple notifications
   */
  static generateMany(count: number, overrides: NotificationInput = {}): any[] {
    return Array.from({ length: count }, () => this.generate(overrides));
  }

  /**
   * Generate notifications for specific user
   */
  static generateForUser(userID: string, count: number = 5): any[] {
    return this.generateMany(count, { userID });
  }

  /**
   * Get random element from array
   */
  private static getRandomElement<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
  }
}
