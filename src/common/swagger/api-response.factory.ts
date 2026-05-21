// Libraries
import { ApiProperty } from '@nestjs/swagger';
import { Type } from '@nestjs/common';

/**
 * Generic success response interface
 */
export interface ApiResponse<T> {
  success: boolean;
  status: number;
  data: T;
  message: string;
}

/**
 * Generic paginated response interface
 */
export interface PaginatedApiResponse<T> {
  success: boolean;
  status: number;
  data: T[];
  count: number;
  message: string;
}

/**
 * Creates a success response class for Swagger documentation
 *
 * @param DataDto - DTO class to wrap in response
 * @returns Runtime-generated response class
 *
 * @example
 * const UserResponseClass = createApiResponseClass(UserDto);
 * // Generates class named "UserResponse" with type-safe data property
 */
export function createApiResponseClass<T>(DataDto: Type<T>): Type<ApiResponse<T>> {
  class ResponseClass implements ApiResponse<T> {
    @ApiProperty({ example: true })
    success!: boolean;

    @ApiProperty({ example: 200 })
    status!: number;

    @ApiProperty({ type: DataDto })
    data!: T;

    @ApiProperty({ example: 'Operation successful' })
    message!: string;
  }

  Object.defineProperty(ResponseClass, 'name', {
    value: `${DataDto.name}Response`,
  });

  return ResponseClass;
}

/**
 * Creates a paginated response class for Swagger documentation
 *
 * @param DataDto - DTO class to wrap in paginated response
 * @returns Runtime-generated paginated response class
 *
 * @example
 * const UserPaginatedResponseClass = createPaginatedApiResponseClass(UserDto);
 * // Generates "UserPaginatedResponse" with array data and count
 */
export function createPaginatedApiResponseClass<T>(DataDto: Type<T>): Type<PaginatedApiResponse<T>> {
  class PaginatedResponseClass implements PaginatedApiResponse<T> {
    @ApiProperty({ example: true })
    success!: boolean;

    @ApiProperty({ example: 200 })
    status!: number;

    @ApiProperty({ type: [DataDto] })
    data!: T[];

    @ApiProperty({ example: 150 })
    count!: number;

    @ApiProperty({ example: 'Operation successful' })
    message!: string;
  }

  Object.defineProperty(PaginatedResponseClass, 'name', {
    value: `${DataDto.name}PaginatedResponse`,
  });

  return PaginatedResponseClass;
}

/**
 * Standard error response class for Swagger documentation
 */
export class ErrorApiResponseClass {
  @ApiProperty({ example: false })
  success!: boolean;

  @ApiProperty({ example: 400 })
  status!: number;

  @ApiProperty({ example: 'Validation failed' })
  message!: string;

  @ApiProperty({
    example: ['field must be a string'],
    required: false,
  })
  errors?: string[];
}
