import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { AnnouncementScope, AnnouncementStatus, AnnouncementType } from '../../enums/announcement.enum';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AnnouncementReqDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  communityID?: string | null;

  @ApiProperty({ maxLength: 255 })
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_NOT_EMPTY') })
  @MaxLength(255, { message: i18nValidationMessage('validation.MAX_LENGTH') })
  title!: string;

  @ApiProperty({ enum: AnnouncementType, enumName: 'AnnouncementType' })
  @Type(() => Number)
  @IsEnum(AnnouncementType, { message: i18nValidationMessage('validation.IS_ENUM') })
  type!: AnnouncementType;

  @ApiPropertyOptional({ description: 'Rich text content' })
  @IsOptional()
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  content?: string | null;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: i18nValidationMessage('validation.IS_DATE') })
  start_date?: Date | null;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: i18nValidationMessage('validation.IS_DATE') })
  end_date?: Date | null;

  @ApiProperty({ enum: AnnouncementScope, enumName: 'AnnouncementScope' })
  @Type(() => Number)
  @IsEnum(AnnouncementScope, { message: i18nValidationMessage('validation.IS_ENUM') })
  scope!: AnnouncementScope;

  @ApiProperty({ enum: AnnouncementStatus, enumName: 'AnnouncementStatus' })
  @Type(() => Number)
  @IsEnum(AnnouncementStatus, { message: i18nValidationMessage('validation.IS_ENUM') })
  status!: AnnouncementStatus;
}
