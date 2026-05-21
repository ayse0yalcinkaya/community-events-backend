# Epic Technical Specification: Postman Collection Export

Date: 2025-11-12
Author: BMad
Epic ID: 15
Status: Draft

---

## Overview

Epic 15, mevcut Swagger/OpenAPI 3.0 documentation'dan (Epic 8) otomatik olarak Postman Collection'ları generate eder. Bu özellik, developer'ların API'yi Postman'a import edip hemen test edebilmesini sağlar. swagger2postman NPM paketini kullanarak OpenAPI spec'ini Postman Collection Format v2.1.0'a dönüştürür.

Ana hedefler:
- Tek tıkla Postman import
- Environment variables (dev/staging/prod)
- Authentication flow entegrasyonu
- Otomatik request/response documentation

## Objectives and Scope

**In Scope:**
- swagger2postman package kurulumu ve konfigürasyonu
- Postman converter service implementasyonu
- Endpoint: GET /api/docs/postman (collection JSON download)
- Environment JSON files (dev, staging, production)
- Authentication flow examples ve pre-request scripts
- Import guide ve documentation
- Postman test scripts (optional enhancement)

**Out of Scope:**
- Postman Newman integration (CLI testing - separate feature)
- Postman Monitor entegrasyonu
- Custom Postman collection templates
- Auto-generated Postman monitors
- Postman mock server generation
- API versioning in Postman (separate epic)

## System Architecture Alignment

Bu epic, Architecture'ın **API Documentation** bölümünde tanımlanan Epic 8 (Swagger) üzerine kurulur. Mevcut Swagger/OpenAPI infrastructure'ını Postman Collection Format'a dönüştürür:

**Swagger → Postman Flow:**
```
OpenAPI Spec (Epic 8) → swagger2postman → Postman Collection JSON → Import to Postman
```

Postman environment variables, projenin environment-based configuration pattern'ini takip eder (dev, staging, production).

## Technical Design

### 1. Core Components

**Postman Collection Service:**
```typescript
interface PostmanCollectionService {
  generateCollectionFromSwagger(): Promise<PostmanCollection>
  generateEnvironment(env: EnvironmentType): PostmanEnvironment
  getCollectionJson(): Promise<Buffer>
  getEnvironmentJson(env: EnvironmentType): Promise<Buffer>
}
```

**Location:** `src/common/postman/postman-collection.service.ts`

### 2. Swagger to Postman Conversion

**Process:**
1. Fetch OpenAPI spec from `/api/docs-json` (Epic 8 output)
2. Parse with swagger2postman.convert()
3. Post-process: Add environment variables
4. Generate collection metadata
5. Add auth pre-request scripts

**Key Operations:**
```typescript
// Convert OpenAPI to Postman
const collection = await swagger2postman.convert(
  { data: swaggerJson },
  { output: '2.1.0' }
);

// Inject environment variables
collection.collection.item.forEach((item: any) => {
  item.request.url = {
    ...item.request.url,
    variable: [
      { key: 'baseUrl', value: '{{baseUrl}}' },
      { key: 'authToken', value: '{{authToken}}' }
    ]
  };
});
```

### 3. Postman Collection Structure

**Generated Collection Format:**
```json
{
  "collection": {
    "info": {
      "name": "Boilerplate API",
      "description": "Auto-generated from Swagger",
      "version": "1.0.0"
    },
    "auth": {
      "type": "bearer",
      "bearer": [{
        "key": "token",
        "value": "{{authToken}}",
        "type": "string"
      }]
    },
    "item": [
      {
        "name": "Users",
        "item": [
          {
            "name": "GET /users",
            "request": {
              "method": "GET",
              "url": {
                "raw": "{{baseUrl}}/users",
                "host": ["{{baseUrl}}"],
                "path": ["users"]
              },
              "header": [
                {
                  "key": "Authorization",
                  "value": "Bearer {{authToken}}"
                }
              ]
            }
          }
        ]
      }
    ]
  }
}
```

### 4. Environment Variables Setup

**Environment Types:**
```typescript
enum EnvironmentType {
  DEVELOPMENT = 'dev',
  STAGING = 'staging',
  PRODUCTION = 'prod'
}
```

