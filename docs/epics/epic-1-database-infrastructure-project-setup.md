# Epic 1: Database Infrastructure & Project Setup

**Goal:** Boilerplate projesinin temelini oluştur - NestJS projesi, Prisma ORM setup, dual database support (PostgreSQL/MongoDB), migration system

**Value Proposition:** Her yeni proje bu solid foundation üzerine kurulacak. Database seçimi esnekliği ve production-ready configuration ile başlangıç.

**Prerequisites:** Hiçbiri (ilk epic)

**Technical Stack:**
- NestJS v11.1.8 + TypeScript Strict
- Prisma ORM v6.16.0
- PostgreSQL v15+ veya MongoDB v6+
- Docker + Docker Compose

---

## Story 1.1: NestJS Project Initialization

**As a** developer,
**I want** NestJS projesini strict TypeScript ile oluşturmak,
**So that** type-safe, production-ready bir başlangıç noktam olsun.

**Acceptance Criteria:**
1. NestJS CLI ile proje oluşturulmuş (`@nestjs/cli@latest new boilerplate --strict`)
2. TypeScript strict mode aktif (tsconfig.json)
3. Temel folder structure hazır (src/, test/, scripts/)
4. ESLint + Prettier configured
5. Git initialized, .gitignore configured
6. Proje build ve run olabiliyor (`npm run start:dev`)

**Technical Notes:**
- NestJS starter temel module structure sağlar
- Strict mode: noImplicitAny, strictNullChecks, strictFunctionTypes
- Hot reload development için configured

**Dependencies:** Yok

---

## Story 1.2: Dual Prisma Schema Setup

**As a** developer,
**I want** hem PostgreSQL hem MongoDB için hazır Prisma schema dosyaları,
**So that** proje başlangıcında database seçimi yapabileyim.

**Acceptance Criteria:**
1. `prisma/schema-postgres.prisma` oluşturulmuş (PostgreSQL datasource + core models)
2. `prisma/schema-mongodb.prisma` oluşturulmuş (MongoDB datasource + core models)
3. Her iki schema da core entity'leri içeriyor: User, Permission, Role, RefreshToken, File
4. Schema'larda multi-tenancy support (domainID field everywhere)
5. Soft-delete pattern (deletedAt field)
6. Timestamp fields (createdAt, updatedAt)
7. `schema.prisma` gitignore'da (runtime'da generate edilecek)

**Technical Notes:**
- PostgreSQL: Relational models, foreign keys, indexes
- MongoDB: Document-based, no explicit relations, embedded documents
- Core models her iki schema'da aynı structure (farklı Prisma syntax)

**Dependencies:** Story 1.1

---

## Story 1.3: Interactive Database Selection Script

**As a** developer,
**I want** interactive bir setup script ile database seçmek,
**So that** proje initialize ederken PostgreSQL veya MongoDB arasında seçim yapabileyim.

**Acceptance Criteria:**
1. `scripts/setup.ts` oluşturulmuş
2. Script çalıştırıldığında kullanıcıya soruyor: "PostgreSQL or MongoDB?"
3. Seçime göre ilgili schema dosyasını `prisma/schema.prisma`'ya kopyalıyor
4. `.env` dosyasını template'ten oluşturuyor (DATABASE_URL placeholder)
5. Kullanıcıya next steps gösteriyor (DATABASE_URL doldur, migrate, seed)
6. `package.json`'a script eklendi: `"setup": "ts-node scripts/setup.ts"`

**Technical Notes:**
- Node.js inquirer library veya basit readline kullan
- File copy: fs.copyFileSync()
- .env.example'dan .env oluştur

**Dependencies:** Story 1.2

---

## Story 1.4: Prisma Service & Module

**As a** developer,
**I want** global bir PrismaService ve PrismaModule,
**So that** tüm module'ler database'e erişebilsin.

**Acceptance Criteria:**
1. `src/database/prisma.service.ts` oluşturulmuş (PrismaClient wrapper)
2. `src/database/prisma.module.ts` oluşturulmuş (Global module)
3. PrismaService, onModuleInit ve enableShutdownHooks implement ediyor
4. Connection pooling configured (min: 5, max: 20)
5. PrismaModule, AppModule'e import edilmiş
6. Service başarıyla inject edilebiliyor diğer module'lere

**Technical Notes:**
- PrismaService extends PrismaClient
- Global module decorator @Global() kullan
- Graceful shutdown hooks for database cleanup

**Dependencies:** Story 1.3

---

## Story 1.5: Database Migration System (PostgreSQL)

**As a** developer,
**I want** Prisma migration system kurulmuş,
**So that** schema değişikliklerini version control edebileyim.

**Acceptance Criteria:**
1. `prisma/migrations/` klasörü oluşturulmuş
2. İlk migration oluşturulmuş (`init` migration - core tables)
3. Migration commands `package.json`'a eklendi:
   - `"prisma:generate": "prisma generate"`
   - `"prisma:migrate": "prisma migrate dev"`
   - `"prisma:deploy": "prisma migrate deploy"`
4. Migration başarıyla çalışıyor (PostgreSQL için)
5. MongoDB için migration skip ediliyor (schemaless)
6. README'de migration workflow açıklanmış

**Technical Notes:**
- PostgreSQL: Migration SQL dosyaları otomatik generate
- MongoDB: Schema validation yok, migration skip
- Migration naming: timestamp_description

**Dependencies:** Story 1.4

---

## Story 1.6: Seed Data Script

**As a** developer,
**I want** initial seed data script,
**So that** development ve testing için sample data oluşturabileyim.

**Acceptance Criteria:**
1. `prisma/seed.ts` oluşturulmuş
2. Seed script şunları oluşturuyor:
   - Admin user (email: admin@boilerplate.com, password: Admin123!)
   - Test user (email: user@boilerplate.com, password: User123!)
   - Core permissions (USERS.CREATE, USERS.VIEW, USERS.UPDATE, USERS.DELETE)
   - Sample domain (domainID: default-domain-uuid)
3. `package.json`'a seed command eklendi: `"prisma:seed": "ts-node prisma/seed.ts"`
4. Seed script idempotent (tekrar çalıştırılabilir, duplicate hata vermiyor)
5. Seed çalıştırıldığında console'a success message basıyor

**Technical Notes:**
- Password hash: bcrypt kullan (10 rounds)
- UUID generation: uuid library veya crypto.randomUUID()
- Check existing before insert (upsert pattern)

**Dependencies:** Story 1.5

---

## Story 1.7: Environment Configuration & Validation

**As a** developer,
**I want** environment-based configuration ve validation,
**So that** missing/invalid config ile proje start etmesin.

**Acceptance Criteria:**
1. `src/config/` klasörü oluşturulmuş
2. Config dosyaları:
   - `app.config.ts` - PORT, NODE_ENV, API_PREFIX
   - `database.config.ts` - DATABASE_URL validation
   - `jwt.config.ts` - JWT_SECRET, expiration times
3. `.env.example` oluşturulmuş (tüm required vars ile)
4. Config validation Joi schema ile (startup'ta fail-fast)
5. AppModule'de ConfigModule.forRoot() configured
6. Invalid config ile start attempt descriptive error veriyor

**Technical Notes:**
- @nestjs/config package kullan
- Joi validation schema
- Fail-fast yaklaşımı: Invalid config = process exit

**Dependencies:** Story 1.6

---
