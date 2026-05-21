# Epic Technical Specification: Database Infrastructure & Project Setup

Date: 2025-11-04
Author: BMad
Epic ID: 1
Status: Draft

---

## Overview

Epic 1, Boilerplate projesinin tüm temelini oluşturan kritik bir epic'tir. NestJS framework'ü üzerine kurulu, Prisma ORM ile hem PostgreSQL hem MongoDB destekleyen, production-ready bir database infrastructure ve project setup sağlar. Bu epic tamamlandığında, geliştiriciler tek bir interactive script ile database seçimi yapabilecek ve hemen geliştirmeye başlayabilecek durumda bir proje yapısına sahip olacaklar.

PRD'de tanımlanan "1 hafta → 1 gün" setup hedefinin omurgası bu epic ile sağlanır. hrsync-backend'den kanıtlanmış migration, seeding ve multi-tenancy pattern'leri kullanılarak, production-ready bir başlangıç noktası oluşturulur.

## Objectives and Scope

### In Scope

**✅ NestJS Project Setup**
- NestJS CLI v11.1.8 ile strict TypeScript projesi
- ESLint + Prettier konfigürasyonu
- Git initialization ve .gitignore yapılandırması
- Hot reload development ortamı

**✅ Dual Database Schema**
- PostgreSQL için complete Prisma schema (`schema-postgres.prisma`)
- MongoDB için complete Prisma schema (`schema-mongodb.prisma`)
- Core entities: User, Permission, Role, RefreshToken, OTPVerification, File
- Multi-tenancy support: domainID field tüm entity'lerde
- Soft-delete pattern: deletedAt field

**✅ Interactive Database Selection**
- Setup script: PostgreSQL veya MongoDB seçimi
- Otomatik schema kopyalama (`schema.prisma` generation)
- `.env` dosyası template'ten oluşturma
- Next steps guidance

**✅ Prisma Service & Module**
- PrismaService (PrismaClient wrapper)
- Global PrismaModule
- Connection pooling (min: 5, max: 20)
- Graceful shutdown hooks

**✅ Database Migration System**
- Prisma migrations (PostgreSQL için)
- Initial migration: core tables
- Migration CLI commands
- MongoDB: Migration skip (schemaless)

**✅ Seed Data Script**
- Admin user (admin@boilerplate.com)
- Test user (user@boilerplate.com)
- Core permissions (USERS.CREATE, VIEW, UPDATE, DELETE)
- Sample domain (default-domain-uuid)
- Idempotent seed (tekrar çalıştırılabilir)

**✅ Environment Configuration**
- Config module setup (@nestjs/config)
- Joi validation schema
- Environment files: .env.example, .env.development
- Fail-fast configuration validation

### Out of Scope

**❌ Authentication Logic:** Epic 2'de implement edilecek (JWT, refresh tokens)
**❌ Permission Guards:** Epic 3'te implement edilecek (authorization logic)
**❌ File Storage Setup:** Epic 4'te (AWS S3 configuration)
**❌ Production Dockerfile:** Epic 11'de (CI/CD & Deployment)
**❌ Redis Setup:** Phase 2'de (caching infrastructure)
**❌ Test Infrastructure:** Epic 9'da (Jest setup, coverage)

## System Architecture Alignment

Bu epic, architecture dokümanında tanımlanan **Modular Monolith** yaklaşımının temelini oluşturur:

**Project Structure Foundation:**
```
boilerplate/
├── src/
│   ├── main.ts                    # Bootstrap (Epic 1)
│   ├── app.module.ts              # Root module (Epic 1)
│   ├── database/                  # PrismaService (Epic 1)
│   │   ├── prisma.service.ts
│   │   └── prisma.module.ts
│   ├── config/                    # Config modules (Epic 1)
│   │   ├── app.config.ts
│   │   ├── database.config.ts
│   │   └── jwt.config.ts
│   └── common/                    # Shared utilities (Epic 7)
├── prisma/
│   ├── schema-postgres.prisma     # Epic 1
│   ├── schema-mongodb.prisma      # Epic 1
│   ├── schema.prisma              # Generated (Epic 1)
│   ├── migrations/                # PostgreSQL migrations (Epic 1)
│   └── seed.ts                    # Seed data (Epic 1)
└── scripts/
    └── setup.ts                   # Interactive setup (Epic 1)
```

