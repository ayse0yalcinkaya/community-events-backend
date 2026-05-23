import { Expose } from 'class-transformer';

class ConnectionUserSummaryResDto {
  @Expose()
  id!: string;

  @Expose()
  firstName!: string;

  @Expose()
  lastName!: string;

  @Expose()
  headline?: string | null;

  @Expose()
  city?: string | null;

  @Expose()
  profileImageID?: string | null;
}

export class ConnectionResDto {
  @Expose()
  id!: string;

  @Expose()
  status!: string;

  @Expose()
  direction!: 'sent' | 'received';

  @Expose()
  createdAt!: Date;

  @Expose()
  updatedAt!: Date;

  @Expose()
  otherUser!: ConnectionUserSummaryResDto;
}
