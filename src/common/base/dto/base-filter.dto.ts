// NestJS imports
// Libraries
import { ApiPropertyOptional } from '@nestjs/swagger';

// Third-party imports
import { Type } from 'class-transformer';
import { IsDateString, IsOptional, IsString } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

/**
 * Base filter DTO with common filtering options
 * Provides search, status, and date range filtering
 *
 * @example
 * ```typescript
 * export class GetUsersQueryDto extends BaseFilterDto {
 *   @ApiPropertyOptional({ enum: UserRole })
 *   @IsOptional()
 *   @IsEnum(UserRole)
 *   role?: UserRole;
 * }
 * ```
 */
export class BaseFilterDto {
  @ApiPropertyOptional({
    description: 'Search query string',
    example: 'john',
  })
  @IsOptional()
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by status',
    example: 'active',
  })
  @IsOptional()
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  status?: string;

  @ApiPropertyOptional({
    description: 'Filter from date (ISO 8601)',
    example: '2025-01-01T00:00:00Z',
  })
  @IsOptional()
  @IsDateString({}, { message: i18nValidationMessage('validation.IS_DATE_STRING') })
  @Type(() => Date)
  dateFrom?: Date;

  @ApiPropertyOptional({
    description: 'Filter to date (ISO 8601)',
    example: '2025-12-31T23:59:59Z',
  })
  @IsOptional()
  @IsDateString({}, { message: i18nValidationMessage('validation.IS_DATE_STRING') })
  @Type(() => Date)
  dateTo?: Date;
}
