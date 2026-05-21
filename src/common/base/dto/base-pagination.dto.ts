// NestJS imports
// Libraries
import { ApiPropertyOptional } from '@nestjs/swagger';

// Third-party imports
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

/**
 * Base pagination DTO with page-based pagination
 * Provides page, limit, skip, and take calculations
 *
 * @example
 * ```typescript
 * export class GetUsersQueryDto extends BasePaginationDto {
 *   @ApiPropertyOptional()
 *   @IsOptional()
 *   @IsEnum(UserStatus)
 *   status?: UserStatus;
 * }
 * ```
 */
export class BasePaginationDto {
  @ApiPropertyOptional({
    description: 'Page number (1-based)',
    minimum: 1,
    default: 1,
    example: 1,
  })
  @Type(() => Number)
  @IsInt({ message: i18nValidationMessage('validation.IS_INT') })
  @Min(1, { message: i18nValidationMessage('validation.MIN') })
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    minimum: 1,
    maximum: 100,
    default: 10,
    example: 10,
  })
  @Type(() => Number)
  @IsInt({ message: i18nValidationMessage('validation.IS_INT') })
  @Min(1, { message: i18nValidationMessage('validation.MIN') })
  @Max(100, { message: i18nValidationMessage('validation.MAX') })
  @IsOptional()
  limit?: number = 10;

  /**
   * Calculate skip value for database queries
   * @returns Number of records to skip
   */
  get skip(): number {
    return ((this.page ?? 1) - 1) * (this.limit ?? 10);
  }

  /**
   * Calculate take value for database queries
   * @returns Number of records to take
   */
  get take(): number {
    return this.limit ?? 10;
  }
}
