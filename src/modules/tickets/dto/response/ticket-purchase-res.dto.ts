import { Expose } from 'class-transformer';

export class TicketPurchaseResDto {
  @Expose()
  id!: string;

  @Expose()
  ticketID!: string;

  @Expose()
  userID!: string;

  @Expose()
  quantity!: number;

  @Expose()
  totalPrice!: number;

  @Expose()
  currency!: string;

  @Expose()
  status!: string;

  @Expose()
  purchasedAt!: Date;
}
