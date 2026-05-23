// Libraries
import { IsEnum, IsBoolean } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

import { NotificationChannel } from '../enums/notification-channel.enum.js';
import { NotificationType } from '../enums/notification-type.enum';

export class UpdateNotificationPreferenceDto {
  @IsEnum(NotificationType, {
    message: i18nValidationMessage('validation.IS_ENUM'),
  })
  type!: NotificationType;

  @IsEnum(NotificationChannel, {
    message: i18nValidationMessage('validation.IS_ENUM'),
  })
  channel!: NotificationChannel;

  @IsBoolean({ message: i18nValidationMessage('validation.IS_BOOLEAN') })
  enabled!: boolean;
}
