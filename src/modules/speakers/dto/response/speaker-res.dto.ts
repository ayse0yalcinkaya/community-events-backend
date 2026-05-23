import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class SpeakerResDto {
  @ApiProperty({ description: 'Speaker ID' })
  @Expose()
  id!: string;

  @ApiProperty({ description: 'Event ID' })
  @Expose()
  eventID!: string;

  @ApiProperty({ description: 'Speaker name' })
  @Expose()
  name!: string;

  @ApiProperty({ description: 'Speaker title', required: false })
  @Expose()
  title?: string;

  @ApiProperty({ description: 'Speaker bio', required: false })
  @Expose()
  bio?: string;

  @ApiProperty({ description: 'Speaker photo URL', required: false })
  @Expose()
  photoUrl?: string;

  @ApiProperty({ description: 'Display order' })
  @Expose()
  order!: number;

  @ApiProperty({ description: 'Creation date' })
  @Expose()
  createdAt!: Date;

  @ApiProperty({ description: 'Last update date' })
  @Expose()
  updatedAt!: Date;
}
