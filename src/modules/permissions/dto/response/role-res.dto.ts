import { UserTypeEnum } from '@/common/enums/user-type.enum';

/**
 * Response DTO for Role entity.
 *
 * Used in GET /permissions/roles endpoint to share role metadata with the UI.
 * Mirrors the Role Prisma model fields relevant for the client.
 */
import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class RoleResDto {
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
}
