import { Expose, Type } from 'class-transformer';

class PublicProfileInterestDto {
  @Expose()
  id!: string;

  @Expose()
  name!: string;
}

class PublicProfileCommunityDto {
  @Expose()
  id!: string;

  @Expose()
  name!: string;

  @Expose()
  slug!: string;

  @Expose()
  city?: string | null;
}

class PublicProfileEventDto {
  @Expose()
  id!: string;

  @Expose()
  title!: string;

  @Expose()
  slug!: string;

  @Expose()
  format!: string;
}

export class PublicProfileResDto {
  @Expose()
  id!: string;

  @Expose()
  firstName!: string;

  @Expose()
  lastName!: string;

  @Expose()
  headline?: string | null;

  @Expose()
  bio?: string | null;

  @Expose()
  city?: string | null;

  @Expose()
  website?: string | null;

  @Expose()
  instagramUrl?: string | null;

  @Expose()
  linkedinUrl?: string | null;

  @Expose()
  profileImageUrl?: string | null;

  @Expose()
  @Type(() => PublicProfileInterestDto)
  interests!: PublicProfileInterestDto[];

  @Expose()
  @Type(() => PublicProfileCommunityDto)
  communities!: PublicProfileCommunityDto[];

  @Expose()
  @Type(() => PublicProfileEventDto)
  recentEvents!: PublicProfileEventDto[];

  @Expose()
  connectionStatus?: string | null;

  @Expose()
  totalConnections!: number;
}
