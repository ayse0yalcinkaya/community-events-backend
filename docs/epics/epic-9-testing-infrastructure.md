# Epic 9: Testing Infrastructure

**Goal:** Comprehensive test framework - unit, integration, E2E tests with coverage reporting

**Value Proposition:** %70+ coverage target, test-driven development support, regression prevention

**Prerequisites:** Epic 1 (App setup)

**Technical Stack:**
- Jest v29.x
- @nestjs/testing
- supertest (E2E)
- Coverage: Istanbul

---

## Story 9.1: Jest Configuration & Test Setup

**As a** developer,
**I want** Jest configured,
**So that** test yazabileyim.

**Acceptance Criteria:**
1. Jest configured (jest.config.js)
   - TypeScript support (ts-jest)
   - Coverage thresholds: 70% (global)
   - Test environment: node
   - Module path aliases (@src/, @common/, etc.)
2. `package.json` scripts:
   - `"test": "jest"`
   - `"test:watch": "jest --watch"`
   - `"test:cov": "jest --coverage"`
   - `"test:e2e": "jest --config ./test/jest-e2e.json"`
3. Coverage reports: `coverage/` folder
4. `.gitignore`: coverage/ eklendi
5. Sample test çalışıyor (app.controller.spec.ts)

**Technical Notes:**
- Jest preset: NestJS default
- Coverage reporters: text, lcov, html
- Module aliases: tsconfig paths'ten

**Dependencies:** Story 8.3

---

## Story 9.2: Unit Test Examples (Service Layer)

**As a** developer,
**I want** service layer unit test examples,
**So that** test pattern'ini öğrenebilleyim.

**Acceptance Criteria:**
1. `src/modules/users/__test__/users.service.spec.ts` oluşturulmuş
2. Test pattern: Arrange-Act-Assert
3. Mocking:
   - UsersRepository mock
   - I18nService mock
4. Test cases:
   - `should create user successfully`
   - `should throw NotFoundException when user not found`
   - `should throw ConflictException when email exists`
   - `should update user successfully`
   - `should soft-delete user`
5. Coverage: UsersService %80+
6. Fast execution (< 1s tüm service tests)

**Technical Notes:**
- TestingModule.createTestingModule() kullan
- jest.fn() for mocking
- expect().toHaveBeenCalledWith() for assertions

**Dependencies:** Story 9.1

---

## Story 9.3: Integration Test Setup

**As a** developer,
**I want** integration test setup,
**So that** API endpoint'leri test edebilleyim.

**Acceptance Criteria:**
1. `test/setup.ts` oluşturulmuş
   - Test database connection (separate DB: boilerplate_test)
   - beforeAll: Database connect
   - afterAll: Database disconnect
   - beforeEach: Clean tables (user, permission, etc.)
2. `src/modules/users/__test__/users.controller.integration.spec.ts` example
3. Test pattern:
   - Create test app (TestingModule)
   - Seed data (test user, permissions)
   - Test endpoint (request/response validation)
4. Test cases:
   - GET /users (list users, pagination)
   - POST /users (create user)
   - PATCH /users/:id (update user)
   - DELETE /users/:id (soft delete)
5. Database cleanup between tests

**Technical Notes:**
- Separate test DB (DATABASE_URL override)
- Prisma test instance
- Clean state between tests

**Dependencies:** Story 9.2

---

## Story 9.4: E2E Test Infrastructure

**As a** developer,
**I want** E2E test infrastructure,
**So that** complete user journey'leri test edebilleyim.

**Acceptance Criteria:**
1. `test/jest-e2e.json` configured
2. `test/auth.e2e-spec.ts` oluşturulmuş
3. E2E test: Complete auth flow
   - Register user
   - Verify email
   - Login
   - Access protected route
   - Refresh token
   - Logout
4. `supertest` kullanarak HTTP requests
5. Database isolation (test DB)
6. Seed data per test
7. Cleanup after test

**Technical Notes:**
- supertest: request(app.getHttpServer())
- Full application bootstrap
- Real HTTP requests (no mocking)

**Dependencies:** Story 9.3

---

## Story 9.5: Test Coverage Reporting

**As a** developer,
**I want** coverage reporting,
**So that** hangi kod'un test edilmediğini görebilleyim.

**Acceptance Criteria:**
1. Coverage reports generate ediliyor (`npm run test:cov`)
2. Coverage thresholds enforced:
   - Global: %70
   - Utilities: %100
   - Services: %80
3. Coverage formats:
   - Console summary
   - HTML report (coverage/index.html)
   - LCOV (CI/CD için)
4. CI/CD pipeline: Coverage threshold fail → build fail
5. README'de coverage badge (future, CI/CD'den)

**Technical Notes:**
- Jest coverage configuration
- Istanbul reporter
- Threshold enforcement: CI/CD'de --coverage flag

**Dependencies:** Story 9.4

---

## Story 9.6: Mock Factories

**As a** developer,
**I want** test mock factories,
**So that** test data kolayca oluşturabileyim.

**Acceptance Criteria:**
1. `test/factories/` klasörü oluşturulmuş
2. Factory files:
   - `user.factory.ts` → mockUser(), mockUserDto()
   - `permission.factory.ts` → mockPermission()
   - `file.factory.ts` → mockFile()
3. Factory functions:
   ```typescript
   export const mockUser = (overrides?: Partial<User>): User => ({
     id: uuid(),
     domainID: 'test-domain',
     email: 'test@example.com',
     ...overrides
   });
   ```
4. Usage in tests:
   ```typescript
   const user = mockUser({ email: 'custom@example.com' });
   ```

**Technical Notes:**
- Partial<T> for overrides
- Reasonable defaults
- UUID generation: uuid library

**Dependencies:** Story 9.5

---
