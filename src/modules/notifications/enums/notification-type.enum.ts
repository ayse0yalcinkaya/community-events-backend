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
}
