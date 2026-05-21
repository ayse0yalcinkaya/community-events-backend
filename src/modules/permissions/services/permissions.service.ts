// Libraries
import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { Module, Permission, Role, UserType } from '@prisma/client';

// DTOs
import { CreateRoleDto } from '../dto/request/create-role.dto';
import { PermissionsAssignRoleDto } from '../dto/request/assign-role.dto';
import { UpdateRoleDto } from '../dto/request/update-role.dto';
// Services
import { PrismaService } from '../../../database/prisma.service';
// Enums
import { UserTypeEnum } from '../../../common/enums/user-type.enum';

/**
 * Permission with default flag
 */
export interface PermissionWithDefault extends Permission {
  isDefault: boolean;
  module?: Module;
}

/**
 * Permissions Service
 *
 * Handles permission and role CRUD operations.
 * Works with AuthorizationService for permission validation logic.
 *
 * Responsibilities:
 * - List all permissions (GET /permissions)
 * - Get unique permission modules (GET /permissions/modules)
 * - Get user's effective permissions via roles (GET /users/:id/permissions)
 * - Get user's effective permissions via roles (GET /users/:id/permissions)
 * - Create new roles with permissions (POST /roles)
 * - Assign role to user (POST /users/:id/roles)
 *
 * @see Story 3.8: Role & Permission Management Endpoints
 */
@Injectable()
export class PermissionsService {
  private readonly logger = new Logger(PermissionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly i18n: I18nService,
  ) {}

  /**
   * Get all permissions from database.
   *
   * @returns Promise<Permission[]> - All permissions (no pagination, < 100 items)
   *
   * @see AC-3.8.1: GET /permissions endpoint
   */
  async getAllPermissions(): Promise<Permission[]> {
    return this.prisma.permission.findMany({
      include: { module: true },
      orderBy: [{ module: { nameKey: 'asc' } }, { action: 'asc' }],
    });
  }

  /**
   * Get unique permission modules.
   *
   * @returns Promise<string[]> - Unique module names (e.g., ['USERS', 'FILES', 'PERMISSIONS'])
   *
   * @see AC-3.8.2: GET /permissions/modules endpoint
   */
  async getPermissionModules(): Promise<Module[]> {
    return this.prisma.module.findMany({
      where: { isVisible: true },
      orderBy: { nameKey: 'asc' },
    });
  }

