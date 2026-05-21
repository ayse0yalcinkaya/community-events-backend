// Libraries
import { IsEnum, IsOptional, IsObject, IsString, MinLength, MaxLength, IsNotEmpty } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

// Enums
import { NotificationType } from '../enums/notification-type.enum';
/**
 * DTO for sending notification
 * Used by POST /notifications/send endpoint
 *
 * Validation rules:
 * - type: Required NotificationType enum (verification, password-reset, otp, general, alert, marketing)
 * - title: Required string, 1-200 characters
 * - message: Required string, 1-1000 characters
 * - data: Optional object (for template rendering or additional context)
 */
export class SendNotificationDto {
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_NOT_EMPTY') })
  userID!: string; // User UUID

  @IsEnum(NotificationType, {
    message: i18nValidationMessage('validation.IS_ENUM'),
  })
  type!: NotificationType; // Notification type

  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  @MinLength(1, { message: i18nValidationMessage('validation.MIN_LENGTH') })
  @MaxLength(200, { message: i18nValidationMessage('validation.MAX_LENGTH') })
  title!: string; // Notification title

  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  @MinLength(1, { message: i18nValidationMessage('validation.MIN_LENGTH') })
  @MaxLength(1000, { message: i18nValidationMessage('validation.MAX_LENGTH') })
  message!: string; // Notification message

  @IsOptional()
  @IsObject({ message: i18nValidationMessage('validation.IS_OBJECT') })
  data?: object; // Notification data
}