**Environment JSON Structure:**
```json
{
  "environment": {
    "id": "api-env-dev",
    "name": "Boilerplate API - Development",
    "values": [
      {
        "key": "baseUrl",
        "value": "http://localhost:3000/api",
        "enabled": true
      },
      {
        "key": "authToken",
        "value": "",
        "enabled": true,
        "type": "text"
      }
    ]
  }
}
```

### 5. Authentication Flow Integration

**Pre-request Script:**
```javascript
// Add auth header to every request
if (pm.request.headers.has('Authorization')) {
  // Header already exists
} else if (pm.environment.get('authToken')) {
  pm.request.headers.add({
    key: 'Authorization',
    value: 'Bearer ' + pm.environment.get('authToken')
  });
} else {
  console.log('⚠️ authToken not set. Please set environment variable.');
}
```

**Login Requests:**
- Admin login: POST {{baseUrl}}/auth/login/admin
- OTP request: POST {{baseUrl}}/auth/login/otp/request
- OTP verify: POST {{baseUrl}}/auth/login/otp/verify

### 6. Implementation Plan

**Step 1: Package Installation**
```bash
npm install swagger2postman --save-dev
npm install @types/swagger2postman --save-dev
```

**Step 2: Service Implementation**
Create service files:
- `src/common/postman/postman-collection.service.ts`
- `src/common/postman/interfaces/postman-collection.interface.ts`
- `src/common/postman/interfaces/postman-environment.interface.ts`
- `src/common/postman/utils/swagger-parser.util.ts`

