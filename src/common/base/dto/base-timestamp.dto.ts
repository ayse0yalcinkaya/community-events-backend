// Libraries
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

/**
 * Base DTO for timestamp fields
 * Provides standard timestamp fields for response DTOs
 *
 * @example
 * ```typescript
 * export class UserResDto extends BaseTimestampDto {
 *   @ApiProperty()
 *   email: string;
 * }
 * ```
 */
export abstract class BaseTimestampDto {
  @ApiProperty({
    description: 'Creation timestamp',
    example: '2025-11-06T10:00:00Z',
  })
  @Type(() => Date)
  createdAt!: Date;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2025-11-06T12:30:00Z',
  })
  @Type(() => Date)
  updatedAt!: Date;

  @ApiProperty({
    description: 'Soft delete timestamp (null if not deleted)',
    example: null,
    required: false,
    nullable: true,
  })
  @Type(() => Date)
  deletedAt?: Date | null;
}
