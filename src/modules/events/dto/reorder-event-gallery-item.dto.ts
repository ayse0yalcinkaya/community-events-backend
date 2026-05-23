import { IsInt, IsUUID, Min } from 'class-validator';

export class ReorderEventGalleryItemDto {
  @IsUUID('4')
  id!: string;

  @IsInt()
  @Min(0)
  order!: number;
}
