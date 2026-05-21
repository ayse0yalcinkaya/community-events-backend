// Libraries
import { Expose } from 'class-transformer';

// Enums
import { AuthProviderEnum } from '../enums';

/**
 * Response DTO for UserProvider
 * Used when returning user's authentication providers
 *
 * NOTE: credentials field is NEVER exposed for security
 */
export class UserProviderResDto {
  @Expose()
  id!: string;

  @Expose()
  provider!: AuthProviderEnum;

  @Expose()
  identifier!: string;

  @Expose()
  lastLogin!: Date | null;

  @Expose()
  status!: number;

  @Expose()
  createdAt!: Date;

  // credentials is NEVER exposed for security reasons
}
