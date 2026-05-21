import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsUUID, ArrayMinSize, IsOptional } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

/**
 * MarkChatMessagesReadDto captures identifiers for transitioning messages to read state.
 * For group messages, provide the groupID. For direct messages, omit groupID.
 */
export class MarkChatMessagesReadDto {
  @ApiProperty({ type: () => [String], description: 'Message IDs to mark as read.' })
  @IsArray({ message: i18nValidationMessage('validation.IS_ARRAY') })
  @ArrayMinSize(1, { message: i18nValidationMessage('validation.ARRAY_MIN_SIZE') })
  @IsUUID(4, { each: true, message: i18nValidationMessage('validation.IS_UUID') })
  messageIds!: string[];

  @ApiPropertyOptional({
    description: 'Group ID when marking group messages as read. Omit for direct messages.',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID(4, { message: i18nValidationMessage('validation.IS_UUID') })
  groupID?: string;
}
