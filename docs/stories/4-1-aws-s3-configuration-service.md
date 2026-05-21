# Story 4.1: AWS S3 Configuration & Service

Status: done

## Story

As a developer,
I want AWS S3 configuration ve wrapper service,
So that S3 operations yapabileyim.

## Acceptance Criteria

1. **AC-4.1.1:** AWS S3 SDK v3 packages installed and configured
   - `@aws-sdk/client-s3` ^3.600.0 installed
   - `@aws-sdk/s3-request-presigner` ^3.600.0 installed
   - `multer` ^1.4.5-lts.1 and `@types/multer` installed
   - No dependency conflicts, `npm install` succeeds

2. **AC-4.1.2:** AWS configuration file created with environment variable support
   - `src/config/aws.config.ts` created with `registerAs('aws', ...)` pattern
   - Reads: AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, S3_BUCKET
   - Optional config: S3_ENDPOINT, S3_FORCE_PATH_STYLE (for MinIO local dev)
   - Configuration registered in AppModule imports

3. **AC-4.1.3:** Environment variable validation added
   - Joi validation schema includes AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, S3_BUCKET (all required)
   - Application fails to start if required AWS env vars missing
   - Clear error messages for missing configuration

4. **AC-4.1.4:** S3Service created and implements IS3Service interface
   - `src/modules/files/services/s3.service.ts` created
   - Methods: `uploadFile()`, `getPresignedUrl()`, `deleteFile()`
   - S3Client initialized with credentials from aws.config.ts
   - Injectable service, registered in FilesModule providers

5. **AC-4.1.5:** S3 connection validated on application start
   - Health check endpoint: GET /health/s3
   - Tests S3 connectivity (listBucket or headBucket operation)
   - Returns 200 OK if S3 reachable, 503 Service Unavailable if not
   - Logged at application startup (info level)

6. **AC-4.1.6:** Local development MinIO setup documented
   - Docker Compose configuration provided for MinIO
   - .env.development.example includes MinIO config
   - README section explains local S3 setup
   - Works without AWS account for local development

## Tasks / Subtasks

- [x] Task 1: Install AWS SDK v3 packages (AC: 4.1.1)
  - [x] Subtask 1.1: Install `@aws-sdk/client-s3` ^3.600.0
  - [x] Subtask 1.2: Install `@aws-sdk/s3-request-presigner` ^3.600.0
  - [x] Subtask 1.3: Install `multer` ^1.4.5-lts.1 and `@types/multer`
  - [x] Subtask 1.4: Verify no dependency conflicts with `npm install`

- [x] Task 2: Create AWS configuration file (AC: 4.1.2)
  - [x] Subtask 2.1: Create `src/config/aws.config.ts` with `registerAs('aws', ...)` pattern
  - [x] Subtask 2.2: Configure environment variables: AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, S3_BUCKET
  - [x] Subtask 2.3: Add optional MinIO configuration: S3_ENDPOINT, S3_FORCE_PATH_STYLE
  - [x] Subtask 2.4: Register aws.config.ts in AppModule ConfigModule.forRoot()

- [x] Task 3: Add environment variable validation (AC: 4.1.3)
  - [x] Subtask 3.1: Update `src/config/validation.schema.ts` (or create if missing)
  - [x] Subtask 3.2: Add Joi validation for AWS_REGION (required)
  - [x] Subtask 3.3: Add Joi validation for AWS_ACCESS_KEY_ID (required)
  - [x] Subtask 3.4: Add Joi validation for AWS_SECRET_ACCESS_KEY (required)
  - [x] Subtask 3.5: Add Joi validation for S3_BUCKET (required)
  - [x] Subtask 3.6: Add optional validation for S3_ENDPOINT and S3_FORCE_PATH_STYLE
  - [x] Subtask 3.7: Test application fails to start with clear error when AWS env vars missing

