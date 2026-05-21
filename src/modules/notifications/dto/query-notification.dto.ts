// Libraries
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsBoolean, IsEnum, IsDate, IsNumber, IsPositive, Min, Max } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { i18nValidationMessage } from 'nestjs-i18n';
import { SortDirection } from '../../../common/base/dto/base-sort.dto';
import { NotificationType } from '../enums/notification-type.enum';

export class QueryNotificationDto {
  @ApiPropertyOptional({ type: Number, minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: i18nValidationMessage('validation.IS_NUMBER') })
  @IsPositive({ message: i18nValidationMessage('validation.IS_POSITIVE') })
  page?: number;

  @ApiPropertyOptional({ type: Number, minimum: 1, maximum: 100, default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: i18nValidationMessage('validation.IS_NUMBER') })
  @Min(1, { message: i18nValidationMessage('validation.MIN') })
  @Max(100, { message: i18nValidationMessage('validation.MAX') })
  limit?: number;

  @ApiPropertyOptional({ description: 'Subject ve message içinde arama' })
  @IsOptional()
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  search?: string;

  @ApiPropertyOptional({ enum: NotificationType, enumName: 'NotificationType', description: 'Bildirim tipi' })
  @Type(() => Number)
  @IsOptional()
  @IsEnum(NotificationType, { message: i18nValidationMessage('validation.IS_ENUM') })
  type?: NotificationType;

  @ApiPropertyOptional({ description: 'Okunma durumu (true=okundu, false=okunmadı)' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean({ message: i18nValidationMessage('validation.IS_BOOLEAN') })
  isRead?: boolean;

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

  // Helper getters for pagination
  get skip(): number {
    const page = this.page ?? 1;
    const limit = this.limit ?? 10;
    return (page - 1) * limit;
  }

  get take(): number {
    return this.limit ?? 10;
  }
}
