import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

import { AnnouncementScope, AnnouncementStatus, AnnouncementType } from '@/modules/announcements/enums/announcement.enum';

export class CreateCommunityAnnouncementDto {
  @IsUUID('4')
  communityID!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title!: string;

  @Type(() => Number)
  @IsEnum(AnnouncementType)
  type!: AnnouncementType;

  @IsOptional()
  @IsString()
  content?: string | null;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  start_date?: Date | null;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  end_date?: Date | null;

  @IsOptional()
  @Type(() => Number)
  @IsEnum(AnnouncementScope)
  scope?: AnnouncementScope;

  @IsOptional()
  @Type(() => Number)
  @IsEnum(AnnouncementStatus)
  status?: AnnouncementStatus;
}