- [x] Task 4: Create S3Service with core methods (AC: 4.1.4)
  - [x] Subtask 4.1: Create `src/modules/files/` directory structure
  - [x] Subtask 4.2: Create `src/modules/files/services/s3.service.ts`
  - [x] Subtask 4.3: Define IS3Service interface
  - [x] Subtask 4.4: Implement `uploadFile(buffer: Buffer, key: string, mimeType: string): Promise<string>`
  - [x] Subtask 4.5: Implement `getPresignedUrl(key: string, expiresIn: number): Promise<string>` (default 900s = 15min)
  - [x] Subtask 4.6: Implement `deleteFile(key: string): Promise<void>`
  - [x] Subtask 4.7: Initialize S3Client with credentials from aws.config.ts (inject ConfigService)
  - [x] Subtask 4.8: Implement error handling (wrap S3 exceptions in BadRequestException/ServiceUnavailableException)
  - [x] Subtask 4.9: Add @Injectable() decorator to S3Service

- [x] Task 5: Create FilesModule and register S3Service (AC: 4.1.4)
  - [x] Subtask 5.1: Create `src/modules/files/files.module.ts`
  - [x] Subtask 5.2: Register S3Service in providers array
  - [x] Subtask 5.3: Export S3Service for use in other modules (if needed)
  - [x] Subtask 5.4: Import ConfigModule to access aws.config.ts
  - [x] Subtask 5.5: Import FilesModule in AppModule

- [x] Task 6: Implement S3 health check endpoint (AC: 4.1.5)
  - [x] Subtask 6.1: Create HealthController (or add to existing health module)
  - [x] Subtask 6.2: Add GET /health/s3 endpoint
  - [x] Subtask 6.3: Inject S3Service into HealthController
  - [x] Subtask 6.4: Test S3 connectivity (headBucket or listObjects with max 1 item)
  - [x] Subtask 6.5: Return 200 OK if S3 reachable, 503 Service Unavailable if not
  - [x] Subtask 6.6: Log S3 health check result at application startup (info level)

- [x] Task 7: Create MinIO Docker Compose setup (AC: 4.1.6)
  - [x] Subtask 7.1: Add MinIO service to `docker-compose.yml` (ports: 9000, 9001)
  - [x] Subtask 7.2: Configure MinIO environment variables (MINIO_ROOT_USER, MINIO_ROOT_PASSWORD)
  - [x] Subtask 7.3: Create `.env.development.example` with MinIO configuration
  - [x] Subtask 7.4: Add S3_ENDPOINT=http://localhost:9000 and S3_FORCE_PATH_STYLE=true for local dev
  - [x] Subtask 7.5: Document local S3 setup in README.md (section: "Local Development with MinIO")
  - [x] Subtask 7.6: Test application works with MinIO locally (upload, download, delete)

- [x] Task 8: Update environment configuration examples (AC: 4.1.2, 4.1.6)
  - [x] Subtask 8.1: Update `.env.example` with AWS S3 configuration
  - [x] Subtask 8.2: Add comments explaining each AWS environment variable
  - [x] Subtask 8.3: Document S3 bucket naming convention (e.g., boilerplate-dev, boilerplate-staging, boilerplate-prod)
  - [x] Subtask 8.4: Add AWS IAM policy example to docs (minimum required permissions)

- [x] Task 9: Testing (AC: All)
  - [x] Subtask 9.1: Unit test S3Service.uploadFile() (mock S3Client, verify PutObjectCommand)
  - [x] Subtask 9.2: Unit test S3Service.getPresignedUrl() (mock getSignedUrl, verify expiration)
  - [x] Subtask 9.3: Unit test S3Service.deleteFile() (mock DeleteObjectCommand)
  - [x] Subtask 9.4: Integration test health check endpoint (GET /health/s3)
  - [x] Subtask 9.5: Test environment variable validation (application fails to start if required vars missing)
  - [x] Subtask 9.6: Test S3 error handling (connection error, invalid credentials, bucket not found)
  - [x] Subtask 9.7: Test MinIO local development setup (docker-compose up, application connects)

