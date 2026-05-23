import { CommunityMemberRole } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateCommunityMemberRoleDto {
  @IsEnum(CommunityMemberRole)
  role!: CommunityMemberRole;
}
