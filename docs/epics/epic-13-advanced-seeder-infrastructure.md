# Epic 13: Advanced Seeder Infrastructure (NestJS + Prisma Best Practices)

**Goal:** hrsync-backend proven pattern üzerine comprehensive seeder architecture - Prisma native seeders, factory pattern, environment-based seeding, idempotent operations, CI/CD integration

**Value Proposition:** Geliştiriciler tek komutla (`npm run seed` veya `npx prisma db seed`) production-ready test data ile database'i doldurabilsin. Seed data'lar idempotent, environment-specific ve factory pattern ile organized olsun. Seed işlemleri transactional ve rollback-ready olsun.

**Prerequisites:** Epic 1 (Database Infrastructure) - PrismaService, dual schema setup

**Technical Stack:**
- **Prisma Native Seeding**: `prisma/seed.ts` entry point, individual seeder classes
- **Module Organization**: `prisma/seeders/` directory, static seed() methods
- **Faker.js v8+**: Realistic Turkish test data (names, emails, phones)
- **Idempotent Operations**: upsert(), createMany(skipDuplicates: true)
- **Transaction Support**: $transaction() for data integrity
- **Environment-Based**: NODE_ENV controlled seeding (dev/test/staging)
- **Module Source Referansı**: hrsync-backend `prisma/seeders/` pattern (Epic 6 benzeri)

---

## Story 13.1: Prisma Native Seeding Entry Point

**As a** developer,
**I want** main `prisma/seed.ts` entry point ve organized seeder structure,
**So that** `npx prisma db seed` komutu çalıştığında tüm seeders sırayla çalışsın.

**Acceptance Criteria:**
1. `prisma/seed.ts` oluşturulmuş - main entry point
2. `prisma/seeders/` directory oluşturulmuş
3. Individual seeder files: `user.seeder.ts`, `role.seeder.ts`, `permission.seeder.ts`, `file.seeder.ts`
4. Main seed function: async main() with PrismaClient instance
5. Seeder execution order (dependencies respected):
   - RoleSeeder.seed(prisma) → PermissionSeeder.seed(prisma) → UserSeeder.seed(prisma)
6. Progress logging: console.log() with ✓ checkmarks
7. Error handling: try-catch, process.exit(1) on failure
8. Prisma disconnect: $disconnect() in finally block

**Technical Implementation:**
```typescript
// prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import { UserSeeder } from './seeders/user.seeder';
import { RoleSeeder } from './seeders/role.seeder';
import { PermissionSeeder } from './seeders/permission.seeder';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Start seeding...');

  // Order matters - seed dependencies first
  console.log('Seeding roles...');
  await RoleSeeder.seed(prisma);
  console.log('✓ Roles seeded');

  console.log('Seeding permissions...');
  await PermissionSeeder.seed(prisma);
  console.log('✓ Permissions seeded');

  console.log('Seeding users...');
  await UserSeeder.seed(prisma);
  console.log('✓ Users seeded');

  console.log('🎉 Seeding finished.');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

**Dependencies:** Story 1.4 (PrismaService ready)

---

## Story 13.2: Model Factory Pattern & Faker Integration

**As a** developer,
**I want** realistic test data generate edebilmek için factory pattern,
**So that** Faker.js ile Turkish test data kolayca oluşturabileyim.

**Acceptance Criteria:**
1. `prisma/factories/` directory oluşturulmuş
2. Factory classes: `user.factory.ts`, `role.factory.ts`, `permission.factory.ts`, `file.factory.ts`
3. Static methods: `generate()` (single), `generateMany(count)` (bulk)
4. Faker.js v8+ integration: Turkish locale for realistic data
5. Type safety: Prisma types kullanarak generic factory
6. Override support: factory(overrides) → merge defaults + overrides
7. Realistic data: Turkish names, emails, phone numbers (05xx), addresses

**Technical Implementation:**
```typescript
// prisma/factories/user.factory.ts
import { faker } from '@faker-js/faker';
import { Prisma } from '@prisma/client';

