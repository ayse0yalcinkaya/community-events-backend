// Libraries
import { IsUUID, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { i18nValidationMessage } from 'nestjs-i18n';

/**
 * DTO for assigning role to user
 * Used by POST /users/:id/roles endpoint
 */
export class AssignRoleDto {
  @ApiProperty({
    description: 'Role ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @IsUUID(4, { message: i18nValidationMessage('validation.IS_UUID') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_NOT_EMPTY') })
  roleID!: string;
}
