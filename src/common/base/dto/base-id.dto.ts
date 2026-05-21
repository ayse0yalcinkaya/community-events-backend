// Libraries
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

/**
 * Base DTO for ID parameter validation
 * Used in routes that require an ID parameter
 *
 * @example
 * ```typescript
 * @Get(':id')
 * async findOne(@Param() params: BaseIdDto) {
 *   return this.service.findOne(params.id);
 * }
 * ```
 */
export class BaseIdDto {
  @ApiProperty({
    description: 'Resource identifier',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  @IsUUID(4, { message: i18nValidationMessage('validation.IS_UUID') })
  id!: string;
}
