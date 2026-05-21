/**
 * User type enumeration for hierarchical role categorization.
 *
 * UserType defines the top-level user category:
 * - ADMIN: System administrators with access to admin-level roles
 * - USER: Standard users with access to user-level roles
 *
 * Roles are linked to UserType via Role.parentType:
 * - ADMIN roles: admin
 * - USER roles: staff, manager, user
 *
 * @example
 * // In CreateUserDto
 * userType: UserTypeEnum.ADMIN
 *
 * @example
 * // Role assignment validation
 * if (user.userType !== role.parentType) {
 *   throw new BadRequestException('Role type mismatch');
 * }
 */
export enum UserTypeEnum {
  ADMIN = 'ADMIN',
  USER = 'USER',
}
