# Epic Technical Specification: Advanced Seeder Infrastructure

Date: 2025-11-11
Author: BMad
Epic ID: epic-13
Status: Draft

---

## Overview

Epic 13, hrsync-backend proven pattern üzerine comprehensive seeder architecture implement eder. Proje, NestJS + Prisma v6.16.0 native seeding özelliklerini kullanarak production-ready test data management sağlar. Amaç, geliştiricilerin tek komutla (`npm run seed`) database'i anlamlı test verileriyle doldurabilmesidir.

Seeder architecture, idempotent operations, factory pattern ve environment-based seeding destekler. Seed data'lar Turkish locale ile Faker.js kullanarak realistic olur (05xx phone format, Turkish names). Tüm seeder işlemleri transactional ve rollback-ready olarak design edilir.

## Objectives and Scope

**In-Scope:**
- Prisma native seeding implementation (`prisma/seed.ts`)
- Individual seeder classes with static seed() methods
- Factory pattern for realistic test data (Faker.js v8+)
- Idempotent seeding (upsert, createMany skipDuplicates)
- Environment-based data volume (dev/test/staging)
- Transaction support ($transaction) for data integrity
- Password hashing utility (bcrypt) for test users
- CI/CD integration (GitHub Actions, Docker)
- Test infrastructure (Jest, unit + integration tests)

**Out-of-Scope:**
- Dynamic module discovery (seeder registration by import only)
- Complex plugin systems or decorators
- GraphQL seeders (REST API focus)
- Microservice-specific seeding patterns

## System Architecture Alignment

Epic 13, mevcut Epic 1 (Database Infrastructure) üzerine kurulur:
- PrismaService (Epic 1.4) kullanarak database access
- Dual schema support (PostgreSQL/MongoDB) maintained
- User, Role, Permission entities (Epic 3) için seeding
- File entity (Epic 4) için sample data
- SMS entity (Epic 5) için OTP test data

Architecture pattern: Modular monolithic (tüm seeders prisma/ directory altında). No additional NestJS modules required - seeder'lar standalone TypeScript classes.

## Detailed Design

### Services and Modules

**Seeder Structure:**
```
prisma/
├── seed.ts                    # Main entry point
├── seeders/                   # Individual seeder classes
│   ├── role.seeder.ts         # Seed roles (admin, staff, user, guest)
│   ├── permission.seeder.ts   # Seed permissions from PRD
│   ├── user.seeder.ts         # Seed users with hashed passwords
│   ├── file.seeder.ts         # Seed S3 files (images, PDFs)
│   └── sms.seeder.ts          # Seed SMS logs (OTP codes)
├── factories/                 # Factory pattern for data generation
│   ├── user.factory.ts        # Generate user data
│   ├── role.factory.ts        # Generate role data
│   └── file.factory.ts        # Generate file metadata
└── utils/
    └── hash-password.ts       # Bcrypt password hashing
```

**Individual Seeder Classes:**
- Static `seed(prisma: PrismaClient)` method
- Dependency injection not required (PrismaClient passed as parameter)
- Console logging with ✓ success indicators
- Idempotent operations (safe to re-run)

### Data Models and Contracts

**Core Entities Seeded:**
1. **Role**: admin, staff, user, guest (upsert)
2. **Permission**: auth.users.*, files.*, documents.* (createMany skipDuplicates)
3. **User**:
   - Admin: admin@boilerplate.dev (password: Admin123!)
   - Staff: 5 users (Staff123!)
   - Regular: environment-specific count
4. **File**: sample images (JPG/PNG), PDFs, metadata
5. **SMS**: OTP codes, Turkish phone numbers (05xx format)

**Data Contracts:**
```typescript
// UserFactory output
type UserData = Prisma.UserCreateInput = {
  email: string;           // faker.internet.email()
  name: string;            // faker.person.fullName()
  phone: string;           // faker.phone.number('05## ### ## ##')
  password: string;        // hashed via bcrypt
  isActive: boolean;       // true
  role: {                  // relation
    connect: { name: string }
  }
}
```

### APIs and Interfaces

**No REST APIs - Seeder Only:**
- Seeder'lar sadece database'e yazar
- No HTTP endpoints
- No controllers or DTOs
- Standalone execution via `npx prisma db seed`

### Workflows and Sequencing

**Seeding Order (Dependencies):**
1. **RoleSeeder** → Creates base roles
2. **PermissionSeeder** → Creates permissions + assigns to roles
3. **UserSeeder** → Creates users (requires roles)
4. **FileSeeder** → Creates file metadata (standalone)
5. **SmsSeeder** → Creates SMS logs (standalone)

**Transaction Handling:**
```typescript
// Main seed.ts
async function main() {
  await prisma.$transaction(async (tx) => {
    await RoleSeeder.seed(tx);
    await PermissionSeeder.seed(tx);
    await UserSeeder.seed(tx);
    await FileSeeder.seed(tx);
  });
}
```

## Non-Functional Requirements

### Performance

