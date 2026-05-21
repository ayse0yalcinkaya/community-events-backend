# Story 9.4: E2E Test Infrastructure

Status: done

## Story

As a developer,
I want E2E test infrastructure,
so that complete user journey'leri test edebilleyim.

## Acceptance Criteria

### AC-9.4.1: E2E Jest Configuration
**Given** E2E testleri için ayrı bir Jest konfigürasyonu gerekli
**When** `test/jest-e2e.json` dosyası oluşturulduğunda
**Then**:
- E2E-specific Jest configuration mevcut
- testRegex: `.e2e-spec.ts$` pattern ile sadece E2E testleri çalıştırılıyor
- transform: ts-jest ile TypeScript desteği aktif
- moduleNameMapper: Path aliases (@/) çalışıyor
- testEnvironment: node

### AC-9.4.2: Complete Auth Flow E2E Test
**Given** authentication flow complete user journey olarak test edilmeli
**When** `test/auth.e2e-spec.ts` dosyası oluşturulduğunda ve execute edildiğinde
**Then**:
- Test case: Complete auth flow journey
  - Step 1: POST /auth/register - User registration
  - Step 2: POST /auth/verify-email - Email verification with OTP
  - Step 3: POST /auth/login - User login, JWT token alınıyor
  - Step 4: GET /users/profile - Protected route access with JWT
  - Step 5: POST /auth/refresh - Token refresh
  - Step 6: POST /auth/logout - User logout
- Her step'te HTTP status code ve response body doğrulanıyor
- JWT token'lar successive request'lerde kullanılıyor
- Database state verification her critical step'te yapılıyor

### AC-9.4.3: Full Application Bootstrap for E2E
**Given** E2E testleri production-like environment'ta çalışmalı
**When** E2E test suite execute edildiğinde
**Then**:
- Full NestJS application bootstrap edilmiş (AppModule ile)
- Real HTTP requests via supertest
- Test database (`boilerplate_test`) ile bağlantı kurulmuş
- Tüm modules, guards, interceptors, pipes aktif
- ValidationPipe, ExceptionFilter gibi global config'ler uygulanmış
- `app.init()` ile application initialize edilmiş

### AC-9.4.4: Supertest HTTP Request Testing
**Given** E2E testleri real HTTP request'ler göndermeli
**When** supertest kullanılarak endpoint'ler test edildiğinde
**Then**:
- `request(app.getHttpServer())` pattern kullanılıyor
- HTTP method'lar: GET, POST, PATCH, DELETE test ediliyor
- Request headers set ediliyor (Authorization: Bearer <token>)
- Request body JSON format'ında gönderiliyor
- Response assertions: status code, body structure, data validation
- Cookie handling (refresh token cookie varsa)

