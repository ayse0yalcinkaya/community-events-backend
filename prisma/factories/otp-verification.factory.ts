// Libraries
import { randomUUID } from 'crypto';
export interface OTPVerificationInput {
  userID?: string;
  code?: string;
  type?: string;
  purpose?: string;
  expiresAt?: Date;
  attempts?: number;
  verified?: boolean;
}

/**
 * OTP Verification Factory
 *
 * Creates OTP verification records for users
 * Supports EMAIL and SMS OTP types
 * Generates realistic 6-digit codes
 *
 * Example usage:
 * const otp = OTPVerificationFactory.generate({
 *   userID: 'user-uuid',
 *   type: 'EMAIL'
 * });
 */
export class OTPVerificationFactory {
  private static types = ['EMAIL', 'SMS'];
  private static purposes = [
    'REGISTRATION',
    'LOGIN',
    'PASSWORD_RESET',
    'PHONE_VERIFICATION',
    'EMAIL_VERIFICATION',
    'TWO_FACTOR_AUTH',
  ];

  /**
   * Generate a single OTP verification
   */
  static generate(overrides: OTPVerificationInput = {}): any {
    const type = overrides.type || this.getRandomElement(this.types);
    const purpose = overrides.purpose || this.getRandomElement(this.purposes);

    // Generate a 6-digit numeric code
    const code = overrides.code || this.generateOTPCode();

    // 60% chance of being verified (for old records)
    const verified = overrides.verified !== undefined ? overrides.verified : Math.random() > 0.4;

    // Generate expiration date (15 minutes from now for unverified, past date for verified)
    const now = new Date();
    const expiresAt =
      overrides.expiresAt || new Date(now.getTime() + (verified ? -24 * 60 * 60 * 1000 : 15 * 60 * 1000));

    // Random attempts (0-5 for verified, 0-3 for unverified)
    const attempts =
      overrides.attempts !== undefined ? overrides.attempts : Math.floor(Math.random() * (verified ? 6 : 4));

    const createdAt = new Date(expiresAt.getTime() - 24 * 60 * 60 * 1000); // Created 24h before expiration

    return {
      userID: overrides.userID || randomUUID(),
      code,
      type,
      purpose,
      expiresAt,
      attempts,
      verified,
      createdAt,
    };
  }

  /**
   * Generate multiple OTP verifications
   */
  static generateMany(count: number, overrides: OTPVerificationInput = {}): any[] {
    return Array.from({ length: count }, () => this.generate(overrides));
  }

  /**
   * Generate OTP for specific user
   */
  static generateForUser(userID: string, count: number = 1): any[] {
    return this.generateMany(count, { userID });
  }

  /**
   * Generate verified OTP
   */
  static generateVerified(userID: string, type: string = 'EMAIL'): any {
    return this.generate({
      userID,
      type,
      verified: true,
      expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Expired yesterday
    });
  }

  /**
   * Generate unverified OTP (active)
   */
  static generateUnverified(userID: string, type: string = 'EMAIL'): any {
    return this.generate({
      userID,
      type,
      verified: false,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000), // Expires in 15 minutes
    });
  }

  /**
   * Generate a 6-digit OTP code
   */
  private static generateOTPCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Get random element from array
   */
  private static getRandomElement<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
  }
}