type UserData = Prisma.UserCreateInput;

export class UserFactory {
  static generate(overrides: Partial<UserData> = {}): UserData {
    const defaultData: UserData = {
      email: faker.internet.email(),
      name: faker.person.fullName(),
      phone: faker.phone.number('05## ### ## ##'), // Turkish format
      password: 'hashedpassword123', // Pre-hashed for testing
      isActive: true,
      createdAt: faker.date.past(),
      // Add relations if needed
      role: overrides.role || {
        connect: { name: 'user' }
      },
    };

    return { ...defaultData, ...overrides };
  }

  static generateMany(count: number, overrides: Partial<UserData> = {}): UserData[] {
    return Array.from({ length: count }, () => this.generate(overrides));
  }
}

// prisma/seeders/user.seeder.ts
import { PrismaClient } from '@prisma/client';
import { UserFactory } from '../factories/user.factory';
import { hashPassword } from '../utils/hash-password';

export class UserSeeder {
  static async seed(prisma: PrismaClient) {
    console.log('Seeding users...');

    // Create admin user with upsert (idempotent)
    await prisma.user.upsert({
      where: { email: 'admin@boilerplate.dev' },
      update: {},
      create: {
        email: 'admin@boilerplate.dev',
        name: 'System Administrator',
        phone: '05551234567',
        password: await hashPassword('Admin123!'),
        isActive: true,
        role: {
          connect: { name: 'admin' }
        }
      },
    });

    // Create staff users with factory
    const staffUsers = UserFactory.generateMany(5, {
      role: { connect: { name: 'staff' } }
    });

    await prisma.user.createMany({
      data: staffUsers,
      skipDuplicates: true, // Idempotent operation
    });

    // Create regular users
    const regularUsers = UserFactory.generateMany(20);

    await prisma.user.createMany({
      data: regularUsers,
      skipDuplicates: true,
    });

    console.log(`✓ Seeded ${5 + 20} users successfully`);
  }
}
```

**Faker.js Configuration:**
- Install: `npm install -D @faker-js/faker`
- Turkish locale: `import { faker } from '@faker-js/faker';` (default tr supported)
- Phone format: `faker.phone.number('05## ### ## ##')` (Turkish mobile)

**Dependencies:** Story 13.1

---

## Story 13.3: Individual Module Seeders (Idempotent & Transactional)

**As a** developer,
**I want** her module için ayrı seeder class'ı,
**So that** RoleSeeder, PermissionSeeder, UserSeeder, FileSeeder ayrı ayrı çalışabilsin.

**Acceptance Criteria:**
1. **RoleSeeder** (`prisma/seeders/role.seeder.ts`):
   - Upsert: admin, staff, user, guest roles
   - Idempotent: skipDuplicates: true
2. **PermissionSeeder** (`prisma/seeders/permission.seeder.ts`):
   - All permissions from PRD (auth.users.create, auth.users.read, etc.)
   - Connect permissions to roles (RolePermission entities)
3. **UserSeeder** (`prisma/seeders/user.seeder.ts`):
   - Admin user, staff users, regular users
   - Hash password utility: `import { hashPassword } from '../utils/hash-password'`
4. **FileSeeder** (`prisma/seeders/file.seeder.ts`):
   - Sample S3 files: images (JPG/PNG), documents (PDF), videos
   - File metadata: size, mimeType, fileName
5. **SmsSeeder** (`prisma/seeders/sms.seeder.ts`):
   - Sample SMS logs: OTP codes, delivery statuses
   - Turkish phone numbers (05xx format)
6. **All seeders idempotent**: upsert() or createMany(skipDuplicates: true)
7. **Transaction support**: $transaction() for related data

**Technical Implementation:**
```typescript
// prisma/seeders/role.seeder.ts
import { PrismaClient } from '@prisma/client';

