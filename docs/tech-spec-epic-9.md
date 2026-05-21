# Epic Technical Specification: Testing Infrastructure

Date: 2025-11-07
Author: BMad
Epic ID: 9
Status: Draft

---

## Overview

Epic 9, Boilerplate projesinin kalitesini garanti altına alan kapsamlı bir test altyapısının kurulumunu sağlar. Jest v30.x ve @nestjs/testing framework'leri kullanılarak unit, integration ve E2E testlerinin yazılabilmesi için gerekli tüm konfigürasyon ve pattern'leri içerir. Bu epic tamamlandığında, geliştiriciler %70+ coverage hedefine ulaşabilecek, test-driven development (TDD) yapabilecek ve regression prevention (gerileme önleme) mekanizmaları kurulmuş olacaktır.

hrsync-backend projesinden kanıtlanmış test pattern'leri (Arrange-Act-Assert, mock factory'ler, integration test setup) kullanılarak production-ready bir test infrastructure oluşturulur. Bu altyapı, PRD'de belirlenen NFR-3 (Kalite ve Bakım) standartlarının temelini oluşturur.

## Objectives and Scope

### In Scope

**✅ Jest Konfigürasyonu ve Test Altyapısı**
- Jest v30.x configuration (jest.config.js)
- TypeScript support via ts-jest
- Coverage thresholds: Global %70, Utilities %100, Services %80
- Test environment: node
- Module path aliases (@/, @common/, vb.)
- Package.json scripts: test, test:watch, test:cov, test:e2e
- Coverage reports: text, lcov, html formatında

**✅ Unit Test Pattern'leri ve Örnekler**
- Service layer unit test examples (UsersService, AuthService, vb.)
- Arrange-Act-Assert (AAA) test pattern
- Mock implementation pattern'leri (@nestjs/testing kullanımı)
- Repository, I18nService, EventEmitter mock'ları
- Test isolation ve cleanup best practices
- Fast execution (<1s for service tests)

**✅ Integration Test Setup**
- Test database setup (boilerplate_test)
- Database connection/disconnection lifecycle
- Table cleanup between tests (beforeEach/afterEach)
- Integration test examples (Controllers + Services + DB)
- Seed data management for integration tests
- Real database queries with test isolation

**✅ E2E Test Infrastructure**
- jest-e2e.json configuration
- supertest entegrasyonu
- Complete user journey tests (Auth flow örneği)
- Full application bootstrap for E2E
- Database isolation for E2E tests
- Real HTTP request testing

