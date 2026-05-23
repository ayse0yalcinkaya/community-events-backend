// Libraries
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
  title?: string | null;

  @Expose()
  description?: string | null;

  @Expose()
  speakerID?: string | null;

  @Expose()
  speakerName?: string | null;

  @Expose()
  startAt!: Date;

  @Expose()
  endAt!: Date;
}

class EventSpeakerResDto {
  @Expose()
  id!: string;

  @Expose()
  name!: string;

  @Expose()
  title?: string | null;

  @Expose()
  bio?: string | null;

  @Expose()
  photoUrl?: string | null;

  @Expose()
  order!: number;
}

class EventSponsorResDto {
  @Expose()
  id!: string;

  @Expose()
  name!: string;

  @Expose()
  logoUrl?: string | null;

  @Expose()
  websiteUrl?: string | null;

  @Expose()
  tier?: string | null;

  @Expose()
  order!: number;
}

class EventGalleryResDto {
  @Expose()
  id!: string;

  @Expose()
  fileID!: string;

  @Expose()
  fileUrl!: string;

  @Expose()
  caption?: string | null;

  @Expose()
  order!: number;
}

class EventTicketResDto {
  @Expose()
  id!: string;

  @Expose()
  name!: string;

  @Expose()
  type!: string;

  @Expose()
  price?: number;

  @Expose()
  currency?: string;

  @Expose()
  quota?: number;

  @Expose()
  available!: number;

  @Expose()
  salesStart?: Date;

  @Expose()
  salesEnd?: Date;

  @Expose()
  description?: string;

  @Expose()
  order!: number;
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
  @Type(() => EventSpeakerResDto)
  speakers?: EventSpeakerResDto[];

  @Expose()
  @Type(() => EventSponsorResDto)
  sponsors?: EventSponsorResDto[];

  @Expose()
  @Type(() => EventGalleryResDto)
  gallery?: EventGalleryResDto[];

  @Expose()
  @Type(() => EventTicketResDto)
  tickets?: EventTicketResDto[];

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

  @Expose()
  coverImageID?: string | null;

  @Expose()
  coverImageUrl?: string | null;
}