**Step 3: Controller Endpoint**
```typescript
@Controller('docs')
export class DocsController {
  @Get('postman')
  @ApiOperation({ summary: 'Download Postman Collection' })
  async getPostmanCollection(
    @Res() res: Response,
    @Query('env') env: EnvironmentType = EnvironmentType.DEVELOPMENT
  ): Promise<void> {
    const collection = await this.postmanService.generateCollection();
    const environment = await this.postmanService.generateEnvironment(env);

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="boilerplate-api-${env}.postman_collection.json"`);
    res.send(JSON.stringify(collection, null, 2));
  }

  @Get('postman/environment/:env')
  @ApiOperation({ summary: 'Download Postman Environment' })
  async getPostmanEnvironment(
    @Param('env') env: EnvironmentType,
    @Res() res: Response
  ): Promise<void> {
    const environment = await this.postmanService.generateEnvironment(env);

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="boilerplate-api-${env}.postman_environment.json"`);
    res.send(JSON.stringify(environment, null, 2));
  }
}
```

**Step 4: Testing**
- Unit tests for service methods
- Integration tests for endpoints
- Manual Postman import test
- Verify environment switching

## Dependencies and Prerequisites

**Required:**
- **Epic 8 Complete:** Swagger/OpenAPI 3.0 implementation
- **Node.js packages:**
  - swagger2postman (v1.0.0+)
  - @nestjs/common (existing)

**Related Epics:**
- Epic 2 (Authentication) - auth flow examples
- Epic 8 (API Documentation) - Swagger source
- Epic 14 (Architecture refinement) - code organization

## Testing Strategy

**Unit Tests:**
- Test swagger parsing and conversion
- Test environment variable generation
- Test collection JSON structure
- Test authentication script injection

**Integration Tests:**
- Test endpoint: GET /api/docs/postman
- Test endpoint: GET /api/docs/postman/environment/:env
- Verify downloaded JSON is valid Postman Collection
- Verify environment JSON structure

**Manual Testing:**
1. Start application (Epic 8 running)
2. Visit /api/docs (Swagger UI)
3. Download collection from /api/docs/postman
4. Import collection into Postman
5. Import environment file
6. Set environment in Postman
7. Test authentication flow
8. Execute sample API requests

**Postman Test Script Verification:**
```javascript
// Test example for GET /users
pm.test('Status code is 200', function () {
    pm.response.to.have.status(200);
});

pm.test('Response time < 2s', function () {
    pm.expect(pm.response.responseTime).to.be.below(2000);
});

pm.test('Response has success property', function () {
    const responseJson = pm.response.json();
    pm.expect(responseJson).to.have.property('success');
});
```

## Performance Considerations

**Conversion Performance:**
- Swagger → Postman conversion: < 500ms for typical API
- Caching: Cache converted collection for 1 hour
- Lazy loading: Convert only when requested

**File Size:**
- Typical Postman Collection: < 100KB (for 50 endpoints)
- Environment JSON: < 5KB
- Compression: Enable gzip for downloads

**Memory Usage:**
- Stream large collections instead of loading into memory
- Cleanup temporary conversion artifacts
- Limit concurrent conversions (max 10)

## Security Considerations

**Sensitive Data:**
- Never include real auth tokens in collection
- Mark environment variables as sensitive in Postman
- Include warnings in collection description

**Download Security:**
- Rate limit: Max 10 downloads per minute per IP
- Validate environment parameter (dev/staging/prod only)
- No authentication required (public endpoint)

## Error Handling

**Conversion Errors:**
- Handle malformed Swagger spec
- Log conversion errors with details
- Return 500 with error message

**Missing Swagger:**
- Check if /api/docs-json exists
- If not, redirect to /api/docs
- Provide helpful error message

**Invalid Environment:**
- Validate env parameter (dev/staging/prod)
- Return 400 with valid values list

## Documentation Requirements

**README Updates:**
```markdown
## Postman Collection

Import API into Postman:

1. Download collection:
   ```bash
   curl -O http://localhost:3000/api/docs/postman
   ```

2. Download environment (choose one):
   ```bash
   curl -O http://localhost:3000/api/docs/postman/environment/dev
   curl -O http://localhost:3000/api/docs/postman/environment/staging
   curl -O http://localhost:3000/api/docs/postman/environment/prod
   ```

3. Import in Postman:
   - File → Import → Upload collection.json
   - File → Import → Upload environment.json
   - Select imported environment
   - Set authToken in environment variables

4. Test authentication:
   - Import collection
   - Run "Admin Login" request
   - Copy token from response
   - Paste into authToken environment variable
```

**API Endpoint Documentation:**
- GET /api/docs/postman - Download collection
- GET /api/docs/postman/environment/:env - Download environment
- Query parameter: env (dev|staging|prod, default: dev)

## Acceptance Criteria

**Epic 15 Complete When:**

✅ **Technical Implementation:**
- swagger2postman package installed and working
- PostmanCollectionService fully implemented
- Endpoints /api/docs/postman and /api/docs/postman/environment/:env working
- Collection JSON valid and importable to Postman
- Environment JSON files generated correctly

✅ **Documentation:**
- README section added with import instructions
- Postman collection metadata populated
- Authentication flow documented in collection

✅ **Testing:**
- Unit tests: >90% coverage
- Integration tests: All endpoints tested
- Manual testing: Collection imported and working in Postman
- Test scripts: Basic validation working

✅ **Code Quality:**
- Follows Epic 15 stories exactly
- Integration with existing Epic 8 Swagger implementation
- No breaking changes to existing endpoints

## Risks and Mitigation

**Risk 1:** swagger2postman package compatibility issues
- **Mitigation:** Test with current Swagger version, fallback to manual conversion

**Risk 2:** Postman Collection Format changes
- **Mitigation:** Pin to specific version, test with latest Postman

**Risk 3:** Large API specs causing memory issues
- **Mitigation:** Implement streaming, lazy loading

## Post-Review Follow-ups

After Senior Developer Review (2025-11-12):

- **Story 15.1 Action Item:** Fix test assertion bug in unit tests (src/common/postman/__tests__/postman-collection.service.spec.ts:220, 228). Tests incorrectly expect validation to fail when warnings are present (empty paths or missing components). Validation logic correctly treats warnings as non-blocking. **Status:** Open, **Severity:** Low, **Location:** docs/backlog.md

## Post-Implementation

**Future Enhancements:**
- Newman integration for CLI testing (Epic 16)
- Auto-generated Postman monitors
- API changelog in Postman collection
- Multiple collection formats (v2.0, v2.1.0)
