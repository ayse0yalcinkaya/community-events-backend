import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt, MaxLength, Min, IsUrl } from 'class-validator';

export class CreateSponsorDto {
  @ApiProperty({ description: 'Sponsor name', example: 'Tech Corp' })
  @IsString()
  @MaxLength(180)
  name!: string;

  @ApiProperty({ description: 'Sponsor logo file ID', required: false })
  @IsOptional()
  @IsString()
  logoFileID?: string;

  @ApiProperty({ description: 'Sponsor website URL', example: 'https://techcorp.com', required: false })
  @IsOptional()
  @IsUrl()
  @MaxLength(255)
  websiteUrl?: string;

  @ApiProperty({ description: 'Sponsor tier', example: 'PLATINUM', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  tier?: string;

  @ApiProperty({ description: 'Display order', example: 1, required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}
