/**
 * Type-safe permission constants matching database permission format.
 * Format: MODULE.ACTION (e.g., USERS.CREATE, USERS.VIEW)
 *
 * These constants align with the Permission table in the database
 * and are used with the @Permission decorator for route protection.
 *
 * @example
 * @Permission('USERS', ActionEnum.CREATE)
 * // Checks for permission: PERMISSIONS.USERS.CREATE = 'USERS.CREATE'
 */
export const PERMISSIONS = {
  USERS: {
    CREATE: 'USERS.CREATE',
    VIEW: 'USERS.VIEW',
    UPDATE: 'USERS.UPDATE',
    DELETE: 'USERS.DELETE',
  },
  PERMISSIONS: {
    VIEW: 'PERMISSIONS.VIEW',
    ASSIGN: 'PERMISSIONS.ASSIGN',
    REVOKE: 'PERMISSIONS.REVOKE',
  },
  FILES: {
    CREATE: 'FILES.CREATE',
    VIEW: 'FILES.VIEW',
    DELETE: 'FILES.DELETE',
    VIEW_ALL: 'FILES.VIEW_ALL',
  },
  ANNOUNCEMENTS: {
    CREATE: 'ANNOUNCEMENTS.CREATE',
    VIEW: 'ANNOUNCEMENTS.VIEW',
    VIEW_ALL: 'ANNOUNCEMENTS.VIEW_ALL',
    UPDATE: 'ANNOUNCEMENTS.UPDATE',
    DELETE: 'ANNOUNCEMENTS.DELETE',
  },
  CHAT: {
    CREATE: 'CHAT.CREATE',
    VIEW: 'CHAT.VIEW',
    UPDATE: 'CHAT.UPDATE',
    DELETE: 'CHAT.DELETE',
  },
} as const;

/**
 * Type helper for permission values
 */
export type PermissionValue =
  (typeof PERMISSIONS)[keyof typeof PERMISSIONS][keyof (typeof PERMISSIONS)[keyof typeof PERMISSIONS]];
