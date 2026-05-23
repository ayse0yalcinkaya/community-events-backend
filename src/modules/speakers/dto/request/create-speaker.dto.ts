// Libraries
import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt, MaxLength, Min } from 'class-validator';
export class CreateSpeakerDto {
  @ApiProperty({ description: 'Speaker name', example: 'Dr. Ahmet Yılmaz' })
  @IsString()
  @MaxLength(180)
  name!: string;

  @ApiProperty({ description: 'Speaker title', example: 'Yapay Zeka Uzmanı', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(180)
  title?: string;

  @ApiProperty({ description: 'Speaker bio', example: '10 yıllık deneyime sahip AI uzmanı...', required: false })
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiProperty({ description: 'Speaker photo file ID', required: false })
  @IsOptional()
  @IsString()
  photoFileID?: string;

  @ApiProperty({ description: 'Display order', example: 1, required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}
