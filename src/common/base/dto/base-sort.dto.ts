// Libraries
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

/**
 * Sort direction enum
 */
export enum SortDirection {
  ASC = 'asc',
  DESC = 'desc',
}

/**
 * Base sorting DTO
 * Provides orderBy field and sort direction
 *
 * @example
 * ```typescript
 * export class GetUsersQueryDto extends BaseSortDto {
 *   // Add specific filtering fields
 * }
 * ```
 */
export class BaseSortDto {
  @ApiPropertyOptional({
    description: 'Field to sort by',
    example: 'createdAt',
  })
  @IsOptional()
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  orderBy?: string;

  @ApiPropertyOptional({
    description: 'Sort direction',
    enum: SortDirection,
    default: SortDirection.DESC,
    example: SortDirection.DESC,
  })
  @IsOptional()
  @IsEnum(SortDirection, { message: i18nValidationMessage('validation.IS_ENUM') })
  sortDirection?: SortDirection = SortDirection.DESC;
}
