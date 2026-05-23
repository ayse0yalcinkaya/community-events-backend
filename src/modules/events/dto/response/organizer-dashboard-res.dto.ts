import { Expose, Type } from 'class-transformer';

import { EventResDto } from './event-res.dto';

class OrganizerDashboardStatsResDto {
  @Expose()
  totalEvents!: number;

  @Expose()
  draftEvents!: number;

  @Expose()
  publishedEvents!: number;

  @Expose()
  cancelledEvents!: number;

  @Expose()
  completedEvents!: number;

  @Expose()
  totalAttendees!: number;

  @Expose()
  totalBookmarks!: number;
}

export class OrganizerDashboardResDto {
  @Expose()
  @Type(() => OrganizerDashboardStatsResDto)
  stats!: OrganizerDashboardStatsResDto;

  @Expose()
  @Type(() => EventResDto)
  recentEvents!: EventResDto[];
}
