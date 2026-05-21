// Libraries
import { ApiProperty } from '@nestjs/swagger';

/**
 * Error detail interface
 */
export interface ErrorDetail {
  field?: string;
  message: string;
  code?: string;
}

/**
 * Base error response for API errors
 * Used for standardized error responses across the application
 *
 * @example
 * ```typescript
 * @ApiResponse({
 *   status: 400,
 *   type: BaseErrorResponse,
 * })
 * @Post()
 * async create(@Body() dto: CreateUserDto) {
 *   // Validation errors automatically formatted
 *   return this.usersService.create(dto);
 * }
 * ```
 */
export class BaseErrorResponse {
  @ApiProperty({
    description: 'Indicates failed operation',
    example: false,
  })
  success: false;

  @ApiProperty({
    description: 'HTTP status code',
    example: 400,
  })
  status: number;

  @ApiProperty({
    description: 'Error message',
    example: 'Validation failed',
  })
  message: string;

  @ApiProperty({
    description: 'Detailed error information',
    type: [Object],
    example: [
      {
        field: 'email',
        message: 'Email must be a valid email address',
        code: 'INVALID_EMAIL',
      },
    ],
    required: false,
  })
  errors?: ErrorDetail[];

  constructor(message: string, status: number = 400, errors?: ErrorDetail[]) {
    this.success = false;
    this.status = status;
    this.message = message;
    this.errors = errors;
  }
}
