// Libraries
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  Post,
  Put,
  UseGuards,
  Delete,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { I18n, I18nContext } from 'nestjs-i18n';

// DTOs
import { CreateRoleDto } from '../dto/request/create-role.dto';
import { PermissionsAssignRoleDto } from '../dto/request/assign-role.dto';
import { UpdateRoleDto } from '../dto/request/update-role.dto';
import { PermissionResDto } from '../dto/response/permission-res.dto';
import { RoleResDto } from '../dto/response/role-res.dto';
import { RoleDetailResDto } from '../dto/response/role-detail-res.dto';
import { ModuleResDto } from '../dto/response/module-res.dto';

// Services
import { PermissionsService } from '../services/permissions.service';
// Guards/Decorators
import { ApiEndpoint } from '@/common/decorators';
import { Permission } from '@/common/decorators/permission.decorator';
import { ActionEnum } from '@/common/enums/action.enum';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';

/**
 * PermissionsController - Permission & Role Management Endpoints
 *
 * Provides admin endpoints for permission management:
 * - GET /permissions - List all permissions
 * - GET /permissions/modules - Get unique permission modules
 * - GET /users/:id/permissions - Get user's effective permissions (via roles)
 * - POST /roles - Create new role with permissions
 *
 * All endpoints require:
 * 1. JWT authentication via JwtAuthGuard
 * 2. Permission-based authorization via PermissionsGuard
 *
 * @see Story 3.8: Role & Permission Management Endpoints
 */