**ADR Alignment:**
- **ADR-001:** Interactive CLI script implementasyonu (Story 1.3)
- **ADR-003:** Multi-tenancy domainID pattern (tüm schema'larda)
- **ADR-008:** File/folder naming conventions (kebab-case)

## Detailed Design

### Services and Modules

| Service/Module | Responsibility | Inputs | Outputs | Owner |
|---------------|---------------|---------|---------|-------|
| **PrismaService** | PrismaClient wrapper, connection management, lifecycle hooks | DATABASE_URL (env) | Prisma client instance | database/prisma.service.ts |
| **PrismaModule** | Global module providing PrismaService | - | Exported PrismaService | database/prisma.module.ts |
| **ConfigModule** | Environment variable validation and management | .env files | Validated config object | config/*.config.ts |
| **AppModule** | Root module, imports all feature modules | - | NestJS application | src/app.module.ts |
| **Setup Script** | Interactive database selection | User input (PostgreSQL/MongoDB) | schema.prisma, .env | scripts/setup.ts |
| **Seed Script** | Initial data seeding | - | Admin user, permissions, test data | prisma/seed.ts |

**Service Dependencies:**
```
AppModule
  └─> ConfigModule (validates environment)
       └─> PrismaModule (database connection)
            └─> PrismaService (all data access)
```

### Data Models and Contracts

**Core Entities (PostgreSQL Schema):**

```prisma
// User Management
model User {
  id            String    @id @default(uuid())
  domainID      String    @db.Uuid
  email         String    @unique
  passwordHash  String
  firstName     String
  lastName      String
  phone         String?
  isActive      Boolean   @default(true)
  emailVerified Boolean   @default(false)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  deletedAt     DateTime?

  refreshTokens     RefreshToken[]
  otpVerifications  OTPVerification[]
  userPermissions   UserPermission[]
  userRoles         UserRole[]
  files             File[]

  @@index([domainID])
  @@index([email])
  @@map("users")
}

// Authentication
model RefreshToken {
  id        String   @id @default(uuid())
  userID    String   @db.Uuid
  domainID  String   @db.Uuid
  token     String   @unique
  expiresAt DateTime
  createdAt DateTime @default(now())

  user User @relation(fields: [userID], references: [id], onDelete: Cascade)

  @@index([userID])
  @@index([token])
  @@map("refresh_tokens")
}

model OTPVerification {
  id        String   @id @default(uuid())
  userID    String   @db.Uuid
  domainID  String   @db.Uuid
  code      String
  type      String   // 'EMAIL' | 'SMS'
  expiresAt DateTime
  attempts  Int      @default(0)
  verified  Boolean  @default(false)
  createdAt DateTime @default(now())

  user User @relation(fields: [userID], references: [id], onDelete: Cascade)

  @@index([userID, code])
  @@map("otp_verifications")
}

// Permissions (RBAC)
model Permission {
  id          String   @id @default(uuid())
  module      String
  action      String
  description String?
  createdAt   DateTime @default(now())

  userPermissions UserPermission[]
  rolePermissions RolePermission[]

  @@unique([module, action])
  @@map("permissions")
}

model Role {
  id        String   @id @default(uuid())
  domainID  String   @db.Uuid
  name      String
  createdAt DateTime @default(now())

  userRoles       UserRole[]
  rolePermissions RolePermission[]

  @@unique([domainID, name])
  @@map("roles")
}

model UserPermission {
  id           String @id @default(uuid())
  userID       String @db.Uuid
  permissionID String @db.Uuid
  domainID     String @db.Uuid

  user       User       @relation(fields: [userID], references: [id], onDelete: Cascade)
  permission Permission @relation(fields: [permissionID], references: [id], onDelete: Cascade)

  @@unique([userID, permissionID, domainID])
  @@index([userID])
  @@map("user_permissions")
}

model UserRole {
  id       String @id @default(uuid())
  userID   String @db.Uuid
  roleID   String @db.Uuid
  domainID String @db.Uuid

  user User @relation(fields: [userID], references: [id], onDelete: Cascade)
  role Role @relation(fields: [roleID], references: [id], onDelete: Cascade)

  @@unique([userID, roleID, domainID])
  @@index([userID])
  @@map("user_roles")
}

model RolePermission {
  id           String @id @default(uuid())
  roleID       String @db.Uuid
  permissionID String @db.Uuid

  role       Role       @relation(fields: [roleID], references: [id], onDelete: Cascade)
  permission Permission @relation(fields: [permissionID], references: [id], onDelete: Cascade)

  @@unique([roleID, permissionID])
  @@map("role_permissions")
}

// File Management
model File {
  id           String    @id @default(uuid())
  domainID     String    @db.Uuid
  userID       String    @db.Uuid
  filename     String
  originalName String
  mimeType     String
  size         Int
  s3Key        String
  s3Bucket     String
  createdAt    DateTime  @default(now())
  deletedAt    DateTime?

  user User @relation(fields: [userID], references: [id])

  @@index([domainID, userID])
  @@index([s3Key])
  @@map("files")
}

// Notifications
model Notification {
  id        String   @id @default(uuid())
  domainID  String   @db.Uuid
  userID    String   @db.Uuid
  type      String
  channel   String   // 'EMAIL' | 'SMS' | 'PUSH'
  title     String?
  message   String
  data      Json?
  sent      Boolean  @default(false)
  sentAt    DateTime?
  createdAt DateTime @default(now())

  @@index([domainID, userID])
  @@map("notifications")
}

model NotificationPreference {
  id        String  @id @default(uuid())
  domainID  String  @db.Uuid
  userID    String  @db.Uuid
  channel   String  // 'EMAIL' | 'SMS' | 'PUSH'
  enabled   Boolean @default(true)

  @@unique([domainID, userID, channel])
  @@map("notification_preferences")
}
```

**MongoDB Schema Differences:**
- No explicit foreign key constraints
- Embedded documents or ObjectID references
- Same field structure, different Prisma generators

**Multi-Tenancy Pattern:**
- Every entity has `domainID: String @db.Uuid`
- All queries must filter by domainID (enforced by Prisma middleware in future stories)
- Indexes on domainID for query performance

**Soft-Delete Pattern:**
- `deletedAt?: DateTime?` field on entities that can be deleted
- Queries filter `deletedAt IS NULL` to exclude deleted records
- Hard delete only for cleanup jobs

### APIs and Interfaces

**No HTTP APIs in Epic 1** - Bu epic sadece infrastructure kurar, API endpoint'leri Epic 2+ ile gelir.

**PrismaService Interface:**
```typescript
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor();

  async onModuleInit(): Promise<void>;
  // Connects to database on module initialization

  async enableShutdownHooks(app: INestApplication): Promise<void>;
  // Registers shutdown hooks for graceful connection closing

  async onModuleDestroy(): Promise<void>;
  // Disconnects from database on module destroy
}
```

**Setup Script Interface:**
```typescript
// scripts/setup.ts
interface SetupOptions {
  database: 'postgres' | 'mongodb';
}

async function runSetup(): Promise<void>;
// Prompts user for database selection
// Copies appropriate schema file to schema.prisma
// Generates .env from template
// Shows next steps guidance
```

**Seed Script Interface:**
```typescript
// prisma/seed.ts
async function seed(): Promise<void>;
// Creates admin user
// Creates test user
// Creates core permissions
// Creates sample domain
// Idempotent (upsert pattern)
```

### Workflows and Sequencing

**Story Implementation Sequence:**

```
Story 1.1: NestJS Project Initialization
  ↓
Story 1.2: Dual Prisma Schema Setup
  ↓ (schemas exist)
Story 1.3: Interactive Database Selection Script
  ↓ (schema.prisma generated, .env created)
Story 1.4: Prisma Service & Module
  ↓ (PrismaService available for use)
Story 1.5: Database Migration System
  ↓ (migrations created and applied - PostgreSQL only)
Story 1.6: Seed Data Script
  ↓ (initial data in database)
Story 1.7: Environment Configuration & Validation
  ✓ (complete infrastructure ready)
```

**Database Setup Flow:**

```
Developer
  ↓
1. npm install
  ↓
2. npm run setup (Story 1.3)
  ├─> Prompt: PostgreSQL or MongoDB?
  ├─> Copy schema-{selection}.prisma → schema.prisma
  ├─> Generate .env from .env.example
  └─> Show next steps
  ↓
3. Edit .env (set DATABASE_URL)
  ↓
4. npx prisma generate (Story 1.4)
  ↓
5. npx prisma migrate dev (Story 1.5, PostgreSQL only)
  ↓
6. npm run prisma:seed (Story 1.6)
  ↓
7. npm run start:dev
  ✓ Application running
```

**Configuration Loading Sequence:**

```
Application Start
  ↓
1. Load .env file
  ↓
2. ConfigModule.forRoot() (Story 1.7)
  ├─> Load app.config.ts
  ├─> Load database.config.ts
  ├─> Load jwt.config.ts
  └─> Validate with Joi schema
  ↓ (validation success)
3. PrismaModule initialization (Story 1.4)
  ├─> PrismaService.onModuleInit()
  ├─> Connect to database
  └─> Enable shutdown hooks
  ↓ (connection success)
4. AppModule initialization
  ↓
✓ Application ready
```

## Non-Functional Requirements

### Performance

**Database Connection Performance:**
- **Target:** Initial connection < 2 seconds
- **Implementation:** Prisma connection pooling (min: 5, max: 20 connections)
- **Validation:** Health check endpoint (`/health/db`) measures connection time

**Migration Execution Performance:**
- **Target:** Initial migration < 10 seconds for core schema
- **Note:** PostgreSQL only, MongoDB is schemaless (no migrations)

**Seed Data Performance:**
- **Target:** Seed script execution < 5 seconds
- **Data:** Admin user + test user + 4 core permissions + 1 domain
- **Optimization:** Batch inserts where possible

### Security

**Environment Variable Security:**
- **Requirement:** No secrets in version control
- `.env` files gitignored (only `.env.example` committed)
- `.env.example` contains placeholders, not real values
- **Validation:** Joi schema enforces required variables

**Password Security (Seed Data):**
- **Requirement:** Passwords bcrypt hashed with 10+ rounds
- **Implementation:** bcrypt.hash(password, 10)
- **Test passwords:** Clearly documented, changed in production forks

**Database Connection Security:**
- **Requirement:** Connection string from environment variable only
- **PostgreSQL:** `postgresql://user:pass@host:5432/db`
- **MongoDB:** `mongodb://user:pass@host:27017/db`
- **Production:** SSL/TLS enforced (connection string parameter)

**Multi-Tenancy Security:**
- **Requirement:** domainID field on all tables
- **Implementation:** Every entity has domainID UUID field
- **Validation:** Prisma middleware (future story) warns if query lacks domainID

### Reliability/Availability

**Graceful Shutdown:**
- **Requirement:** Pending database operations complete before shutdown
- **Implementation:** `onModuleDestroy()` hook disconnects cleanly
- **Timeout:** 30 seconds for pending operations

**Database Connection Resilience:**
- **Requirement:** Auto-reconnect on connection loss
- **Implementation:** Prisma automatic reconnection (default behavior)
- **Logging:** Connection errors logged to Winston

**Migration Rollback:**
- **Requirement:** Failed migrations rollback automatically
- **Implementation:** Prisma transactional migrations
- **Manual Rollback:** `prisma migrate resolve --rolled-back <migration_name>`

**Seed Idempotency:**
- **Requirement:** Seed script can run multiple times safely
- **Implementation:** Upsert pattern (check if exists before insert)
- **No Duplicates:** Email uniqueness prevents duplicate users

### Observability

**Logging:**
- **Requirement:** Structured JSON logs for database operations
- **Implementation:** Winston logger (Epic 7 will configure)
- **Events Logged:**
  - Database connection established
  - Database connection lost
  - Migration executed
  - Seed completed
  - Configuration validation errors

**Health Checks:**
- **Endpoint:** `GET /health/db` (Epic 7 will implement)
- **Check:** Execute `SELECT 1` query
- **Response Time:** Measured and returned
- **Status Codes:** 200 (healthy), 503 (unhealthy)

**Configuration Visibility:**
- **Requirement:** Log configuration on startup (exclude secrets)
- **Implementation:**
  ```typescript
  logger.info('Configuration loaded', {
    nodeEnv: config.NODE_ENV,
    port: config.PORT,
    database: config.DATABASE_URL.split('@')[1] // Hide credentials
  });
  ```

## Dependencies and Integrations

### External Dependencies

**NPM Packages:**

```json
{
  "dependencies": {
    "@nestjs/common": "^11.1.8",
    "@nestjs/core": "^11.1.8",
    "@nestjs/config": "^3.2.0",
    "@nestjs/platform-express": "^11.1.8",
    "@prisma/client": "^6.16.0",
    "bcrypt": "^5.1.1",
    "joi": "^17.13.0",
    "reflect-metadata": "^0.2.0",
    "rxjs": "^7.8.1",
    "uuid": "^9.0.1"
  },
  "devDependencies": {
    "@nestjs/cli": "^11.0.10",
    "@types/bcrypt": "^5.0.2",
    "@types/node": "^20.11.0",
    "@types/uuid": "^9.0.8",
    "prisma": "^6.16.0",
    "ts-node": "^10.9.2",
    "typescript": "^5.3.3"
  }
}
```

**Database Servers:**
- **PostgreSQL 15+:** Port 5432, required for PostgreSQL option
- **MongoDB 6+:** Port 27017, required for MongoDB option
- **Note:** Only one database server needed (selected during setup)

**Development Tools:**
- **Node.js 20.x LTS:** Runtime environment
- **npm 10+:** Package manager
- **Git:** Version control

### Integration Points

**Story 1.1 → Story 1.2:**
- NestJS project structure created → Prisma schemas added to `/prisma` folder

**Story 1.2 → Story 1.3:**
- Dual schemas exist → Setup script copies selected schema to `schema.prisma`

**Story 1.3 → Story 1.4:**
- `schema.prisma` exists → PrismaService can generate Prisma client

**Story 1.4 → Story 1.5:**
- PrismaService configured → Migrations can be executed

**Story 1.5 → Story 1.6:**
- Database tables exist → Seed data can be inserted

**Story 1.6 → Story 1.7:**
- Seed data in place → Configuration module validates DATABASE_URL connection

**Epic 1 → Epic 2:**
- PrismaService available → Auth module can query User table
- Seed data includes users → Auth can test login

**Epic 1 → Epic 3:**
- Permission entity exists → Permission system can query and assign
- Seed data includes permissions → Permission guards can validate

**Epic 1 → All Future Epics:**
- PrismaService globally available → All modules can access database
- Multi-tenancy structure ready → domainID filtering enforced

### Dependency Manifest Analysis

**package.json Analysis:**
```bash
# Core framework
@nestjs/common: ^11.1.8          # NestJS core functionality
@nestjs/core: ^11.1.8            # Dependency injection, modules
@nestjs/config: ^3.2.0           # Environment config management
@nestjs/platform-express: ^11.1.8 # HTTP server (Express)

# Database
@prisma/client: ^6.16.0          # Prisma ORM client
prisma: ^6.16.0                  # Prisma CLI (migrations, generate)

# Security
bcrypt: ^5.1.1                   # Password hashing (10+ rounds)

# Utilities
joi: ^17.13.0                    # Schema validation (config)
uuid: ^9.0.1                     # UUID generation (IDs)
reflect-metadata: ^0.2.0         # Decorator metadata (NestJS requirement)
rxjs: ^7.8.1                     # Reactive programming (NestJS requirement)

# Development
@nestjs/cli: ^11.0.10            # Project scaffolding, build
ts-node: ^10.9.2                 # TypeScript execution (scripts)
typescript: ^5.3.3               # TypeScript compiler (strict mode)
```

**No Known Vulnerabilities:** All packages verified on 2025-11-04

## Acceptance Criteria (Authoritative)

### Story 1.1: NestJS Project Initialization

✅ **AC-1.1.1:** NestJS CLI ile proje oluşturulmuş (`npx @nestjs/cli@latest new boilerplate --strict`)
✅ **AC-1.1.2:** TypeScript strict mode aktif (`tsconfig.json` içinde `strict: true`)
✅ **AC-1.1.3:** Temel folder structure hazır (`src/`, `test/`, `scripts/`)
✅ **AC-1.1.4:** ESLint + Prettier configured (`.eslintrc.js`, `.prettierrc` mevcut)
✅ **AC-1.1.5:** Git initialized, `.gitignore` configured (node_modules, dist ignored)
✅ **AC-1.1.6:** Proje build ve run olabiliyor (`npm run start:dev` çalışıyor, port 3000'de dinliyor)

### Story 1.2: Dual Prisma Schema Setup

✅ **AC-1.2.1:** `prisma/schema-postgres.prisma` oluşturulmuş (PostgreSQL datasource + core models)
✅ **AC-1.2.2:** `prisma/schema-mongodb.prisma` oluşturulmuş (MongoDB datasource + core models)
✅ **AC-1.2.3:** Her iki schema da core entity'leri içeriyor: User, Permission, Role, RefreshToken, OTPVerification, File, Notification, NotificationPreference
✅ **AC-1.2.4:** Schema'larda multi-tenancy support (domainID field her entity'de UUID type)
✅ **AC-1.2.5:** Soft-delete pattern (deletedAt field DateTime? type)
✅ **AC-1.2.6:** Timestamp fields (createdAt @default(now()), updatedAt @updatedAt)
✅ **AC-1.2.7:** `schema.prisma` gitignore'da (runtime'da generate edilecek)

### Story 1.3: Interactive Database Selection Script

✅ **AC-1.3.1:** `scripts/setup.ts` oluşturulmuş (executable with ts-node)
✅ **AC-1.3.2:** Script çalıştırıldığında kullanıcıya soruyor: "PostgreSQL or MongoDB?"
✅ **AC-1.3.3:** Seçime göre ilgili schema dosyasını `prisma/schema.prisma`'ya kopyalıyor (fs.copyFileSync)
✅ **AC-1.3.4:** `.env` dosyasını `.env.example`'dan oluşturuyor (DATABASE_URL placeholder)
✅ **AC-1.3.5:** Kullanıcıya next steps gösteriyor (console output: 1. Fill DATABASE_URL, 2. Run prisma generate, 3. Run prisma migrate dev, 4. Run seed)
✅ **AC-1.3.6:** `package.json`'a script eklendi: `"setup": "ts-node scripts/setup.ts"`

### Story 1.4: Prisma Service & Module

✅ **AC-1.4.1:** `src/database/prisma.service.ts` oluşturulmuş (PrismaClient extend eden class)
✅ **AC-1.4.2:** `src/database/prisma.module.ts` oluşturulmuş (Global module with @Global() decorator)
✅ **AC-1.4.3:** PrismaService, `onModuleInit` ve `enableShutdownHooks` implement ediyor
✅ **AC-1.4.4:** Connection pooling configured (`datasource db` içinde connection_limit veya prisma default 10 connection)
✅ **AC-1.4.5:** PrismaModule, AppModule'e import edilmiş (`app.module.ts` imports array'inde)
✅ **AC-1.4.6:** Service başarıyla inject edilebiliyor (test: constructor injection çalışıyor)

### Story 1.5: Database Migration System (PostgreSQL)

✅ **AC-1.5.1:** `prisma/migrations/` klasörü oluşturulmuş (gitignore'dan exclude)
✅ **AC-1.5.2:** İlk migration oluşturulmuş (`init` migration - tüm core tables SQL)
✅ **AC-1.5.3:** Migration commands `package.json`'a eklendi:
  - `"prisma:generate": "prisma generate"`
  - `"prisma:migrate": "prisma migrate dev"`
  - `"prisma:deploy": "prisma migrate deploy"`
✅ **AC-1.5.4:** Migration başarıyla çalışıyor (PostgreSQL database'de tüm tablolar oluşuyor)
✅ **AC-1.5.5:** MongoDB için migration skip ediliyor (schema.prisma MongoDB ise migrate command hata vermiyor veya warning veriyor)
✅ **AC-1.5.6:** README'de migration workflow açıklanmış (adımlar documented)

### Story 1.6: Seed Data Script

✅ **AC-1.6.1:** `prisma/seed.ts` oluşturulmuş (async function seed())
✅ **AC-1.6.2:** Seed script şunları oluşturuyor:
  - Admin user (email: admin@boilerplate.com, password: Admin123!, bcrypt hashed)
  - Test user (email: user@boilerplate.com, password: User123!, bcrypt hashed)
  - Core permissions (USERS.CREATE, USERS.VIEW, USERS.UPDATE, USERS.DELETE)
  - Sample domain (domainID: uuid(), name: "Default Domain")
✅ **AC-1.6.3:** `package.json`'a seed command eklendi: `"prisma:seed": "ts-node prisma/seed.ts"`
✅ **AC-1.6.4:** Seed script idempotent (tekrar çalıştırılabilir, duplicate hata vermiyor - upsert pattern)
✅ **AC-1.6.5:** Seed çalıştırıldığında console'a success message basıyor ("✅ Seed completed: X users, Y permissions")

### Story 1.7: Environment Configuration & Validation

✅ **AC-1.7.1:** `src/config/` klasörü oluşturulmuş
✅ **AC-1.7.2:** Config dosyaları oluşturulmuş:
  - `app.config.ts` (PORT, NODE_ENV, API_PREFIX export ediyor)
  - `database.config.ts` (DATABASE_URL validation export ediyor)
  - `jwt.config.ts` (JWT_SECRET, JWT_ACCESS_EXPIRATION, JWT_REFRESH_EXPIRATION export ediyor)
✅ **AC-1.7.3:** `.env.example` oluşturulmuş (tüm required variables placeholder ile)
✅ **AC-1.7.4:** Config validation Joi schema ile (ConfigModule.forRoot içinde validationSchema)
✅ **AC-1.7.5:** AppModule'de ConfigModule.forRoot() configured (isGlobal: true, validationSchema: envSchema)
✅ **AC-1.7.6:** Invalid config ile start attempt descriptive error veriyor (Joi validation error message console'da, process exit)

## Traceability Mapping

| Acceptance Criteria | Spec Section | Component/API | Test Strategy |
|---------------------|--------------|---------------|---------------|
| AC-1.1.1 - NestJS CLI project creation | Workflows → Story 1.1 | NestJS CLI | Manual verification: Check project structure |
| AC-1.1.2 - TypeScript strict mode | Data Models | tsconfig.json | Automated: Build check (tsc --noEmit) |
| AC-1.1.6 - Project runs | Services → AppModule | main.ts, app.module.ts | E2E: Start server, check http://localhost:3000 |
| AC-1.2.1 - PostgreSQL schema | Data Models | prisma/schema-postgres.prisma | Manual: File exists, contains core entities |
| AC-1.2.4 - Multi-tenancy domainID | Data Models | All entity models | Automated: Unit test validates domainID field exists |
| AC-1.3.2 - Interactive prompt | Workflows → Setup Flow | scripts/setup.ts | Manual: Run script, verify prompt appears |
| AC-1.3.3 - Schema copy | Workflows → Setup Flow | scripts/setup.ts | Integration: Check schema.prisma created after selection |
| AC-1.4.1 - PrismaService creation | Services → PrismaService | database/prisma.service.ts | Unit: Service instantiates, extends PrismaClient |
| AC-1.4.5 - PrismaModule import | Services → PrismaModule | app.module.ts | Integration: AppModule imports PrismaModule |
| AC-1.4.6 - Service injection | Services → PrismaModule | any service constructor | Integration: Inject PrismaService in test module |
| AC-1.5.2 - Initial migration | Workflows → Migration Flow | prisma/migrations/*/migration.sql | Manual: Check migration SQL file, table creation |
| AC-1.5.4 - Migration execution | Workflows → Migration Flow | prisma migrate dev | E2E: Run migration, verify tables in database |
| AC-1.6.2 - Seed data creation | Services → Seed Script | prisma/seed.ts | Integration: Run seed, query users and permissions |
| AC-1.6.4 - Seed idempotency | NFR → Reliability | prisma/seed.ts | Integration: Run seed twice, verify no duplicates |
| AC-1.7.4 - Config validation | Services → ConfigModule | Joi schema | Unit: Pass invalid config, expect validation error |
| AC-1.7.6 - Invalid config error | NFR → Reliability | config/*.config.ts | E2E: Start app with missing env var, expect exit |

## Risks, Assumptions, Open Questions

### Risks

🔴 **Risk-1: Database Selection Lock-In**
- **Description:** Seçilen database (PostgreSQL vs MongoDB) sonradan değiştirilemez, fork gerektirir
- **Mitigation:** Setup script açıkça uyarı verir: "Bu seçim kalıcıdır, sonradan değiştiremezsiniz"
- **Severity:** Medium (boilerplate use case için kabul edilebilir)

🟡 **Risk-2: Prisma Version Compatibility**
- **Description:** Prisma v6.16.0 henüz çok yeni (2025-11-04 verified), breaking changes olabilir
- **Mitigation:** Dependency lock (package-lock.json), version update stratejisi documented
- **Severity:** Low (Prisma stable API)

🟡 **Risk-3: Migration Conflicts (PostgreSQL)**
- **Description:** Concurrent migration execution birden fazla developer tarafından conflict yaratabilir
- **Mitigation:** Git workflow (migration'lar version control'de), team communication
- **Severity:** Low (standard migration best practices)

🟢 **Risk-4: Seed Data Security**
- **Description:** Seed script'te hardcoded passwords (Admin123!, User123!) güvenlik riski
- **Mitigation:** README'de açıkça belirtilir: "Production fork'ta seed passwords değiştirilmeli"
- **Severity:** Very Low (development only concern)

### Assumptions

✅ **Assumption-1:** Developer'ların PostgreSQL veya MongoDB kurulu olduğunu varsayıyoruz
- **Validation:** Setup script database connection test etmez, developer DATABASE_URL'yi doğru doldurmalı
- **Documentation:** README'de prerequisite olarak belirtilecek

✅ **Assumption-2:** Developer'lar NestJS ve Prisma temel bilgisine sahip
- **Validation:** Boilerplate expert-level developer'lar için, basic tutorial içermez
- **Documentation:** External links (NestJS docs, Prisma docs) sağlanacak

✅ **Assumption-3:** Multi-tenancy tüm future module'lerde kullanılacak
- **Validation:** domainID pattern Epic 1'de kurulur, Epic 2+ consistency check edilir
- **Enforcement:** Architecture document ve coding standards enforce eder

✅ **Assumption-4:** Docker kullanımı optional (local development için)
- **Validation:** Epic 10'da Docker setup opsiyonel olarak eklenecek
- **Impact:** Epic 1 Docker gerektirmez, native installation yeterli

### Open Questions

❓ **Question-1:** MongoDB seçildiğinde migration system tamamen skip mi edilecek yoksa custom migration pattern mi kullanılacak?
- **Current Decision:** Skip (schemaless olduğu için migration gerekmez)
- **Future Review:** Phase 2'de MongoDB migration tool değerlendirilebilir

❓ **Question-2:** Seed data domainID değeri sabit mi olacak yoksa her seed run'da yeni UUID mi?
- **Current Decision:** Sabit UUID (idempotency için) - `default-domain-uuid` gibi predictable
- **Rationale:** Test ve development consistency için sabit ID daha iyi

❓ **Question-3:** ConfigModule validation fail olduğunda process exit mi yoksa default values mı kullanılsın?
- **Current Decision:** Process exit (fail-fast approach) - production'da missing config kabul edilemez
- **Rationale:** Sessiz hata yerine açık failure tercih edilir

❓ **Question-4:** Prisma Client generation timing - setup script içinde mi yoksa developer manuel mi çalıştıracak?
- **Current Decision:** Manuel (`npx prisma generate`) - setup script sadece schema kopyalar
- **Rationale:** Developer control, troubleshooting kolaylığı

## Test Strategy Summary

### Unit Tests (Story 1.4, 1.6, 1.7)

**PrismaService Tests:**
```typescript
describe('PrismaService', () => {
  it('should extend PrismaClient', () => {
    expect(service).toBeInstanceOf(PrismaClient);
  });

  it('should connect on module init', async () => {
    await service.onModuleInit();
    expect(service.$connect).toHaveBeenCalled();
  });

  it('should disconnect on module destroy', async () => {
    await service.onModuleDestroy();
    expect(service.$disconnect).toHaveBeenCalled();
  });
});
```

**ConfigModule Tests:**
```typescript
describe('ConfigModule Validation', () => {
  it('should throw error when DATABASE_URL missing', () => {
    delete process.env.DATABASE_URL;
    expect(() => validateEnv()).toThrow('DATABASE_URL is required');
  });

  it('should accept valid configuration', () => {
    const config = validateEnv();
    expect(config.PORT).toBe(3000);
    expect(config.NODE_ENV).toBe('development');
  });
});
```

**Seed Script Tests:**
```typescript
describe('Seed Script', () => {
  it('should create admin user', async () => {
    await seed();
    const admin = await prisma.user.findUnique({
      where: { email: 'admin@boilerplate.com' }
    });
    expect(admin).toBeDefined();
    expect(admin.firstName).toBe('Admin');
  });

  it('should be idempotent (no duplicates on re-run)', async () => {
    await seed();
    await seed(); // Run twice
    const users = await prisma.user.findMany();
    expect(users).toHaveLength(2); // Only admin + test user
  });
});
```

### Integration Tests (Story 1.5, 1.6)

**Migration Tests:**
```typescript
describe('Prisma Migrations', () => {
  it('should create all core tables', async () => {
    await execAsync('npx prisma migrate deploy');

    const tables = await prisma.$queryRaw`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
    `;

    expect(tables).toContain({ table_name: 'users' });
    expect(tables).toContain({ table_name: 'permissions' });
    expect(tables).toContain({ table_name: 'refresh_tokens' });
  });
});
```

**Database Connection Tests:**
```typescript
describe('Database Connection', () => {
  it('should connect to PostgreSQL', async () => {
    await prisma.$connect();
    const result = await prisma.$queryRaw`SELECT 1 as value`;
    expect(result[0].value).toBe(1);
  });

  it('should handle connection error gracefully', async () => {
    process.env.DATABASE_URL = 'invalid-url';
    await expect(prisma.$connect()).rejects.toThrow();
  });
});
```

### E2E Tests (Story 1.1, 1.7)

**Application Bootstrap Test:**
```typescript
describe('Application Bootstrap (E2E)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('should bootstrap successfully', () => {
    expect(app).toBeDefined();
  });

  it('should listen on configured port', async () => {
    const server = app.getHttpServer();
    const address = server.address();
    expect(address.port).toBe(3000);
  });

  afterAll(async () => {
    await app.close();
  });
});
```

**Setup Script E2E Test:**
```typescript
describe('Setup Script (E2E)', () => {
  it('should copy PostgreSQL schema when selected', async () => {
    // Mock user input: PostgreSQL
    jest.spyOn(inquirer, 'prompt').mockResolvedValue({ database: 'postgres' });

    await runSetup();

    const schema = fs.readFileSync('prisma/schema.prisma', 'utf-8');
    expect(schema).toContain('provider = "postgresql"');
    expect(fs.existsSync('.env')).toBe(true);
  });

  it('should copy MongoDB schema when selected', async () => {
    // Mock user input: MongoDB
    jest.spyOn(inquirer, 'prompt').mockResolvedValue({ database: 'mongodb' });

    await runSetup();

    const schema = fs.readFileSync('prisma/schema.prisma', 'utf-8');
    expect(schema).toContain('provider = "mongodb"');
  });
});
```

### Manual Testing Checklist

**Story 1.3 - Setup Script:**
- [ ] Run `npm run setup`
- [ ] Select PostgreSQL → verify schema.prisma copied, .env created
- [ ] Delete files, re-run with MongoDB → verify MongoDB schema copied
- [ ] Check .env contains DATABASE_URL placeholder

**Story 1.5 - Migrations:**
- [ ] Run `npx prisma migrate dev --name init`
- [ ] Check `prisma/migrations/` folder created with SQL file
- [ ] Inspect SQL file: verify all tables (users, permissions, etc.)
- [ ] Connect to PostgreSQL, verify tables exist

**Story 1.6 - Seed:**
- [ ] Run `npm run prisma:seed`
- [ ] Check console output: "✅ Seed completed..."
- [ ] Query database: verify admin@boilerplate.com exists
- [ ] Run seed again → no duplicate errors

**Story 1.7 - Config Validation:**
- [ ] Remove DATABASE_URL from .env
- [ ] Run `npm run start:dev` → expect error message and exit
- [ ] Restore DATABASE_URL → app starts successfully

---

✅ **Epic 1 Tech Spec Complete**
📋 **Status:** Ready for Implementation
🚀 **Next Step:** Run `/bmad:bmm:workflows:create-story` to draft Story 1.1
