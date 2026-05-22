import { IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class UpdateEventBasicDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(180)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(320)
  shortDescription?: string;

  @IsOptional()
  @IsUUID('4')
  primaryCategoryID?: string;

  @IsOptional()
  @IsUUID('4')
  organizerCommunityID?: string | null;
}
