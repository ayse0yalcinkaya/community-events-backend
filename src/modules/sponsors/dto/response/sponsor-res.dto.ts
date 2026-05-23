import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class SponsorResDto {
  @ApiProperty({ description: 'Sponsor ID' })
  @Expose()
  id!: string;

  @ApiProperty({ description: 'Event ID' })
  @Expose()
  eventID!: string;

  @ApiProperty({ description: 'Sponsor name' })
  @Expose()
  name!: string;

  @ApiProperty({ description: 'Sponsor logo URL', required: false })
  @Expose()
  logoUrl?: string;

  @ApiProperty({ description: 'Sponsor website URL', required: false })
  @Expose()
  websiteUrl?: string;

  @ApiProperty({ description: 'Sponsor tier', required: false })
  @Expose()
  tier?: string;

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