  /**
   * Get all roles ordered by name.
   *
   * @returns Promise<Role[]> - All roles (no pagination, < 50 items expected)
   */
  async getAllRoles(): Promise<Role[]> {
    return this.prisma.role.findMany({
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Get user's effective permissions via roles AND default permissions.
   *
   * @param userID - User ID
   * @returns Promise<PermissionWithDefault[]> - Deduplicated permissions with isDefault flag
   *
   * Implementation:
   * 1. Validates user exists
   * 2. Queries role-based permissions (UserRole → RolePermission)
   * 3. Queries default permissions based on userType
   * 4. Merges and deduplicates (role permissions take precedence)
   *
   * @throws NotFoundException if user not found
   *
   * @see AC-3.8.3: GET /users/:id/permissions endpoint
   */
  async getUserPermissions(userID: string): Promise<PermissionWithDefault[]> {
    // Query user with role and permissions
    const user = await this.prisma.user.findUnique({
      where: { id: userID },
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

    if (!user) {
      this.logger.warn(`User not found: ${userID}`);
      throw new NotFoundException(this.i18n.translate('errors.USER_NOT_FOUND'));
    }

    // Collect role-based permissions
    const permissionMap = new Map<string, PermissionWithDefault>();

    if (user.role) {
      // Get permissions from the single role
      user.role.rolePermissions.forEach((rp) => {
        const perm = rp.permission as Permission & { module?: Module };
        const key = `${perm.moduleID}.${perm.action}`;
        permissionMap.set(key, { ...perm, isDefault: false });
      });
    }

    // Add default permissions based on userType
    const defaultPermissions = await this.getDefaultPermissionsForUserType(user.userType);

    for (const defPerm of defaultPermissions) {
      const key = `${defPerm.moduleID}.${defPerm.action}`;
      // Only add if not already present from role
      if (!permissionMap.has(key)) {
        permissionMap.set(key, { ...defPerm, isDefault: true });
      }
    }

    // Return deduplicated permission array, sorted for consistency
    const result = Array.from(permissionMap.values()).sort((a: any, b: any) => {
      if (a.module?.nameKey === b.module?.nameKey) {
        return a.action.localeCompare(b.action);
      }
      return (a.module?.nameKey || '').localeCompare(b.module?.nameKey || '');
    });

    this.logger.log(`Retrieved ${result.length} permissions for user ${userID} (includes defaults)`);
    return result;
  }

  /**
   * Get default permissions for a user type from module defaults.
   *
   * @param userType - User type (ADMIN or USER)
   * @returns Promise<Permission[]> - Permissions from modules with defaults for this user type
   */
  private async getDefaultPermissionsForUserType(userType: UserType): Promise<(Permission & { module?: Module })[]> {
    // Fetch modules that have default permissions
    const modules = await this.prisma.module.findMany({
      where: {
        OR: [{ defaultAdminActions: { isEmpty: false } }, { defaultUserActions: { isEmpty: false } }],
      },
      include: {
        permissions: {
          include: { module: true },
        },
      },
    });

    const defaultPermissions: (Permission & { module?: Module })[] = [];

    for (const module of modules) {
      const defaultActions = userType === UserTypeEnum.ADMIN ? module.defaultAdminActions : module.defaultUserActions;

      for (const permission of module.permissions) {
        if (defaultActions.includes(permission.action)) {
          defaultPermissions.push(permission);
        }
      }
    }

    return defaultPermissions;
  }

  /**
   * Get current user's role details and permissions as CSV summary.
   *
   * @param userID - User ID
   * @returns Role metadata, permission list, CSV string, and modules array
   */
  async getUserRolePermissionsSummary(userID: string): Promise<{
    role: {
      id: string;
      name: string;
      parentType: Role['parentType'];
      createdAt: Date;
      updatedAt: Date;
    } | null;
    permissionsCsv: string;
    modules: string[];
    permissions: {
      id: string;
      module: string;
      action: string;
      description: string;
      createdAt: Date;
    }[];
  }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userID },
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

    if (!user) {
      this.logger.warn(`User not found: ${userID}`);
      throw new NotFoundException(this.i18n.translate('errors.USER_NOT_FOUND'));
    }

    if (!user.role) {
      return { role: null, permissionsCsv: '', modules: [], permissions: [] };
    }

    const permissions = user.role.rolePermissions
      .map((rp: any) => rp.permission as Permission & { module?: Module })
      .filter(Boolean)
      .map((permission) => {
        const moduleName = this.extractModuleName(permission.module);
        return {
          id: permission.id,
          module: moduleName,
          action: permission.action,
          description: permission.description ?? '',
          createdAt: permission.createdAt,
        };
      })
      .sort((a, b) => {
        if (a.module === b.module) {
          return a.action.localeCompare(b.action);
        }
        return a.module.localeCompare(b.module);
      });

    const modules = Array.from(new Set(permissions.map((p) => p.module).filter(Boolean))).sort();
    const permissionsCsv = permissions.map((p) => `${p.module}.${p.action}`).join(',');

    return {
      role: {
        id: user.role.id,
        name: user.role.name,
        parentType: user.role.parentType,
        createdAt: user.role.createdAt,
        updatedAt: user.role.updatedAt,
      },
      permissionsCsv,
      modules,
      permissions,
    };
  }

  private extractModuleName(module?: { nameKey?: string }): string {
    if (!module?.nameKey) {
      return '';
    }

    const match = module.nameKey.match(/modules\.(.+)\.NAME/);
    return match ? match[1] : module.nameKey;
  }

  /**
   * Create a new role with permissions.
   *
   * @param dto - CreateRoleDto
   * @returns Promise<Role> - Created role
   *
   * Implementation:
   * 1. Validates if role name already exists
   * 2. Validates permissionIDs exist
   * 3. Creates Role and RolePermissions in transaction
   *
   * @throws BadRequestException if role name exists or invalid permissionIDs
   */
  async createRole(dto: CreateRoleDto): Promise<Role> {
    // Check if role name exists
    const existingRole = await this.prisma.role.findUnique({
      where: {
        name: dto.name,
      },
    });

    if (existingRole) {
      this.logger.warn(`Role name already exists: ${dto.name}`);
      throw new BadRequestException(this.i18n.translate('errors.ROLE_NAME_EXISTS'));
    }

    // Validate and fetch permissions by modules if provided
    let permissions: { id: string }[] = [];
    if (dto.moduleIDs && dto.moduleIDs.length > 0) {
      // first validate if moduleIDs are valid
      const modules = await this.prisma.module.findMany({
        where: { id: { in: dto.moduleIDs } },
        select: { id: true },
      });

      if (modules.length !== dto.moduleIDs.length) {
        this.logger.warn(`Invalid module IDs provided: ${dto.moduleIDs.join(', ')}`);
        throw new BadRequestException(this.i18n.translate('errors.INVALID_MODULE_ID'));
      }

      permissions = await this.prisma.permission.findMany({
        where: { moduleID: { in: dto.moduleIDs } },
        select: { id: true },
      });

      if (permissions.length === 0) {
        this.logger.warn(`No permissions found for modules: ${dto.moduleIDs.join(', ')}`);
        throw new BadRequestException(this.i18n.translate('errors.NO_PERMISSIONS_FOUND_FOR_MODULES'));
      }
    }

    // Create Role and RolePermissions in transaction
    const role = await this.prisma.$transaction(async (tx) => {
      const newRole = await tx.role.create({
        data: {
          name: dto.name,
          description: dto.description ?? null,
          parentType: dto.parentType ?? null,
          isDefault: dto.isDefault ?? false,
        },
      });

      if (permissions.length > 0) {
        await tx.rolePermission.createMany({
          data: permissions.map((p) => ({
            roleID: newRole.id,
            permissionID: p.id,
          })),
        });
      }

      return newRole;
    });

    this.logger.log(`Created role ${role.name} with permissions from modules: ${dto.moduleIDs?.join(', ') || 'none'}`);
    return role;
  }

  /**
   * Assign a role to a user.
   *
   * @param userID - User ID to assign role to
   * @param dto - AssignRoleDto containing roleID
   * @returns Promise<void>
   *
   * Implementation:
   * 1. Validates user exists
   * 2. Validates role exists
   * 3. Creates UserRole relation
   *
   * @throws NotFoundException if user or role not found
   * @throws BadRequestException if assignment already exists
   */
  async assignRoleToUser(userID: string, dto: PermissionsAssignRoleDto): Promise<void> {
    const { roleID } = dto;

    // Validate user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userID },
      select: { id: true, userType: true, roleID: true },
    });

    if (!user) {
      this.logger.warn(`User not found: ${userID}`);
      throw new NotFoundException(this.i18n.translate('errors.USER_NOT_FOUND'));
    }

    // Validate role exists
    const role = await this.prisma.role.findUnique({
      where: { id: roleID },
      select: { id: true, parentType: true },
    });

    if (!role) {
      this.logger.warn(`Role not found: ${roleID}`);
      throw new NotFoundException(this.i18n.translate('errors.ROLE_NOT_FOUND'));
    }

    // Validate user type compatibility with role parentType
    if (role.parentType && role.parentType !== user.userType) {
      this.logger.warn(
        `Role type mismatch: user ${userID} (${user.userType}) cannot have role ${roleID} (${role.parentType})`,
      );
      throw new BadRequestException(await this.i18n.translate('errors.ROLE_TYPE_MISMATCH'));
    }

    // Check if user already has this role
    if (user.roleID === roleID) {
      this.logger.warn(`Role ${roleID} already assigned to user ${userID}`);
      throw new BadRequestException(this.i18n.translate('errors.ROLE_ALREADY_ASSIGNED'));
    }

    // Create assignment by updating user
    await this.prisma.user.update({
      where: { id: userID },
      data: {
        roleID,
      },
    });

    this.logger.log(`Assigned role ${roleID} to user ${userID}`);
  }

  /**
   * Update an existing role.
   *
   * @param roleID - ID of the role to update
   * @param dto - UpdateRoleDto
   * @returns Promise<Role> - Updated role
   *
   * Implementation:
   * 1. Validates role exists
   * 2. Validates name uniqueness if changed
   * 3. Updates role and permissions in transaction
   */
  async updateRole(roleID: string, dto: UpdateRoleDto): Promise<Role> {
    // Check if role exists
    const existingRole = await this.prisma.role.findUnique({
      where: { id: roleID },
    });

    if (!existingRole) {
      this.logger.warn(`Role not found: ${roleID}`);
      throw new NotFoundException(this.i18n.translate('errors.ROLE_NOT_FOUND'));
    }

    // Check if new name exists (if name is being updated)
    if (dto.name && dto.name !== existingRole.name) {
      const nameExists = await this.prisma.role.findFirst({
        where: {
          name: dto.name,
          id: { not: roleID },
        },
      });

      if (nameExists) {
        this.logger.warn(`Role name already exists: ${dto.name}`);
        throw new BadRequestException(this.i18n.translate('errors.ROLE_NAME_EXISTS'));
      }
    }

    // Validate permissions if modules provided
    let permissions: { id: string }[] = [];
    if (dto.moduleIDs && dto.moduleIDs.length > 0) {
      // first validate if moduleIDs are valid
      const modules = await this.prisma.module.findMany({
        where: { id: { in: dto.moduleIDs } },
        select: { id: true },
      });

      if (modules.length !== dto.moduleIDs.length) {
        this.logger.warn(`Invalid module IDs provided: ${dto.moduleIDs.join(', ')}`);
        throw new BadRequestException(this.i18n.translate('errors.INVALID_MODULE_ID'));
      }

      permissions = await this.prisma.permission.findMany({
        where: { moduleID: { in: dto.moduleIDs } },
        select: { id: true },
      });

      if (permissions.length === 0) {
        this.logger.warn(`No permissions found for modules: ${dto.moduleIDs.join(', ')}`);
        throw new BadRequestException(this.i18n.translate('errors.NO_PERMISSIONS_FOUND_FOR_MODULES'));
      }
    }

    // Update Role and RolePermissions in transaction
    const role = await this.prisma.$transaction(async (tx) => {
      // If setting isDefault to true, clear existing default for same parentType
      if (dto.isDefault === true && existingRole.parentType) {
        await tx.role.updateMany({
          where: {
            parentType: existingRole.parentType,
            isDefault: true,
            id: { not: roleID },
          },
          data: { isDefault: false },
        });
        this.logger.log(`Cleared previous default role for parentType: ${existingRole.parentType}`);
      }

      const updatedRole = await tx.role.update({
        where: { id: roleID },
        data: {
          name: dto.name,
          ...(dto.description !== undefined ? { description: dto.description } : {}),
          ...(dto.isDefault !== undefined ? { isDefault: dto.isDefault } : {}),
        },
      });

      // If modules are provided, update permissions
      if (dto.moduleIDs) {
        // Delete existing permissions
        await tx.rolePermission.deleteMany({
          where: { roleID },
        });

        // Add new permissions if available
        if (permissions.length > 0) {
          await tx.rolePermission.createMany({
            data: permissions.map((p) => ({
              roleID,
              permissionID: p.id,
            })),
          });
        }
      }

      return updatedRole;
    });

    this.logger.log(`Updated role ${role.name}`);
    return role;
  }

  /**
   * Get a single role by ID with its modules and permissions.
   *
   * @param roleID - ID of the role to get
   * @returns Role with grouped modules and permissions
   *
   * @throws NotFoundException if role not found
   */
  async getRoleById(roleID: string): Promise<{
    id: string;
    name: string;
    description: string | null;
    parentType: Role['parentType'];
    isDefault: boolean;
    createdAt: Date;
    updatedAt: Date;
    modules: {
      id: string;
      nameKey: string;
      descriptionKey: string;
      permissions: {
        id: string;
        action: string;
        description: string | null;
      }[];
    }[];
  }> {
    const role = await this.prisma.role.findUnique({
      where: { id: roleID },
      include: {
        rolePermissions: {
          include: {
            permission: {
              include: { module: true },
            },
          },
        },
      },
    });

    if (!role) {
      this.logger.warn(`Role not found: ${roleID}`);
      throw new NotFoundException(this.i18n.translate('errors.ROLE_NOT_FOUND'));
    }

    // Group permissions by module
    const moduleMap = new Map<
      string,
      {
        id: string;
        nameKey: string;
        descriptionKey: string;
        permissions: { id: string; action: string; description: string | null }[];
      }
    >();

    for (const rp of role.rolePermissions) {
      const permission = rp.permission;
      const module = permission.module;

      if (!moduleMap.has(module.id)) {
        moduleMap.set(module.id, {
          id: module.id,
          nameKey: module.nameKey,
          descriptionKey: module.descriptionKey,
          permissions: [],
        });
      }

      moduleMap.get(module.id)!.permissions.push({
        id: permission.id,
        action: permission.action,
        description: permission.description,
      });
    }

    // Sort modules by nameKey and permissions by action
    const modules = Array.from(moduleMap.values())
      .sort((a, b) => a.nameKey.localeCompare(b.nameKey))
      .map((m) => ({
        ...m,
        permissions: m.permissions.sort((a, b) => a.action.localeCompare(b.action)),
      }));

    this.logger.log(`Retrieved role ${role.name} with ${modules.length} modules`);

    return {
      id: role.id,
      name: role.name,
      description: role.description,
      parentType: role.parentType,
      isDefault: role.isDefault,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
      modules,
    };
  }

  /**
   * Delete a role.
   *
   * @param roleID - ID of the role to delete
   * @returns Promise<void>
   *
   * Implementation:
   * 1. Validates role exists
   * 2. Deletes role (db cascade handles permissions and user references)
   */
  async deleteRole(roleID: string): Promise<void> {
    // Check if role exists
    const existingRole = await this.prisma.role.findUnique({
      where: { id: roleID },
    });

    if (!existingRole) {
      this.logger.warn(`Role not found: ${roleID}`);
      throw new NotFoundException(this.i18n.translate('errors.ROLE_NOT_FOUND'));
    }

    await this.prisma.role.delete({
      where: { id: roleID },
    });

    this.logger.log(`Deleted role ${existingRole.name}`);
  }
}
