// Libraries
import { IsString, IsEnum, IsNotEmpty } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

// Enums
import { SmsStatus } from '../../enums/sms-status.enum';

/**
 * DTO for SMS delivery callback webhook
 * Used by POST /sms/callback/delivery endpoint
 */
export class DeliveryCallbackDto {
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_NOT_EMPTY') })
  providerId!: string; // FONIVA message ID

  @IsEnum([SmsStatus.DELIVERED, SmsStatus.FAILED], {
    message: i18nValidationMessage('validation.IS_ENUM'),
  })
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_NOT_EMPTY') })
  status!: SmsStatus.DELIVERED | SmsStatus.FAILED;
}
