/**
 * Response DTO for Permission entity.
 * Used in GET /permissions and GET /users/:id/permissions endpoints.
 *
 * Maps to Permission table fields:
 * - id: UUID primary key
 * - module: Permission module (e.g., 'USERS', 'PERMISSIONS')
 * - action: Permission action (e.g., 'CREATE', 'VIEW', 'ASSIGN')
 * - description: Human-readable description
 * - createdAt: Creation timestamp
 * - isDefault: Whether this permission comes from module defaults (not role assignment)
 *
 * @see Story 3.8, AC-3.8.1, AC-3.8.3
 */
export class PermissionResDto {
  id!: string;
  module!: string;
  action!: string;
  description!: string;
  createdAt!: Date;

  /**
   * Indicates if this permission is granted by default based on userType,
   * rather than explicitly assigned via a role.
   *
   * - true: Permission comes from Module.defaultAdminActions or defaultUserActions
   * - false: Permission comes from user's assigned role
   */
  isDefault?: boolean;
}
