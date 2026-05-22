import { IsLatitude, IsLongitude, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class UpdateEventLocationDto {
  @IsOptional()
  @IsString()
  @MaxLength(180)
  venueName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  district?: string;

  @IsOptional()
  @IsLatitude()
  latitude?: string;

  @IsOptional()
  @IsLongitude()
  longitude?: string;

  @IsOptional()
  @IsUrl()
  meetingUrl?: string;
}
