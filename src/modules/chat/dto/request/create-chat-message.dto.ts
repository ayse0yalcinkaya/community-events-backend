// Libraries
import { BadRequestException } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsArray, IsBoolean, IsEnum, IsObject, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

// Interfaces
import type { ChatMessageMetadata } from '../../interfaces/chat-attachment.interface';

// Enums
import { ChatConversationTypeEnum } from '@/common/enums';

/**
 * Payload for composing chat messages and attachments.
 */
export class CreateChatMessageDto {
  @ApiPropertyOptional({
    enum: ChatConversationTypeEnum,
    description: 'Conversation type. Use GROUP when receiverID represents a group.',
    default: ChatConversationTypeEnum.DIRECT,
  })
  @IsOptional()
  @IsEnum(ChatConversationTypeEnum, { message: i18nValidationMessage('validation.IS_ENUM') })
  conversationType?: ChatConversationTypeEnum;

  @ApiProperty({ format: 'uuid', description: 'Receiver unique identifier.' })
  @IsUUID(4, { message: i18nValidationMessage('validation.IS_UUID') })
  receiverID!: string;

  @ApiPropertyOptional({ description: 'Plain text message body (encrypted server-side).' })
  @IsOptional()
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  @MaxLength(4000, { message: i18nValidationMessage('validation.MAX_LENGTH') })
  content?: string;

  @ApiPropertyOptional({
    description:
      'Client metadata (parsed from JSON when sent as string). For voice messages, include voice: { durationMs, codec?, waveform? }.',
  })
  @IsOptional()
  @IsObject({ message: i18nValidationMessage('validation.IS_OBJECT') })
  @Transform(({ value }) => {
    if (!value) return undefined;
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch (error) {
        throw new BadRequestException('chat.INVALID_METADATA_JSON');
      }
    }
    return value;
  })
  metadata?: ChatMessageMetadata;

  @ApiPropertyOptional({ description: 'Client generated UUID for idempotency.' })
  @IsOptional()
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  clientMessageId?: string;

  @ApiPropertyOptional({
    description: 'Marks the message as forwarded (WhatsApp-style forwarded indicator).',
    default: false,
  })
  @IsOptional()
  @IsBoolean({ message: i18nValidationMessage('validation.IS_BOOLEAN') })
  @Transform(({ value }) => value === 'true' || value === true)
  forwarded?: boolean;

  @ApiPropertyOptional({
    description: 'Quoted message ID being replied to (WhatsApp-style message reply).',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID(4, { message: i18nValidationMessage('validation.IS_UUID') })
  quotedMessageId?: string;

  @ApiPropertyOptional({
    type: () => [String],
    description: 'IDs of previously uploaded files to attach.',
  })
  @IsOptional()
  @IsArray({ message: i18nValidationMessage('validation.IS_ARRAY') })
  @Transform(({ value }) => {
    if (!value) return undefined;
    if (Array.isArray(value)) return value.map((v) => String(v));
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) return parsed.map((v) => String(v));
        return [String(parsed)];
      } catch (error) {
        throw new BadRequestException('chat.INVALID_EXISTING_FILE_IDS');
      }
    }
    return Array.isArray(value) ? value.map((v) => String(v)) : [String(value)];
  })
  @IsUUID(4, { each: true, message: i18nValidationMessage('validation.IS_UUID') })
  existingFileIds?: string[];
}
