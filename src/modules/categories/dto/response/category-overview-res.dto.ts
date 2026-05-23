// Libraries
import { Expose } from 'class-transformer';
class CategoryOverviewEventResDto {
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

class CategoryOverviewCommunityResDto {
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
}

class CategoryOverviewUserResDto {
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
}

export class CategoryOverviewResDto {
  @Expose()
  id!: string;

  @Expose()
  name!: string;

  @Expose()
  slug!: string;

  @Expose()
  description?: string | null;

  @Expose()
  eventCount!: number;

  @Expose()
  communityCount!: number;

  @Expose()
  peopleCount!: number;

  @Expose()
  events!: CategoryOverviewEventResDto[];

  @Expose()
  communities!: CategoryOverviewCommunityResDto[];

  @Expose()
  people!: CategoryOverviewUserResDto[];
}
