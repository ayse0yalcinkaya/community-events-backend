import {
  IsOptional,
  IsString,
  MinLength,
  MaxLength,
  IsPhoneNumber,
  IsBoolean,
  IsEnum,
  IsUUID,
  Matches,
  IsEmail,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { i18nValidationMessage } from 'nestjs-i18n';
import { normalizePhoneNumber } from '@/common/utils/phone-normalizer.util';

// Enums
import { UserTypeEnum } from '@/common/enums';

/**
 * DTO for admin user update
 * Used by PATCH /users/:id endpoint
 *
 * All fields are optional (partial update supported).
 * Validation rules:
 * - firstName, lastName: 2-50 characters if provided
 * - phoneNumber: Valid Turkish phone number if provided
 * - isActive: Boolean if provided (for enabling/disabling user accounts)
 */
export class UpdateUserDto {
  @ApiPropertyOptional({
    minLength: 2,
    maxLength: 50,
    description: 'Ad',
  })
  @IsOptional()
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  @MinLength(2, { message: i18nValidationMessage('validation.MIN_LENGTH') })
  @MaxLength(50, { message: i18nValidationMessage('validation.MAX_LENGTH') })
  firstName?: string;

  @ApiPropertyOptional({
    minLength: 2,
    maxLength: 50,
    description: 'Soyad',
  })
  @IsOptional()
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  @MinLength(2, { message: i18nValidationMessage('validation.MIN_LENGTH') })
  @MaxLength(50, { message: i18nValidationMessage('validation.MAX_LENGTH') })
  lastName?: string;

  @ApiPropertyOptional({
    description: 'E.164 formatında Türk GSM numarası',
  })
  @IsOptional()
  @Transform(({ value }) => normalizePhoneNumber(value))
  @IsPhoneNumber('TR', {
    message: i18nValidationMessage('validation.IS_PHONE_NUMBER'),
  })
  phoneNumber?: string;

  @ApiPropertyOptional({
    example: 'user@example.com',
    description: 'E-posta adresi',
  })
  @IsOptional()
  @IsEmail({}, { message: i18nValidationMessage('validation.IS_EMAIL') })
  email?: string;

  @ApiPropertyOptional({
    description: 'Hesap aktiflik durumu',
  })
  @IsOptional()
  @IsBoolean({ message: i18nValidationMessage('validation.IS_BOOLEAN') })
  isActive?: boolean;

  @ApiPropertyOptional({
    enum: UserTypeEnum,
    enumName: 'UserTypeEnum',
    description: 'Kullanıcı tipi (ADMIN / USER)',
  })
  @IsOptional()
  @IsEnum(UserTypeEnum, { message: i18nValidationMessage('validation.IS_ENUM') })
  userType?: UserTypeEnum;

  @ApiPropertyOptional({
    example: '12345678901',
    description: 'Vergi kimlik numarası (10-11 hane)',
  })
  @IsOptional()
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  @Matches(/^\d{10,11}$/, { message: i18nValidationMessage('validation.MATCHES_VKN') })
  VKN?: string;

  @ApiPropertyOptional({
    description: 'Atanacak rolün ID bilgisi (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @IsOptional()
  @IsUUID(4, { message: i18nValidationMessage('validation.IS_UUID') })
  roleID?: string;
}
