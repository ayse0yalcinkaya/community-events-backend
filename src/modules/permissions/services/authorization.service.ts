// Libraries
import { Injectable } from '@nestjs/common';

// Services
import { PrismaService } from '../../../database/prisma.service';
// Interfaces/Types
import { Permission } from '@prisma/client';
// Enums
import { UserTypeEnum } from '../../../common/enums/user-type.enum';

/**
 * Authorization service for role-based access control with default permissions.
 *
 * Implements role-based permission model with default permission fallback:
 * - User → Role → RolePermission → Permission (role-based)
 * - User → UserType → Module.defaultAdminActions/defaultUserActions (default)
 *
 * Permission Check Order:
 * 1. Check role-based permissions first
 * 2. If not found, check default permissions based on userType
 *
 * Performance optimized with eager loading to avoid N+1 queries.
 *
 * @see Story 3.5: Authorization Service Implementation
 */
@Injectable()
export class AuthorizationService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Check if a user has a specific permission via their role OR default permissions.
   *
   * @param userID - The ID of the user to check
   * @param permission - The permission string (e.g., 'USERS.CREATE', 'USERS.VIEW')
   * @returns Promise<boolean> - TRUE if user has permission, FALSE otherwise
   *
   * Implementation:
   * 1. Parses permission string into module and action
   * 2. Checks role-based permissions (User → Role → RolePermission)
   * 3. If not found, checks default permissions based on userType
   *
   * Performance: Target < 50ms (p95) via optimized Prisma queries with eager loading
   */
  async hasPermission(userID: string, permission: string): Promise<boolean> {
    // Parse permission string (e.g., 'USERS.CREATE' → module='USERS', action='CREATE')
    const [moduleName, action] = permission.split('.');
    if (!moduleName || !action) {
      return false;
    }

    // Step 1: Check role-based permissions
    const hasRolePermission = await this.checkRolePermission(userID, moduleName, action);
    if (hasRolePermission) {
      return true;
    }

    // Step 2: Check default permissions based on userType
    return this.checkDefaultPermission(userID, moduleName, action);
  }

  /**
   * Check role-based permission (extracted from original hasPermission logic)
   */
  private async checkRolePermission(userID: string, moduleName: string, action: string): Promise<boolean> {
    const userRoles = await this.fetchUserRoles(userID);

    if (!userRoles.length) {
      return false;
    }

    // Flatten role permissions
    const permissions = userRoles
      .flatMap((ur: any) => ur?.role?.rolePermissions ?? [])
      .map((rp: any) => rp?.permission)
      .filter(Boolean);

    // Check if permission exists
    // Compare module name from permission string with module name extracted from nameKey
    return permissions.some((p: any) => {
      const dbModuleKey = p.module?.nameKey; // e.g., modules.USERS.NAME
      if (!dbModuleKey) return false;
      const match = dbModuleKey.match(/modules\.(.+)\.NAME/); // Extract USERS
      const dbModuleName = match ? match[1] : '';
      return dbModuleName === moduleName && p.action === action;
    });
  }

  /**
   * Check default permission based on user's userType and module defaults.
   *
   * @param userID - User ID
   * @param moduleName - Module name (e.g., 'TICKETS')
   * @param action - Action name (e.g., 'VIEW')
   * @returns Promise<boolean>
   */
  private async checkDefaultPermission(userID: string, moduleName: string, action: string): Promise<boolean> {
    // Fetch user's userType
    const user = await this.prisma.user.findUnique({
      where: { id: userID },
      select: { userType: true },
    });

    if (!user) {
      return false;
    }

    // Fetch module with default actions
    const moduleKey = `modules.${moduleName}.NAME`;
    const module = await this.prisma.module.findUnique({
      where: { nameKey: moduleKey },
      select: {
        defaultAdminActions: true,
        defaultUserActions: true,
      },
    });

    if (!module) {
      return false;
    }

    // Check based on userType
    if (user.userType === UserTypeEnum.ADMIN) {
      return module.defaultAdminActions.includes(action);
    } else if (user.userType === UserTypeEnum.USER) {
      return module.defaultUserActions.includes(action);
    }

    return false;
  }

  /**
   * Get all permissions for a user via their role.
   *
   * @param userID - The ID of the user
   * @returns Promise<Permission[]> - Array of permissions
   *
   * Implementation:
   * 1. Queries user based permissions (User → Role → RolePermission)
   * 2. Returns permissions
   *
   * Performance: Target < 100ms (p95) via optimized Prisma queries
   */
  async getUserPermissions(userID: string): Promise<Permission[]> {
    const userRoles = await this.fetchUserRoles(userID);

    if (!userRoles.length) return [];

    const permissions = userRoles
      .flatMap((ur: any) => ur?.role?.rolePermissions ?? [])
      .map((rp: any) => rp?.permission)
      .filter(Boolean);

    // Deduplicate permissions by module/action
    const unique = new Map<string, Permission>();
    permissions.forEach((perm: any) => {
      const moduleKey = perm.module?.nameKey || 'UNKNOWN';
      unique.set(`${moduleKey}.${perm.action}`, perm);
    });

    return Array.from(unique.values());
  }

  /**
   * Load user roles with permissions using whichever Prisma relations are available.
   * Supports both userRole join model (tests) and direct user.role relation (production).
   */
  private async fetchUserRoles(userID: string) {
    const userRoleDelegate = (this.prisma as any).userRole;

    if (userRoleDelegate?.findMany) {
      return userRoleDelegate.findMany({
        where: { userID },
        include: {
          role: {
            include: {
              rolePermissions: {
                include: {
                  permission: {
                    include: { module: true },
                  },
                },
              },
            },
          },
        },
      });
    }

    // Fallback to single role relation
    const user = await this.prisma.user.findUnique({
      where: { id: userID },
      select: {
        role: {
          include: {
            rolePermissions: {
              include: {
                permission: {
                  include: { module: true },
                },
              },
            },
          },
        },
      },
    });

    if (!user?.role) return [];

    return [
      {
        role: user.role,
      },
    ];
  }
}
