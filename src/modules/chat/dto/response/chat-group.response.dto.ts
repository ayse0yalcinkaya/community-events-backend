// Libraries
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

// Enums
import { ChatGroupRoleEnum, ChatParticipantTypeEnum } from '@/common/enums';

/**
 * ChatGroupMemberResponseDto exposes membership info within a group.
 */
export class ChatGroupMemberResponseDto {
  @ApiProperty({ format: 'uuid' })
  @Expose()
  userID!: string;

  @ApiProperty({ enum: ChatGroupRoleEnum })
  @Expose()
  role!: ChatGroupRoleEnum;

  @ApiProperty({ format: 'date-time' })
  @Expose()
  joined_at!: Date;

  @ApiProperty({ description: 'Member first name' })
  @Expose()
  firstName!: string;

  @ApiProperty({ description: 'Member last name' })
  @Expose()
  lastName!: string;

  @ApiPropertyOptional({ enum: ChatParticipantTypeEnum, description: 'Participant type (USER)' })
  @Expose()
  participantType?: ChatParticipantTypeEnum;

  @ApiPropertyOptional({ description: 'Member profile photo URL' })
  @Expose()
  photoUrl?: string | null;
}

/**
 * ChatGroupResponseDto represents group metadata with optional members.
 */
export class ChatGroupResponseDto {
  @ApiProperty({ format: 'uuid' })
  @Expose()
  id!: string;

  @ApiProperty()
  @Expose()
  name!: string;

  @ApiProperty({ format: 'uuid' })
  @Expose()
  ownerID!: string;

  @ApiProperty({ format: 'uuid' })
  @Expose()
  createdBy!: string;

  @ApiProperty({ format: 'date-time' })
  @Expose()
  created_at!: Date;

  @ApiProperty({ format: 'date-time' })
  @Expose()
  updated_at!: Date;

  @ApiPropertyOptional({ description: 'Group photo URL.' })
  @Expose()
  photoUrl?: string | null;

  @ApiPropertyOptional({
    type: () => [ChatGroupMemberResponseDto],
    description: 'Current members with roles.',
  })
  @Expose()
  @Type(() => ChatGroupMemberResponseDto)
  members?: ChatGroupMemberResponseDto[];
}