export class RoleSeeder {
  static async seed(prisma: PrismaClient) {
    console.log('Seeding roles...');

    const roles = [
      { name: 'admin', description: 'System Administrator' },
      { name: 'staff', description: 'Staff Member' },
      { name: 'user', description: 'Regular User' },
      { name: 'guest', description: 'Guest User' },
    ];

    for (const role of roles) {
      await prisma.role.upsert({
        where: { name: role.name },
        update: { description: role.description },
        create: role,
      });
    }

    console.log(`✓ Seeded ${roles.length} roles`);
  }
}

// prisma/seeders/permission.seeder.ts
import { PrismaClient } from '@prisma/client';

export class PermissionSeeder {
  static async seed(prisma: PrismaClient) {
    console.log('Seeding permissions...');

    const permissions = [
      // User management
      { name: 'auth.users.create', description: 'Create users' },
      { name: 'auth.users.read', description: 'Read users' },
      { name: 'auth.users.update', description: 'Update users' },
      { name: 'auth.users.delete', description: 'Delete users' },

      // File management
      { name: 'files.upload', description: 'Upload files' },
      { name: 'files.download', description: 'Download files' },
      { name: 'files.delete', description: 'Delete files' },

      // Document generation
      { name: 'documents.generate', description: 'Generate documents' },
      { name: 'documents.read', description: 'Read documents' },
    ];

    // Seed permissions
    await prisma.permission.createMany({
      data: permissions,
      skipDuplicates: true,
    });

    // Assign permissions to roles (admin gets all)
    const adminRole = await prisma.role.findUnique({ where: { name: 'admin' } });
    if (adminRole) {
      await prisma.$transaction(async (tx) => {
        for (const perm of permissions) {
          const permission = await tx.permission.findUnique({ where: { name: perm.name } });
          if (permission) {
            await tx.rolePermission.upsert({
              where: {
                roleId_permissionId: {
                  roleId: adminRole.id,
                  permissionId: permission.id,
                }
              },
              update: {},
              create: {
                roleId: adminRole.id,
                permissionId: permission.id,
              },
            });
          }
        }
      });
    }

    console.log(`✓ Seeded ${permissions.length} permissions`);
  }
}

// prisma/seeders/file.seeder.ts
import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';
import { FileFactory } from '../factories/file.factory';

export class FileSeeder {
  static async seed(prisma: PrismaClient) {
    console.log('Seeding files...');

    const fileTypes = [
      { mimeType: 'image/jpeg', extension: 'jpg', count: 10 },
      { mimeType: 'image/png', extension: 'png', count: 5 },
      { mimeType: 'application/pdf', extension: 'pdf', count: 3 },
    ];

    for (const fileType of fileTypes) {
      const files = FileFactory.generateMany(fileType.count, {
        mimeType: fileType.mimeType,
        extension: fileType.extension,
      });

      await prisma.file.createMany({
        data: files,
        skipDuplicates: true,
      });
    }

    console.log(`✓ Seeded ${fileTypes.reduce((sum, ft) => sum + ft.count, 0)} files`);
  }
}
```

**Dependencies:** Story 13.2

---

## Story 13.4: Package.json Scripts & Prisma Integration

**As a** developer,
**I want** Prisma native seeding commands,
**So that** `npx prisma db seed` veya `npm run seed` komutları çalışsın.

**Acceptance Criteria:**
1. **package.json scripts**:
   ```json
   {
     "scripts": {
       "prisma:seed": "ts-node prisma/seed.ts",
       "seed": "npx prisma db seed",
       "seed:reset": "prisma migrate reset",
       "seed:dev": "NODE_ENV=development npm run seed",
       "seed:test": "NODE_ENV=test npm run seed"
     },
     "prisma": {
       "seed": "ts-node prisma/seed.ts"
     }
   }
   ```
2. **Auto-run after migration**: `prisma migrate dev` otomatik seed eder
3. **Individual seeder execution**: `ts-node prisma/seeders/role.seeder.ts`
4. **Clear and seed**: `npm run seed:reset` = migrate reset + seed
5. **Environment-specific**: NODE_ENV controls seed data volume
6. **Progress output**: console.log with emojis (✓, 🎉, ❌)
7. **TypeScript support**: ts-node for .ts seed files

**Technical Implementation:**
```bash
# Run all seeders
npx prisma db seed
# OR
npm run seed

