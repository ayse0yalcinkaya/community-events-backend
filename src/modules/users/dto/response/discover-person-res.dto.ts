import { Expose, Type } from 'class-transformer';

class DiscoverPersonEventResDto {
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
}

export class DiscoverPersonResDto {
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
  profileImageID?: string | null;

  @Expose()
  connectionStatus?: string | null;

  @Expose()
  totalConnections!: number;

  @Expose()
  @Type(() => DiscoverPersonEventResDto)
  publicEvents!: DiscoverPersonEventResDto[];
}
