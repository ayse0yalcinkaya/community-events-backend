// Libraries
import { IsEnum, IsBoolean } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

import { NotificationChannel } from '../enums/notification-channel.enum.js';

export class UpdateNotificationPreferenceDto {
  @IsEnum(NotificationChannel, {
    message: i18nValidationMessage('validation.IS_ENUM'),
  })
  channel!: NotificationChannel;

  @IsBoolean({ message: i18nValidationMessage('validation.IS_BOOLEAN') })
  enabled!: boolean;
}
