// Libraries
import { ApiProperty } from '@nestjs/swagger';

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/**
 * Base paginated response for list endpoints
 * Provides data array with pagination metadata
 *
 * @example
 * ```typescript
 * @ApiResponse({
 *   status: 200,
 *   type: BasePaginatedResponse<UserResDto>,
 * })
 * @Get()
 * async findAll(@Query() query: GetUsersQueryDto) {
 *   const [users, count] = await this.usersService.findAll(query);
 *   return {
 *     data: users,
 *     count,
 *     page: query.page,
 *     limit: query.limit,
 *   };
 * }
 * ```
 */
export class BasePaginatedResponse<T> {
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
    description: 'Array of data items',
    isArray: true,
  })
  data!: T[];

  @ApiProperty({
    description: 'Total count of items',
    example: 100,
  })
  count!: number;

  @ApiProperty({
    description: 'Response message',
    example: 'Items retrieved successfully',
    required: false,
  })
  message?: string;

  @ApiProperty({
    description: 'Pagination metadata',
    required: false,
  })
  meta?: PaginationMeta;

  /**
   * Calculate pagination metadata
   */
  static createMeta(page: number, limit: number, total: number): PaginationMeta {
    const totalPages = Math.ceil(total / limit);
    return {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    };
  }
}
