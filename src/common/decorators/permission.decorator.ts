// Libraries
import { SetMetadata } from '@nestjs/common';

// Enums
import { ActionEnum } from '../enums/action.enum';

/**
 * Metadata key for permission-based authorization
 */
export const PERMISSION_KEY = 'permission';

/**
 * Permission metadata interface
 */
export interface PermissionMetadata {
  module: string;
  action: ActionEnum;
}

/**
 * Decorator to mark routes with required permission.
 * Used with PermissionsGuard to enforce permission-based access control.
 *
 * @param module - The module name (e.g., 'USERS', 'ROLES')
 * @param action - The action type from ActionEnum (CREATE, VIEW, UPDATE, DELETE)
 *
 * @example
 * ```typescript
 * @Permission('USERS', ActionEnum.CREATE)
 * @Post()
 * async create(@Body() dto: CreateUserDto) {
 *   return this.usersService.create(dto);
 * }
 * ```
 */
export const Permission = (module: string, action: ActionEnum) =>
  SetMetadata(PERMISSION_KEY, { module, action } as PermissionMetadata);
