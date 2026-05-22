import { Expose } from 'class-transformer';

export class CommunityResDto {
  @Expose()
  id!: string;

  @Expose()
  name!: string;

  @Expose()
  slug!: string;

  @Expose()
  shortDescription?: string | null;

  @Expose()
  description?: string | null;

  @Expose()
  city?: string | null;

  @Expose()
  website?: string | null;

  @Expose()
  instagramUrl?: string | null;

  @Expose()
  linkedinUrl?: string | null;

  @Expose()
  status!: string;

  @Expose()
  createdAt!: Date;

  @Expose()
  updatedAt!: Date;

  @Expose()
  memberCount?: number;

  @Expose()
  activeEventCount?: number;

  @Expose()
  currentUserMembershipStatus?: string | null;

  @Expose()
  currentUserMembershipRole?: string | null;

  @Expose()
  logoFileID?: string | null;

  @Expose()
  coverImageFileID?: string | null;

  @Expose()
  logoUrl?: string | null;

  @Expose()
  coverImageUrl?: string | null;
}
