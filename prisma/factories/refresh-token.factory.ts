import { randomUUID } from 'crypto';

export interface RefreshTokenInput {
  userID?: string;
  token?: string;
  expiresAt?: Date;
}

/**
 * Refresh Token Factory
 *
 * Creates refresh token records for JWT authentication
 * Generates realistic JWT-like tokens with proper expiration
 *
 * Example usage:
 * const refreshToken = RefreshTokenFactory.generate({
 *   userID: 'user-uuid'
 * });
 */
export class RefreshTokenFactory {
  private static readonly TOKEN_PREFIX = 'refresh_token_';
  private static readonly DEFAULT_EXPIRY_DAYS = 30;

  /**
   * Generate a single refresh token
   */
  static generate(overrides: RefreshTokenInput = {}): any {
    const token = overrides.token || this.generateTokenString();
    const now = new Date();

    // Generate expiration date (defaults to 30 days from now)
    const expiresAt =
      overrides.expiresAt ||
      new Date(now.getTime() + this.DEFAULT_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

    return {
      userID: overrides.userID || randomUUID(),
      token,
      expiresAt,
      createdAt: now,
    };
  }

  /**
   * Generate multiple refresh tokens
   */
  static generateMany(count: number, overrides: RefreshTokenInput = {}): any[] {
    return Array.from({ length: count }, () => this.generate(overrides));
  }

  /**
   * Generate refresh token for specific user
   */
  static generateForUser(userID: string, count: number = 1): any[] {
    return this.generateMany(count, { userID });
  }

  /**
   * Generate expired token (for testing expired token cleanup)
   */
  static generateExpired(userID: string): any {
    const now = new Date();
    return this.generate({
      userID,
      expiresAt: new Date(now.getTime() - 24 * 60 * 60 * 1000), // Expired yesterday
    });
  }

  /**
   * Generate soon-to-expire token (for testing token refresh logic)
   */
  static generateExpiringSoon(userID: string): any {
    const now = new Date();
    return this.generate({
      userID,
      expiresAt: new Date(now.getTime() + 2 * 60 * 60 * 1000), // Expires in 2 hours
    });
  }

  /**
   * Generate fresh token (far from expiration)
   */
  static generateFresh(userID: string): any {
    const now = new Date();
    return this.generate({
      userID,
      expiresAt: new Date(now.getTime() + 25 * 24 * 60 * 60 * 1000), // Expires in 25 days
    });
  }

  /**
   * Generate a realistic refresh token string
   */
  private static generateTokenString(): string {
    const randomBytes = Buffer.from(
      Array.from({ length: 64 }, () => Math.floor(Math.random() * 256)),
    ).toString('base64url');

    return `${this.TOKEN_PREFIX}${randomBytes}`;
  }
}
