// Libraries
import { ApiProperty } from '@nestjs/swagger';

/**
 * Base success response for API operations
 * Used for operations that return data with success confirmation
 *
 * @example
 * ```typescript
 * // Automatically wrapped by interceptor
 * @ApiResponse({
 *   status: 200,
 *   type: BaseSuccessResponse<UserResDto>,
 * })
 * @Get(':id')
 * async findOne(@Param('id') id: string) {
 *   return this.usersService.findOne(id);
 * }
 * ```
 */
export class BaseSuccessResponse<T> {
  @ApiProperty({
    description: 'Indicates successful operation',
    example: true,
  })
  success!: true;

  @ApiProperty({
    description: 'HTTP status code',
    example: 200,
  })
  status!: number;

  @ApiProperty({
    description: 'Response data payload',
  })
  data!: T;

  @ApiProperty({
    description: 'Success message',
    example: 'Operation completed successfully',
    required: false,
  })
  message?: string;
}