## Dev Notes

### Architecture Patterns and Constraints

**AWS S3 Integration Pattern:**
- S3Service acts as wrapper around AWS SDK v3 (@aws-sdk/client-s3)
- Configuration externalized to aws.config.ts (follows NestJS ConfigModule pattern)
- Environment-based bucket naming: `{project}-{environment}` (e.g., boilerplate-dev, boilerplate-prod)
- S3Client initialized once and reused (singleton pattern via @Injectable)
- [Source: docs/tech-spec-epic-4.md#Services-and-Modules]

**Error Handling Strategy:**
- S3 exceptions wrapped in NestJS exceptions (BadRequestException, ServiceUnavailableException)
- Retry logic with exponential backoff (3 attempts: 1s, 2s, 4s)
- Clear error messages for debugging (e.g., "S3 bucket not found: boilerplate-dev")
- [Source: docs/tech-spec-epic-4.md#Error-Handling]

**Configuration Management:**
- aws.config.ts uses `registerAs('aws', ...)` pattern (type-safe configuration)
- ConfigService injected into S3Service to access configuration
- Joi validation ensures required AWS env vars present at application startup
- Validation fails fast with clear error messages
- [Source: docs/tech-spec-epic-4.md#Configuration-Dependencies]

**Local Development with MinIO:**
- MinIO provides S3-compatible API for local development (no AWS account needed)
- Docker Compose setup includes MinIO service (ports 9000 for API, 9001 for console)
- S3_ENDPOINT and S3_FORCE_PATH_STYLE enable MinIO compatibility
- [Source: docs/tech-spec-epic-4.md#AWS-S3-Setup-Requirements]

**Health Check Pattern:**
- GET /health/s3 endpoint tests S3 connectivity at runtime
- Uses headBucket operation (minimal overhead, no data transfer)
- Logged at application startup for monitoring
- Returns 503 Service Unavailable if S3 unreachable (allows k8s readiness probes)
- [Source: docs/tech-spec-epic-4.md#Observability]

**Security Considerations:**
- AWS credentials never hardcoded (environment variables only)
- AWS IAM policy with minimum required permissions (PutObject, GetObject, DeleteObject, ListBucket)
- S3 bucket public access blocked (all files private by default)
- Pre-signed URLs provide time-limited access (15 min expiry)
- [Source: docs/tech-spec-epic-4.md#Security]

### Source Tree Components to Touch

**New Files to Create:**
```
src/
├── config/
│   ├── aws.config.ts                          # NEW - AWS S3 configuration
│   └── validation.schema.ts                   # MODIFIED - Add AWS env var validation
├── modules/
│   └── files/
│       ├── services/
│       │   └── s3.service.ts                  # NEW - S3 wrapper service
│       └── files.module.ts                    # NEW - Files module registration
└── health/
    └── health.controller.ts                   # MODIFIED - Add /health/s3 endpoint

docker-compose.yml                             # MODIFIED - Add MinIO service
.env.example                                   # MODIFIED - Add AWS S3 configuration
.env.development.example                       # NEW - MinIO local dev configuration
README.md                                      # MODIFIED - Add local S3 setup section
```

**Dependencies from Previous Epics:**
- ConfigModule (Epic 1): Used to register aws.config.ts
- PrismaModule (Epic 1): Will be used in Story 4.2 for File entity operations
- JwtAuthGuard (Epic 2): Will be used in Story 4.2+ for protected endpoints
- PermissionsGuard (Epic 3): Will be used in Story 4.2+ for FILES.* permissions

**Integration Points:**
- AppModule: Import FilesModule and register aws.config.ts
- ConfigModule: Validate AWS environment variables at startup
- HealthModule: Add /health/s3 endpoint for S3 connectivity check

### Testing Standards Summary

**Unit Testing (S3Service):**
- Test 1: uploadFile() → Mock S3Client.send(), verify PutObjectCommand called with buffer, key, mimeType
- Test 2: getPresignedUrl() → Mock getSignedUrl(), verify expiration (900s)
- Test 3: deleteFile() → Mock DeleteObjectCommand, verify S3 key passed correctly
- Test 4: S3 connection error → Verify exception wrapping (ServiceUnavailableException)
- Test 5: Invalid credentials → Verify clear error message

**Integration Testing:**
- Test 1: GET /health/s3 → Returns 200 OK if S3 reachable
- Test 2: GET /health/s3 → Returns 503 Service Unavailable if S3 unreachable
- Test 3: Application startup → Fails if required AWS env vars missing (AWS_REGION, etc.)
- Test 4: Application startup → Succeeds with valid AWS env vars

**E2E Testing (MinIO):**
- Test 1: docker-compose up → MinIO starts successfully
- Test 2: Application connects to MinIO (S3_ENDPOINT=http://localhost:9000)
- Test 3: S3Service.uploadFile() → File uploaded to MinIO bucket
- Test 4: S3Service.getPresignedUrl() → Pre-signed URL generated (MinIO format)
- Test 5: S3Service.deleteFile() → File deleted from MinIO bucket

### Learnings from Previous Story

**From Story 3-8-role-permission-management-endpoints (Status: review)**

- **Epic 3 Completion:**
  - All permission infrastructure completed (PermissionsGuard, AuthorizationService, FILES.* permissions)
  - Permission sync script ready to add FILES.* permissions to database
  - 21 E2E tests passing for permission management endpoints
  - **For Story 4.1**: Permission infrastructure ready, but no FILES.* permissions in database yet

- **NestJS Module Structure:**
  - Module organization pattern: `src/modules/{feature}/{controllers|services|dto|entities}`
  - @Injectable() decorator required for services
  - Module registration in AppModule (imports array)
  - **For Story 4.1**: Follow same pattern for FilesModule (`src/modules/files/`)

- **Configuration Pattern:**
  - ConfigModule.forRoot() with validation schema
  - registerAs() pattern for namespaced configuration (e.g., 'aws')
  - ConfigService injection into services for type-safe config access
  - **For Story 4.1**: Use same pattern for aws.config.ts

- **Testing Infrastructure:**
  - Unit tests: Mock external services (e.g., PrismaService, S3Client)
  - Integration tests: Test endpoint responses, status codes, error messages
  - E2E tests: Full user journey with real services (or MinIO)
  - **For Story 4.1**: Mock S3Client in unit tests, use MinIO for E2E tests

- **No Blocking Issues:**
  - All Epic 3 stories completed (permission infrastructure ready)
  - Database migrations working correctly
  - Testing patterns established
  - **For Story 4.1**: Ready to start Epic 4 implementation

[Source: stories/3-8-role-permission-management-endpoints.md#Dev-Agent-Record]

**Key Takeaway:**
- Story 4.1 is the foundation story for Epic 4 (File Management)
- Sets up AWS S3 integration infrastructure (configuration, S3Service, health check)
- No database changes in this story (File entity added in Story 4.2)
- Focus on S3 connectivity, configuration validation, and local development setup
- Use MinIO for local development to avoid AWS account requirement

### Project Structure Notes

Story 4.1 creates the foundation for Epic 4 (File Management) by setting up AWS S3 integration:

```
src/
├── config/
│   ├── aws.config.ts                          # NEW - AWS S3 configuration (registerAs pattern)
│   └── validation.schema.ts                   # MODIFIED - Add AWS env var validation (Joi)
│
├── modules/
│   └── files/
│       ├── services/
│       │   └── s3.service.ts                  # NEW - S3 wrapper (uploadFile, getPresignedUrl, deleteFile)
│       └── files.module.ts                    # NEW - FilesModule registration
│
└── health/
    └── health.controller.ts                   # MODIFIED - Add GET /health/s3 endpoint

docker-compose.yml                             # MODIFIED - Add MinIO service (ports 9000, 9001)
.env.example                                   # MODIFIED - AWS S3 env vars template
.env.development.example                       # NEW - MinIO local dev configuration
README.md                                      # MODIFIED - Local S3 setup documentation
```

**Files Module Structure (Complete Epic 4):**
```
src/modules/files/
├── controllers/
│   └── files.controller.ts                    # Story 4.2 - Upload, download, delete, list endpoints
├── services/
│   ├── s3.service.ts                          # Story 4.1 - S3 wrapper (THIS STORY)
│   └── files.service.ts                       # Story 4.2 - Business logic orchestration
├── dto/
│   ├── request/
│   │   └── query-files.dto.ts                 # Story 4.5 - Pagination, filters
│   └── response/
│       └── file-res.dto.ts                    # Story 4.2 - File metadata response
├── entities/
│   └── file.entity.ts                         # Story 4.2 - Prisma model
└── files.module.ts                            # Story 4.1 - Module registration (THIS STORY)
```

**Epic 4 Story Dependencies:**
- **Story 4.1** (AWS S3 Configuration): Foundation (no dependencies)
- **Story 4.2** (File Upload): Depends on 4.1 (uses S3Service)
- **Story 4.3** (File Download): Depends on 4.2 (uses File entity, S3Service)
- **Story 4.4** (File Deletion): Depends on 4.2 (uses File entity)
- **Story 4.5** (File List): Depends on 4.2 (uses File entity)

**Integration with Epic 3 (Permissions):**
- FILES.CREATE permission → Used in Story 4.2 (upload endpoint)
- FILES.VIEW permission → Used in Story 4.3 (download endpoint)
- FILES.DELETE permission → Used in Story 4.4 (delete endpoint)
- FILES.VIEW_ALL permission → Used in Story 4.5 (admin view all files)
- **For Story 4.1**: No permission checks yet (only S3 infrastructure setup)

**No Conflicts:**
- FilesModule independent from other modules (clean boundaries)
- S3Service encapsulates all AWS S3 operations (single responsibility)
- Configuration follows NestJS best practices (registerAs pattern)
- Health check endpoint separate from business logic

### References

**Acceptance Criteria and Requirements:**
- [Source: docs/tech-spec-epic-4.md#Story-4.1] - Complete AC specifications (AC-4.1.1 through AC-4.1.6)
- [Source: docs/epics.md#Story-4.1] - Epic-level story breakdown

**Architecture and Design:**
- [Source: docs/tech-spec-epic-4.md#Services-and-Modules] - S3Service design, IS3Service interface
- [Source: docs/tech-spec-epic-4.md#Configuration-Dependencies] - AWS configuration pattern
- [Source: docs/tech-spec-epic-4.md#AWS-S3-Setup-Requirements] - AWS IAM policy, bucket configuration

**Dependencies:**
- [Source: docs/tech-spec-epic-4.md#Dependencies-and-Integrations] - Epic dependencies (Epic 1, 2, 3)
- [Source: docs/tech-spec-epic-4.md#External-Dependencies] - NPM packages (@aws-sdk/client-s3, etc.)

**Testing:**
- [Source: docs/tech-spec-epic-4.md#Test-Strategy-Summary] - Unit, integration, E2E test approach
- [Source: docs/tech-spec-epic-4.md#Traceability-Mapping] - AC-4.1.1 through AC-4.1.6 test coverage requirements

## Dev Agent Record

### Context Reference

- Story Context: `docs/stories/4-1-aws-s3-configuration-service.context.xml`

### Agent Model Used

Claude Sonnet 4.5 (claude-sonnet-4-5-20250929)

### Debug Log References

**Implementation Plan:**
1. AWS SDK v3 paketleri kurulumu (@aws-sdk/client-s3, @aws-sdk/s3-request-presigner, multer)
2. AWS configuration file (aws.config.ts) - registerAs pattern
3. Environment variable validation (Joi schema)
4. S3Service implementation (uploadFile, getPresignedUrl, deleteFile, testConnection)
5. FilesModule oluşturma ve AppModule'e kayıt
6. Health check endpoint (GET /health/s3)
7. MinIO Docker Compose setup (local development)
8. Environment configuration örnekleri (.env.example, .env.development.example)
9. Comprehensive unit tests (15 test cases, all passing)

**Key Decisions:**
- MinIO kullanımı local development için (AWS account gerektirmez)
- Exponential backoff retry logic (3 attempts: 1s, 2s, 4s)
- Pre-signed URL default expiration: 900s (15 minutes)
- S3Client singleton pattern (@Injectable decorator)

### Completion Notes

**Completed:** 2025-11-06
**Definition of Done:** All acceptance criteria met, code reviewed, tests passing

**Story 4.1 Implementation Complete:**
- ✅ AC-4.1.1: AWS SDK v3 packages installed (@aws-sdk/client-s3 ^3.925.0, @aws-sdk/s3-request-presigner ^3.925.0, multer ^1.4.5-lts.2)
- ✅ AC-4.1.2: AWS configuration file created (src/config/aws.config.ts) with registerAs pattern
- ✅ AC-4.1.3: Environment variable validation added to Joi schema (AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, S3_BUCKET - all required)
- ✅ AC-4.1.4: S3Service implemented with IS3Service interface (uploadFile, getPresignedUrl, deleteFile, testConnection methods)
- ✅ AC-4.1.5: S3 health check endpoint created (GET /api/health/s3) with HeadBucketCommand
- ✅ AC-4.1.6: MinIO Docker Compose setup documented (docker-compose.yml, .env.development.example, README.md)

**Testing Results:**
- Unit tests: 15/15 passing (S3Service.spec.ts)
- Test coverage: uploadFile (5 tests), getPresignedUrl (3 tests), deleteFile (2 tests), testConnection (2 tests), constructor (3 tests)
- Build successful: TypeScript compilation passed
- No dependency conflicts

**Integration Ready:**
- FilesModule registered in AppModule
- HealthModule created and integrated
- S3Service exported for use in future stories (4.2+)
- Configuration validated at startup (fail-fast approach)

### File List

**New Files Created:**
- src/config/aws.config.ts - AWS S3 configuration (registerAs pattern)
- src/modules/files/services/s3.service.ts - S3 wrapper service with retry logic
- src/modules/files/services/s3.service.spec.ts - Unit tests (15 test cases)
- src/modules/files/files.module.ts - Files module registration
- src/health/health.controller.ts - Health check controller
- src/health/health.module.ts - Health module registration
- test/health-s3.e2e-spec.ts - E2E tests for health endpoint
- docker-compose.yml - PostgreSQL + MinIO services
- .env.development.example - MinIO local development configuration

**Modified Files:**
- src/config/env-validation.schema.ts - Added AWS S3 environment variable validation
- src/app.module.ts - Imported aws.config, FilesModule, HealthModule
- package.json - Added AWS SDK v3 and multer dependencies
- package-lock.json - Dependency lock file updated
- .env.example - Added AWS S3 configuration with IAM policy example
- README.md - Added "Local Development with MinIO" section (comprehensive setup guide)

### Change Log

- **2025-11-06:** Story 4.1 drafted
  - Created story file with complete acceptance criteria from tech-spec-epic-4.md
  - Incorporated learnings from Story 3.8 (permission infrastructure ready)
  - All tasks and subtasks mapped to AC requirements
  - Ready for development (all dependencies from Epic 1-3 completed)
  - MinIO local development setup documented for AWS-free development

- **2025-11-06:** Story 4.1 implementation completed
  - All 9 tasks completed successfully
  - AWS SDK v3 integration completed (client-s3, s3-request-presigner, multer)
  - S3Service implemented with full error handling and retry logic
  - Health check endpoint operational (GET /api/health/s3)
  - MinIO Docker Compose setup created for local development
  - 15 unit tests passing, build successful
  - Status: ready-for-dev → in-progress → review