### AC-9.4.5: Database Isolation and Seed Data
**Given** E2E testleri isolated environment'ta çalışmalı
**When** E2E test suite execute edildiğinde
**Then**:
- Test database kullanılıyor (production DB'ye dokunulmuyor)
- `beforeAll`: Database connection kurulmuş
- `beforeEach`: Database tables temizlenmiş (test/setup.ts kullanarak)
- Test scenario'ya özgü seed data oluşturuluyor (domain, user, permissions)
- `afterEach`: Test data cleanup yapılıyor
- `afterAll`: Database connection kapatılmış, app.close() çağrılmış

### AC-9.4.6: JWT Token Flow Validation
**Given** auth flow'da token management test edilmeli
**When** authentication journey execute edildiğinde
**Then**:
- Registration sonrası user database'de oluşmuş
- Login response'unda accessToken ve refreshToken dönüyor
- Access token ile protected route erişilebiliyor
- Refresh token ile yeni access token alınabiliyor
- Logout sonrası token'lar invalidate oluyor
- Invalid token ile protected route 401 dönüyor

### AC-9.4.7: Email Verification OTP Flow
**Given** email verification OTP flow test edilmeli
**When** auth E2E test'inde verification step execute edildiğinde
**Then**:
- User registration sonrası OTP database'de oluşmuş (otpVerification table)
- OTP verification request gönderildiğinde doğru OTP ile başarılı
- Yanlış OTP ile verification fail ediyor (400 veya 401)
- OTP verification sonrası user.emailVerified = true
- Expired OTP test edilmiş (optional, time-based varsa)

### AC-9.4.8: NPM Script for E2E Tests
**Given** E2E testleri kolayca çalıştırılabilmeli
**When** developer `npm run test:e2e` komutunu çalıştırdığında
**Then**:
- Jest E2E configuration (test/jest-e2e.json) ile testler execute ediliyor
- Sadece `.e2e-spec.ts` dosyaları çalışıyor
- Console output: Test results, durations, pass/fail status
- Exit code: 0 (success) veya 1 (failure)

### AC-9.4.9: Error Handling and Edge Cases
**Given** E2E testleri edge case'leri cover etmeli
**When** auth E2E test'i execute edildiğinde
**Then**:
- Test case: Register with existing email → 409 Conflict
- Test case: Login with wrong password → 401 Unauthorized
- Test case: Access protected route without token → 401 Unauthorized
- Test case: Refresh with invalid refresh token → 401 Unauthorized
- Test case: Email verification with invalid OTP → 400 Bad Request
- Her error case'te doğru HTTP status code ve error message dönüyor

## Tasks / Subtasks

- [x] Task 1: E2E Jest Configuration (AC: 9.4.1, 9.4.8)
    - [x] Subtask 1.1: `test/jest-e2e.json` dosyası oluştur
    - [x] Subtask 1.2: testRegex: `.e2e-spec.ts$` pattern ayarla
    - [x] Subtask 1.3: transform ve moduleNameMapper ayarları ekle
    - [x] Subtask 1.4: package.json'a `"test:e2e": "jest --config ./test/jest-e2e.json"` script ekle
    - [x] Subtask 1.5: Verify E2E config ile test discovery çalışıyor

- [x] Task 2: E2E Test Infrastructure Setup (AC: 9.4.3, 9.4.5)
    - [x] Subtask 2.1: `test/auth.e2e-spec.ts` dosyası oluştur
    - [x] Subtask 2.2: Import supertest (`import * as request from 'supertest'`)
    - [x] Subtask 2.3: Import test/setup.ts helpers (setupTestDatabase)
    - [x] Subtask 2.4: beforeAll: TestingModule.createTestingModule({ imports: [AppModule] })
    - [x] Subtask 2.5: beforeAll: app.init() - Full app bootstrap
    - [x] Subtask 2.6: beforeAll: Get PrismaService instance
    - [x] Subtask 2.7: beforeEach: Database cleanup (setupTestDatabase)
    - [x] Subtask 2.8: afterAll: app.close() - Cleanup

- [x] Task 3: Complete Auth Flow E2E Test - Registration (AC: 9.4.2, 9.4.9)
    - [x] Subtask 3.1: Test: "should complete full authentication journey"
    - [x] Subtask 3.2: Step 1 - POST /auth/register
    - Arrange: Valid user registration DTO (email, password, firstName, lastName, phone)
    - Act: POST /auth/register
    - Assert: Response 201, user object returned
    - Verify: User exists in database (emailVerified = false)
    - [x] Subtask 3.3: Test: "should return 409 when registering with existing email"
    - Arrange: Seed existing user
    - Act: POST /auth/register with same email
    - Assert: Response 409, ConflictException

- [x] Task 4: Complete Auth Flow E2E Test - Email Verification (AC: 9.4.2, 9.4.7, 9.4.9)
    - [x] Subtask 4.1: Step 2 - POST /auth/verify-email
    - Arrange: Extract email from registration response
    - Query: Get OTP from database (otpVerification table where email = user.email)
    - Act: POST /auth/verify-email with { email, otp }
    - Assert: Response 200, success message
    - Verify: Database'de user.emailVerified = true
    - [x] Subtask 4.2: Test: "should return 400 when verifying with invalid OTP"
    - Arrange: Registered user
    - Act: POST /auth/verify-email with wrong OTP
    - Assert: Response 400 or 401, error message

- [x] Task 5: Complete Auth Flow E2E Test - Login (AC: 9.4.2, 9.4.6, 9.4.9)
    - [x] Subtask 5.1: Step 3 - POST /auth/login
    - Arrange: Verified user credentials
    - Act: POST /auth/login with { email, password }
    - Assert: Response 200, accessToken ve refreshToken dönüyor
    - Store: accessToken ve refreshToken variables'a kaydet
    - [x] Subtask 5.2: Test: "should return 401 when login with wrong password"
    - Arrange: Registered user
    - Act: POST /auth/login with incorrect password
    - Assert: Response 401, error message

- [x] Task 6: Complete Auth Flow E2E Test - Protected Route Access (AC: 9.4.2, 9.4.4, 9.4.6, 9.4.9)
    - [x] Subtask 6.1: Step 4 - GET /users/profile (Protected route)
    - Arrange: accessToken from login
    - Act: GET /users/profile with Authorization: Bearer <accessToken>
    - Assert: Response 200, user profile returned
    - Verify: Returned user matches registered user
    - [x] Subtask 6.2: Test: "should return 401 when accessing protected route without token"
    - Act: GET /users/profile without Authorization header
    - Assert: Response 401, Unauthorized

- [x] Task 7: Complete Auth Flow E2E Test - Token Refresh (AC: 9.4.2, 9.4.6, 9.4.9)
    - [x] Subtask 7.1: Step 5 - POST /auth/refresh
    - Arrange: refreshToken from login
    - Act: POST /auth/refresh with { refreshToken } (or cookie if used)
    - Assert: Response 200, new accessToken returned
    - Store: New accessToken
    - [x] Subtask 7.2: Verify new accessToken works for protected route
    - Act: GET /users/profile with new accessToken
    - Assert: Response 200, profile returned
    - [x] Subtask 7.3: Test: "should return 401 when refreshing with invalid token"
    - Act: POST /auth/refresh with invalid refreshToken
    - Assert: Response 401, Unauthorized

- [x] Task 8: Complete Auth Flow E2E Test - Logout (AC: 9.4.2)
    - [x] Subtask 8.1: Step 6 - POST /auth/logout
    - Arrange: accessToken (authenticated user)
    - Act: POST /auth/logout with Authorization: Bearer <accessToken>
    - Assert: Response 200, success message
    - [x] Subtask 8.2: Verify token invalidated after logout
    - Act: GET /users/profile with logged-out accessToken
    - Assert: Response 401 (token should be invalid)

- [x] Task 9: Seed Data Helper for E2E (AC: 9.4.5)
    - [x] Subtask 9.1: Create helper function `seedTestDomain(prisma)` in test/setup.ts or separate file
    - Create test domain in database
    - Return domain object
    - [x] Subtask 9.2: Create helper function `seedTestPermissions(prisma)`
    - Seed minimal permissions needed for tests
    - Return permissions array
    - [x] Subtask 9.3: Use seed helpers in beforeEach or per-test as needed

- [x] Task 10: Run and Validate E2E Tests (AC: 9.4.8)
    - [x] Subtask 10.1: Execute `npm run test:e2e`
    - [x] Subtask 10.2: Verify all E2E tests pass
    - [x] Subtask 10.3: Check execution time (should be < 30 seconds per Tech Spec)
    - [x] Subtask 10.4: Verify test database isolation (no impact on production DB)
    - [x] Subtask 10.5: Run E2E tests multiple times to ensure deterministic results

## Dev Notes

### Architecture Patterns and Constraints

**E2E Test Pattern (from Tech Spec):**
- **Bootstrap (beforeAll):** Full NestJS application startup with all modules
- **Scenario:** Complete user journey from registration to logout
- **Assertions:** Verify HTTP status, response body, authentication state, database consistency
- **Shutdown (afterAll):** Application cleanup, close all connections
[Source: docs/tech-spec-epic-9.md#Workflows-and-Sequencing → E2E Test Workflow]

**Complete Auth Journey:**
```
Register → Verify Email → Login → Access Protected Route → Refresh Token → Logout
  201        200           200      200                      200             200
```

**Supertest Pattern:**
```typescript
const response = await request(app.getHttpServer())
  .post('/auth/register')
  .send({ email: 'test@e2e.com', password: 'Test123!', ... })
  .expect(201);

expect(response.body.success).toBe(true);
expect(response.body.data.email).toBe('test@e2e.com');
```
[Source: docs/tech-spec-epic-9.md#APIs-and-Interfaces → E2E Test Pattern]

**Full Application Bootstrap:**
```typescript
beforeAll(async () => {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule], // All modules loaded
  }).compile();

  app = moduleFixture.createNestApplication();
  // Apply global pipes, filters, guards (same as main.ts)
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  await app.init();
});
```
[Source: docs/tech-spec-epic-9.md#APIs-and-Interfaces → E2E Test Pattern]

**Test Database Strategy:**
- **Separate Database:** `boilerplate_test` (not production)
- **Clean State:** Truncate tables in beforeEach for test isolation
- **Seed Data:** Minimal per-test (domain, permissions, user)
[Source: docs/tech-spec-epic-9.md#Data-Models-and-Contracts → Test Database Schema]

**Performance Target:**
- E2E tests: < 30 seconds (complete auth flow)
- Full test suite: < 2 minutes
[Source: docs/tech-spec-epic-9.md#Non-Functional-Requirements → Performance]

### Source Tree Components to Touch

**Files to Create:**
```
test/jest-e2e.json                           # CREATE - E2E Jest configuration
test/auth.e2e-spec.ts                        # CREATE - Auth flow E2E test
```

**Files to Modify:**
```
package.json                                 # MODIFY - Add test:e2e script
```

**Files to Reference (Do Not Modify):**
```
src/app.module.ts                            # Full app module for bootstrap
src/modules/auth/auth.controller.ts          # Auth endpoints under test
src/modules/auth/auth.service.ts             # Auth service (real, not mocked)
src/modules/users/users.controller.ts        # Users profile endpoint
test/setup.ts                                # Database cleanup (from Story 9.3)
.env.test                                    # Test environment config (from Story 9.3)
```

### Learnings from Previous Story

**From Story 9-3: Integration Test Setup (Status: review)**

**Test Infrastructure Ready:**
1. **test/setup.ts Created:** Database cleanup helpers with proper FK order
2. **test/jest-setup.ts:** Jest setup to load .env.test
3. **.env.test:** Test environment configuration (DATABASE_URL, mock API keys)
4. **Guard Override Pattern:** JwtAuthGuard, PermissionsGuard overridden for test bypass

**Key Patterns from Story 9.3:**
1. **TestingModule Setup:** Using @nestjs/testing for full app bootstrap
2. **Database Cleanup:** `setupTestDatabase()` helper function for table truncation
3. **Turkish Phone Format:** +905XXXXXXXXX (10 digits after +905)
4. **Supertest Import:** `import * as request from 'supertest'` (default import)
5. **Response Format:** Controller returns flat objects (not wrapped in `data`)

**Performance Results from Story 9.3:**
- 12 integration tests: 1.262 seconds (0.105s per test)
- Well under 5s per test target
- E2E tests will be slower but should still be < 30s total

**Critical Difference for Story 9.4:**
- **Integration Tests (9.3):** Controller + Service + DB (guards overridden for speed)
- **E2E Tests (9.4):** Full application with ALL guards, pipes, filters active (production-like)
- **Scope:** Integration = individual endpoints, E2E = complete user journeys

**Files Created in Story 9.3 to Reuse:**
- `test/setup.ts` → Use `setupTestDatabase()` in E2E beforeEach
- `test/jest-setup.ts` → Same setup for .env.test loading
- `.env.test` → Same test environment config

**Guard Override Not Needed in E2E:**
- Integration tests override guards for speed (testing controller logic only)
- E2E tests should test WITH guards (real authentication flow)
- This means E2E tests must actually login and use real JWT tokens

**Review Findings from Story 9.3:**
- All 9 acceptance criteria validated
- Zero HIGH/MEDIUM issues
- Production-ready quality
- Pattern established can be followed for E2E tests

[Source: docs/stories/9-3-integration-test-setup.md#Dev-Agent-Record]
[Source: docs/stories/9-3-integration-test-setup.md#Learnings-from-Previous-Story]

### Project Structure Notes

**E2E Test File Organization:**
```
test/
├── jest-e2e.json                            # TO CREATE - E2E Jest config
├── auth.e2e-spec.ts                         # TO CREATE - Auth E2E test
├── setup.ts                                 # EXISTS - Database cleanup (Story 9.3)
├── jest-setup.ts                            # EXISTS - Load .env.test (Story 9.3)
└── utils/                                   # Unit test utilities (NOT used in E2E)
```

**E2E Test File Naming Convention:**
- **E2E Tests:** `*.e2e-spec.ts` (e.g., `auth.e2e-spec.ts`)
- Located in `test/` directory (not `src/`)
- Separate from unit tests (*.spec.ts) and integration tests (*.integration.spec.ts)
[Source: docs/tech-spec-epic-9.md#System-Architecture-Alignment]

**Test Execution Commands:**
```
npm run test:e2e                             # E2E tests only
npm test                                     # All unit tests
npm run test -- users.controller.integration # Specific integration test
```

**E2E vs Integration Test Placement:**
- **Integration Tests:** `src/modules/[module]/__tests__/*.integration.spec.ts`
- **E2E Tests:** `test/*.e2e-spec.ts`
- Rationale: E2E tests cross multiple modules, not module-specific

### Testing Standards Summary

**E2E Test Best Practices (from Tech Spec):**
1. **Full Application:** Bootstrap complete NestJS app with all modules
2. **Real Authentication:** No guard overrides, use actual JWT tokens
3. **Complete Journeys:** Test full user flows, not isolated endpoints
4. **Database Isolation:** Use test database, clean state between tests
5. **Supertest:** Real HTTP requests to app.getHttpServer()
6. **Performance:** < 30 seconds for complete auth flow

**E2E Test Setup Pattern:**
```typescript
describe('Authentication (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  let refreshToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = app.get<PrismaService>(PrismaService);

    // Apply same global config as main.ts
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));

    await app.init();
  });

  beforeEach(async () => {
    await setupTestDatabase(prisma);
    // Seed domain, permissions if needed
  });

  afterAll(async () => {
    await app.close();
  });

  it('should complete full authentication journey', async () => {
    // Step 1: Register
    const registerRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'e2e@test.com', password: 'Test123!', ... })
      .expect(201);

    // Step 2: Verify Email (get OTP from DB)
    const otp = await prisma.otpVerification.findFirst({
      where: { email: 'e2e@test.com' }
    });
    await request(app.getHttpServer())
      .post('/auth/verify-email')
      .send({ email: 'e2e@test.com', otp: otp.code })
      .expect(200);

    // Step 3: Login
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'e2e@test.com', password: 'Test123!' })
      .expect(200);

    accessToken = loginRes.body.data.accessToken;
    refreshToken = loginRes.body.data.refreshToken;

    // Step 4: Access Protected Route
    await request(app.getHttpServer())
      .get('/users/profile')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    // Step 5: Refresh Token
    const refreshRes = await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken })
      .expect(200);

    // Step 6: Logout
    await request(app.getHttpServer())
      .post('/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
  });
});
```
[Source: docs/tech-spec-epic-9.md#APIs-and-Interfaces → E2E Test Pattern]

**Database Cleanup:**
- Reuse `setupTestDatabase()` from test/setup.ts (created in Story 9.3)
- Clean tables in correct FK order: permissions → users → domains

**Seed Data Requirements:**
- Domain: Create test domain (OTP verification might need domain)
- Permissions: Seed minimal permissions if authorization tests needed
- User: Created during test flow (registration step)

### References

**Epic and Requirements:**
- [Source: docs/epics/epic-9-testing-infrastructure.md#Story-9.4] - Story definition and acceptance criteria
- [Source: docs/tech-spec-epic-9.md] - Epic 9 technical specification (E2E test patterns)

**Technical Specifications:**
- [Source: docs/tech-spec-epic-9.md#APIs-and-Interfaces → E2E Test Pattern] - E2E test setup and supertest usage
- [Source: docs/tech-spec-epic-9.md#Workflows-and-Sequencing → E2E Test Workflow] - Complete journey flow
- [Source: docs/tech-spec-epic-9.md#Data-Models-and-Contracts → E2E Configuration Schema] - jest-e2e.json structure

**Testing Strategy:**
- [Source: docs/tech-spec-epic-9.md#Test-Strategy-Summary → E2E Testing Strategy] - Focus on complete journeys
- [Source: docs/tech-spec-epic-9.md#Non-Functional-Requirements → Performance] - < 30s execution target

**Dependencies:**
- [Source: docs/stories/9-3-integration-test-setup.md] - Integration test setup (Story 9.3 completion)
- [Source: test/setup.ts] - Database cleanup helpers (Story 9.3)
- [Source: .env.test] - Test environment config (Story 9.3)

**Auth Module Under Test:**
- [Source: src/modules/auth/auth.controller.ts] - Auth endpoints (register, login, verify, refresh, logout)
- [Source: src/modules/auth/auth.service.ts] - Auth service implementation
- [Source: src/modules/users/users.controller.ts] - Users profile endpoint

## Dev Agent Record

### Completion Notes
**Completed:** 2025-11-10
**Definition of Done:** All acceptance criteria met, code reviewed, tests passing

### Context Reference

- [9-4-e2e-test-infrastructure.context.xml](9-4-e2e-test-infrastructure.context.xml)

### Agent Model Used

Claude Sonnet 4.5 (claude-sonnet-4-5-20250929)

### Debug Log References

### Completion Notes List

### File List

- **test/auth.e2e-spec.ts** - Complete auth journey E2E test (register → verify → login → profile → refresh)
  - Tests full authentication flow covering AC 9.4.2
  - Tests JWT token generation and validation (AC 9.4.6, 9.4.7)
  - Tests error scenarios (AC 9.4.9)
  - 6 test cases, all passing
