// Libraries
import { randomUUID } from 'crypto';
export interface NotificationPreferenceInput {
  userID?: string;
  channel?: string;
  enabled?: boolean;
}

/**
 * Notification Preference Factory
 *
 * Creates notification preference records for users
 * Supports EMAIL, SMS, and PUSH channels
 *
 * Example usage:
 * const preference = NotificationPreferenceFactory.generate({
 *   userID: 'user-uuid',
 *   channel: 'EMAIL'
 * });
 */
export class NotificationPreferenceFactory {
  private static channels = ['EMAIL', 'SMS', 'PUSH'];

  /**
   * Generate a single notification preference
   */
  static generate(overrides: NotificationPreferenceInput = {}): any {
    const channel = overrides.channel || this.getRandomElement(this.channels);
    // Most users have preferences enabled (80% chance)
    const enabled = overrides.enabled !== undefined ? overrides.enabled : Math.random() > 0.2;

    const now = new Date();

    return {
      userID: overrides.userID || randomUUID(),
      channel,
      enabled,
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * Generate multiple notification preferences
   */
  static generateMany(count: number, overrides: NotificationPreferenceInput = {}): any[] {
    return Array.from({ length: count }, () => this.generate(overrides));
  }

  /**
   * Generate complete preference set for a user (all 3 channels)
   */
  static generateCompleteSet(userID: string): any[] {
    return this.channels.map((channel) =>
      this.generate({
        userID,
        channel,
        enabled: Math.random() > 0.15, // 85% chance of being enabled
      }),
    );
  }

  /**
   * Generate preferences for specific user
   */
  static generateForUser(userID: string, channels: string[] = this.channels): any[] {
    return channels.map((channel) =>
      this.generate({
        userID,
        channel,
      }),
    );
  }

  /**
   * Get random element from array
   */
  private static getRandomElement<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
  }
}
