// Libraries
import { Expose } from 'class-transformer';

// Enums
import { Platform } from '../enums/platform.enum';

/**
 * Response DTO for device token registration
 * Used by POST /users/me/device-tokens endpoint
 *
 * Fields exposed:
 * - id: DeviceToken UUID
 * - token: FCM device token (masked for security)
 * - platform: Platform enum (iOS or Android)
 * - createdAt: Timestamp when token was registered
 */
export class DeviceTokenResDto {
  @Expose()
  id!: string;

  @Expose()
  token!: string;

  @Expose()
  platform!: Platform;

  @Expose()
  createdAt!: Date;
}
