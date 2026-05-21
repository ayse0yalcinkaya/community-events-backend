import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, IsOptional, IsEnum, IsUUID } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { ChatConversationTypeEnum } from '@/common/enums';

export class EditChatMessageDto {
  @ApiProperty({ description: 'Updated message content (plaintext, encrypted server-side).' })
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_NOT_EMPTY') })
  @MaxLength(4000, { message: i18nValidationMessage('validation.MAX_LENGTH') })
  content!: string;

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
