import { Expose } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { UserTypeEnum } from '@/common/enums';
import { RoleResDto } from '@/modules/permissions/dto/response/role-res.dto';
import { Type } from 'class-transformer';

export class UserResDto {
  @Expose()
  id!: string;

  @Expose()
  phoneNumber!: string;

  @Expose()
  @ApiProperty()
  firstName!: string;

  @Expose()
  @ApiProperty()
  lastName!: string;

  @Expose()
  email!: string;

  @Expose()
  isActive!: boolean;

  @Expose()
  phoneVerified!: boolean;

  @Expose()
  userType!: UserTypeEnum;

  @Expose()
  VKN?: string;

  @Expose()
  legalEntityType?: string;

  @Expose()
  createdAt!: Date;

  @Expose()
  updatedAt!: Date;

  @Expose()
  @Type(() => RoleResDto)
  role?: RoleResDto;

  @Expose()
  @ApiProperty({ description: 'Profil resmi URL', required: false })
  profileImageUrl?: string;

  // NOTE: role field removed - roles are accessed via userRoles relation
  // Sensitive fields (deletedAt) are excluded by omission
  // When using plainToInstance with excludeExtraneousValues: true,
  // only fields with @Expose() will be included in the response
}
