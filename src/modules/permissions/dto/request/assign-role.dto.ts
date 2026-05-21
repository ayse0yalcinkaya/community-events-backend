// Libraries
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
export class PermissionsAssignRoleDto {
  @ApiProperty({
    description: 'Atanacak rolün ID değeri',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID('4', { message: i18nValidationMessage('validation.IS_UUID') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_NOT_EMPTY') })
  roleID!: string;
}
