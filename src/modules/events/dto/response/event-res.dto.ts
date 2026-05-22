import { Expose, Type } from 'class-transformer';

class EventCategoryResDto {
  @Expose()
  id!: string;

  @Expose()
  name!: string;

  @Expose()
  slug!: string;
}

class EventCommunityResDto {
  @Expose()
  id!: string;

  @Expose()
  name!: string;

  @Expose()
  slug!: string;
}

class EventLocationResDto {
  @Expose()
  venueName?: string | null;

  @Expose()
  address?: string | null;

  @Expose()
  city?: string | null;

  @Expose()
  district?: string | null;

  @Expose()
  meetingUrl?: string | null;
}

class EventSessionResDto {
  @Expose()
  id!: string;

  @Expose()
  startAt!: Date;

  @Expose()
  endAt!: Date;
}

export class EventResDto {
  @Expose()
  id!: string;

  @Expose()
  title!: string;

  @Expose()
  slug!: string;

  @Expose()
  shortDescription?: string | null;

  @Expose()
  description?: string | null;

  @Expose()
  format!: string;

  @Expose()
  visibility!: string;

  @Expose()
  approvalMode!: string;

  @Expose()
  language?: string | null;

  @Expose()
  capacity?: number | null;

  @Expose()
  isPaid!: boolean;

  @Expose()
  externalRegistrationUrl?: string | null;

  @Expose()
  status!: string;

  @Expose()
  publishedAt?: Date | null;

  @Expose()
  createdAt!: Date;

  @Expose()
  updatedAt!: Date;

  @Expose()
  @Type(() => EventCategoryResDto)
  primaryCategory!: EventCategoryResDto;

  @Expose()
  @Type(() => EventCommunityResDto)
  organizerCommunity?: EventCommunityResDto | null;

  @Expose()
  @Type(() => EventLocationResDto)
  location?: EventLocationResDto | null;

  @Expose()
  @Type(() => EventSessionResDto)
  sessions?: EventSessionResDto[];

  @Expose()
  attendeeCount?: number;

  @Expose()
  bookmarkCount?: number;

  @Expose()
  currentUserAttendanceStatus?: string | null;

  @Expose()
  currentUserAttendanceVisibility?: string | null;

  @Expose()
  isBookmarked?: boolean;
}
