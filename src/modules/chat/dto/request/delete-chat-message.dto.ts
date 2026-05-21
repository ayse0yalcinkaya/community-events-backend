import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsUUID } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { ChatConversationTypeEnum } from '@/common/enums';

/**
 * DeleteChatMessageDto represents query parameters for deleting a chat message.
 */
export class DeleteChatMessageDto {
  @ApiPropertyOptional({
    enum: ChatConversationTypeEnum,
    description: 'Conversation type. Defaults to DIRECT.',
  })
  @IsOptional()
  @IsEnum(ChatConversationTypeEnum, { message: i18nValidationMessage('validation.IS_ENUM') })
  conversationType?: ChatConversationTypeEnum;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Group ID. Required when conversationType is GROUP.',
  })
  @IsOptional()
  @IsUUID(4, { message: i18nValidationMessage('validation.IS_UUID') })
  groupID?: string;
}
