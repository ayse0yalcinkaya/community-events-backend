// Libraries
import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt, IsEnum, IsDecimal, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';
export enum TicketTypeEnum {
  FREE = 'FREE',
  PAID = 'PAID',
  DONATION = 'DONATION',
}

export class CreateTicketDto {
  @ApiProperty({ description: 'Ticket name', example: 'General Admission' })
  @IsString()
  @MaxLength(180)
  name!: string;

  @ApiProperty({ description: 'Ticket type', enum: TicketTypeEnum, example: TicketTypeEnum.PAID })
  @IsEnum(TicketTypeEnum)
  type!: TicketTypeEnum;

  @ApiProperty({ description: 'Ticket price', example: 100.5, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsDecimal()
  price?: number;

  @ApiProperty({ description: 'Currency', example: 'TRY', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @ApiProperty({ description: 'Ticket quota', example: 100, required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  quota?: number;

  @ApiProperty({ description: 'Available tickets', example: 100, required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  available?: number;

  @ApiProperty({ description: 'Sales start date', required: false })
  @IsOptional()
  salesStart?: Date;

  @ApiProperty({ description: 'Sales end date', required: false })
  @IsOptional()
  salesEnd?: Date;

  @ApiProperty({ description: 'Ticket description', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Display order', example: 1, required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}
