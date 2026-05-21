/**
 * Action enumeration for permission-based authorization.
 * Defines action types used in @Permission decorator.
 *
 * Complete action coverage for all system modules:
 *
 * Standard CRUD actions:
 * - CREATE: Create new resources
 * - VIEW: Read/view resources
 * - UPDATE: Update existing resources
 * - DELETE: Delete resources
 *
 * Permission management:
 * - ASSIGN: Assign permissions/roles
 * - REVOKE: Revoke permissions/roles
 *
 * User management:
 * - ACTIVATE: Activate/deactivate users
 *
 * File management:
 * - VIEW_ALL: View all users' files (elevated permission)
 *
 * Notification management:
 * - MARK_READ: Mark notifications as read
 * - SEND: Send notifications to users
 *
 * Preference management:
 * - MANAGE: Manage settings/preferences for all users
 *
 * Device management:
 * - REGISTER: Register device tokens
 *
 * OTP verification:
 * - VERIFY: Verify OTP codes
 *
 * SMS management:
 * - RESEND: Resend SMS messages
 *
 * Ticket approval:
 * - APPROVE: Approve tickets in review status
 *
 * Report management:
 * - EXPORT: Export reports to PDF/Excel
 *
 * Survey management:
 * - RESPOND: Submit survey responses (separate from CREATE which creates new surveys)
 *
 * @example
 * @Permission('USERS', ActionEnum.CREATE)
 * async create() { ... }
 *
 * @example
 * @Permission('FILES', ActionEnum.VIEW_ALL)
 * async viewAllFiles() { ... }
 *
 * @example
 * @Permission('NOTIFICATIONS', ActionEnum.MARK_READ)
 * async markAsRead() { ... }
 */
export enum ActionEnum {
  // Standard CRUD
  CREATE = 0,
  VIEW = 1,
  UPDATE = 2,
  DELETE = 3,

  // Permission management
  ASSIGN = 4,
  REVOKE = 5,

  // User management
  ACTIVATE = 6,

  // File management
  VIEW_ALL = 7,

  // Notification management
  MARK_READ = 8,
  SEND = 9,

  // Preference management
  MANAGE = 10,

  // Device management
  REGISTER = 11,

  // OTP verification
  VERIFY = 12,

  // SMS management
  RESEND = 13,

  // Ticket approval
  APPROVE = 14,

  // Report management
  EXPORT = 15,

  // Survey management
  RESPOND = 16,
}
