// Libraries
import { IsOptional, IsEnum, IsString, IsInt, Min, Max, IsDate } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { i18nValidationMessage } from 'nestjs-i18n';

// Enums
import { UserTypeEnum } from '@/common/enums';

/**
 * DTO for user list query with pagination, filtering, and sorting
 * Used by GET /users endpoint
 *
 * Pagination:
 * - page: Page number (default: 1, min: 1)
 * - limit: Items per page (default: 20, min: 1, max: 100)
 *
 * Filtering:
 * - status: Filter by active/inactive users
 * - role: Filter by user role (admin, staff, manager)
 * - search: Search in firstName, lastName, phoneNumber (OR condition)
 *
 * Sorting:
 * - sortBy: Field to sort by (default: createdAt)
 * - sortOrder: Sort direction (default: desc)
 */
export class QueryUserDto {
  @ApiPropertyOptional({
    description: 'Sayfa numarası',
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: i18nValidationMessage('validation.IS_INT') })
  @Min(1, { message: i18nValidationMessage('validation.MIN') })
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Sayfa başına sonuç',
    minimum: 1,
    maximum: 100,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: i18nValidationMessage('validation.IS_INT') })
  @Min(1, { message: i18nValidationMessage('validation.MIN') })
  @Max(100, { message: i18nValidationMessage('validation.MAX') })
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Kullanıcı durumu',
    enum: ['active', 'inactive'],
  })
  @IsOptional()
  @IsEnum(['active', 'inactive'], {
    message: i18nValidationMessage('validation.IS_ENUM'),
  })
  status?: 'active' | 'inactive';

  @ApiPropertyOptional({
    description: 'Rol filtresi',
    enum: ['admin', 'staff', 'manager'],
  })
  @IsOptional()
  @IsEnum(['admin', 'staff', 'manager'], {
    message: i18nValidationMessage('validation.IS_ENUM'),
  })
  role?: 'admin' | 'staff' | 'manager';

  @ApiPropertyOptional({
    enum: UserTypeEnum,
    enumName: 'UserTypeEnum',
    description: 'Kullanıcı tipi filtresi',
  })
  @IsOptional()
  @IsEnum(UserTypeEnum, { message: i18nValidationMessage('validation.IS_ENUM') })
  userType?: UserTypeEnum;

  @ApiPropertyOptional({
    description: 'İsim, soyisim veya telefon ile arama',
  })
  @IsOptional()
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  search?: string;

  @ApiPropertyOptional({
    description: 'Sıralama alanı',
    enum: ['createdAt', 'firstName', 'lastName', 'phoneNumber'],
    default: 'createdAt',
  })
  @IsOptional()
  @IsEnum(['createdAt', 'firstName', 'lastName', 'phoneNumber'], {
    message: i18nValidationMessage('validation.IS_ENUM'),
  })
  sortBy?: 'createdAt' | 'firstName' | 'lastName' | 'phoneNumber' = 'createdAt';

  @ApiPropertyOptional({
    description: 'Sıralama yönü',
    enum: ['asc', 'desc'],
    default: 'desc',
  })
  @IsOptional()
  @IsEnum(['asc', 'desc'], {
    message: i18nValidationMessage('validation.IS_ENUM'),
  })
  sortOrder?: 'asc' | 'desc' = 'desc';

  // Date filters
  @ApiPropertyOptional({
    description: 'Bu tarihten sonra oluşturulan kullanıcıları filtrele',
    type: String,
    format: 'date-time',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: i18nValidationMessage('validation.IS_DATE') })
  createdFrom?: Date;

  @ApiPropertyOptional({
    description: 'Bu tarihten önce oluşturulan kullanıcıları filtrele',
    type: String,
    format: 'date-time',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: i18nValidationMessage('validation.IS_DATE') })
  createdTo?: Date;

  @ApiPropertyOptional({
    description: 'Bu tarihten sonra güncellenen kullanıcıları filtrele',
    type: String,
    format: 'date-time',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: i18nValidationMessage('validation.IS_DATE') })
  updatedFrom?: Date;

  @ApiPropertyOptional({
    description: 'Bu tarihten önce güncellenen kullanıcıları filtrele',
    type: String,
    format: 'date-time',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: i18nValidationMessage('validation.IS_DATE') })
  updatedTo?: Date;
}
