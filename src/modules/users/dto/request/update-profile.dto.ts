// Libraries
import { IsOptional, IsString, MinLength, MaxLength, IsPhoneNumber } from 'class-validator';
import { Transform } from 'class-transformer';
import { i18nValidationMessage } from 'nestjs-i18n';
import { normalizePhoneNumber } from '@/common/utils/phone-normalizer.util';

export class UpdateProfileDto {
  @IsOptional()
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  @MinLength(2, { message: i18nValidationMessage('validation.MIN_LENGTH') })
  @MaxLength(50, { message: i18nValidationMessage('validation.MAX_LENGTH') })
  firstName?: string;

  @IsOptional()
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  @MinLength(2, { message: i18nValidationMessage('validation.MIN_LENGTH') })
  @MaxLength(50, { message: i18nValidationMessage('validation.MAX_LENGTH') })
  lastName?: string;

  @IsOptional()
  @Transform(({ value }) => normalizePhoneNumber(value))
  @IsPhoneNumber('TR', {
    message: i18nValidationMessage('validation.IS_PHONE_NUMBER'),
  })
  phoneNumber?: string;
}
