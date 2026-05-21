// Libraries
import { IsEnum, IsString, MinLength, MaxLength } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

// Enums
import { Platform } from '../enums/platform.enum';

/**
 * DTO for registering device token
 * Used by POST /users/me/device-tokens endpoint
 *
 * Validation rules:
 * - token: Required string, 1-500 characters (FCM device token)
 * - platform: Required Platform enum (iOS or Android)
 */
export class RegisterDeviceTokenDto {
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  @MinLength(1, { message: i18nValidationMessage('validation.MIN_LENGTH') })
  @MaxLength(500, { message: i18nValidationMessage('validation.MAX_LENGTH') })
  token!: string;

  @IsEnum(Platform, {
    message: i18nValidationMessage('validation.IS_ENUM'),
  })
  platform!: Platform;
}
