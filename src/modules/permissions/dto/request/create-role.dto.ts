// Libraries
import { IsArray, IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { i18nValidationMessage } from 'nestjs-i18n';

// Enums
import { UserTypeEnum } from '@/common/enums';

/**
 * Request DTO for creating a new role.
 * Used in POST /permissions/roles endpoint.
 *
 * Validation:
 * - name: required string
 * - description: optional string
 * - parentType: optional enum (ADMIN or USER)
 * - permissionIDs: optional array of UUIDs
 * - isDefault: optional boolean (only one default per parentType allowed)
 */
export class CreateRoleDto {
  @ApiProperty({
    description: 'Role name',
    example: 'Manager',
  })
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_NOT_EMPTY') })
  name!: string;

  @ApiProperty({
    description: 'Role description',
    example: 'Manager role with limited permissions',
    required: false,
  })
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    enum: UserTypeEnum,
    enumName: 'UserTypeEnum',
    description: 'Parent user type for this role (ADMIN or USER). Determines which users can have this role.',
    example: 'USER',
  })
  @IsEnum(UserTypeEnum, { message: i18nValidationMessage('validation.IS_ENUM') })
  @IsOptional()
  parentType?: UserTypeEnum;

  @ApiProperty({
    description: 'List of module IDs to assign permissions from',
    example: ['uuid-1', 'uuid-2'],
    required: false,
  })
  @IsArray({ message: i18nValidationMessage('validation.IS_ARRAY') })
  @IsUUID('4', { each: true, message: i18nValidationMessage('validation.IS_UUID') })
  @IsOptional()
  moduleIDs?: string[] = [];

  @ApiProperty({
    description: 'Set as default role for user type (only one per parentType allowed)',
    example: false,
    required: false,
    default: false,
  })
  @IsBoolean({ message: i18nValidationMessage('validation.IS_BOOLEAN') })
  @IsOptional()
  isDefault?: boolean = false;
}
