import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

import { UserTypeEnum } from '@/common/enums/user-type.enum';

/**
 * Permission item within a module for role detail response
 */
export class RolePermissionItemDto {
  @ApiProperty()
  @Expose()
  id!: string;

  @ApiProperty({ description: 'Permission action (e.g., VIEW, CREATE, UPDATE, DELETE)' })
  @Expose()
  action!: string;

  @ApiProperty({ required: false, nullable: true })
  @Expose()
  description!: string | null;
}

/**
 * Module with its permissions for role detail response
 */
export class RoleModuleResDto {
  @ApiProperty()
  @Expose()
  id!: string;

  @ApiProperty({ description: 'Translated module name' })
  @Expose()
  name!: string;

  @ApiProperty({ description: 'Translated module description' })
  @Expose()
  description!: string;

  @ApiProperty({ type: [RolePermissionItemDto] })
  @Expose()
  @Type(() => RolePermissionItemDto)
  permissions!: RolePermissionItemDto[];
}

/**
 * Response DTO for single Role detail with modules and permissions.
 *
 * Used in GET /permissions/roles/:id endpoint to provide full role information
 * including assigned modules and their permissions.
 */
export class RoleDetailResDto {
  @ApiProperty()
  @Expose()
  id!: string;

  @ApiProperty()
  @Expose()
  name!: string;

  @ApiProperty({ required: false, nullable: true, description: 'Role description' })
  @Expose()
  description!: string | null;

  @ApiProperty({ required: false, nullable: true })
  @Expose()
  parentType!: UserTypeEnum | null;

  @ApiProperty({ description: 'Whether this is the default role for its user type' })
  @Expose()
  isDefault!: boolean;

  @ApiProperty()
  @Expose()
  createdAt!: Date;

  @ApiProperty()
  @Expose()
  updatedAt!: Date;

  @ApiProperty({ type: [RoleModuleResDto], description: 'Modules with their permissions assigned to this role' })
  @Expose()
  @Type(() => RoleModuleResDto)
  modules!: RoleModuleResDto[];
}
