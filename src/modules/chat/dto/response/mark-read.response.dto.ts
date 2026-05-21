import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class MarkReadResponseDto {
  @ApiProperty({ description: 'Number of messages updated to read state.' })
  @Expose()
  updatedCount!: number;
}
