// Libraries
import { Expose } from 'class-transformer';

// Enums
import { NotificationChannel } from '../enums/notification-channel.enum';

/**
 * Response DTO for notification history
 * Used by GET /users/me/notifications endpoint
 *
 * Fields exposed:
 * - id: Notification UUID
 * - type: Notification type
 * - channel: Notification channel (EMAIL, SMS, PUSH)
 * - title: Notification title
 * - message: Notification message
 * - sent: Whether notification was sent successfully
 * - sentAt: Timestamp when notification was sent (null if not sent)
 * - createdAt: Timestamp when notification record was created
 */
export class NotificationResDto {
  @Expose()
  id!: string;

  @Expose()
  type!: string;

  @Expose()
  channel!: NotificationChannel;

  @Expose()
  title!: string | null;

  @Expose()
  message!: string;

  @Expose()
  sent!: boolean;

  @Expose()
  sentAt!: Date | null;

  @Expose()
  read!: boolean;

  @Expose()
  createdAt!: Date;
}
