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
  IsEnum,
  IsUUID,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { i18nValidationMessage } from 'nestjs-i18n';
import { UserTypeEnum } from '@/common/enums';
import { normalizePhoneNumber } from '@/common/utils/phone-normalizer.util';

/**
 * DTO for admin user creation
 * Used by POST /users endpoint
 *
 * Validation rules:
 * - phoneNumber: Required, valid Turkish phone number (E.164 format: +90XXXXXXXXXX)
 * - firstName, lastName: Required, 2-50 characters
 * - password: Optional for staff/manager, should be required for admin (validated at service layer)
 *   Must be 8-50 chars with at least 1 letter and 1 number
 * - email: Optional, valid email format
 * - userType: Optional, defaults to USER. ADMIN or USER
 * - VKN: Optional, Turkish Tax ID (10-11 digits)
 * - roleID: Optional, UUID of the role to assign.
 *
 * NOTE: Role is automatically assigned during user creation via UserRole junction table.
 * Default role is 'staff' from seed data.
 */
export class CreateUserDto {
  @ApiProperty({
    example: '+905551112233',
    description: 'E.164 formatında Türk GSM numarası',
  })
  @Transform(({ value }) => normalizePhoneNumber(value))
  @IsPhoneNumber('TR', {
    message: i18nValidationMessage('validation.IS_PHONE_NUMBER'),
  })
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_NOT_EMPTY') })
  phoneNumber!: string;

  @ApiProperty({
    minLength: 2,
    maxLength: 50,
    example: 'Ahmet',
  })
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  @MinLength(2, { message: i18nValidationMessage('validation.MIN_LENGTH') })
  @MaxLength(50, { message: i18nValidationMessage('validation.MAX_LENGTH') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_NOT_EMPTY') })
  firstName!: string;

  @ApiProperty({
    minLength: 2,
    maxLength: 50,
    example: 'Yılmaz',
  })
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  @MinLength(2, { message: i18nValidationMessage('validation.MIN_LENGTH') })
  @MaxLength(50, { message: i18nValidationMessage('validation.MAX_LENGTH') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_NOT_EMPTY') })
  lastName!: string;

  @ApiPropertyOptional({
    minLength: 8,
    maxLength: 50,
    example: 'Sifre123',
  })
  @IsOptional()
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  @MinLength(4, { message: i18nValidationMessage('validation.MIN_LENGTH') })
  @MaxLength(50, { message: i18nValidationMessage('validation.MAX_LENGTH') })
  password?: string;

  @ApiPropertyOptional({
    example: 'ahmet@example.com',
  })
  @IsOptional()
  @IsEmail({}, { message: i18nValidationMessage('validation.IS_EMAIL') })
  email?: string;

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
