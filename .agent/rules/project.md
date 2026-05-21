---
trigger: always_on
---

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Enterprise NestJS v11 backend boilerplate with TypeScript, Prisma ORM, PostgreSQL, and Redis. Multi-tenant architecture with domain-based data isolation.

## Essential Commands

```bash
# Development
npm run dev                    # Watch mode + auto-import formatting
npm run start:dev             # NestJS watch mode only
npm run lint                  # ESLint with auto-fix
npm run format                # Prettier formatting
npm run type-check            # TypeScript validation (no emit)

# Database (PostgreSQL via Prisma)
npm run prisma:generate       # Generate Prisma client
npm run prisma:migrate        # Create and apply migrations
npm run prisma:seed           # Seed database
npm run permission:sync       # Sync permissions from code to database

# Testing
npm test                      # Unit + integration tests
npm run test:e2e              # E2E tests (separate config)
npm run test:cov              # Coverage report
npm run test:watch            # Watch mode

# Docker (local services)
npm run docker:up             # Start PostgreSQL, MongoDB, Redis
npm run docker:down           # Stop services
npm run docker:reset          # Full reset with data purge
```

## Architecture

### Module Structure (Mandatory Pattern)

```
src/modules/[module-name]/
  __test__/                   # Unit tests
  controllers/                # HTTP layer
  dto/request/                # Input DTOs
  dto/response/               # Output DTOs
  entities/                   # Database models
  enums/                      # Module-specific enums
  interfaces/                 # Service/Repository contracts
  repositories/               # Data access layer
  services/                   # Business logic
  [module-name].module.ts     # NestJS module definition
```

### Key Architectural Patterns

**Permission System**: Clean relational design - NO role string on User model. Uses junction tables: `UserRole` and `UserPermission`. Permission checking via `@Permission('MODULE', ActionEnum.ACTION)` decorator.

**Response Format**: Controllers return DTOs directly. `TransformResponseInterceptor` auto-wraps to `{ success, status, data, message }`. For pagination, return `{ data, count }`.

**Global Pipeline**: JwtAuthGuard (global except @Public) → PermissionsGuard → ValidationPipe → TransformResponseInterceptor → SentryExceptionFilter

## Development Standards

### Documentation (Swagger)

- All Controllers must be decorated with `@ApiTags`.
- Endpoints must have `@ApiOperation({ summary: ... })` and `@ApiResponse`.
- DTO properties must be decorated with `@ApiProperty()`.

### Database Changes

- **Migrations**: Always generate migrations for schema changes (`npm run prisma:migrate`).
- **Seeding**: Keep seeders and factories updated. When modifying entities, update the corresponding factory in `prisma/factories/`.

### Import Organization (8-Group Order)

```typescript
// 1. Libraries
// 2. DTOs
// 3. Services
// 4. Repositories
// 5. Entities
// 6. Interfaces
// 7. Enums
// 8. Events
```

## Naming Conventions

| Context       | Convention         | Example                       |
| ------------- | ------------------ | ----------------------------- |
| Files/Folders | kebab-case         | `advance-payments.service.ts` |
| Classes       | PascalCase         | `AdvancePaymentsService`      |
| Variables     | camelCase          | `domainID`, `staffID`         |
| Constants     | SCREAMING_SNAKE    | `PERMISSIONS_KEY`             |
| DB Tables     | snake_case, plural | `advance_payments`            |
| DB Columns    | snake_case         | `created_at`, `response_note` |
| API Endpoints | plural, kebab-case | `/advance-payments`           |

## Code Patterns

### Controller Pattern

```typescript
@Post()
@ApiOperation({ summary: 'Create new user' })
@ApiResponse({ status: 201, type: UserResDto })
@Permission('USERS', ActionEnum.CREATE)
async create(
  @Body() createDto: CreateUserDto,
  @CurrentUser('domainID') domainID: string,
): Promise<UserResDto> {
  return this.usersService.create(createDto, domainID);
}
```

### Service Error Handling

```typescript
try {
  const result = await this.repository.operation();
  if (!result) throw new NotFoundException(this.i18n.t('module.NOT_FOUND'));
  return plainToInstance(ResDto, result, { excludeExtraneousValues: true });
} catch (error) {
  if (error instanceof NotFoundException) throw error;
  throw new BadRequestException(error?.response?.message || this.i18n.t('module.OPERATION_FAILED'));
}
```

### DTO Transformation

```typescript
export class UserResDto {
  @ApiProperty()
  @Expose()
  id: string;

  @ApiProperty()
  @Expose()
  email: string;

  @Exclude() passwordHash: string;
  @Exclude() domainID: string;
}

// Always use with options
return plainToInstance(UserResDto, user, { excludeExtraneousValues: true });
```

## Testing

**Coverage Requirements**: 70% global, 100% for `src/common/`, 80% for services

**Test File Patterns**:

- Unit: `*.spec.ts`
- Integration: `*.integration.spec.ts`
- E2E: `test/*.e2e-spec.ts`

**Path Aliases**: `@/` maps to `src/`, `@/test/` maps to `test/`

## Configuration

Environment variables validated via Joi at startup (fail-fast). Required:

- `NODE_ENV` (development|test|production)
- `DATABASE_URL` (PostgreSQL connection string)
- `JWT_SECRET` (minimum 32 characters)

Configuration files in `src/config/`: app, database, jwt, aws, redis, mail, sentry, logger

## Key Services

- **PrismaService**: Database access (global module)
- **CacheService**: Redis-backed caching (global module)
- **AuthorizationService**: Permission calculation
- **TokenManagementService**: JWT + refresh token handling
- **LoggerService**: Winston-based structured logging

## Pre-Commit Hooks

Husky runs: ESLint → Prettier → Fast unit tests. Commits blocked if checks fail. Use `npm run lint && npm run format` before committing.
