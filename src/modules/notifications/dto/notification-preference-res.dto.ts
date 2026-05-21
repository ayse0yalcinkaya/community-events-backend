// Libraries
import { Expose } from 'class-transformer';

// Enums
import { NotificationChannel } from '../enums/notification-channel.enum';

export class NotificationPreferenceResDto {
  @Expose()
  channel!: NotificationChannel;

  @Expose()
  enabled!: boolean;
}
