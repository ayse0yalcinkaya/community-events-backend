import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, IsUrl, IsUUID, MaxLength, MinLength } from 'class-validator';

import { EventApprovalMode, EventFormat, EventVisibility } from '@prisma/client';

export class CreateEventDraftDto {
  @IsString()
  @MinLength(3)
  @MaxLength(180)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(320)
  shortDescription?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsUUID('4')
  primaryCategoryID!: string;

  @IsOptional()
  @IsUUID('4')
  organizerCommunityID?: string;

  @IsOptional()
  @IsEnum(EventFormat)
  format?: EventFormat;

  @IsOptional()
  @IsEnum(EventVisibility)
  visibility?: EventVisibility;

  @IsOptional()
  @IsEnum(EventApprovalMode)
  approvalMode?: EventApprovalMode;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  language?: string;

  @IsOptional()
  @IsInt()
  capacity?: number;

  @IsOptional()
  @IsBoolean()
  isPaid?: boolean;

  @IsOptional()
  @IsUrl()
  externalRegistrationUrl?: string;
}
