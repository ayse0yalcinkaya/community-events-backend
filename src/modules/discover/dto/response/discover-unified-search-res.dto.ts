import { Expose, Type } from 'class-transformer';

import { EventResDto } from '@/modules/events/dto/response/event-res.dto';

class DiscoverUnifiedCommunityItemResDto {
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

class DiscoverUnifiedUserItemResDto {
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

class DiscoverUnifiedCategoryItemResDto {
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

class DiscoverUnifiedSearchSectionMetaResDto {
  @Expose()
  count!: number;
}

class DiscoverUnifiedSearchSectionResDto<TItem> {
  @Expose()
  @Type(() => DiscoverUnifiedSearchSectionMetaResDto)
  meta!: DiscoverUnifiedSearchSectionMetaResDto;

  @Expose()
  items!: TItem[];
}

export class DiscoverUnifiedSearchResDto {
  @Expose()
  query!: string;

  @Expose()
  @Type(() => DiscoverUnifiedSearchSectionResDto)
  events!: DiscoverUnifiedSearchSectionResDto<EventResDto>;

  @Expose()
  @Type(() => DiscoverUnifiedSearchSectionResDto)
  communities!: DiscoverUnifiedSearchSectionResDto<DiscoverUnifiedCommunityItemResDto>;

  @Expose()
  @Type(() => DiscoverUnifiedSearchSectionResDto)
  users!: DiscoverUnifiedSearchSectionResDto<DiscoverUnifiedUserItemResDto>;

  @Expose()
  @Type(() => DiscoverUnifiedSearchSectionResDto)
  categories!: DiscoverUnifiedSearchSectionResDto<DiscoverUnifiedCategoryItemResDto>;
}
