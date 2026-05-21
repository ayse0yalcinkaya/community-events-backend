// Interfaces
import type { SchemaObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';

// Decorators
import { ApiBodyOption, ApiEndpoint, ApiParamOption, ApiQueryOption } from './api-endpoint.decorator';
export interface ApiCrudOptions {
  /** Path parameters */
  params?: ApiParamOption[];

  /** Query parameters */
  queries?: ApiQueryOption[];

  /** Custom summary (overrides default) */
  summary?: string;

  /** Is the endpoint public (no auth required)? */
  isPublic?: boolean;

  /** Request body configuration (for Create/Update) */
  body?: ApiBodyOption;

  /** Body schema for Swagger documentation (for Create/Update with file uploads) */
  bodySchema?: SchemaObject;

  /** Content type (e.g., 'multipart/form-data') */
  consumes?: string;
}

/**
 * Swagger decorator for "Get All" CRUD operation
 *
 * Summary: "Tümünü listele"
 * Response: Paginated array
 * Auth: Required
 *
 * @param type - Response DTO class
 * @param options - Additional configuration (params, queries, summary)
 *
 * @example
 * // Basic usage
 * @ApiGetAll(UserResDto)
 * @Get()
 * async findAll() {}
 *
 * @example
 * // With query parameters
 * @ApiGetAll(UserResDto, {
 *   queries: [
 *     { name: 'page', type: Number, description: 'Sayfa numarası' },
 *     { name: 'limit', type: Number, description: 'Sayfa başına kayıt sayısı' },
 *     { name: 'search', type: String, description: 'Arama terimi' }
 *   ]
 * })
 * @Get()
 * async findAll() {}
 */
export const ApiGetAll = (type: any, options: ApiCrudOptions = {}) =>
  ApiEndpoint(options.summary || 'Tümünü listele', {
    type,
    isPaginated: true,
    params: options.params,
    queries: options.queries,
    isPublic: options.isPublic,
  });

/**
 * Swagger decorator for "Get One" CRUD operation
 *
 * Summary: "Detayı getir"
 * Response: Single object
 * Auth: Required
 * Errors: 404 Not Found
 *
 * @param type - Response DTO class
 * @param options - Additional configuration (params, summary)
 *
 * @example
 * // Basic usage (automatically adds id param)
 * @ApiGetOne(UserResDto)
 * @Get(':id')
 * async findOne(@Param('id') id: string) {}
 *
 * @example
 * // Custom param name
 * @ApiGetOne(UserResDto, {
 *   params: [{ name: 'userId', description: 'Kullanıcı ID' }]
 * })
 * @Get(':userId')
 * async findOne(@Param('userId') id: string) {}
 */
export const ApiGetOne = (type: any, options: ApiCrudOptions = {}) => {
  // Default to 'id' param if no params provided
  const params = options.params;

  return ApiEndpoint(options.summary || 'Detayı getir', {
    type,
    params,
    notFound: true,
    isPublic: options.isPublic,
  });
};

/**
 * Swagger decorator for "Create" CRUD operation
 *
 * Summary: "Yeni kayıt oluştur"
 * Response: 201 Created with object
 * Auth: Required
 *
 * @param type - Response DTO class
 * @param options - Additional configuration (summary, body, bodySchema, consumes)
 *
 * @example
 * // Basic usage
 * @ApiCreate(UserResDto)
 * @Post()
 * async create(@Body() dto: CreateUserDto) {}
 *
 * @example
 * // Custom summary
 * @ApiCreate(UserResDto, { summary: 'Yeni kullanıcı ekle' })
 * @Post()
 * async create(@Body() dto: CreateUserDto) {}
 *
 * @example
 * // File upload with bodySchema
 * @ApiCreate(FileResDto, {
 *   summary: 'Dosya yükle',
 *   consumes: 'multipart/form-data',
 *   bodySchema: {
 *     type: 'object',
 *     properties: {
 *       file: { type: 'string', format: 'binary' }
 *     }
 *   }
 * })
 * @Post('upload')
 * async upload() {}
 */
export const ApiCreate = (type: any, options: ApiCrudOptions = {}) =>
  ApiEndpoint(options.summary || 'Yeni kayıt oluştur', {
    type,
    status: 201,
    isPublic: options.isPublic,
    body: options.body,
    bodySchema: options.bodySchema,
    consumes: options.consumes,
  });

/**
 * Swagger decorator for "Update" CRUD operation
 *
 * Summary: "Kaydı güncelle"
 * Response: Updated object
 * Auth: Required
 * Errors: 404 Not Found
 *
 * @param type - Response DTO class
 * @param options - Additional configuration (params, summary, body, bodySchema, consumes)
 *
 * @example
 * // Basic usage (automatically adds id param)
 * @ApiUpdate(UserResDto)
 * @Patch(':id')
 * async update(@Param('id') id: string, @Body() dto: UpdateUserDto) {}
 *
 * @example
 * // Custom param
 * @ApiUpdate(UserResDto, {
 *   params: [{ name: 'userId', description: 'Kullanıcı ID' }]
 * })
 * @Patch(':userId')
 * async update(@Param('userId') id: string, @Body() dto: UpdateUserDto) {}
 *
 * @example
 * // Update with file upload
 * @ApiUpdate(FileResDto, {
 *   consumes: 'multipart/form-data',
 *   bodySchema: {
 *     type: 'object',
 *     properties: {
 *       file: { type: 'string', format: 'binary' },
 *       name: { type: 'string' }
 *     }
 *   }
 * })
 * @Patch(':id')
 * async update(@Param('id') id: string) {}
 */
export const ApiUpdate = (type: any, options: ApiCrudOptions = {}) => {
  // Default to 'id' param if no params provided
  const params = options.params;

  return ApiEndpoint(options.summary || 'Kaydı güncelle', {
    type,
    params,
    notFound: true,
    isPublic: options.isPublic,
    body: options.body,
    bodySchema: options.bodySchema,
    consumes: options.consumes,
  });
};

/**
 * Swagger decorator for "Delete" CRUD operation
 *
 * Summary: "Kaydı sil"
 * Response: 204 No Content
 * Auth: Required
 * Errors: 404 Not Found
 *
 * @param options - Additional configuration (params, summary)
 *
 * @example
 * // Basic usage (automatically adds id param)
 * @ApiDelete()
 * @Delete(':id')
 * async remove(@Param('id') id: string) {}
 *
 * @example
 * // Custom param
 * @ApiDelete({
 *   params: [{ name: 'userId', description: 'Kullanıcı ID' }]
 * })
 * @Delete(':userId')
 * async remove(@Param('userId') id: string) {}
 */
export const ApiDelete = (options: ApiCrudOptions = {}) => {
  // Default to 'id' param if no params provided
  const params = options.params;

  return ApiEndpoint(options.summary || 'Kaydı sil', {
    status: 204,
    params,
    notFound: true,
    isPublic: options.isPublic,
  });
};