# Reset database and seed
npm run seed:reset

# Development environment seeding
npm run seed:dev

# Run individual seeder
ts-node prisma/seeders/role.seeder.ts

# Custom script with specific data
SEED_USER_COUNT=100 npm run seed
```

**Prisma Configuration:**
- Install: `npm install -D ts-node`
- Add to `prisma/schema.prisma`:
  ```prisma
  generator client {
    provider = "prisma-client-js"
  }

  datasource db {
    provider = "postgresql" // or "mongodb"
    url      = env("DATABASE_URL")
  }
  ```
- Auto-seed: Enabled by default in Prisma v5+

**Dependencies:** Story 13.3

---

## Story 13.5: Environment-Specific Data & Transactional Seeding

**As a** developer,
**I want** NODE_ENV'e göre farklı data volume ve type,
**So that** development (100+ users), test (5-10 users), staging (50+ users) için optimize olsun.

**Acceptance Criteria:**
1. **Environment Detection**:
   ```typescript
   const isDevelopment = process.env.NODE_ENV === 'development';
   const isTest = process.env.NODE_ENV === 'test';
   const isStaging = process.env.NODE_ENV === 'staging';
   ```
2. **Data Volume by Environment**:
   - Development: 50 users, 20 files, 100+ SMS logs
   - Test: 5 users, 3 files, 10 SMS logs (fast CI)
   - Staging: 25 users, 10 files, 50 SMS logs
3. **Always seed essentials**: Roles, permissions, admin user (all environments)
4. **Transaction support**: `$transaction()` for rollback on failure
5. **Error handling**: try-catch with proper error messages
6. **Clean data before seeding** (development only):
   ```typescript
   async function clearDatabase(prisma: PrismaClient) {
     await prisma.file.deleteMany();
     await prisma.user.deleteMany();
     await prisma.rolePermission.deleteMany();
     await prisma.permission.deleteMany();
     await prisma.role.deleteMany();
   }
   ```

**Technical Implementation:**
```typescript
// prisma/seeders/user.seeder.ts (env-specific version)
import { PrismaClient } from '@prisma/client';
import { UserFactory } from '../factories/user.factory';

export class UserSeeder {
  static async seed(prisma: PrismaClient) {
    const isDevelopment = process.env.NODE_ENV === 'development';
    const isTest = process.env.NODE_ENV === 'test';

    // Clear existing data (dev only)
    if (isDevelopment) {
      await prisma.user.deleteMany();
    }

    console.log('Seeding users...');

    // Always seed admin
    await prisma.user.upsert({
      where: { email: 'admin@boilerplate.dev' },
      update: {},
      create: {
        email: 'admin@boilerplate.dev',
        name: 'System Admin',
        password: 'hashedpassword',
        role: { connect: { name: 'admin' } }
      }
    });

    // Environment-specific data
    const userCount = isTest ? 5 : isDevelopment ? 50 : 25;
    const users = UserFactory.generateMany(userCount);

    await prisma.user.createMany({
      data: users,
      skipDuplicates: true,
    });

    console.log(`✓ Seeded ${userCount} users`);
  }
}

