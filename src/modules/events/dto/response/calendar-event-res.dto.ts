import { Expose } from 'class-transformer';

export class CalendarEventResDto {
  @Expose()
  eventID!: string;

  @Expose()
  slug!: string;

  @Expose()
  title!: string;

  @Expose()
  startAt!: Date;

  @Expose()
  endAt!: Date;

  @Expose()
  format!: string;

  @Expose()
  city?: string | null;

  @Expose()
  venueName?: string | null;

  @Expose()
  meetingUrl?: string | null;

  @Expose()
  attendanceStatus!: string;
}
