import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class TicketResDto {
  @ApiProperty({ description: 'Ticket ID' })
  @Expose()
  id!: string;

  @ApiProperty({ description: 'Event ID' })
  @Expose()
  eventID!: string;

  @ApiProperty({ description: 'Ticket name' })
  @Expose()
  name!: string;

  @ApiProperty({ description: 'Ticket type' })
  @Expose()
  type!: string;

  @ApiProperty({ description: 'Ticket price', required: false })
  @Expose()
  price?: number;

  @ApiProperty({ description: 'Currency', required: false })
  @Expose()
  currency?: string;

  @ApiProperty({ description: 'Ticket quota', required: false })
  @Expose()
  quota?: number;

  @ApiProperty({ description: 'Available tickets' })
  @Expose()
  available!: number;

  @ApiProperty({ description: 'Sales start date', required: false })
  @Expose()
  salesStart?: Date;

  @ApiProperty({ description: 'Sales end date', required: false })
  @Expose()
  salesEnd?: Date;

  @ApiProperty({ description: 'Ticket description', required: false })
  @Expose()
  description?: string;

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
