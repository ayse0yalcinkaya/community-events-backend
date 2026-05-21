// Libraries
import { IsPhoneNumber, IsString, IsEnum, IsNotEmpty, MinLength, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { i18nValidationMessage } from 'nestjs-i18n';
import { normalizePhoneNumber } from '@/common/utils/phone-normalizer.util';

// Enums
import { SmsType } from '../../enums/sms-type.enum';

/**
 * DTO for sending SMS
 * Used by SMS Service sendSms() method
 */
export class SendSmsDto {
  @Transform(({ value }) => normalizePhoneNumber(value))
  @IsPhoneNumber('TR', {
    message: i18nValidationMessage('validation.IS_PHONE_NUMBER'),
  })
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_NOT_EMPTY') })
  phoneNumber!: string; // E.164 format: +90XXXXXXXXXX

  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_NOT_EMPTY') })
  @MinLength(1, { message: i18nValidationMessage('validation.MIN_LENGTH') })
  @MaxLength(1600, { message: i18nValidationMessage('validation.MAX_LENGTH') })
  message!: string;

  @IsEnum(SmsType, {
    message: i18nValidationMessage('validation.IS_ENUM'),
  })
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_NOT_EMPTY') })
  type!: SmsType;
}
