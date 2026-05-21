// Libraries
import { PartialType } from '@nestjs/swagger';

// DTOs
import { CreateRoleDto } from './create-role.dto';

/**
 * Request DTO for updating an existing role.
 * Used in PUT /permissions/roles/:id endpoint.
 *
 * Extends CreateRoleDto but makes all fields optional.
 */
export class UpdateRoleDto extends PartialType(CreateRoleDto) {}
