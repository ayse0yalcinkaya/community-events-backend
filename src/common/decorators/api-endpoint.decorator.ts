// NestJS imports
// Libraries
import { applyDecorators } from '@nestjs/common';

import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiHeader,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

// Interfaces
import type { SchemaObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';

// Local imports
import { createApiResponseClass, createPaginatedApiResponseClass, ErrorApiResponseClass } from '@/common/swagger';

export interface ApiParamOption {
  name: string;
  description?: string;
  type?: any;
  required?: boolean;
  enum?: any[];
}

export interface ApiQueryOption {
  name: string;
  description?: string;
  type?: any;
  required?: boolean;
  enum?: any[];
  isArray?: boolean;
}

export interface ApiBodyOption {
  type?: any;
  description?: string;
  required?: boolean;
  isArray?: boolean;
  schema?: SchemaObject;
}

export interface ApiEndpointOptions {
  /** Response DTO class */
  type?: any;

  /** Is the response paginated? */
  isPaginated?: boolean;

  /** Is the endpoint public (no auth required)? */
  isPublic?: boolean;

  /** Path parameters */
  params?: ApiParamOption[];

  /** Query parameters */
  queries?: ApiQueryOption[];

  /** Request body configuration */
  body?: ApiBodyOption;

  /** Content type (e.g., 'multipart/form-data') */
  consumes?: string;

  /** Custom response status (default: 200 OK) */
  status?: 200 | 201 | 204;

  /** Include 404 Not Found response */
  notFound?: boolean;

  /** Body schema for Swagger documentation (alternative to body.type) */
  bodySchema?: SchemaObject;
}

/**
 * Unified API endpoint documentation decorator
 *
 * Automatically applies operation summary, response schemas, authentication, parameters, and body.
 *
 * @param summary - Endpoint summary (Turkish)
 * @param options - Configuration options
 *
 * @example
 * // Standard authenticated endpoint with path param
 * @ApiEndpoint('Kullanıcıyı getir', {
 *   type: UserResDto,
 *   params: [{ name: 'id', description: 'Kullanıcı ID' }]
 * })
 * @Get(':id')
 * async findOne(@Param('id') id: string) {}
 *
 * @example
 * // Paginated response with query params
 * @ApiEndpoint('Tüm kullanıcıları listele', {
 *   type: UserResDto,
 *   isPaginated: true,
 *   queries: [
 *     { name: 'page', type: Number, description: 'Sayfa numarası' },
 *     { name: 'limit', type: Number, description: 'Sayfa başına kayıt sayısı' }
 *   ]
 * })
 * @Get()
 * async findAll() {}
 *
 * @example
 * // Public endpoint with body
 * @ApiEndpoint('Kullanıcı kaydı', {
 *   type: UserResDto,
 *   isPublic: true,
 *   body: { type: RegisterDto }
 * })
 * @Post('register')
 * async register(@Body() dto: RegisterDto) {}
 *
 * @example
 * // File upload endpoint with bodySchema
 * @ApiEndpoint('Dosya yükle', {
 *   type: FileResDto,
 *   consumes: 'multipart/form-data',
 *   status: 201,
 *   bodySchema: {
 *     type: 'object',
 *     properties: {
 *       file: {
 *         type: 'string',
 *         format: 'binary'
 *       }
 *     }
 *   }
 * })
 * @Post('upload')
 * async upload() {}
 *
 * @example
 * // Multiple file upload with bodySchema
 * @ApiEndpoint('Çoklu dosya yükle', {
 *   type: FileResDto,
 *   consumes: 'multipart/form-data',
 *   status: 201,
 *   bodySchema: {
 *     type: 'object',
 *     properties: {
 *       files: {
 *         type: 'array',
 *         items: {
 *           type: 'string',
 *           format: 'binary'
 *         }
 *       }
 *     }
 *   }
 * })
 * @Post('upload-multiple')
 * async uploadMultiple() {}
 */
export function ApiEndpoint(summary: string, options: ApiEndpointOptions = {}): MethodDecorator {
  const decorators: Array<ClassDecorator | MethodDecorator | PropertyDecorator> = [
    ApiOperation({ summary }),
    ApiBadRequestResponse({ type: ErrorApiResponseClass }),
    ApiHeader({
      name: 'Accept-Language',
      description: 'İsteğin dilini belirtir (örn. tr, en). Query paramı (?lang) yoksa bu header kullanılır.',
      required: false,
    }),
  ];

  // Add authentication decorators (unless public)
  if (!options.isPublic) {
    decorators.push(ApiBearerAuth('JWT-auth'), ApiUnauthorizedResponse({ type: ErrorApiResponseClass }));
  }

  // Add path parameters
  if (options.params && options.params.length > 0) {
    options.params.forEach((param) => {
      decorators.push(
        ApiParam({
          name: param.name,
          description: param.description || param.name,
          type: param.type || String,
          required: param.required !== false,
          enum: param.enum,
        }),
      );
    });
  }

  // Add query parameters
  if (options.queries && options.queries.length > 0) {
    options.queries.forEach((query) => {
      decorators.push(
        ApiQuery({
          name: query.name,
          description: query.description || query.name,
          type: query.type || String,
          required: query.required === true,
          enum: query.enum,
          isArray: query.isArray,
        }),
      );
    });
  }

  // Add request body
  if (options.body || options.bodySchema) {
    // Priority: bodySchema > body.schema > body.type
    const bodyConfig: any = {};

    if (options.bodySchema) {
      // Direct bodySchema parameter (highest priority)
      bodyConfig.schema = options.bodySchema;
      bodyConfig.required = true;
    } else if (options.body?.schema) {
      // body.schema property
      bodyConfig.schema = options.body.schema;
      bodyConfig.required = options.body.required !== false;
      bodyConfig.description = options.body.description;
    } else if (options.body?.type) {
      // body.type property (original behavior)
      bodyConfig.type = options.body.type;
      bodyConfig.description = options.body.description;
      bodyConfig.required = options.body.required !== false;
      bodyConfig.isArray = options.body.isArray;
    }

    if (Object.keys(bodyConfig).length > 0) {
      decorators.push(ApiBody(bodyConfig));
    }
  }

  // Add content type
  if (options.consumes) {
    decorators.push(ApiConsumes(options.consumes));
  }

  // Add response type decorator (if type provided)
  if (options.type) {
    const responseType = options.isPaginated
      ? createPaginatedApiResponseClass(options.type)
      : createApiResponseClass(options.type);

    // Use appropriate response decorator based on status
    if (options.status === 201) {
      decorators.push(ApiCreatedResponse({ type: responseType }));
    } else if (options.status === 204) {
      decorators.push(ApiNoContentResponse({ description: 'Başarıyla tamamlandı' }));
    } else {
      decorators.push(ApiOkResponse({ type: responseType }));
    }
  }

  // Add 404 Not Found response if specified
  if (options.notFound) {
    decorators.push(ApiNotFoundResponse({ type: ErrorApiResponseClass }));
  }

  return applyDecorators(...decorators);
}
