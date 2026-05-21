// Libraries
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

// Interfaces
import { ChatAttachmentMetadata, ChatMessageMetadata } from '../../interfaces/chat-attachment.interface';

// Enums
import {
  ChatMessageStatusEnum,
  ChatParticipantTypeEnum,
  ChatConversationTypeEnum,
  ChatGroupRoleEnum,
} from '@/common/enums';

export class ChatMessageResponseDto {
  @ApiProperty({ format: 'uuid' })
  @Expose()
  id!: string;

  @ApiProperty({ format: 'uuid' })
  @Expose()
  senderID!: string;

  @ApiProperty({ enum: ChatParticipantTypeEnum })
  @Expose()
  senderType!: ChatParticipantTypeEnum;

  @ApiProperty({ format: 'uuid' })
  @Expose()
  receiverID!: string;

  @ApiProperty({ enum: ChatParticipantTypeEnum })
  @Expose()
  receiverType!: ChatParticipantTypeEnum;

  @ApiPropertyOptional({ description: 'Decrypted content (null when attachment only).' })
  @Expose()
  content!: string | null;

  @ApiPropertyOptional({ type: () => [Object], description: 'Attachment metadata array.' })
  @Expose()
  attachment?: ChatAttachmentMetadata[] | null;

  @ApiPropertyOptional({ type: () => Object })
  @Expose()
  metadata?: ChatMessageMetadata | null;

  @ApiProperty({ enum: ChatMessageStatusEnum })
  @Expose()
  status!: ChatMessageStatusEnum;

  @ApiProperty({ default: false })
  @Expose()
  forwarded!: boolean;

  @ApiPropertyOptional({
    description: 'Quoted message summary when replying.',
    type: () => Object,
  })
  @Expose()
  quotedMessage?: ChatMessageMetadata['quotedMessage'] | null;

  @ApiProperty({ default: false })
  @Expose()
  is_edited!: boolean;

  @ApiPropertyOptional({ format: 'date-time' })
  @Expose()
  edited_at!: Date | null;

  @ApiProperty({ default: false })
  @Expose()
  is_deleted!: boolean;

  @ApiProperty({ format: 'date-time' })
  @Expose()
  created_at!: Date;

  @ApiProperty({ format: 'date-time' })
  @Expose()
  updated_at!: Date;
}

export class CounterpartInfoDto {
  @ApiPropertyOptional()
  @Expose()
  firstName?: string | null;

  @ApiPropertyOptional()
  @Expose()
  lastName?: string | null;

  @ApiPropertyOptional()
  @Expose()
  departmentName?: string | null;

  @ApiPropertyOptional()
  @Expose()
  position?: string | null;

  @ApiPropertyOptional()
  @Expose()
  photoUrl?: string | null;
}

export class ChatConversationSummaryDto {
  @ApiProperty({ enum: ChatConversationTypeEnum })
  @Expose()
  type!: ChatConversationTypeEnum;

  @ApiPropertyOptional({ description: 'Counterpart ID for direct chats.', format: 'uuid' })
  @Expose()
  counterpartID?: string;

  @ApiPropertyOptional({ enum: ChatParticipantTypeEnum })
  @Expose()
  counterpartType?: ChatParticipantTypeEnum;

  @ApiPropertyOptional()
  @Expose()
  groupID?: string;

  @ApiPropertyOptional()
  @Expose()
  groupName?: string;

  @ApiPropertyOptional({ enum: ChatGroupRoleEnum })
  @Expose()
  membershipRole?: ChatGroupRoleEnum;

  @ApiPropertyOptional({ description: 'Group photo URL when type is GROUP.' })
  @Expose()
  groupPhotoUrl?: string | null;

  @ApiPropertyOptional({ type: () => ChatMessageResponseDto })
  @Expose()
  @Type(() => ChatMessageResponseDto)
  lastMessage?: ChatMessageResponseDto | null;

  @ApiProperty({ description: 'Unread message count for this conversation.' })
  @Expose()
  unreadCount!: number;

  @ApiPropertyOptional({ type: () => CounterpartInfoDto })
  @Expose()
  @Type(() => CounterpartInfoDto)
  counterpartInfo?: CounterpartInfoDto | null;
}