**✅ Coverage Reporting**
- Istanbul coverage reporter
- Coverage thresholds enforcement (CI/CD'de fail on threshold)
- Console summary, HTML reports, LCOV format
- Coverage per module visibility
- CI/CD pipeline integration

**✅ Mock Factory Pattern**
- test/factories/ klasör yapısı
- Factory functions: mockUser(), mockPermission(), mockFile()
- Partial<T> override pattern
- Reusable test data generators
- Consistent test data across all tests

### Out of Scope

**❌ Load Testing / Performance Testing:** Phase 4'te performance testing framework
**❌ Visual Regression Testing:** UI testing Epic 13'te (frontend varsa)
**❌ Contract Testing:** Microservice'e geçilirse implement edilecek 
**❌ Mutation Testing:** Advanced testing strategies Phase 5'te
**❌ CI/CD Pipeline:** Epic 11'de GitHub Actions ile test automation
**❌ Test Containers:** Docker-based test isolation Epic 10'da
**❌ Snapshot Testing:** Component testing ile birlikte (UI epic'inde)

## System Architecture Alignment

Bu epic, architecture dokümanında tanımlanan **Quality Assurance Strategy** ve **Testing Pyramid** yaklaşımının implementasyonudur:

**Test Pyramid Implementation:**
```
                 E2E Tests
              (Critical paths)
           /                 \
      Integration Tests
    (API + DB + Services)
   /                       \
     Unit Tests
  (Services, Utils, Guards)
```

**Testing Infrastructure Foundation:**
```
boilerplate/
├── test/
│   ├── jest-e2e.json              # E2E configuration (Epic 9)
│   ├── setup.ts                   # Integration test setup (Epic 9)
│   ├── auth.e2e-spec.ts           # E2E example (Epic 9)
│   └── factories/                 # Mock factories (Epic 9)
│       ├── user.factory.ts
│       ├── permission.factory.ts
│       └── file.factory.ts
├── src/
│   └── modules/
│       └── [module]/
│           └── __test__/          # Unit + Integration tests (Epic 9)
│               ├── [module].service.spec.ts
│               ├── [module].controller.integration.spec.ts
│               └── [module].repository.spec.ts
├── coverage/                      # Coverage reports (Epic 9)
└── jest.config.js                 # Jest configuration (Epic 9)
```

**ADR Alignment:**
- **ADR-008:** File/folder naming (`__test__/` folders, `.spec.ts` naming)
- **NFR-3:** Quality standards (%70+ coverage, TDD support)
- **NFR-4.12:** Testing patterns from hrsync-backend (AAA, mocking, cleanup)

## Detailed Design

### Services and Modules

| Component | Responsibility | Inputs | Outputs | Owner |
|-----------|---------------|---------|---------|-------|
| **jest.config.js** | Jest configuration, test environment setup, coverage thresholds | TypeScript files, test files | Test execution config | Root directory |
| **jest-e2e.json** | E2E test specific configuration | jest.config.js base | E2E test execution config | test/jest-e2e.json |
| **test/setup.ts** | Integration test database lifecycle | DATABASE_URL (test DB) | Connected test database | test/setup.ts |
| **test/factories/** | Mock data generators | Override parameters | Mock entities | test/factories/*.factory.ts |
| **TestingModule** | NestJS test module builder | Providers, imports, mocks | Isolated test app instance | @nestjs/testing |
| **supertest** | HTTP request testing | NestJS app instance | HTTP response assertions | E2E tests |
| **Coverage Reporter** | Test coverage tracking and reporting | Test execution results | Coverage reports (text, html, lcov) | Istanbul/Jest |

**Test Infrastructure Dependencies:**
```
jest.config.js
  └─> ts-jest (TypeScript compilation)
       └─> Test Files (*.spec.ts, *.integration-spec.ts)
            ├─> Unit Tests
            │    └─> Mock Dependencies (TestingModule)
            ├─> Integration Tests
            │    └─> test/setup.ts (Real DB)
            └─> E2E Tests
                 └─> supertest + Full App Bootstrap
```

**Test Execution Flow:**
1. Jest loads configuration (jest.config.js or jest-e2e.json)
2. ts-jest compiles TypeScript test files
3. Test files execute:
   - **Unit:** Mock dependencies via TestingModule
   - **Integration:** Connect to test DB via setup.ts
   - **E2E:** Bootstrap full app with supertest
4. Coverage reporter collects metrics
5. Results output to console/HTML/LCOV

### Data Models and Contracts

**Test Configuration Schema (jest.config.js):**
```typescript
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.(spec|integration-spec)\\.ts$',
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  transform: { '^.+\\.(t|j)s$': 'ts-jest' },
  collectCoverageFrom: ['src/**/*.(t|j)s'],
  coverageDirectory: 'coverage',
  testEnvironment: 'node',
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
  coverageThresholds: {
    global: { branches: 70, functions: 70, lines: 70, statements: 70 },
    './src/common/**/*.ts': { branches: 100, functions: 100, lines: 100, statements: 100 },
    './src/**/services/**/*.ts': { branches: 80, functions: 80, lines: 80, statements: 80 }
  }
};
```

**E2E Configuration Schema (jest-e2e.json):**
```json
{
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": ".",
  "testRegex": ".e2e-spec.ts$",
  "transform": { "^.+\\.(t|j)s$": "ts-jest" },
  "testEnvironment": "node",
  "moduleNameMapper": { "^@/(.*)$": "<rootDir>/src/$1" }
}
```

**Mock Factory Interface:**
```typescript
// test/factories/user.factory.ts
export const mockUser = (overrides?: Partial<User>): User => ({
  id: uuid(),
  domainID: 'test-domain-id',
  email: 'test@example.com',
  passwordHash: 'hashed-password',
  firstName: 'Test',
  lastName: 'User',
  phone: '+905551234567',
  isActive: true,
  emailVerified: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  ...overrides
});

// Usage in tests
const user = mockUser({ email: 'custom@test.com', isActive: false });
```

**Test Database Schema:**
- Separate test database: `boilerplate_test`
- Same schema as production (via Prisma migrations)
- Clean state between tests (truncate tables in beforeEach)
- Seed minimal data per test scenario

### APIs and Interfaces

**TestingModule API Pattern:**
```typescript
// Unit Test Setup
const module: TestingModule = await Test.createTestingModule({
  providers: [
    UsersService,
    {
      provide: UsersRepository,
      useValue: {
        findOne: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        remove: jest.fn(),
      },
    },
    {
      provide: I18nService,
      useValue: { t: jest.fn((key) => `translated.${key}`) },
    },
  ],
}).compile();

const service = module.get<UsersService>(UsersService);
const mockRepository = module.get(UsersRepository);
```

**Integration Test Pattern:**
```typescript
// Integration Test Setup with Real DB
describe('UsersController (Integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = app.get<PrismaService>(PrismaService);
    await app.init();
  });

  beforeEach(async () => {
    // Clean test data
    await prisma.user.deleteMany({});
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /users should create user', async () => {
    const response = await request(app.getHttpServer())
      .post('/users')
      .send({ email: 'test@example.com', ... })
      .expect(201);

    expect(response.body.data.email).toBe('test@example.com');
  });
});
```

**E2E Test Pattern:**
```typescript
// E2E Test with supertest
describe('Authentication (E2E)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/auth/register (POST) should register user', () => {
    return request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'new@test.com', password: 'Test123!' })
      .expect(201)
      .expect((res) => {
        expect(res.body.success).toBe(true);
        expect(res.body.data.email).toBe('new@test.com');
      });
  });
});
```

### Workflows and Sequencing

**Unit Test Workflow (AAA Pattern):**
```
1. ARRANGE: Setup test data and mocks
   - Create mock dependencies (repository, i18n, etc.)
   - Setup TestingModule with mocked providers
   - Define test input data
   - Configure mock return values

