// Libraries
import { ApiProperty } from '@nestjs/swagger';

/**
 * Base response DTO wrapper for API responses
 * Provides type-safe response structure aligned with global interceptor
 *
 * Note: Controllers typically return raw data/DTOs directly.
 * The global response interceptor wraps them automatically in this format.
 * This class provides type definitions for consistency.
 *
 * @example
 * ```typescript
 * // Response structure (automatically wrapped by interceptor)
 * const response: BaseResponseDto<UserResDto> = {
 *   success: true,
 *   status: 200,
 *   data: userData,
 *   message: 'User retrieved successfully',
 * };
 * ```
 */
export class BaseResponseDto<T> {
  @ApiProperty({
    description: 'Indicates if the request was successful',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'HTTP status code',
    example: 200,
  })
  status: number;

  @ApiProperty({
    description: 'Response data payload',
  })
  data: T;

  @ApiProperty({
    description: 'Response message',
    example: 'Operation completed successfully',
    required: false,
  })
  message?: string;

  constructor(data: T, message?: string, status: number = 200) {
    this.success = status >= 200 && status < 300;
    this.status = status;
    this.data = data;
    this.message = message;
  }
}