- **Data Volume**:
  - Development: 50 users, 20 files
  - Test: 5 users, 3 files (fast CI)
  - Staging: 25 users, 10 files
- **Bulk Operations**: createMany() for multiple records
- **Skipping Duplicates**: skipDuplicates: true avoids conflicts
- **Target**: < 5 seconds for full seeding (test env)

### Security

- **Password Hashing**: bcrypt with saltRounds: 10
- **No Plain Text**: All passwords hashed before seeding
- **Environment Variables**: DATABASE_URL from .env
- **Idempotent**: upsert() prevents duplicate seeding

### Reliability/Availability

- **Transaction Support**: All-or-nothing seeding
- **Error Handling**: try-catch with process.exit(1) on failure
- **Prisma Disconnect**: $disconnect() in finally block
- **Retry Logic**: Not implemented (seeder is idempotent)

### Observability

- **Console Logging**: ✓ success indicators, ❌ errors
- **Progress Output**: "Seeding users...", "✓ Seeded 50 users"
- **No External Logging**: No Winston/Sentry integration
- **Metrics**: Seed duration, record counts (console only)

## Dependencies and Integrations

**Internal Dependencies:**
- Epic 1: PrismaService, PrismaClient
- Epic 3: User, Role, Permission entities
- Epic 4: File entity (S3 metadata)
- Epic 5: SMS entity (FONIVA pattern)

**External Dependencies:**
```
{
  "@faker-js/faker": "^8.0.0",
  "bcrypt": "^5.1.0",
  "ts-node": "^10.9.0"
}
```

**Prisma Integration:**
- Native seeding via `prisma.seed` in package.json
- Auto-runs after `prisma migrate dev`
- TypeScript support via ts-node

## Acceptance Criteria (Authoritative)

1. ✅ **Entry Point**: `prisma/seed.ts` with async main() function
2. ✅ **Individual Seeders**: Static seed() methods in separate files
3. ✅ **Idempotent**: upsert() for single records, createMany(skipDuplicates: true) for bulk
4. ✅ **Factory Pattern**: generate() and generateMany() methods
5. ✅ **Turkish Data**: Faker.js with Turkish phone format (05xx)
6. ✅ **Password Hashing**: bcrypt utility in prisma/utils/hash-password.ts
7. ✅ **Environment-Based**: NODE_ENV controls data volume
8. ✅ **Transaction Support**: $transaction() in main seed function
9. ✅ **CLI Commands**: npm run seed, npx prisma db seed
10. ✅ **CI/CD**: GitHub Actions auto-seed before tests
11. ✅ **Test Coverage**: Unit tests for seeders with beforeEach/afterEach cleanup
12. ✅ **Progress Logging**: Console output with ✓ emojis

## Traceability Mapping

| AC | Spec Section | Component/API | Test Strategy |
|----|--------------|---------------|---------------|
| AC1 | Detailed Design - Services | prisma/seed.ts | Manual: run npx prisma db seed |
| AC2 | Detailed Design - Services | prisma/seeders/* | Manual: check files exist |
| AC3 | NFR - Security | prisma/utils/hash-password.ts | Unit test: hashPassword() output |
| AC4 | Detailed Design - Data Models | prisma/factories/* | Unit test: generate() returns valid data |
| AC5 | NFR - Performance | Story 13.5 | E2E test: seed time < 5s |
| AC10 | Dependencies - External | package.json | Integration: CI runs seed |
| AC11 | NFR - Performance | test/* | Unit test: Jest coverage > 80% |

## Risks, Assumptions, Open Questions

**Risks:**
- R1: Faker.js Turkish locale may not support all data types → Mitigation: Use faker.internet.email(), faker.person.fullName()
- R2: Large dataset seeding may timeout → Mitigation: Environment-based volume limits, chunked processing

**Assumptions:**
- A1: Prisma v6.16.0 installed and configured
- A2: Database connection available (DATABASE_URL set)
- A3: User, Role, Permission entities already migrated

**Open Questions:**
- Q1: Should seed data include refresh tokens? → A: No, token generation separate
- Q2: How to handle seed data in production? → A: Never seed in production, only dev/test/staging

## Test Strategy Summary

**Test Levels:**
1. **Unit Tests**: Each seeder class and factory method
   - RoleSeeder.seed() creates expected roles
   - UserFactory.generate() returns valid UserCreateInput
   - hashPassword() returns bcrypt hash

2. **Integration Tests**: End-to-end seeding
   - Full seed execution (prisma/seed.ts)
   - Transaction rollback on failure
   - Idempotent re-seeding

3. **E2E Tests**: Application with seeded data
   - Login with seeded admin user
   - API calls with seeded permissions
   - File upload with seeded file metadata

**Test Framework:**
- Jest v29+ for unit/integration
- BeforeAll: Connect Prisma
- BeforeEach: Seed database
- AfterEach: Cleanup (deleteMany)
- AfterAll: Disconnect Prisma

**Coverage Target:**
- Seed logic: > 80% statement coverage
- All seeder classes tested
- Factory methods validated
- Error handling verified
