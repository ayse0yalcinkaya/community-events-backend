import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { ChatConversationTypeEnum } from '@/common/enums';

export class GetChatConversationsDto {
  @ApiPropertyOptional({ description: 'Page number (1-indexed).', default: 1 })
  @IsOptional()
  @IsNumber({}, { message: i18nValidationMessage('validation.IS_NUMBER') })
  @Min(1)
  @Transform(({ value }) => (value !== undefined ? Number(value) : undefined))
  page?: number;

  @ApiPropertyOptional({ description: 'Max conversations to return.', default: 20 })
  @IsOptional()
  @IsNumber({}, { message: i18nValidationMessage('validation.IS_NUMBER') })
  @Min(1)
  @Max(100)
  @Transform(({ value }) => (value !== undefined ? Number(value) : undefined))
  limit?: number;

  @ApiPropertyOptional({ description: 'Filter by counterpart/group name (case-insensitive).' })
  @IsOptional()
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  search?: string;

  @ApiPropertyOptional({ enum: ChatConversationTypeEnum, description: 'Filter by conversation type.' })
  @IsOptional()
  @IsEnum(ChatConversationTypeEnum, { message: i18nValidationMessage('validation.IS_ENUM') })
  type?: ChatConversationTypeEnum;
}