2. ACT: Execute the method under test
   - Call service/controller method
   - Pass test input data

3. ASSERT: Verify results
   - Check return value matches expected
   - Verify mock methods called with correct params
   - Assert exceptions thrown when expected
   - Validate business logic behavior

4. CLEANUP: Reset mocks (afterEach)
   - jest.clearAllMocks()
```

**Integration Test Workflow:**
```
1. SETUP: Database initialization (beforeAll)
   - Connect to test database
   - Run migrations if needed
   - Bootstrap NestJS application

2. PREPARE: Seed test data (beforeEach)
   - Truncate relevant tables
   - Insert minimal seed data for test scenario
   - Create test user/permissions/etc.

3. EXECUTE: Run integration test
   - Send HTTP request (if testing controller)
   - Or call service with real dependencies
   - Real database queries executed

4. VERIFY: Assert database state + response
   - Check HTTP response
   - Verify database records created/updated
   - Assert relations loaded correctly

5. CLEANUP: Clean test data (afterEach)
   - Truncate tables
   - Reset database state

6. TEARDOWN: Disconnect (afterAll)
   - Close database connections
   - Close NestJS application
```

**E2E Test Workflow:**
```
1. BOOTSTRAP: Full application startup (beforeAll)
   - Create NestJS application with all modules
   - Connect to test database
   - Initialize all services

2. SCENARIO: Complete user journey
   - Step 1: Register user (POST /auth/register)
   - Step 2: Verify email (POST /auth/verify-email)
   - Step 3: Login (POST /auth/login)
   - Step 4: Access protected route (GET /users/profile)
   - Step 5: Refresh token (POST /auth/refresh)
   - Step 6: Logout (POST /auth/logout)

3. ASSERTIONS: Verify each step
   - HTTP status codes (201, 200, etc.)
   - Response body structure
   - Authentication state changes
   - Database state consistency

4. SHUTDOWN: Application cleanup (afterAll)
   - Close all connections
   - Terminate application
```

**Coverage Report Generation Workflow:**
```
1. Test Execution: Jest runs all test files
2. Instrumentation: Istanbul instruments code during execution
3. Collection: Coverage data collected per file/function
4. Aggregation: Combine coverage from all tests
5. Threshold Check: Compare against configured thresholds
6. Report Generation:
   - Console: Summary to terminal
   - HTML: Interactive report → coverage/index.html
   - LCOV: CI/CD integration → coverage/lcov.info
