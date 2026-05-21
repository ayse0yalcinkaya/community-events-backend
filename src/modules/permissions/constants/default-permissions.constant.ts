/**
 * Default Permission Configuration
 *
 * IMPORTANT: Default permissions are ONLY for internal/system modules.
 * Frontend modules (menu items) should be controlled ONLY via role-based permissions.
 *
 * This ensures that when an admin removes a permission from a role,
 * the user actually loses access (no fallback from defaults).
 *
 * INTERNAL MODULES (default OK): NOTIFICATIONS, FILES, DEVICE_TOKENS, NOTIFICATION_PREFERENCES
 * FRONTEND MODULES (role-only): USERS, ANNOUNCEMENTS, etc.
 */

// Standard CRUD actions
export const CRUD_ACTIONS = ['CREATE', 'VIEW', 'UPDATE', 'DELETE'];
export const VIEW_ONLY = ['VIEW'];

/**
 * ADMIN Default Modules
 *
 * Only internal/system modules that every ADMIN needs regardless of role.
 * Frontend modules are assigned via role (admin role gets all permissions).
 */
export const DEFAULT_ADMIN_MODULES: Record<string, string[]> = {
  // Internal: Bildirim yönetimi
  NOTIFICATIONS: ['VIEW', 'MARK_READ', 'DELETE', 'SEND'],

  // Internal: Dosya yönetimi
  FILES: ['CREATE', 'VIEW', 'DELETE', 'VIEW_ALL'],

  // Internal: Bildirim tercihleri
  NOTIFICATION_PREFERENCES: ['VIEW', 'UPDATE', 'MANAGE'],

  // Internal: Cihaz token (push notification)
  DEVICE_TOKENS: ['VIEW', 'REGISTER', 'DELETE'],

  ANNOUNCEMENTS: ['VIEW_ALL'],
};

/**
 * USER Default Modules
 *
 * Only internal/system modules that every USER needs regardless of role.
 * Frontend modules are assigned via role (user role gets limited permissions).
 */
export const DEFAULT_USER_MODULES: Record<string, string[]> = {
  // Internal: Bildirim yönetimi
  NOTIFICATIONS: ['VIEW', 'MARK_READ'],

  // Internal: Dosya yönetimi
  FILES: ['VIEW', 'CREATE'],

  // Internal: Bildirim tercihleri
  NOTIFICATION_PREFERENCES: ['VIEW', 'UPDATE'],

  // Internal: Cihaz token (push notification)
  DEVICE_TOKENS: ['VIEW', 'REGISTER', 'DELETE'],

  ANNOUNCEMENTS: ['VIEW_ALL'],
};

/**
 * Get default actions for a module based on user type
 *
 * @param moduleName - Module name (e.g., 'NOTIFICATIONS', 'FILES')
 * @param userType - User type ('ADMIN' or 'USER')
 * @returns Array of default actions or empty array
 */
export function getDefaultActionsForModule(moduleName: string, userType: 'ADMIN' | 'USER'): string[] {
  if (userType === 'ADMIN') {
    return DEFAULT_ADMIN_MODULES[moduleName] ?? [];
  }
  return DEFAULT_USER_MODULES[moduleName] ?? [];
}
