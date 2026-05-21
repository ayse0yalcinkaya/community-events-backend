// NestJS imports
// Libraries
import { ApiPropertyOptional } from '@nestjs/swagger';

// Third-party imports
import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

// Local imports
import { BasePaginationDto } from './base-pagination.dto';
import { SortDirection } from './base-sort.dto';

/**
 * Base query DTO combining pagination, sorting, and filtering
 * This is the main base class for query DTOs
 *
 * @example
 * ```typescript
 * export class GetUsersQueryDto extends BaseQueryDto {
 *   @ApiPropertyOptional({ enum: UserStatus })
 *   @IsOptional()
 *   @IsEnum(UserStatus)
 *   userStatus?: UserStatus;
 * }
 *
 * // Usage in controller
 * @Get()
 * async findAll(@Query() query: GetUsersQueryDto) {
 *   return this.service.findAll({
 *     skip: query.skip,
 *     take: query.take,
 *     where: {
 *       status: query.status,
 *       // ... other filters
 *     },
 *     orderBy: {
 *       [query.orderBy || 'createdAt']: query.sortDirection,
 *     },
 *   });
 * }
 * ```
 */
export class BaseQueryDto extends BasePaginationDto {
  // Inherit pagination fields: page, limit, skip, take

  // Sorting fields
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

  // Filter fields
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
