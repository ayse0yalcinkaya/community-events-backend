import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class CreateChatGroupDto {
  @ApiProperty({ description: 'Group name.' })
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  @MaxLength(255, { message: i18nValidationMessage('validation.MAX_LENGTH') })
  name!: string;

  @ApiPropertyOptional({ type: () => [String], description: 'Initial member IDs to add.' })
  @IsOptional()
  @IsArray({ message: i18nValidationMessage('validation.IS_ARRAY') })
  @IsUUID(4, { each: true, message: i18nValidationMessage('validation.IS_UUID') })
  memberIDs?: string[];
}
