/**
 * SMS Type Enum
 *
 * Defines the types of SMS messages that can be sent.
 */
export enum SmsType {
  /** One-time password for authentication */
  OTP = 0,
  /** General notification message */
  NOTIFICATION = 1,
  /** Marketing/promotional message */
  MARKETING = 2,
  /** Alert/urgent message */
  ALERT = 3,
}
