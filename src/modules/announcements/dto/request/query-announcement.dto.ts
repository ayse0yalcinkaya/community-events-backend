import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsNumber, IsOptional, IsPositive, IsString, Max, Min } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { AnnouncementScope, AnnouncementStatus, AnnouncementType } from '../../enums/announcement.enum';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { SortDirection } from '../../../../common/base/dto/base-sort.dto';

export class QueryAnnouncementDto {
  @ApiPropertyOptional({ type: Number, minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: i18nValidationMessage('validation.IS_NUMBER') })
  @IsPositive()
  page?: number;

  @ApiPropertyOptional({ type: Number, minimum: 1, maximum: 100, default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: i18nValidationMessage('validation.IS_NUMBER') })
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ description: 'Search in title/content' })
  @IsOptional()
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  search?: string;

  @ApiPropertyOptional({ enum: AnnouncementType, enumName: 'AnnouncementType' })
  @Type(() => Number)
  @IsOptional()
  @IsEnum(AnnouncementType, { message: i18nValidationMessage('validation.IS_ENUM') })
  type?: AnnouncementType;

  @ApiPropertyOptional({ enum: AnnouncementScope, enumName: 'AnnouncementScope' })
  @Type(() => Number)
  @IsOptional()
  @IsEnum(AnnouncementScope, { message: i18nValidationMessage('validation.IS_ENUM') })
  scope?: AnnouncementScope;

  @ApiPropertyOptional({ enum: AnnouncementStatus, enumName: 'AnnouncementStatus' })
  @Type(() => Number)
  @IsOptional()
  @IsEnum(AnnouncementStatus, { message: i18nValidationMessage('validation.IS_ENUM') })
  status?: AnnouncementStatus;

  // Date filters
  @ApiPropertyOptional({ type: String, format: 'date-time', description: 'Oluşturulma tarihi başlangıcı' })
  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: i18nValidationMessage('validation.IS_DATE') })
  createdFrom?: Date;

  @ApiPropertyOptional({ type: String, format: 'date-time', description: 'Oluşturulma tarihi bitişi' })
  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: i18nValidationMessage('validation.IS_DATE') })
  createdTo?: Date;

  @ApiPropertyOptional({ type: String, format: 'date-time', description: 'Güncellenme tarihi başlangıcı' })
  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: i18nValidationMessage('validation.IS_DATE') })
  updatedFrom?: Date;

  @ApiPropertyOptional({ type: String, format: 'date-time', description: 'Güncellenme tarihi bitişi' })
  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: i18nValidationMessage('validation.IS_DATE') })
  updatedTo?: Date;

  // Sorting
  @ApiPropertyOptional({ description: 'Sıralama yapılacak alan', example: 'createdAt' })
  @IsOptional()
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  sortBy?: string;

  @ApiPropertyOptional({ description: 'Sıralama yönü (asc/desc)', enum: SortDirection, example: SortDirection.DESC })
  @IsOptional()
  sortOrder?: SortDirection;
}