// Use transaction for data integrity
export class FullSeeder {
  static async seedAll(prisma: PrismaClient) {
    await prisma.$transaction(async (tx) => {
      await RoleSeeder.seed(tx);
      await PermissionSeeder.seed(tx);
      await UserSeeder.seed(tx);
      await FileSeeder.seed(tx);
    });
  }
}
```

**Dependencies:** Story 13.4

---

## Story 13.6: Hash Password Utility & Test Data Management

**As a** developer,
**I want** password hashing utility for test data,
**So that** seeded users have proper hashed passwords for authentication.

**Acceptance Criteria:**
1. `prisma/utils/hash-password.ts` utility
2. Bcrypt for password hashing (saltRounds: 10)
3. Test passwords: `Admin123!`, `Staff123!`, `User123!`
4. Consistent password format across all seeders

**Technical Implementation:**
```typescript
// prisma/utils/hash-password.ts
import * as bcrypt from 'bcrypt';

export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

// Usage in UserSeeder
await prisma.user.upsert({
  where: { email: 'admin@boilerplate.dev' },
  update: {},
  create: {
    email: 'admin@boilerplate.dev',
    password: await hashPassword('Admin123!'),
    // ...
  }
});
```

**Dependencies:** Story 13.5

---

## Story 13.7: CI/CD Integration & Automation

**As a** developer,
**I want** automated seeding in CI/CD pipeline,
**So that** test environment automatically seeded before tests run.

**Acceptance Criteria:**
1. **GitHub Actions**: `npm run seed` before test execution
2. **Docker Compose**: seed on container startup (ENTRYPOINT)
3. **Pre-test seeding**: E2E tests require seed data
4. **Health check**: verify seed data exists before tests

**Technical Implementation:**
```yaml
# .github/workflows/test.yml
- name: Setup Database
  run: |
    npm run prisma:migrate
    npm run seed

- name: Run Tests
  run: npm test
```

```yaml
# docker-compose.yml
services:
  app:
    command: sh -c "npx prisma db seed && npm run start:dev"
```

**Dependencies:** Story 13.6

---

## Story 13.8: Testing Infrastructure for Seeders

**As a** developer,
**I want** seeders testable ve validated,
**So that** test coverage > 80% and seed data consistent.

**Acceptance Criteria:**
1. Unit tests for each seeder class (Jest)
2. Integration tests: database seeding E2E
3. Mock factories for isolated testing
4. Test cleanup: `afterEach()` cleanup seed data

**Technical Implementation:**
```typescript
// test/seeders/user.seeder.spec.ts
import { PrismaClient } from '@prisma/client';
import { UserSeeder } from '../../prisma/seeders/user.seeder';

describe('UserSeeder', () => {
  let prisma: PrismaClient;

  beforeEach(async () => {
    prisma = new PrismaClient();
    await prisma.$connect();
  });

  afterEach(async () => {
    await prisma.user.deleteMany();
    await prisma.$disconnect();
  });

  it('should seed admin user', async () => {
    await UserSeeder.seed(prisma);

    const user = await prisma.user.findUnique({
      where: { email: 'admin@boilerplate.dev' }
    });

    expect(user).toBeTruthy();
    expect(user?.name).toBe('System Admin');
  });
});
```

**Dependencies:** Story 13.7

---

## Epic Summary

**Total Stories:** 8
**Estimated Effort:** 3-4 sprints
**Complexity:** Medium (Prisma native)
**Priority:** High (developer experience)

**Key Technologies:**
- NestJS v11.1.8
- Prisma ORM v6.16.0 (Native Seeding)
- Faker.js v8+ (Turkish locale)
- Bcrypt (password hashing)
- TypeScript + ts-node

**Project Structure:**
```
prisma/
├── seed.ts (main entry)
├── seeders/
│   ├── role.seeder.ts
│   ├── permission.seeder.ts
│   ├── user.seeder.ts
│   ├── file.seeder.ts
│   └── sms.seeder.ts
├── factories/
│   ├── user.factory.ts
│   ├── role.factory.ts
│   └── file.factory.ts
└── utils/
    └── hash-password.ts
```

**Success Metrics:**
- ✅ Idempotent seeding (safe to re-run)
- ✅ Environment-based data volume
- ✅ Transaction support (data integrity)
- ✅ Prisma native integration
- ✅ CI/CD automation
- ✅ Test coverage > 80%
