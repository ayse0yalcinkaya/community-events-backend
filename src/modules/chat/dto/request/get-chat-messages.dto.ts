import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { ChatConversationTypeEnum } from '@/common/enums';

export class GetChatMessagesDto {
  @ApiPropertyOptional({
    enum: ChatConversationTypeEnum,
    description: 'DIRECT (default) or GROUP. When GROUP, receiverID/counterpartID should be the group ID.',
    default: ChatConversationTypeEnum.DIRECT,
  })
  @IsOptional()
  @IsEnum(ChatConversationTypeEnum, { message: i18nValidationMessage('validation.IS_ENUM') })
  conversationType?: ChatConversationTypeEnum;

  @ApiPropertyOptional({ description: 'Counterpart identifier for direct chats.', format: 'uuid' })
  @IsOptional()
  @IsUUID(4, { message: i18nValidationMessage('validation.IS_UUID') })
  counterpartID?: string;

  @ApiPropertyOptional({
    description: 'Alias of counterpartID kept for backward compatibility (also used for groupID).',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID(4, { message: i18nValidationMessage('validation.IS_UUID') })
  receiverID?: string;

  @ApiPropertyOptional({
    description: 'Pagination cursor (ISO8601). Returns messages created before this timestamp.',
  })
  @IsOptional()
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  before?: string;

  @ApiPropertyOptional({
    description: 'Max number of messages to return (default 50).',
    default: 50,
  })
  @IsOptional()
  @IsNumber({}, { message: i18nValidationMessage('validation.IS_NUMBER') })
  @Min(1)
  @Max(200)
  @Transform(({ value }) => (value !== undefined ? Number(value) : undefined))
  limit?: number;

  @ApiPropertyOptional({
    description: 'Search term to filter messages by content (case-insensitive).',
  })
  @IsOptional()
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  search?: string;
}
