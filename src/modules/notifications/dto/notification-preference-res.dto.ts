// Libraries
import { Expose } from 'class-transformer';

// Enums
import { NotificationChannel } from '../enums/notification-channel.enum';
import { NotificationType } from '../enums/notification-type.enum';

export class NotificationPreferenceResDto {
  @Expose()
  type!: NotificationType;

  @Expose()
  channel!: NotificationChannel;

  @Expose()
  enabled!: boolean;
}
