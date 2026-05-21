// Libraries
import { Expose } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Response DTO for mark as read operations
 * Used by PATCH /users/me/notifications/read and /read-all endpoints
 */
export class MarkReadResponseDto {
  @ApiProperty({
    description: 'Number of notifications marked as read',
    example: 5,
  })
  @Expose()
  updatedCount!: number;
}
