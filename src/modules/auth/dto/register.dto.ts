// Libraries
import {
  IsPhoneNumber,
  IsString,
  IsOptional,
  IsEmail,
  MinLength,
  MaxLength,
  Matches,
  IsNotEmpty,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { i18nValidationMessage } from 'nestjs-i18n';
import { normalizePhoneNumber } from '@/common/utils/phone-normalizer.util';

export class RegisterDto {
  @Transform(({ value }) => normalizePhoneNumber(value))
  @IsPhoneNumber('TR', { message: i18nValidationMessage('validation.IS_PHONE_NUMBER') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_NOT_EMPTY') })
  phoneNumber!: string; // E.164 format: +90XXXXXXXXXX

  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  @MinLength(2, { message: i18nValidationMessage('validation.MIN_LENGTH') })
  @MaxLength(50, { message: i18nValidationMessage('validation.MAX_LENGTH') })
  firstName!: string;

  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  @MinLength(2, { message: i18nValidationMessage('validation.MIN_LENGTH') })
  @MaxLength(50, { message: i18nValidationMessage('validation.MAX_LENGTH') })
  lastName!: string;

  @IsOptional()
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  @MinLength(8, { message: i18nValidationMessage('validation.MIN_LENGTH') })
  @MaxLength(50, { message: i18nValidationMessage('validation.MAX_LENGTH') })
  password?: string; // Optional for staff, required if admin account is being created

  @IsOptional()
  @IsEmail({}, { message: i18nValidationMessage('validation.IS_EMAIL') })
  email?: string; // For notifications only

  @IsOptional()
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  @MaxLength(100, { message: i18nValidationMessage('validation.MAX_LENGTH') })
  city?: string;

  @IsOptional()
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  @Matches(/^\d{10,11}$/, { message: i18nValidationMessage('validation.MATCHES_VKN') })
  VKN?: string; // Turkish Tax ID (10-11 digits)
}
