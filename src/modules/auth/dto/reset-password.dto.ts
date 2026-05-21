// Libraries
import { IsPhoneNumber, IsNotEmpty, IsString, Length, Matches, MinLength, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { i18nValidationMessage } from 'nestjs-i18n';
import { normalizePhoneNumber } from '@/common/utils/phone-normalizer.util';

export class ResetPasswordDto {
  @Transform(({ value }) => normalizePhoneNumber(value))
  @IsPhoneNumber('TR', { message: i18nValidationMessage('validation.IS_PHONE_NUMBER') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_NOT_EMPTY') })
  phoneNumber!: string;

  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  @Length(6, 6, { message: i18nValidationMessage('validation.LENGTH') })
  @Matches(/^\d{6}$/, { message: i18nValidationMessage('validation.MATCHES_OTP') })
  otpCode!: string;

  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  @MinLength(8, { message: i18nValidationMessage('validation.MIN_LENGTH') })
  @MaxLength(50, { message: i18nValidationMessage('validation.MAX_LENGTH') })
  @Matches(/^(?=.*[A-Za-z])(?=.*\d)/, {
    message: i18nValidationMessage('validation.MATCHES_PASSWORD'),
  })
  newPassword!: string;
}
