// Libraries
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';

// DTOs
import { CreateUserDto } from '../dto/request/create-user.dto';
import { QueryUserDto } from '../dto/request/query-user.dto';
import { UpdateUserDto } from '../dto/request/update-user.dto';
import { AssignRoleDto } from '../dto/request/assign-role.dto';
import { UserResDto } from '../dto/response/user-res.dto';

// Services
import { UsersService } from '../services/users.service';

// Guards/Decorators
import { ApiCreate, ApiDelete, ApiEndpoint, ApiGetAll, ApiGetOne, ApiUpdate } from '@/common/decorators';
import { Permission } from '@/common/decorators/permission.decorator';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';

// Enums
import { ActionEnum, UserTypeEnum } from '@/common/enums';

/**
 * UsersController - Admin User CRUD
 *
 * All endpoints require:
 * 1. JWT authentication via JwtAuthGuard
 * 2. Permission-based authorization via PermissionsGuard
 * 3. Multi-tenancy isolation (domainID from JWT)
 *
 * Endpoints:
 * - GET /users - List users with pagination, filtering, sorting
 * - GET /users/:id - Get single user
 * - POST /users - Create user
 * - PATCH /users/:id - Update user
 * - DELETE /users/:id - Soft-delete user
 */
@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  constructor(private readonly usersService: UsersService) {}

  /**
   * GET /users
   * List users with pagination, filtering, and sorting
   * @param user Current authenticated user from JWT
   * @param queryDto Query parameters (page, limit, status, role, search, sortBy, sortOrder)
   * @returns Paginated user list with meta
   */
  @ApiGetAll(UserResDto, {
    queries: [
      { name: 'page', type: Number, description: 'Sayfa numarası' },
      { name: 'limit', type: Number, description: 'Sayfa başına kayıt sayısı' },
      { name: 'status', type: String, description: 'Kullanıcı durumu' },
      { name: 'role', type: String, description: 'Rol filtresi' },
      { name: 'userType', type: String, description: 'Kullanıcı tipi', enum: Object.values(UserTypeEnum) },
      { name: 'search', type: String, description: 'Arama terimi' },
      { name: 'sortBy', type: String, description: 'Sıralama alanı' },
      { name: 'sortOrder', type: String, description: 'Sıralama sırası' },
    ],
  })
  @Permission('USERS', ActionEnum.VIEW)
  @Get()
  async findAll(@Query() queryDto: QueryUserDto): Promise<{ items: UserResDto[]; count: number }> {
    this.logger.log(`Listing users (page: ${queryDto.page}, limit: ${queryDto.limit})`);

    // Fetch users with pagination, filtering, sorting
    const { data, total } = await this.usersService.findAll(queryDto);

    // Transform to DTOs, excluding sensitive fields
    const userDtos = data.map((u) => plainToInstance(UserResDto, u, { excludeExtraneousValues: true }));

    return {
      items: userDtos,
      count: total,
    };
  }

  /**
   * GET /users/:id
   * Get single user by ID
   * @param user Current authenticated user from JWT
   * @param id User UUID
   * @returns UserResDto
   * @throws NotFoundException if user not found
   * @throws ForbiddenException if user in different domain
   */
  @ApiGetOne(UserResDto, {
    params: [{ name: 'id', description: 'Kullanıcı ID' }],
  })
  @Permission('USERS', ActionEnum.VIEW)
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<UserResDto> {
    this.logger.log(`Getting user: ${id}`);

    const userData = await this.usersService.findOne(id);

    return plainToInstance(UserResDto, userData, { excludeExtraneousValues: true });
  }

  /**
   * POST /users
   * Create new user
   * @param user Current authenticated user from JWT
   * @param createUserDto User creation data
   * @returns Created UserResDto (201 Created)
   * @throws ConflictException if phoneNumber already exists
   * @throws BadRequestException if validation fails or password required but not provided
   */
  @ApiCreate(UserResDto)
  @Permission('USERS', ActionEnum.CREATE)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createUserDto: CreateUserDto): Promise<UserResDto> {
    this.logger.log(`Creating user (default role will be assigned automatically)`);

    // Create user
    const createdUser = await this.usersService.create(createUserDto);

    // Transform to DTO, excluding sensitive fields
    const userDto = plainToInstance(UserResDto, createdUser, {
      excludeExtraneousValues: true,
    });

    return userDto;
  }

  /**
   * PATCH /users/:id
   * Update user (partial update)
   * @param user Current authenticated user from JWT
   * @param id User UUID
   * @param updateUserDto Fields to update
   * @returns Updated UserResDto
   * @throws NotFoundException if user not found
   * @throws ForbiddenException if user in different domain
   * @throws ConflictException if phoneNumber already exists
   */
  @ApiUpdate(UserResDto, {
    params: [{ name: 'id', description: 'Kullanıcı ID' }],
  })
  @Permission('USERS', ActionEnum.UPDATE)
  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto): Promise<UserResDto> {
    this.logger.log(`Updating user: ${id}`);

    // Update user
    const updatedUser = await this.usersService.update(id, updateUserDto);

    // Transform to DTO, excluding sensitive fields
    const userDto = plainToInstance(UserResDto, updatedUser, {
      excludeExtraneousValues: true,
    });

    return userDto;
  }

  /**
   * DELETE /users/:id
   * Soft-delete user
   * @param user Current authenticated user from JWT
   * @param id User UUID
   * @returns Success message
   * @throws NotFoundException if user not found
   * @throws ForbiddenException if user in different domain
   */
  @ApiDelete({
    params: [{ name: 'id', description: 'Kullanıcı ID' }],
  })
  @Permission('USERS', ActionEnum.DELETE)
  @Delete(':id')
  async remove(@Param('id') id: string): Promise<void> {
    this.logger.log(`Soft-deleting user: ${id}`);

    // Soft-delete user
    await this.usersService.softDelete(id);
  }

  /**
   * Assign role to user
   * POST /users/:id/roles
   * @param userId User UUID
   * @param assignRoleDto Role assignment data
   * @param currentUser Current user from JWT
   * @returns Success message
   */
  @ApiEndpoint('Kullanıcıya rol ata', {
    status: 200,
    body: { type: AssignRoleDto },
    params: [{ name: 'id', description: 'Kullanıcı ID' }],
    notFound: true,
  })
  @Permission('USERS', ActionEnum.ASSIGN)
  @Post(':id/roles')
  @HttpCode(HttpStatus.OK)
  async assignRole(@Param('id') userId: string, @Body() assignRoleDto: AssignRoleDto): Promise<void> {
    this.logger.log(`Assigning role ${assignRoleDto.roleID} to user ${userId}`);

    await this.usersService.assignRole(userId, assignRoleDto.roleID);
  }

  /**
   * Revoke role from user
   * DELETE /users/:id/roles/:roleId
   * @param userId User UUID
   * @param roleId Role UUID
   * @param currentUser Current user from JWT
   * @returns Success message
   */
  @ApiEndpoint('Kullanıcıdan rol kaldır', {
    status: 200,
    params: [
      { name: 'id', description: 'Kullanıcı ID' },
      { name: 'roleId', description: 'Rol ID' },
    ],
    notFound: true,
  })
  @Permission('USERS', ActionEnum.REVOKE)
  @Delete(':id/roles/:roleId')
  @HttpCode(HttpStatus.OK)
  async revokeRole(@Param('id') userId: string, @Param('roleId') roleId: string): Promise<void> {
    this.logger.log(`Revoking role ${roleId} from user ${userId}`);

    await this.usersService.revokeRole(userId, roleId);
  }

  /**
   * Get user's roles
   * GET /users/:id/roles
   * @param userId User UUID
   * @param currentUser Current user from JWT
   * @returns Array of user roles
   */
  @ApiEndpoint('Kullanıcı rollerini listele', {
    params: [{ name: 'id', description: 'Kullanıcı ID' }],
    notFound: true,
  })
  @Permission('USERS', ActionEnum.VIEW)
  @Get(':id/roles')
  async getUserRoles(@Param('id') userId: string): Promise<any[]> {
    this.logger.log(`Getting roles for user ${userId}`);

    return this.usersService.getUserRoles(userId);
  }
}
