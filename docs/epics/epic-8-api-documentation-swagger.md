# Epic 8: API Documentation (Swagger)

**Goal:** Auto-generated, always up-to-date API documentation with interactive testing

**Value Proposition:** Developer-friendly docs, try-it-out functionality, type-safe response schemas

**Prerequisites:** Epic 3 (Controllers exist)

**Technical Stack:**
- @nestjs/swagger
- OpenAPI 3.0
- Swagger UI

---

## Story 8.1: Swagger Module Setup

**As a** developer,
**I want** Swagger configured,
**So that** API documentation otomatik oluşsun.

**Acceptance Criteria:**
1. `@nestjs/swagger` package installed
2. Swagger configured (main.ts):
   - Available at /api/docs
   - Title, description, version (from package.json)
   - Bearer auth configured
3. Swagger UI accessible (browser'da /api/docs açılabiliyor)
4. Environment-based: Dev/staging enabled, production disabled (or auth-protected)
5. Export to JSON: /api/docs-json endpoint

**Technical Notes:**
- DocumentBuilder + SwaggerModule.createDocument()
- addBearerAuth() for JWT
- Production: SWAGGER_ENABLED env var

**Dependencies:** Story 7.6

---

## Story 8.2: Swagger Response Factory Functions

**As a** developer,
**I want** type-safe Swagger response decorators,
**So that** response schema'ları consistent olsun.

**Acceptance Criteria:**
1. `src/common/swagger/api-response.factory.ts` oluşturulmuş
2. Factory functions:
   - `createApiResponseClass<T>(DataDto: Type<T>)` → Success response class
   - `createPaginatedApiResponseClass<T>(DataDto: Type<T>)` → Paginated response class
   - `ErrorApiResponseClass` → Error response class
3. Response format (hrsync-backend pattern):
   ```typescript
   class ApiResponse<T> {
     @ApiProperty() success: boolean;
     @ApiProperty() status: number;
     @ApiProperty() data: T;
     @ApiProperty() message: string;
   }
   ```
4. Paginated response:
   ```typescript
   class PaginatedApiResponse<T> {
     @ApiProperty() success: boolean;
     @ApiProperty() status: number;
     @ApiProperty() data: T[];
     @ApiProperty() count: number;
     @ApiProperty() message: string;
   }
   ```

**Technical Notes:**
- Generic class factory (runtime class generation)
- @ApiProperty() decorators for Swagger
- Type() helper for DTO metadata

**Dependencies:** Story 8.1

---

## Story 8.3: Controller Swagger Decorators

**As a** developer,
**I want** controller endpoint'lerine Swagger decorators,
**So that** her endpoint documented olsun.

**Acceptance Criteria:**
1. Tüm controller'lara şunlar eklendi:
   - `@ApiTags('Users')` - Controller grouping
   - `@ApiBearerAuth('JWT-auth')` - JWT requirement
2. Her endpoint method'a:
   - `@ApiOperation({ summary: '...' })` - Endpoint açıklaması
   - `@ApiResponse({ status: 200, type: createApiResponseClass(Dto) })` - Success response
   - `@ApiBadRequestResponse({ type: ErrorApiResponseClass })` - Error response
   - `@ApiParam()` / `@ApiQuery()` - Path/query parameters
3. DTO'lara:
   - `@ApiProperty()` - Field documentation
   - `@ApiPropertyOptional()` - Optional fields
4. Example values: @ApiProperty({ example: 'john@example.com' })

**Technical Notes:**
- Swagger decorators her controller method'a eklenecek
- hrsync-backend exact pattern
- Example request/response Swagger UI'da görünüyor

**Dependencies:** Story 8.2

---
