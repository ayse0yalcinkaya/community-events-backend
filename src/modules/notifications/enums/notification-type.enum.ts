/**
 * Notification Type Enum
 *
 * Defines the types of notifications that can be sent through the unified notification service.
 */
export enum NotificationType {
  /** Email verification notifications */
  VERIFICATION = 0,
  /** Password reset notifications */
  PASSWORD_RESET = 1,
  /** OTP (One-Time Password) notifications */
  OTP = 2,
  /** General notifications */
  GENERAL = 3,
  /** Alert notifications */
  ALERT = 4,
  /** Marketing notifications */
  MARKETING = 5,
  /** Event reminder notifications */
  EVENT_REMINDER = 6,
  /** Event recommendation notifications */
  EVENT_RECOMMENDATION = 7,
  /** Community announcement notifications */
  COMMUNITY_ANNOUNCEMENT = 8,
  /** Connection request notifications */
  CONNECTION_REQUEST = 9,
  /** Connection accepted notifications */
  CONNECTION_ACCEPTED = 10,
}