7. Exit Code: Success (0) if thresholds met, Failure (1) if not
```

## Non-Functional Requirements

### Performance

**Test Execution Speed:**
- Unit tests: < 1 saniye (tüm service test suite)
- Integration tests: < 5 saniye per test suite
- E2E tests: < 30 saniye (complete auth flow)
- Full test suite: < 2 dakika (tüm unit + integration + E2E)

**Coverage Collection Performance:**
- Coverage overhead: Max %10 slower execution
- Coverage report generation: < 3 saniye
- Incremental coverage: Sadece değişen dosyalar için analiz

**Test Isolation:**
- Her test bağımsız çalışabilmeli (paralel execution support)
- Database cleanup: < 100ms per test
- Mock creation overhead: Negligible (< 1ms)

**Resource Constraints:**
- Test database: Max 100MB
- Coverage reports: Max 50MB (HTML + LCOV)
- Memory usage: < 512MB for full test suite

**Rationale:** PRD'de belirtilen "hızlı feedback döngüsü" için testlerin hızlı çalışması kritik. TDD yapılabilmesi için unit testler 1 saniyenin altında sonuç vermeli.

### Security

**Test Data Isolation:**
- Test database: Production'dan tamamen ayrı (`boilerplate_test`)
- Credential management: Test-specific credentials in .env.test
- Sensitive data: Mock data kullan, gerçek kullanıcı bilgisi yok
- API keys: Test environment keys, production keys ASLA test'te kullanılmamalı

**Test Environment Security:**
- `.env.test` dosyası `.gitignore`'da
- Test database erişimi: Sadece localhost'tan
- Test coverage reports: Sensitive paths filtrelenmeli
- CI/CD secrets: Encrypted environment variables

**Mock Security:**
- Mock password hashes: Gerçek hash algoritması kullanma (performance)
- Mock tokens: Fake JWT'ler, production secret ASLA kullanma
- Mock API responses: Gerçek API key'ler expose etme

**Test Code Quality:**
- Test dosyaları da ESLint/Prettier ile lint edilmeli
- Security-sensitive code review: Auth/permission testleri
- No hardcoded secrets in test files

**Rationale:** Test environment'ta security breach production'a etki etmemeli. Test data ile production data karışmamalı.

### Reliability/Availability

**Test Stability:**
- Test success rate: %99+ (flaky test oranı < %1)
- Deterministic tests: Aynı input → aynı output (no randomness)
- Idempotent tests: Birden fazla çalıştırılabilir
- Independent tests: Test execution order önemli olmamalı

**Database Reliability:**
- Test database availability: %100 (local PostgreSQL)
- Connection pooling: Min 2, Max 10 connections
- Cleanup guarantee: beforeEach/afterEach ile garanti
- Migration reliability: Test DB migrations production ile sync

**CI/CD Integration:**
- Test execution on every PR: Mandatory
- Coverage threshold enforcement: Build fail on < %70
- Test result caching: Değişmeyen testler cache'lenebilir
- Retry mechanism: Flaky test detection (max 1 retry)

**Error Handling:**
- Test failure reporting: Clear error messages
- Stack traces: Full context for debugging
- Database connection failures: Graceful error messages
- Timeout handling: Tests fail after 30s (configurable)

**Rationale:** Testler güvenilir olmalı ki developer'lar sonuçlara güvensin. Flaky testler güven kaybına neden olur.

### Observability

**Test Execution Visibility:**
- Console output: Real-time test progress
- Test names: Descriptive ("should create user successfully")
- Execution time: Her test için duration
- Failed test highlighting: Red/Green output

**Coverage Reporting:**
- Console summary: Overall coverage %
- HTML report: Interactive file-by-file view
  - Uncovered lines highlighted
  - Branch coverage visualization
  - Function coverage per module
- LCOV format: CI/CD integration (Codecov, Coveralls)
- Coverage trends: Track over time (CI/CD)

**Test Metrics:**
- Total tests: Count
- Passed/Failed/Skipped: Breakdown
- Execution time: Total + per suite
- Coverage per module: Detailed breakdown
- Threshold violations: List of files below threshold

**Debug Support:**
- Jest watch mode: Interactive test running
- Test filtering: Run specific tests (--testNamePattern)
- Debug mode: VS Code debugger integration
- Verbose output: --verbose flag for detailed logs

**Logging in Tests:**
- Service logs: Muted by default (log level: error)
- Test-specific logs: console.log for debugging
- Database queries: Optional query logging (--verbose)

**Rationale:** Developer'lar test başarısızlıklarını hızlıca debug edebilmeli. Coverage raporları hangi alanların eksik olduğunu göstermeli.

## Dependencies and Integrations

**NPM Dependencies (Already in package.json):**

| Package | Version | Purpose | Usage |
|---------|---------|---------|-------|
| **jest** | ^30.0.0 | Core test framework | Test runner, assertions, mocking |
| **@nestjs/testing** | ^11.0.1 | NestJS test utilities | TestingModule, test app bootstrap |
| **ts-jest** | ^29.2.5 | TypeScript preprocessor | Compile TS test files |
| **@types/jest** | ^30.0.0 | Jest type definitions | TypeScript support |
| **supertest** | ^7.0.0 | HTTP assertion library | E2E test HTTP requests |
| **@types/supertest** | ^6.0.2 | supertest types | TypeScript support |

**Implicit Dependencies (via NestJS):**
- **@nestjs/common**: Exception classes, decorators
- **@nestjs/core**: Module system, dependency injection
- **@prisma/client**: Database client for integration tests
- **class-transformer**: DTO transformation in tests
- **class-validator**: DTO validation in tests

**Testing Framework Dependencies:**
```
jest (Core)
  ├─> ts-jest (TypeScript compilation)
  ├─> @types/jest (Type definitions)
  └─> istanbul (Coverage - bundled with Jest)

