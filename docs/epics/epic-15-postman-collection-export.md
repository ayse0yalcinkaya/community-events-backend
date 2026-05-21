# Epic 15: Postman Collection Export

**Goal:** Auto-generated Postman collections from Swagger/OpenAPI documentation with environment variables

**Value Proposition:** Developers can import API into Postman with one click, test endpoints immediately

**Prerequisites:** Epic 8 (Swagger/OpenAPI implemented)

**Technical Stack:**
- swagger2postman (npm package)
- OpenAPI 3.0 (from Epic 8)
- Postman Collection Format v2.1.0
- Environment variables (dev, staging, production)

---

## Story 15.1: Swagger to Postman Converter Setup

**As a** developer,
**I want** Swagger documentation automatically converted to Postman Collection,
**So that** API can be imported into Postman easily.

**Acceptance Criteria:**
1. `swagger2postman` npm package installed
2. Postman converter service created:
   - `src/common/postman/postman-collection.service.ts`
3. Converter can read OpenAPI 3.0 spec from /api/docs-json
4. Generate Postman Collection v2.1.0 compatible JSON
5. Available endpoint: GET /api/docs/postman
6. Download header: Content-Disposition: attachment; filename="api-collection.json"

**Technical Notes:**
- Use swagger2postman.convert() function
- Postman Collection Format v2.1.0
- Include all endpoints from OpenAPI spec
- Preserve HTTP methods, paths, headers

**Dependencies:** Story 8.1 (Swagger JSON export)

---

## Story 15.2: Postman Collection Environment Variables

**As a** developer,
**I want** Postman environment variables for base URL and auth tokens,
**So that** I can easily switch between environments (dev, staging, production).

**Acceptance Criteria:**
1. Postman environment JSON generated alongside collection
2. Environment variables:
   - `baseUrl`: API base URL (from environment)
   - `authToken`: JWT bearer token placeholder
   - `apiKey`: API key placeholder (if applicable)
3. Separate environment files:
   - `api-environment-dev.postman_environment.json`
   - `api-environment-staging.postman_environment.json`
   - `api-environment-prod.postman_environment.json`
4. Variables marked as sensitive (authToken, apiKey)
5. Environment selection guide in README

**Technical Notes:**
- Environment JSON format follows Postman spec
- Base URL from environment variables (NODE_ENV)
- Auth tokens should be set manually after import
- Sensitive variables hidden in Postman UI

**Dependencies:** Story 15.1

---

## Story 15.3: Authentication Flow in Postman

**As a** API consumer,
**I want** Postman collection to include authentication examples,
**So that** I know how to authenticate requests properly.

**Acceptance Criteria:**
1. Auth endpoints included in collection:
   - POST /auth/login/admin (phone + password)
   - POST /auth/login/otp/request (phone)
   - POST /auth/login/otp/verify (phone + OTP)
2. Pre-request script for automatic token injection:
   - Check if {{authToken}} exists
   - If not, display instructions in Console
3. Authorization headers configured in collection:
   - Bearer token for protected endpoints
4. Example requests with sample data
5. Login flow documentation in collection description

**Technical Notes:**
- Pre-request script in Postman Collection
- pm.request.headers.add() for auth header
- Documentation for manual token setup
- Include OTP flow instructions

**Dependencies:** Story 15.1, Epic 2 (Authentication)

---

## Story 15.4: Postman Collection Documentation & Import Guide

**As a** developer,
**I want** clear documentation on how to import and use the Postman Collection,
**So that** I can quickly test the API.

**Acceptance Criteria:**
1. README section: "Postman Collection" added
2. Import steps documented:
   - Download collection JSON from /api/docs/postman
   - Download environment JSON (dev/staging/prod)
   - Import both into Postman
   - Set environment in Postman
3. Postman collection metadata:
   - Title, description, version
   - Author: Boilerplate Team
   - Contact/support info
4. Example test cases in README
5. Troubleshooting guide (common issues)
6. Video/image guide (optional)

**Technical Notes:**
- Postman Collection description (markdown supported)
- Collection-level documentation
- Request examples with placeholders
- Link to Swagger UI for detailed docs

**Dependencies:** Story 15.3

---

## Story 15.5: Postman Test Scripts (Optional Enhancement)

**As a** API consumer,
**I want** Postman test scripts that validate responses,
**So that** I can verify API behavior automatically.

**Acceptance Criteria:**
1. Basic test scripts for GET endpoints:
   - Check status code (2xx, 4xx, 5xx)
   - Validate response schema
   - Check response time (< 2s)
2. Test scripts for POST/PUT/PATCH:
   - Validate required fields
   - Check success response format
3. Collection-level test script setup
4. Tests run automatically after requests
5. Test results visible in Postman Test Results tab

**Technical Notes:**
- pm.test() functions in Postman
- Response schema validation (json-schema)
- Response time: pm.response.responseTime
- Status code checks: pm.response.to.have.status(200)

**Dependencies:** Story 15.3

---

**Implementation Notes:**

This epic builds on Epic 8 (Swagger/OpenAPI). The swagger2postman package will read the OpenAPI spec and generate a compatible Postman Collection. This provides developers with an immediate testing workflow without having to manually create requests in Postman.

**File Structure:**
```
src/
├── common/
│   ├── postman/
│   │   ├── postman-collection.service.ts
│   │   ├── interfaces/
│   │   │   ├── postman-collection.interface.ts
│   │   │   └── postman-environment.interface.ts
│   │   └── utils/
│   │       └── swagger-parser.util.ts
└── [controllers with Swagger decorators from Epic 8]
```
