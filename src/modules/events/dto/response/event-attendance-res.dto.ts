import { Expose } from 'class-transformer';

export class EventAttendanceResDto {
  @Expose()
  id!: string;

  @Expose()
  eventID!: string;

  @Expose()
  userID!: string;

  @Expose()
  status!: string;

  @Expose()
  visibility!: string;

  @Expose()
  registeredAt!: Date;

  @Expose()
  approvedAt?: Date | null;

  @Expose()
  cancelledAt?: Date | null;

  @Expose()
  firstName!: string;

  @Expose()
  lastName!: string;

  @Expose()
  profileImageID?: string | null;
}