@nestjs/testing
  ├─> @nestjs/common
  ├─> @nestjs/core
  └─> Testing utilities (TestingModule, Test)

supertest
  └─> Used for E2E HTTP testing
```

**Database Integration:**
- **PostgreSQL**: Test database `boilerplate_test`
- **Prisma**: Same schema as production
- **Connection**: Separate DATABASE_URL for tests
- **Migrations**: Run on test DB before first test

**CI/CD Integration Points:**
- **GitHub Actions**: Test execution in CI pipeline (Epic 11)
- **Coverage Services**: LCOV export for Codecov/Coveralls
- **Pre-commit Hooks**: Run tests before commit (Epic 12)

**Module Dependencies (Epic Order):**
- **Epic 1**: PrismaService, database infrastructure (required for integration tests)
- **Epic 2**: Auth services (required for auth E2E tests)
- **Epic 3**: Authorization services (required for permission tests)
- **Epic 7**: Logger, I18nService (mocked in tests)

**External Services (Mocked in Tests):**
- AWS S3: Mock S3 client responses
- SendGrid: Mock email sending
- Twilio/FONIVA: Mock SMS sending
- Firebase: Mock push notifications
- Sentry: Mock error tracking

**File System Dependencies:**
- `.gitignore`: Exclude coverage/ folder
- `tsconfig.json`: Module path aliases (@/)
- `package.json`: Test scripts configuration

**Version Compatibility:**
- Node.js: >= 18.x (same as production)
- PostgreSQL: >= 14.x (same as production)
- Jest: 30.x (stable, latest major)
- TypeScript: 5.x (same as production)

## Acceptance Criteria (Authoritative)

### AC-1: Jest Configuration Complete
**Given** Jest is configured for the project
**When** developer runs `npm test`
**Then** all test files matching `*.spec.ts` pattern are discovered and executed
**And** coverage reports are generated in `coverage/` folder
**And** coverage thresholds are enforced (global: 70%, services: 80%, common: 100%)

### AC-2: Unit Test Examples Implemented
**Given** unit test examples exist for service layer
**When** developer reviews `src/modules/users/__test__/users.service.spec.ts`
**Then** Arrange-Act-Assert pattern is demonstrated
**And** Repository, I18nService mocks are shown
**And** Test cases include: create success, not found, conflict, update, soft-delete
**And** Tests execute in < 1 second

### AC-3: Integration Test Infrastructure Working
**Given** integration test setup is configured
**When** developer runs integration tests
**Then** test database `boilerplate_test` is connected
**And** tables are cleaned between tests
**And** real HTTP requests are sent to controllers
**And** database state is verified after operations
**And** all connections are closed after tests

### AC-4: E2E Test Infrastructure Functional
**Given** E2E test example exists (`test/auth.e2e-spec.ts`)
**When** developer runs `npm run test:e2e`
**Then** full NestJS application bootstraps
**And** complete auth flow is tested (register → verify → login → access → refresh → logout)
**And** HTTP requests use supertest
**And** response status codes and body structure are validated

### AC-5: Coverage Reporting Configured
**Given** coverage reporting is enabled
**When** developer runs `npm run test:cov`
**Then** console shows coverage summary
**And** HTML report is generated at `coverage/index.html`
**And** LCOV report is generated at `coverage/lcov.info`
**And** tests fail if coverage < 70% globally

### AC-6: Mock Factory Pattern Established
**Given** mock factories exist in `test/factories/`
**When** developer uses `mockUser({ email: 'custom@test.com' })`
**Then** user object with overrides is returned
**And** default values are provided for all required fields
**And** factories exist for: User, Permission, File
**And** Partial<T> override pattern is demonstrated

### AC-7: Test Scripts Functional
**Given** package.json test scripts are configured
**When** developer runs various test commands
**Then** `npm test` runs all unit tests
**And** `npm run test:watch` runs tests in watch mode
**And** `npm run test:cov` runs with coverage
**And** `npm run test:e2e` runs E2E tests only

### AC-8: Documentation and Patterns Established
**Given** test examples and patterns exist
**When** new developer joins the team
**Then** they can follow existing test examples
**And** AAA pattern is documented in test files
**And** Mock setup patterns are clear
**And** Integration test lifecycle is documented

## Traceability Mapping

| Acceptance Criteria | Epic Story | Tech Spec Section | Test Approach |
|---------------------|------------|-------------------|---------------|
| **AC-1** | Story 9.1 (Jest Config) | Data Models → Test Configuration Schema | Verify jest.config.js exists, run `npm test` successfully |
| **AC-2** | Story 9.2 (Unit Tests) | APIs and Interfaces → TestingModule Pattern | Review test file structure, verify AAA pattern, run unit tests |
| **AC-3** | Story 9.3 (Integration) | APIs and Interfaces → Integration Test Pattern | Run integration tests, verify DB connection/cleanup |
| **AC-4** | Story 9.4 (E2E) | APIs and Interfaces → E2E Test Pattern | Run E2E tests, verify full app bootstrap |
| **AC-5** | Story 9.5 (Coverage) | Workflows → Coverage Report Generation | Run test:cov, verify reports generated |
| **AC-6** | Story 9.6 (Mock Factories) | Data Models → Mock Factory Interface | Use factory in test, verify override pattern |
| **AC-7** | Story 9.1 (Jest Config) | Dependencies → NPM Dependencies | Run all test scripts, verify execution |
| **AC-8** | All Stories | Overview, Detailed Design | Code review, developer interview |

**PRD Requirements Mapping:**

| PRD Requirement | Epic 9 Implementation | Verification |
|-----------------|----------------------|--------------|
| **NFR-3.1**: %70+ test coverage | Coverage thresholds in jest.config.js | `npm run test:cov` shows >= 70% |
| **NFR-3.2**: TDD support | Fast unit tests, watch mode | Run `npm run test:watch` |
| **NFR-3.3**: Regression prevention | Comprehensive test suite | All tests pass on CI/CD |
| **NFR-4.12**: Testing patterns | AAA, mocking, cleanup patterns | Review test files |

**Architecture Alignment:**

| Architecture Decision | Implementation | Location |
|-----------------------|----------------|----------|
| **Testing Pyramid** | Unit > Integration > E2E | Test file distribution |
| **Test Isolation** | beforeEach/afterEach cleanup | Integration tests |
| **Mock Strategy** | Factory pattern, TestingModule | test/factories/, unit tests |

## Risks, Assumptions, Open Questions

### Risks

**RISK-1: Flaky Tests**
- **Description:** Integration/E2E tests may fail intermittently due to timing issues, database state, or network
- **Impact:** High - Reduces developer trust, wastes CI/CD time
- **Mitigation:**
  - Ensure proper cleanup (beforeEach/afterEach)
  - Use deterministic test data (no random values)
  - Add timeouts where needed
  - Implement retry mechanism (max 1 retry) in CI/CD
- **Owner:** Developer implementing tests

**RISK-2: Test Database Performance**
- **Description:** Test database may become slow with large test suites
- **Impact:** Medium - Slower test execution, longer feedback loops
- **Mitigation:**
  - Keep integration tests focused (minimal data seeding)
  - Use unit tests for most scenarios
  - Optimize database cleanup (truncate vs delete)
  - Consider test database reset strategy
- **Owner:** Team lead

**RISK-3: Coverage Threshold Too High**
- **Description:** 70% global coverage may be hard to achieve initially
- **Impact:** Low - Build failures, developer frustration
- **Mitigation:**
  - Start with lower threshold (50%) and increase gradually
  - Exclude certain files (.spec.ts, main.ts) from coverage
  - Focus on critical paths first (auth, permissions)
- **Owner:** Tech lead

### Assumptions

**ASSUMPTION-1:** Developer Machine Setup
- All developers have PostgreSQL installed locally
- Test database `boilerplate_test` can be created
- If not, provide Docker Compose setup (Epic 10)

**ASSUMPTION-2:** Test Execution Time
- Full test suite < 2 minutes is achievable
- If exceeded, review test optimization strategies

**ASSUMPTION-3:** CI/CD Integration
- Epic 11 will handle GitHub Actions setup
- Test execution in CI/CD is out of scope for Epic 9

**ASSUMPTION-4:** Mock Strategy
- External services (AWS, SendGrid) can be mocked
- No integration tests against real external services
- Mocked responses are sufficient for testing

### Open Questions

**QUESTION-1:** Test Database Strategy
- Should we use Docker for test database (Epic 10)?
- Or assume local PostgreSQL installation?
- **Answer Needed By:** Before Story 9.3 implementation
- **Proposed:** Local PostgreSQL for Epic 9, Docker in Epic 10

**QUESTION-2:** Coverage Threshold Granularity
- Should we have different thresholds per module?
- Or stick with global + common + services?
- **Answer Needed By:** Before Story 9.1 implementation
- **Proposed:** Start simple (global 70%), refine later

**QUESTION-3:** E2E Test Scope
- How many E2E tests should we implement in Epic 9?
- Just auth flow, or also user management, file upload, etc.?
- **Answer Needed By:** Before Story 9.4 implementation
- **Proposed:** Only auth flow in Epic 9, expand in subsequent epics

**QUESTION-4:** Test Data Management
- Should we create a shared test data generator?
- Or let each test create its own data?
- **Answer Needed By:** Before Story 9.6 implementation
- **Proposed:** Factory pattern (Story 9.6) for reusable test data

## Test Strategy Summary

**Unit Testing Strategy:**
- **Focus:** Service layer, utility functions, guards
- **Coverage Target:** 80% for services, 100% for utilities
- **Approach:** Mock all dependencies, fast execution
- **Tools:** Jest, @nestjs/testing, TestingModule
- **Pattern:** Arrange-Act-Assert (AAA)

**Integration Testing Strategy:**
- **Focus:** Controller + Service + Database
- **Coverage Target:** Critical API endpoints
- **Approach:** Real database, clean state between tests
- **Tools:** Jest, supertest (controller tests), PrismaService
- **Pattern:** beforeAll (setup) → beforeEach (seed) → test → afterEach (cleanup) → afterAll (teardown)

**E2E Testing Strategy:**
- **Focus:** Complete user journeys
- **Coverage Target:** Critical paths (auth, user CRUD)
- **Approach:** Full application bootstrap, real HTTP requests
- **Tools:** Jest, supertest, full NestJS app
- **Pattern:** Complete flows (register → verify → login → access → logout)

**Coverage Strategy:**
- **Global Threshold:** 70% (branches, functions, lines, statements)
- **Service Threshold:** 80% (critical business logic)
- **Utility Threshold:** 100% (shared code must be well-tested)
- **Reporting:** Console summary + HTML report + LCOV (CI/CD)
- **Enforcement:** Tests fail on CI/CD if thresholds not met

**Test Execution Strategy:**
- **Local Development:** `npm run test:watch` (unit tests, fast feedback)
- **Pre-commit:** Run unit tests (via hooks in Epic 12)
- **CI/CD:** Run full suite (unit + integration + E2E) on every PR
- **Coverage Reporting:** Upload LCOV to Codecov/Coveralls (Epic 11)

**Mock Strategy:**
- **External Services:** Always mock (AWS S3, SendGrid, FONIVA, Firebase, Sentry)
- **Database:** Mock in unit tests, real in integration/E2E
- **Time/Dates:** Mock for deterministic tests (jest.useFakeTimers())
- **Factory Pattern:** Reusable mock generators in test/factories/

**Test Maintenance:**
- **Update Tests First:** TDD approach (Red → Green → Refactor)
- **Keep Tests Simple:** One assertion per test when possible
- **Descriptive Names:** "should create user successfully" not "test1"
- **Review Tests:** Code review includes test quality check
