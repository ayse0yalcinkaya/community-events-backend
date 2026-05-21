// Libraries
import { IsPhoneNumber, IsNotEmpty, IsString, Length, Matches } from 'class-validator';
import { Transform } from 'class-transformer';
import { i18nValidationMessage } from 'nestjs-i18n';
import { normalizePhoneNumber } from '@/common/utils/phone-normalizer.util';

export class VerifyPhoneDto {
  @Transform(({ value }) => normalizePhoneNumber(value))
  @IsPhoneNumber('TR', { message: i18nValidationMessage('validation.IS_PHONE_NUMBER') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_NOT_EMPTY') })
  phoneNumber!: string; // E.164 format: +90XXXXXXXXXX

  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  @Length(6, 6, { message: i18nValidationMessage('validation.LENGTH') })
  @Matches(/^\d{6}$/, { message: i18nValidationMessage('validation.MATCHES_OTP') })
  code!: string;
}
