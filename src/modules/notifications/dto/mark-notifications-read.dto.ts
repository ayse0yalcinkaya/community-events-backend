// Libraries
import { IsArray, IsUUID, ArrayMaxSize, ArrayMinSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { i18nValidationMessage } from 'nestjs-i18n';

/**
 * DTO for marking multiple notifications as read
 * Used by PATCH /users/me/notifications/read endpoint
 */
export class MarkNotificationsReadDto {
  @ApiProperty({
    description: 'Array of notification UUIDs to mark as read',
    example: ['550e8400-e29b-41d4-a716-446655440000'],
    type: [String],
    minItems: 1,
    maxItems: 100,
  })
  @IsArray({ message: i18nValidationMessage('validation.IS_ARRAY') })
  @ArrayMinSize(1, { message: i18nValidationMessage('validation.ARRAY_MIN_SIZE') })
  @ArrayMaxSize(100, { message: i18nValidationMessage('validation.ARRAY_MAX_SIZE') })
  @IsUUID(4, { each: true, message: i18nValidationMessage('validation.IS_UUID') })
  ids!: string[];
}
