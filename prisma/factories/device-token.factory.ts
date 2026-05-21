import { randomUUID } from 'crypto';
import { Platform } from '../../src/modules/notifications/enums/platform.enum';

export interface DeviceTokenInput {
  userID?: string;
  token?: string;
  platform?: Platform;
}

/**
 * Device Token Factory
 *
 * Creates device token records for push notifications
 * Supports iOS and Android platforms
 *
 * Example usage:
 * const deviceToken = DeviceTokenFactory.generate({
 *   userID: 'user-uuid',
 *   platform: Platform.iOS
 * });
 */
export class DeviceTokenFactory {
  /**
   * Generate a single device token
   */
  static generate(overrides: DeviceTokenInput = {}): any {
    const platform = overrides.platform || this.getRandomPlatform();
    const token = overrides.token || this.generateToken(platform);

    const now = new Date();

    return {
      userID: overrides.userID || randomUUID(),
      token,
      platform,
      createdAt: now,
    };
  }

  /**
   * Generate multiple device tokens
   */
  static generateMany(count: number, overrides: DeviceTokenInput = {}): any[] {
    return Array.from({ length: count }, () => this.generate(overrides));
  }

  /**
   * Generate device tokens for specific user
   */
  static generateForUser(userID: string, count: number = 1): any[] {
    return this.generateMany(count, { userID });
  }

  /**
   * Generate both iOS and Android tokens for a user
   */
  static generateForUserMultiPlatform(userID: string): any[] {
    return [
      this.generate({
        userID,
        platform: Platform.iOS,
        token: this.generateToken(Platform.iOS),
      }),
      this.generate({
        userID,
        platform: Platform.Android,
        token: this.generateToken(Platform.Android),
      }),
    ];
  }

  /**
   * Generate FCM/APNs token based on platform
   */
  private static generateToken(platform: Platform): string {
    if (platform === Platform.iOS) {
      // iOS APNs token (64 hex chars)
      return Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    } else {
      // Android FCM token (11 char groups separated by colons)
      return Array.from({ length: 4 }, () =>
        Array.from({ length: 11 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
      ).join(':');
    }
  }

  /**
   * Get random platform
   */
  private static getRandomPlatform(): Platform {
    return Math.random() > 0.5 ? Platform.iOS : Platform.Android;
  }
}