@ApiTags('Permissions')
@Controller('permissions')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PermissionsController {
  private readonly logger = new Logger(PermissionsController.name);

  constructor(private readonly permissionsService: PermissionsService) {}

  /**
   * GET /permissions
   * List all permissions in the system
   *
   * @returns Array of all permissions (no pagination, < 100 items)
   *
   * @see AC-3.8.1: GET /permissions endpoint
   */
  @ApiEndpoint('Tüm yetkileri listele', { type: PermissionResDto })
  @Permission('PERMISSIONS', ActionEnum.VIEW)
  @Get()
  async getAllPermissions(): Promise<PermissionResDto[]> {
    this.logger.log('Listing all permissions');

    const permissions = await this.permissionsService.getAllPermissions();

    // Transform to DTOs
    const permissionDtos = permissions.map((p: any) => {
      const dto = plainToInstance(PermissionResDto, p);
      // Map module name from relation
      if (p.module?.nameKey) {
        const match = p.module.nameKey.match(/modules\.(.+)\.NAME/);
        dto.module = match ? match[1] : p.module.nameKey;
      }
      return dto;
    });

    return permissionDtos;
  }

  /**
   * GET /permissions/modules
   * Get unique permission modules
   *
   * @returns Array of unique module names (e.g., ['USERS', 'FILES', 'PERMISSIONS'])
   *
   * @see AC-3.8.2: GET /permissions/modules endpoint
   */
  @ApiEndpoint('Yetki modüllerini listele', { type: ModuleResDto })
  @Permission('PERMISSIONS', ActionEnum.VIEW)
  @Get('modules')
  async getPermissionModules(@I18n() i18n: I18nContext): Promise<ModuleResDto[]> {
    this.logger.log('Listing permission modules');

    const modules = await this.permissionsService.getPermissionModules();

    return modules.map((m) => ({
      id: m.id,
      name: i18n.t(m.nameKey),
      description: i18n.t(m.descriptionKey),
    }));
  }

  /**
   * GET /permissions/roles
   * List all roles to support role selection in admin UI
   */
  @ApiEndpoint('Rolleri listele', { type: RoleResDto })
  @Permission('PERMISSIONS', ActionEnum.VIEW)
  @Get('roles')
  async getRoles(): Promise<{ data: RoleResDto[]; count: number }> {
    this.logger.log('Listing all roles');

    const roles = await this.permissionsService.getAllRoles();

    return { data: roles.map((role) => plainToInstance(RoleResDto, role)), count: roles.length };
  }

  /**
   * GET /permissions/roles/:id
   * Get a single role with its modules and permissions
   *
   * @param roleID Role ID from URL parameter
   * @returns Role details with modules and permissions
   */
  @ApiEndpoint('Rol detayını getir', {
    type: RoleDetailResDto,
    params: [{ name: 'id', description: 'Rol ID' }],
  })
  @Permission('PERMISSIONS', ActionEnum.VIEW)
  @Get('roles/:id')
  async getRoleById(@Param('id') roleID: string, @I18n() i18n: I18nContext): Promise<RoleDetailResDto> {
    this.logger.log(`Getting role details for ${roleID}`);

    const role = await this.permissionsService.getRoleById(roleID);

    // Transform modules with i18n translations
    const modules = role.modules.map((m) => ({
      id: m.id,
      name: i18n.t(m.nameKey),
      description: i18n.t(m.descriptionKey),
      permissions: m.permissions,
    }));

    return plainToInstance(
      RoleDetailResDto,
      {
        ...role,
        modules,
      },
      { excludeExtraneousValues: true },
    );
  }

  /**
   * GET /permissions/users/:id/permissions
   * Get user's effective permissions via roles (deduplicated)
   *
   * @param userId User ID from URL parameter
   * @returns User's effective permissions from all assigned roles
   *
   * @see AC-3.8.3: GET /users/:id/permissions endpoint
   */
  @ApiEndpoint('Kullanıcının yetkilerini getir', {
    type: PermissionResDto,
    params: [{ name: 'id', description: 'Kullanıcı ID' }],
  })
  @Permission('PERMISSIONS', ActionEnum.VIEW)
  @Get('users/:id/permissions')
  async getUserPermissions(@Param('id') userId: string): Promise<PermissionResDto[]> {
    this.logger.log(`Getting permissions for user ${userId}`);

    const permissions = await this.permissionsService.getUserPermissions(userId);

    // Transform to DTOs
    const permissionDtos = permissions.map((p: any) => {
      const dto = plainToInstance(PermissionResDto, p);
      // Map module name from relation
      if (p.module?.nameKey) {
        const match = p.module.nameKey.match(/modules\.(.+)\.NAME/);
        dto.module = match ? match[1] : p.module.nameKey;
      }
      return dto;
    });

    return permissionDtos;
  }

  /**
   * POST /permissions/roles
   * Create a new role with permissions
   *
   * @param dto Request body containing role name and permissionIDs
   * @returns Created role
   */
  @ApiEndpoint('Yeni rol oluştur', { type: CreateRoleDto })
  @Permission('PERMISSIONS', ActionEnum.CREATE)
  @Post('roles')
  @HttpCode(HttpStatus.CREATED)
  async createRole(@Body() dto: CreateRoleDto): Promise<any> {
    this.logger.log(`Creating role ${dto.name}`);

    const role = await this.permissionsService.createRole(dto);

    return role;
  }

  /**
   * PUT /permissions/roles/:id
   * Update an existing role
   *
   * @param roleID Role ID from URL parameter
   * @param dto Request body containing updates
   * @returns Updated role
   */
  @ApiEndpoint('Rol güncelle', {
    type: CreateRoleDto, // Returns role but using CreateRoleDto for swagger example mostly, arguably RoleResDto is better but relying on service return for now
    params: [{ name: 'id', description: 'Rol ID' }],
  })
  @Permission('PERMISSIONS', ActionEnum.UPDATE)
  @Put('roles/:id')
  async updateRole(@Param('id') roleID: string, @Body() dto: UpdateRoleDto): Promise<any> {
    this.logger.log(`Updating role ${roleID}`);

    const role = await this.permissionsService.updateRole(roleID, dto);

    return role;
  }

  /**
   * DELETE /permissions/roles/:id
   * Delete an existing role
   *
   * @param roleID Role ID from URL parameter
   */
  @ApiEndpoint('Rol sil', {
    type: undefined,
    params: [{ name: 'id', description: 'Rol ID' }],
  })
  @Permission('PERMISSIONS', ActionEnum.DELETE)
  @Delete('roles/:id')
  async deleteRole(@Param('id') roleID: string): Promise<void> {
    this.logger.log(`Deleting role ${roleID}`);

    await this.permissionsService.deleteRole(roleID);
  }

  /**
   * POST /permissions/users/:id/roles
   * Assign a role to a user
   *
   * @param userId User ID from URL parameter
   * @param dto Request body containing roleID
   */
  @ApiEndpoint('Kullanıcıya rol ata', {
    type: undefined, // No response body
    params: [{ name: 'id', description: 'Kullanıcı ID' }],
  })
  @Permission('PERMISSIONS', ActionEnum.ASSIGN)
  @Post('users/:id/roles')
  @HttpCode(HttpStatus.CREATED)
  async assignRole(@Param('id') userId: string, @Body() dto: PermissionsAssignRoleDto): Promise<void> {
    this.logger.log(`Assigning role ${dto.roleID} to user ${userId}`);

    await this.permissionsService.assignRoleToUser(userId, dto);
  }
}
