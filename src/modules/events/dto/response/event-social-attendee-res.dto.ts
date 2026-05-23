import { Expose } from 'class-transformer';

export class EventSocialAttendeeResDto {
  @Expose()
  userID!: string;

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

  @Expose()
  attendanceStatus!: string;

  @Expose()
  attendanceVisibility!: string;

  @Expose()
  connectionStatus?: string | null;

  @Expose()
  sharedInterestCount!: number;

  @Expose()
  sharedInterests!: string[];

  @Expose()
  isCurrentUser!: boolean;
}
