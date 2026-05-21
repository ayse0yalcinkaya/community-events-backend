/**
 * SMS Status Enum
 *
 * Defines the possible states of an SMS message throughout its lifecycle.
 */
export enum SmsStatus {
  /** Initial state when SMS is created */
  PENDING = 0,
  /** SMS has been sent to provider */
  SENT = 1,
  /** SMS has been delivered to recipient */
  DELIVERED = 2,
  /** SMS delivery failed */
  FAILED = 3,
}
