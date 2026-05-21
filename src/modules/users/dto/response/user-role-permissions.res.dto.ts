import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

import { RoleResDto } from '@/modules/permissions/dto/response/role-res.dto';

export class RolePermissionItemResDto {
  @ApiProperty()
  @Expose()
  id!: string;

  @ApiProperty()
  @Expose()
  module!: string;

  @ApiProperty()
  @Expose()
  action!: string;

  @ApiProperty()
  @Expose()
  description!: string;

  @ApiProperty()
  @Expose()
  createdAt!: Date;
}

export class UserRolePermissionsResDto {
  @ApiProperty({ type: () => RoleResDto, nullable: true })
  @Expose()
  role!: RoleResDto | null;

  @ApiProperty({ description: 'CSV list of permissions e.g. CHAT.VIEW,CHAT.CREATE' })
  @Expose()
  permissionsCsv!: string;

  @ApiProperty({ type: [String], description: 'Unique modules derived from permissions' })
  @Expose()
  modules!: string[];

  @ApiProperty({ type: [RolePermissionItemResDto] })
  @Expose()
  permissions!: RolePermissionItemResDto[];
}
