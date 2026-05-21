// Libraries
import { applyDecorators, Type } from '@nestjs/common';
import { ApiOkResponse, getSchemaPath } from '@nestjs/swagger';

/**
 * Pagination metadata interface
 */
export interface PaginationMetadata {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

/**
 * Generic paginated response wrapper
 */
export interface PaginatedResponse<T> {
  items: T[];
  metadata: PaginationMetadata;
}

/**
 * Swagger decorator for paginated responses
 * Creates consistent API documentation for paginated endpoints
 *
 * @param model - The DTO class for the items array
 * @returns Composite decorator with Swagger schema
 *
 * @example
 * ```typescript
 * @ApiPaginatedResponse(UserDto)
 * @Get('users')
 * async getUsers(
 *   @Query('page') page: number = 1,
 *   @Query('limit') limit: number = 10,
 * ): Promise<PaginatedResponse<UserDto>> {
 *   return this.usersService.getPaginated(page, limit);
 * }
 * ```
 */
export const ApiPaginatedResponse = <TModel extends Type<any>>(model: TModel) => {
  return applyDecorators(
    ApiOkResponse({
      description: 'Paginated response with items and metadata',
      schema: {
        allOf: [
          {
            properties: {
              items: {
                type: 'array',
                items: { $ref: getSchemaPath(model) },
              },
              metadata: {
                type: 'object',
                properties: {
                  currentPage: {
                    type: 'number',
                    example: 1,
                    description: 'Current page number',
                  },
                  pageSize: {
                    type: 'number',
                    example: 10,
                    description: 'Items per page',
                  },
                  totalItems: {
                    type: 'number',
                    example: 100,
                    description: 'Total number of items',
                  },
                  totalPages: {
                    type: 'number',
                    example: 10,
                    description: 'Total number of pages',
                  },
                  hasNext: {
                    type: 'boolean',
                    example: true,
                    description: 'Has next page',
                  },
                  hasPrevious: {
                    type: 'boolean',
                    example: false,
                    description: 'Has previous page',
                  },
                },
              },
            },
          },
        ],
      },
    }),
  );
};
