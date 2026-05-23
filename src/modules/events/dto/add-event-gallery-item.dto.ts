import { IsInt, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';

export class AddEventGalleryItemDto {
  @IsUUID('4')
  fileID!: string;

  @IsOptional()
  @IsString()
  @MaxLength(280)
  caption?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}
