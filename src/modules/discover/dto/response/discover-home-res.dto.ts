// Libraries
import { Expose, Type } from 'class-transformer';
class DiscoverEventItemResDto {
  @Expose()
  id!: string;

  @Expose()
  title!: string;

  @Expose()
  slug!: string;

  @Expose()
  shortDescription?: string | null;

  @Expose()
  format!: string;

  @Expose()
  city?: string | null;

  @Expose()
  publishedAt?: Date | null;

  @Expose()
  nextSessionStartAt?: Date | null;

  @Expose()
  attendeeCount!: number;
}

class DiscoverCategoryItemResDto {
  @Expose()
  id!: string;

  @Expose()
  name!: string;

  @Expose()
  slug!: string;

  @Expose()
  icon?: string | null;

  @Expose()
  eventCount!: number;
}

class DiscoverCommunityItemResDto {
  @Expose()
  id!: string;

  @Expose()
  name!: string;

  @Expose()
  slug!: string;

  @Expose()
  shortDescription?: string | null;

  @Expose()
  city?: string | null;

  @Expose()
  memberCount!: number;

  @Expose()
  activeEventCount?: number;
}

class DiscoverStatsResDto {
  @Expose()
  totalPublishedEvents!: number;

  @Expose()
  totalActiveCommunities!: number;

  @Expose()
  totalRootCategories!: number;
}

export class DiscoverHomeResDto {
  @Expose()
  @Type(() => DiscoverEventItemResDto)
  featuredEvents!: DiscoverEventItemResDto[];

  @Expose()
  @Type(() => DiscoverEventItemResDto)
  upcomingEvents!: DiscoverEventItemResDto[];

  @Expose()
  @Type(() => DiscoverCategoryItemResDto)
  popularCategories!: DiscoverCategoryItemResDto[];

  @Expose()
  @Type(() => DiscoverCommunityItemResDto)
  featuredCommunities!: DiscoverCommunityItemResDto[];

  @Expose()
  @Type(() => DiscoverEventItemResDto)
  recommendedEvents!: DiscoverEventItemResDto[];

  @Expose()
  @Type(() => DiscoverCommunityItemResDto)
  trendingCommunities!: DiscoverCommunityItemResDto[];

  @Expose()
  @Type(() => DiscoverEventItemResDto)
  communityEvents?: DiscoverEventItemResDto[];

  @Expose()
  @Type(() => DiscoverStatsResDto)
  stats!: DiscoverStatsResDto;
}
