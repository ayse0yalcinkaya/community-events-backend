import { Expose, Type } from 'class-transformer';

class DashboardEventSummaryDto {
  @Expose()
  id!: string;

  @Expose()
  title!: string;

  @Expose()
  slug!: string;

  @Expose()
  format!: string;

  @Expose()
  city?: string | null;

  @Expose()
  nextSessionStartAt?: Date | null;

  @Expose()
  attendeeCount!: number;
}

class DashboardCommunitySummaryDto {
  @Expose()
  id!: string;

  @Expose()
  name!: string;

  @Expose()
  slug!: string;

  @Expose()
  city?: string | null;

  @Expose()
  memberCount!: number;
}

class DashboardConnectionsSummaryDto {
  @Expose()
  totalAccepted!: number;

  @Expose()
  pendingReceived!: number;
}

export class UserDashboardResDto {
  @Expose()
  @Type(() => DashboardEventSummaryDto)
  upcomingEvents!: DashboardEventSummaryDto[];

  @Expose()
  @Type(() => DashboardEventSummaryDto)
  bookmarkedEvents!: DashboardEventSummaryDto[];

  @Expose()
  @Type(() => DashboardCommunitySummaryDto)
  communities!: DashboardCommunitySummaryDto[];

  @Expose()
  @Type(() => DashboardConnectionsSummaryDto)
  connections!: DashboardConnectionsSummaryDto;

  @Expose()
  totalAttendedEvents!: number;

  @Expose()
  totalBookmarks!: number;

  @Expose()
  totalCommunities!: number;
}
