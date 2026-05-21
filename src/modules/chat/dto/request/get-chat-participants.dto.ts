import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class GetChatParticipantsDto {
  @ApiPropertyOptional({ description: 'Filter by participant name.', example: 'Alice' })
  @IsOptional()
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  search?: string;

  @ApiPropertyOptional({ description: 'Max participants to return.', default: 20 })
  @IsOptional()
  @IsNumber({}, { message: i18nValidationMessage('validation.IS_NUMBER') })
  @Min(1)
  @Max(100)
  @Transform(({ value }) => (value !== undefined ? Number(value) : undefined))
  limit?: number;

  @ApiPropertyOptional({ description: 'Page number (1-indexed).', default: 1 })
  @IsOptional()
  @IsNumber({}, { message: i18nValidationMessage('validation.IS_NUMBER') })
  @Min(1)
  @Transform(({ value }) => (value !== undefined ? Number(value) : undefined))
  page?: number;
}
