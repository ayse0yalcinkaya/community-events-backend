import { Transform } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class PurchaseTicketDto {
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  quantity!: number;
}
