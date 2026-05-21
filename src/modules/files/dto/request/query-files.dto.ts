// Libraries
import { IsOptional, IsEnum, IsString, IsInt, Min, Max, IsDate } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { i18nValidationMessage } from 'nestjs-i18n';

/**
 * DTO for file list query with pagination, filtering, and sorting
 * Used by GET /files endpoint
 *
 * Pagination:
 * - page: Page number (default: 1, min: 1)
 * - limit: Items per page (default: 20, min: 1, max: 100)
 *
 * Filtering:
 * - mimeType: Filter by MIME type (supports wildcards, e.g., "image/*", "application/pdf")
 * - search: Search in originalName (case-insensitive)
 *
 * Sorting:
 * - sortBy: Field to sort by (default: createdAt)
 * - sortOrder: Sort direction (default: desc - newest first)
 *
 * Access Control:
 * - Regular users see only their own files (WHERE userID = currentUserID)
 * - Admins with FILES.VIEW_ALL see all domain files (no userID filter)
 * - All queries filtered by domainID and exclude soft-deleted files (deletedAt IS NULL)
 */
export class QueryFilesDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: i18nValidationMessage('validation.IS_INT') })
  @Min(1, { message: i18nValidationMessage('validation.MIN') })
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: i18nValidationMessage('validation.IS_INT') })
  @Min(1, { message: i18nValidationMessage('validation.MIN') })
  @Max(100, { message: i18nValidationMessage('validation.MAX') })
  limit?: number = 20;

  @IsOptional()
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  mimeType?: string;

  @IsOptional()
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  search?: string;

  @IsOptional()
  @IsEnum(['createdAt', 'filename', 'size', 'mimeType'], {
    message: i18nValidationMessage('validation.IS_ENUM'),
  })
  sortBy?: 'createdAt' | 'filename' | 'size' | 'mimeType' = 'createdAt';

  @IsOptional()
  @IsEnum(['asc', 'desc'], {
    message: i18nValidationMessage('validation.IS_ENUM'),
  })
  sortOrder?: 'asc' | 'desc' = 'desc';

  // Date filters
  @ApiPropertyOptional({
    description: 'Bu tarihten sonra oluşturulan dosyaları filtrele',
    type: String,
    format: 'date-time',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: i18nValidationMessage('validation.IS_DATE') })
  createdFrom?: Date;

  @ApiPropertyOptional({
    description: 'Bu tarihten önce oluşturulan dosyaları filtrele',
    type: String,
    format: 'date-time',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: i18nValidationMessage('validation.IS_DATE') })
  createdTo?: Date;

  @ApiPropertyOptional({
    description: 'Bu tarihten sonra güncellenen dosyaları filtrele',
    type: String,
    format: 'date-time',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: i18nValidationMessage('validation.IS_DATE') })
  updatedFrom?: Date;

  @ApiPropertyOptional({
    description: 'Bu tarihten önce güncellenen dosyaları filtrele',
    type: String,
    format: 'date-time',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: i18nValidationMessage('validation.IS_DATE') })
  updatedTo?: Date;
}
