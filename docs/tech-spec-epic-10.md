# Epic Technical Specification: Development Environment

Date: 2025-11-10
Author: BMad
Epic ID: 10
Status: Draft

---

## Overview

Epic 10, Boilerplate projesi için Docker tabanlı, tutarlı ve hızlı kurulabilen bir local development environment oluşturmayı hedefler. Bu epic'in temel amacı, geliştiricilerin tek bir komutla tüm gerekli servisleri (PostgreSQL, MongoDB, Redis) ayağa kaldırabilmesi, manual database setup gerektirmeden çalışmaya başlayabilmesi ve hot reload desteği ile efektif geliştirme yapabilmesidir. Epic 1 (Database Infrastructure & Project Setup) temel altyapı üzerine inşa edilir ve tüm ekip üyeleri için tutarlı bir development experience sağlar.

## Objectives and Scope

**In-Scope:**
- Development-specific Dockerfile (node_modules içinde, volume mount desteği)
- Docker Compose orchestration (app + postgres + mongodb + redis)
- Comprehensive environment variable management (.env.example, .env.development, .env.test, .env.production templates)
- Enhanced seed scripts (10 sample users, roles, permissions, file metadata)
- Hot reload configuration (< 3s restart, watch mode)
- Docker-based migration ve seed workflow
- .dockerignore optimization

**Out-of-Scope:**
- Production Dockerfile (Epic 11: CI/CD & Deployment kapsamında)
- Kubernetes/ECS deployment configuration
- Multi-stage production builds
- Load balancing ve cluster setup
- Cloud-native configuration (AWS Secrets Manager, etc.)

## System Architecture Alignment

Epic 10, Architecture dokümanındaki **Deployment Architecture** ve **Development Environment** bölümlerinde tanımlanan pattern'leri uygular:

**Temel Alignment:**
- **Docker Compose Setup**: Deployment Architecture'da tanımlanan `docker-compose.yml` specification'ı implement edilir
- **Environment Variables**: Tüm required environment variables tanımlanır ve validation ile korunur
- **Database Containers**: PostgreSQL 15, MongoDB 6, Redis 7 Alpine image'ları kullanılır
- **Volume Strategy**: Named volumes ile data persistence, source code volume mount ile hot reload
- **NPM Scripts Integration**: Development Environment'da tanımlanan script'ler Docker ile uyumlu çalışır

**Constraints:**
- Node.js 20 Alpine base image (Architecture standardı)
- Port mapping: 3000 (app), 5432 (postgres), 27017 (mongodb), 6379 (redis)
- hrsync-backend proven patterns: Folder structure, naming conventions maintained
- Multi-tenancy: Seed data domainID ile tutarlı

## Detailed Design

### Services and Modules

Epic 10, infrastructure-focused bir epic olduğu için yeni NestJS servisi/modülü oluşturmaz. Bunun yerine Docker, environment management ve development tooling üzerine odaklanır:

| Component | Responsibility | Inputs | Outputs | Owner |
|-----------|---------------|--------|---------|-------|
| **Dockerfile.dev** | Development container definition | Source code, package.json | Running container with hot reload | DevOps/Platform |
| **docker-compose.yml** | Multi-service orchestration | .env files, Dockerfiles | Running services (app, postgres, mongodb, redis) | DevOps/Platform |
| **.env Templates** | Environment configuration management | User input | Validated configuration | DevOps/Config |
| **prisma/seed.ts** | Enhanced seed data generation | Database schema | Sample data (users, roles, permissions) | Backend/Data |
| **scripts/setup.ts** | Database selection script (existing) | User database choice | DATABASE_URL configuration | Backend/Setup |
| **.dockerignore** | Build optimization | None | Excluded files list | DevOps/Platform |

**Script Enhancements:**
- `prisma/seed.ts`: Epic 1'den extend edilir, 10 sample user, 3 role, complete permissions set ekler
- NPM scripts: Docker-aware commands eklenir (`docker:up`, `docker:down`, `docker:logs`)

### Data Models and Contracts

Epic 10, yeni entity oluşturmaz ancak seed data için aşağıdaki model'leri kullanır:

**Seed Data Entities (Existing - From Epic 1, 2, 3):**

```typescript
// User Entity (Epic 2)
interface SeedUser {
  id: string;              // UUID
  domainID: string;        // Default domain
  phone: string;           // +90XXXXXXXXXX format
  passwordHash: string;    // bcrypt hash
  firstName: string;
  lastName: string;
  email: string | null;
  status: UserStatusEnum;  // ACTIVE (1)
  roleID: string | null;
}

// Role Entity (Epic 3)
interface SeedRole {
  id: string;
  name: string;            // 'Admin', 'Manager', 'User'
  domainID: string;
  description: string;
}

// Permission Entity (Epic 3)
interface SeedPermission {
  id: string;
  resource: string;        // 'USERS', 'FILES', etc.
  action: ActionEnum;      // CREATE, READ, UPDATE, DELETE
}

// File Metadata (Epic 4 - Optional seed)
interface SeedFile {
  id: string;
  key: string;             // S3 key
  filename: string;
  mimeType: string;
  size: number;
  domainID: string;
}
```

**Environment Variables Contract:**

```typescript
// .env.development
interface DevelopmentEnv {
  NODE_ENV: 'development';
  PORT: number;                    // 3000
  API_PREFIX: string;              // 'api'
  DATABASE_URL: string;            // Docker service URLs
  JWT_SECRET: string;              // Min 32 chars
  JWT_ACCESS_EXPIRATION: string;   // '15m'
  JWT_REFRESH_EXPIRATION: string;  // '7d'
  AWS_REGION: string;
  AWS_ACCESS_KEY_ID: string;
  AWS_SECRET_ACCESS_KEY: string;
  S3_BUCKET: string;
  REDIS_HOST: string;              // 'redis' (Docker service)
  REDIS_PORT: number;              // 6379
  // ... (Epic 5, 6, 7 vars)
}
```

### APIs and Interfaces

Epic 10, API endpoints eklemez. Development environment configuration ve tooling'e odaklanır.

**Docker Compose Service Interfaces:**

```yaml
# App Service Contract
services:
  app:
    build:
      context: .
      dockerfile: docker/Dockerfile.dev
    ports:
      - "3000:3000"
    volumes:
      - .:/app                    # Source code mount
      - /app/node_modules         # Exclude node_modules
    environment:
      DATABASE_URL: ${DATABASE_URL}
      JWT_SECRET: ${JWT_SECRET}
      # ... all required vars
    depends_on:
      - postgres
      - mongodb
      - redis
    command: npm run start:dev

# Database Service Contracts
  postgres:
    image: postgres:15-alpine
    ports: ["5432:5432"]
    volumes: ["postgres_data:/var/lib/postgresql/data"]
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5

  mongodb:
    image: mongo:6
    ports: ["27017:27017"]
    volumes: ["mongo_data:/data/db"]
    environment:
      MONGO_INITDB_ROOT_USERNAME: ${MONGO_USER}
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_PASSWORD}

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
    volumes: ["redis_data:/data"]
    command: redis-server --appendonly yes
```

### Workflows and Sequencing

**Initial Setup Workflow:**

```
Developer → Clone Repository
         ↓
         Copy .env.example → .env.development
         ↓
         Fill required values (DB credentials, JWT secret, AWS keys)
         ↓
         docker-compose up -d
         ↓
         Wait for health checks (postgres, mongodb ready)
         ↓
         docker-compose exec app npm run prisma:generate
         ↓
         docker-compose exec app npm run prisma:migrate
         ↓
         docker-compose exec app npm run prisma:seed
         ↓
         Access: http://localhost:3000
         ↓
         Swagger: http://localhost:3000/api/docs
```

**Daily Development Workflow:**

```
Developer → docker-compose up -d
         ↓
         Edit source code (IDE)
         ↓
         File change detected (volume mount)
         ↓
         NestJS CLI watch mode triggers
         ↓
         TypeScript compilation (< 3s)
         ↓
         Server restart automatically
         ↓
         Test changes (Postman/Swagger)
         ↓
         docker-compose down (end of day)
```

**Database Migration Workflow (Docker):**

```
Developer → Create new Prisma migration
         ↓
         docker-compose exec app npx prisma migrate dev --name migration-name
         ↓
         Prisma generates migration files
         ↓
         Apply to PostgreSQL container
         ↓
         Regenerate Prisma Client
         ↓
         Server auto-restarts (hot reload)
```

**Troubleshooting Workflow:**

```
Issue Detected → docker-compose logs -f app
              ↓
              Identify error (logs)
              ↓
              Option A: Code fix → Auto reload
              ↓
              Option B: Dependency change → docker-compose down
                                          → docker-compose build
                                          → docker-compose up -d
              ↓
              Option C: Database reset → docker-compose down -v
                                       → docker-compose up -d
                                       → Re-run migrations + seed
```

## Non-Functional Requirements

### Performance

**Development Environment Startup:**
- **Target**: Container startup < 30 seconds (first build), < 10 seconds (subsequent starts)
- **Strategy**:
  - Alpine base image (minimal size)
  - Layer caching optimization
  - Dependency pre-installation

**Hot Reload Performance:**
- **Target**: Code change → Server restart < 3 seconds (p95)
- **Strategy**:
  - NestJS watch mode (`--watch`)
  - TypeScript incremental compilation
  - Volume mount optimization (exclude node_modules)

**Database Container Initialization:**
- **Target**: PostgreSQL/MongoDB ready < 15 seconds
- **Strategy**:
  - Health checks (postgres: `pg_isready`, mongodb: connection test)
  - Named volumes for data persistence (avoid re-initialization)

**Resource Usage (Local Development):**
- **App Container**: Max 1GB RAM, 1 CPU core
- **PostgreSQL Container**: Max 512MB RAM
- **MongoDB Container**: Max 512MB RAM
- **Redis Container**: Max 256MB RAM
- **Total**: < 2.5GB RAM target for full stack

### Security

**Environment Variables:**
- **Requirement**: No secrets committed to git
- **Implementation**:
  - `.env*` files in `.gitignore` (except `.env.example`)
  - `.env.example` contains placeholder values only
  - README warns against committing real credentials

**Container Security:**
- **Non-root User**: Production Dockerfile uses `USER node` (Epic 11)
- **Development**: Root user acceptable (local development only)
- **Image Source**: Official images only (postgres:15-alpine, mongo:6, redis:7-alpine)

**Network Isolation:**
- **Docker Network**: Default bridge network (containers can communicate)
- **Port Exposure**: Only necessary ports exposed to host (3000, 5432, 27017, 6379)
- **Future**: Production uses isolated networks (Epic 11)

**Secret Management:**
- **Development**: Simple .env files (acceptable for local)
- **Test**: .env.test with test credentials
- **Production**: External secret management (AWS Secrets Manager, out of scope for Epic 10)

### Reliability/Availability

**Container Restart Policy:**
- **Development**: `restart: "no"` (manual control)
- **Dependencies**: Health checks ensure readiness before app starts
  - PostgreSQL: `pg_isready` check every 10s
  - MongoDB: Connection test

**Data Persistence:**
- **Named Volumes**: All database data persists across container restarts
  - `postgres_data:/var/lib/postgresql/data`
  - `mongo_data:/data/db`
  - `redis_data:/data`
- **Volume Cleanup**: `docker-compose down -v` for complete reset (documented)

**Failure Recovery:**
- **Database Connection Failures**: App will retry (NestJS Prisma default behavior)
- **Container Crashes**: No auto-restart in dev (developer intervention required)
- **Data Loss Prevention**: Named volumes prevent accidental data deletion

**Idempotent Operations:**
- **Seed Script**: Upsert pattern allows re-running without duplicates
- **Migrations**: Prisma tracks applied migrations (safe to re-run)

### Observability

**Container Logs:**
- **Access**: `docker-compose logs -f [service]`
- **Retention**: Logs available until container removal
- **Format**: Standard stdout/stderr (NestJS structured logging from Epic 7)

**Health Checks:**
- **PostgreSQL**: `pg_isready` command (interval: 10s, timeout: 5s, retries: 5)
- **MongoDB**: Connection test via mongo shell
- **App**: NestJS health endpoint `/health` (from Epic 7)

**Monitoring:**
- **Development**: Manual log inspection via `docker-compose logs`
- **Resource Usage**: `docker stats` for real-time container metrics
- **Production Monitoring**: Out of scope (Epic 11: Sentry, Winston, Health checks)

**Debugging:**
- **Port Access**: All service ports exposed for debugging tools
  - PostgreSQL: 5432 → PgAdmin, TablePlus
  - MongoDB: 27017 → MongoDB Compass
  - Redis: 6379 → Redis Commander
- **Hot Reload**: Immediate feedback on code changes
- **Source Maps**: TypeScript source maps enabled for debugging

## Dependencies and Integrations

**Docker & Container Runtime:**
- **Docker Engine**: v24+ (required)
- **Docker Compose**: v2+ (required)
- **Platform Support**: macOS (Docker Desktop), Linux (native Docker), Windows (WSL2 + Docker Desktop)

**Base Images:**
```yaml
node:20-alpine      # App development container (Alpine Linux)
postgres:15-alpine  # PostgreSQL database
mongo:6             # MongoDB database
redis:7-alpine      # Redis cache
```

**Node.js Dependencies (package.json - from Epic 1-9):**
```json
{
  "dependencies": {
    "@nestjs/core": "^11.0.1",
    "@nestjs/common": "^11.0.1",
    "@nestjs/platform-express": "^11.0.1",
    "@prisma/client": "^6.18.0",
    "bcrypt": "^6.0.0",
    "class-validator": "^0.14.2",
    "class-transformer": "^0.5.1",
    "@nestjs/jwt": "^11.0.1",
    "@nestjs/passport": "^11.0.5",
    "passport-jwt": "^4.0.1",
    "@aws-sdk/client-s3": "^3.925.0",
    "@sendgrid/mail": "^8.1.6",
    "ioredis": "^5.8.2",
    "winston": "^3.18.3",
    "@sentry/node": "^7.120.4",
    "firebase-admin": "^13.6.0",
    "exceljs": "^4.4.0",
    "puppeteer": "^24.29.1",
    "ejs": "^3.1.10"
  },
  "devDependencies": {
    "@nestjs/cli": "^11.0.0",
    "@nestjs/testing": "^11.0.1",
    "prisma": "^6.18.0",
    "typescript": "^5.7.3",
    "jest": "^30.0.0",
    "ts-node": "^10.9.2",
    "eslint": "^9.18.0",
    "prettier": "^3.4.2"
  }
}
```

**NPM Scripts Integration (package.json enhancements):**
```json
{
  "scripts": {
    "docker:up": "docker-compose up -d",
    "docker:down": "docker-compose down",
    "docker:logs": "docker-compose logs -f app",
    "docker:build": "docker-compose build",
    "docker:reset": "docker-compose down -v && docker-compose up -d",
    "docker:exec": "docker-compose exec app",
    "docker:migrate": "docker-compose exec app npm run prisma:migrate",
    "docker:seed": "docker-compose exec app npm run prisma:seed"
  }
}
```

**Environment Variable Dependencies:**
Epic 10 requires comprehensive environment variables from all previous epics:

| Variable | Source Epic | Required For |
|----------|-------------|--------------|
| DATABASE_URL | Epic 1 | Prisma connection |
| JWT_SECRET, JWT_ACCESS_EXPIRATION, JWT_REFRESH_EXPIRATION | Epic 2 | Authentication |
| AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, S3_BUCKET | Epic 4 | File storage |
| SENDGRID_API_KEY, MAIL_FROM | Epic 5 | Email sending |
| FONIVA_API_URL, FONIVA_USERNAME, FONIVA_PASSWORD, FONIVA_API_KEY | Epic 5 | SMS sending |
| REDIS_HOST, REDIS_PORT | Epic 6.5 | Caching |
| SENTRY_DSN | Epic 7 | Error tracking |
| FIREBASE_* | Epic 5 (optional) | Push notifications |

**Integration Points:**

**1. Epic 1 (Database Infrastructure):**
- Extends `prisma/seed.ts` with enhanced sample data
- Uses existing Prisma schema and migration system
- Integrates with `scripts/setup.ts` for database selection

**2. Epic 2-9 (Application Modules):**
- All modules run inside Docker container
- No code changes needed (existing modules work as-is)
- Environment variables injected via docker-compose

**3. Epic 11 (CI/CD - Future Integration):**
- Production Dockerfile will be separate (`Dockerfile.prod`)
- CI pipeline will use both dev and prod Dockerfiles
- docker-compose.yml serves as reference for production deployment

**External Service Integration (via Environment Variables):**
- AWS S3 (Epic 4)
- SendGrid (Epic 5)
- FONIVA SMS (Epic 5)
- Firebase (Epic 5 - optional)
- Sentry (Epic 7)

**Development Tools Integration:**
- IDE: Volume mount enables direct editing
- Database Tools: Port exposure allows external connections
- Postman/Swagger: API accessible at localhost:3000
- Git: .dockerignore prevents committing container artifacts

## Acceptance Criteria (Authoritative)

### AC-10.1: Development Dockerfile (Story 10.1)
1. `docker/Dockerfile.dev` dosyası oluşturulmuş
2. Base image: `node:20-alpine` kullanılıyor
3. Working directory: `/app` olarak ayarlanmış
4. Dependencies install (`npm ci`) container build sırasında yapılıyor
5. Source code volume mount desteği (hot reload için)
6. Port 3000 expose edilmiş
7. CMD: `npm run start:dev` olarak ayarlanmış
8. `.dockerignore` dosyası oluşturulmuş (node_modules, dist, coverage exclude edilmiş)

### AC-10.2: Docker Compose Setup (Story 10.2)
1. `docker/docker-compose.yml` dosyası oluşturulmuş
2. Services tanımlı:
   - `app`: NestJS application (Dockerfile.dev kullanıyor)
   - `postgres`: PostgreSQL 15 (official alpine image)
   - `mongodb`: MongoDB 6 (official image)
   - `redis`: Redis 7 (alpine image)
3. App service:
   - `postgres`, `mongodb`'ye depends_on tanımlı
   - Source code volume mount yapılmış
   - Environment variables inject edilmiş
   - Port 3000:3000 mapping yapılmış
4. Postgres service:
   - Environment: POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB set edilmiş
   - Named volume: `postgres_data` persist ediyor
   - Port 5432:5432 exposed
   - Health check: `pg_isready` ile yapılıyor
5. MongoDB service:
   - Environment: MONGO_INITDB_ROOT_USERNAME, MONGO_INITDB_ROOT_PASSWORD set edilmiş
   - Named volume: `mongo_data` persist ediyor
   - Port 27017:27017 exposed
6. Redis service:
   - Named volume: `redis_data` persist ediyor
   - Port 6379:6379 exposed
7. Commands çalışıyor:
   - `docker-compose up -d` → Tüm servisleri başlatıyor
   - `docker-compose logs -f app` → App loglarını gösteriyor
   - `docker-compose down` → Tüm servisleri durduruyor

### AC-10.3: Environment Variable Management (Story 10.3)
1. `.env.example` comprehensive (tüm required variables documented)
2. `.env.development` template oluşturulmuş
3. `.env.test` template oluşturulmuş
4. `.env.production` template oluşturulmuş (secure values için placeholder)
5. `.gitignore`: `.env.*` files ignored (`.env.example` hariç)
6. README.md: Setup instructions eklenmiş
   - `.env.example` → `.env.development` copy adımı
   - Required values doldurma talimatı
7. Config validation: Missing vars → startup'ta error fırlatıyor

### AC-10.4: Database Seed Scripts (Story 10.4)
1. `prisma/seed.ts` enhanced (Epic 1'den extend edilmiş)
2. Additional seed data oluşturuluyor:
   - 10 sample users (farklı roller ile)
   - Tüm core permissions
   - 3 sample role (admin, manager, user)
   - Sample file metadata (optional)
3. Seed script idempotent (tekrar çalıştırılabilir, duplicate oluşturmuyor)
4. Seed command çalışıyor: `npm run prisma:seed`
5. Docker Compose'dan seed çalışıyor: `docker-compose exec app npm run prisma:seed`

### AC-10.5: Hot Reload Configuration (Story 10.5)
1. `nest start --watch` configured (package.json'da)
2. Source code volume mount → container'a yapılmış
3. `node_modules` container içinde (mounted değil)
4. TypeScript compilation: Watch mode aktif
5. Server restart on file change: < 3 saniye (measured)
6. Console output: "Restarting..." mesajı görünüyor (file change detection)

### AC-10.6: NPM Scripts Integration (Implicit - All Stories)
1. `docker:up`: `docker-compose up -d` çalıştırıyor
2. `docker:down`: `docker-compose down` çalıştırıyor
3. `docker:logs`: `docker-compose logs -f app` çalıştırıyor
4. `docker:build`: `docker-compose build` çalıştırıyor
5. `docker:reset`: `docker-compose down -v && docker-compose up -d` çalıştırıyor
6. `docker:migrate`: `docker-compose exec app npm run prisma:migrate` çalıştırıyor
7. `docker:seed`: `docker-compose exec app npm run prisma:seed` çalıştırıyor

### AC-10.7: Integration & End-to-End (All Stories)
1. Developer `docker-compose up -d` çalıştırıyor → Tüm servisler başlıyor (< 30s first, < 10s subsequent)
2. Health checks passing (postgres, mongodb ready)
3. `docker-compose exec app npm run prisma:migrate` → Migrations apply oluyor
4. `docker-compose exec app npm run prisma:seed` → Sample data oluşuyor
5. http://localhost:3000 → NestJS app erişilebilir
6. http://localhost:3000/api/docs → Swagger UI erişilebilir
7. Source code değişikliği → Server auto-restart (< 3s)
8. PostgreSQL: PgAdmin/TablePlus ile localhost:5432 üzerinden erişilebilir
9. MongoDB: MongoDB Compass ile localhost:27017 üzerinden erişilebilir
10. Redis: Redis Commander ile localhost:6379 üzerinden erişilebilir

## Traceability Mapping

| AC # | Epic 10 Story | Tech Spec Section | Component/API | Test Idea |
|------|--------------|-------------------|---------------|-----------|
| AC-10.1 | Story 10.1: Development Dockerfile | Services and Modules → Dockerfile.dev | `docker/Dockerfile.dev` | Build image → Verify base image, working dir, expose port 3000 |
| AC-10.2 | Story 10.2: Docker Compose Setup | APIs and Interfaces → Docker Compose Service Interfaces | `docker/docker-compose.yml` | `docker-compose up -d` → Verify all 4 services running, health checks pass |
| AC-10.3 | Story 10.3: Environment Variable Management | Data Models and Contracts → Environment Variables Contract | `.env.example`, `.env.development`, `.env.test`, `.env.production` | Missing var → Startup fails with validation error |
| AC-10.4 | Story 10.4: Database Seed Scripts | Services and Modules → prisma/seed.ts | `prisma/seed.ts` | Run seed twice → No duplicates, 10 users, 3 roles created |
| AC-10.5 | Story 10.5: Hot Reload Configuration | NFR → Performance → Hot Reload Performance | Volume mount, NestJS watch mode | Edit file → Measure restart time < 3s |
| AC-10.6 | Story 10.1-10.5: NPM Scripts | Dependencies and Integrations → NPM Scripts Integration | `package.json` scripts | Run each `docker:*` script → Verify expected outcome |
| AC-10.7 | All Stories: Integration | Workflows and Sequencing → Initial Setup Workflow | Full stack | Follow setup workflow → App accessible, data seeded, hot reload works |

## Risks, Assumptions, Open Questions

### Risks

**RISK-10.1: Platform Compatibility Issues**
- **Description**: Docker Desktop davranışları macOS, Windows (WSL2), Linux'ta farklılık gösterebilir
- **Impact**: Medium - Bazı geliştiriciler farklı sorunlarla karşılaşabilir
- **Mitigation**:
  - Official Docker images kullan (platform-agnostic)
  - README'de platform-specific notes ekle
  - Team içinde farklı platformlarda test yap

**RISK-10.2: Volume Mount Performance (macOS)**
- **Description**: macOS'ta Docker volume mount'lar slow olabilir (I/O overhead)
- **Impact**: Medium - Hot reload performance'ı etkileyebilir (> 3s)
- **Mitigation**:
  - `:cached` volume mount option kullan (macOS için)
  - node_modules'ı exclude et (zaten yapılıyor)
  - Alternatif: Native development (Docker olmadan) için instructions

**RISK-10.3: Resource Exhaustion**
- **Description**: 4 container (app, postgres, mongodb, redis) toplamda > 2.5GB RAM kullanabilir
- **Impact**: Low - Düşük RAM'li makinelerde slow olabilir
- **Mitigation**:
  - Docker Desktop resource limits ayarla (öneriler README'de)
  - MongoDB optional yap (PostgreSQL primary database)
  - Redis optional yap (caching disabled local dev'de acceptable)

**RISK-10.4: Environment Variable Leakage**
- **Description**: Developer yanlışlıkla `.env.development` dosyasını commit edebilir
- **Impact**: High - Credentials leak olabilir
- **Mitigation**:
  - `.gitignore` güçlü (already mitigated)
  - Pre-commit hook: `.env*` files check et (Epic 12)
  - README'de uyarı ekle

**RISK-10.5: Docker Daemon Not Running**
- **Description**: Developer Docker Desktop başlatmayı unutabilir
- **Impact**: Low - Setup failure (açık hata mesajı)
- **Mitigation**:
  - README'de prerequisite check script
  - `docker info` çalıştır setup başında
  - Clear error message: "Docker daemon not running, please start Docker Desktop"

### Assumptions

**ASSUMPTION-10.1: Docker Pre-installed**
- **Assumption**: Geliştiriciler Docker Desktop/Engine önceden kurmuş
- **Validation**: Prerequisites section README'de açıkça belirtilmiş
- **Fallback**: Manual installation guide link

**ASSUMPTION-10.2: Sufficient Disk Space**
- **Assumption**: >= 10GB free disk space (images + volumes + node_modules)
- **Validation**: README'de minimum requirements belirtilmiş
- **Fallback**: docker system prune komutu ile temizlik

**ASSUMPTION-10.3: Internet Connectivity**
- **Assumption**: İlk setup sırasında internet erişimi (image pull, npm install)
- **Validation**: Error message clear (image pull failed, npm install failed)
- **Fallback**: Offline mode için pre-built image (future, out of scope)

**ASSUMPTION-10.4: No Port Conflicts**
- **Assumption**: Ports 3000, 5432, 27017, 6379 boş (başka service kullanmıyor)
- **Validation**: docker-compose up error message açık
- **Fallback**: README'de port değiştirme instructions

**ASSUMPTION-10.5: PostgreSQL Primary Database**
- **Assumption**: Team PostgreSQL kullanacak (MongoDB optional, Redis future)
- **Validation**: Setup script database selection (Epic 1)
- **Fallback**: MongoDB kullanımı için ayrı instructions

### Open Questions

**QUESTION-10.1: Database Selection Workflow**
- **Question**: Setup script (`scripts/setup.ts`) Docker environment'ta nasıl çalışacak?
- **Context**: Epic 1'de interactive database selection var, Docker'da automatic olmalı mı?
- **Resolution Needed**: Story 10.2 implementation sırasında
- **Proposed Answer**: Docker Compose default PostgreSQL, setup script optional kalır

**QUESTION-10.2: Seed Data Volume**
- **Question**: 10 sample user yeterli mi? Daha fazla realistic data gerekli mi?
- **Context**: Testing için meaningful data volume
- **Resolution Needed**: Story 10.4 implementation sırasında
- **Proposed Answer**: 10 user yeterli, gerekirse faker library ile extend edilebilir (optional)

**QUESTION-10.3: MongoDB Container Necessity**
- **Question**: MongoDB container her zaman gerekli mi? PostgreSQL primary ise optional yapılabilir mi?
- **Context**: Resource usage optimization
- **Resolution Needed**: Story 10.2 implementation
- **Proposed Answer**: Optional yap, docker-compose.override.yml ile activate

## Test Strategy Summary

### Test Levels

**1. Component Testing (Story-level)**
- **Scope**: Her story'nin AC'lerini validate et
- **Approach**: Manual testing (developer execution)
- **Tools**: Docker CLI, docker-compose, bash scripts

**Test Cases:**
- Story 10.1: Build Dockerfile.dev → Verify image layers, CMD, exposed ports
- Story 10.2: `docker-compose up -d` → Verify all services running, health checks pass
- Story 10.3: Missing .env var → Startup fails with clear error message
- Story 10.4: Run `prisma:seed` twice → Verify idempotency, no duplicates
- Story 10.5: Edit source file → Measure restart time (< 3s)

**2. Integration Testing (Epic-level)**
- **Scope**: End-to-end workflow validation (AC-10.7)
- **Approach**: Manual walkthrough of Initial Setup Workflow
- **Tools**: Web browser, database clients (PgAdmin, MongoDB Compass), Postman

**Test Scenarios:**
```
Scenario 1: Fresh Setup
- Clone repo → Copy .env.example → Fill values
- docker-compose up -d → Wait for health checks
- Migrate → Seed → Access app
- Expected: App running, Swagger accessible, data seeded

Scenario 2: Hot Reload
- Edit controller file → Save
- Measure restart time
- Expected: < 3 seconds, changes reflected

Scenario 3: Database Access
- Connect PgAdmin to localhost:5432
- Query users table
- Expected: 10 sample users visible

Scenario 4: Container Restart
- docker-compose down → docker-compose up -d
- Expected: Data persists (no re-seed needed)
```

**3. Performance Testing**
- **Scope**: NFR validation (startup time, hot reload, resource usage)
- **Approach**: Measurement-based
- **Tools**: `time` command, `docker stats`, browser DevTools

**Metrics:**
```
- Container startup (first build): < 30s
- Container startup (subsequent): < 10s
- Hot reload: < 3s (p95)
- Resource usage: < 2.5GB RAM total
```

**4. Compatibility Testing**
- **Scope**: Platform compatibility (macOS, Windows WSL2, Linux)
- **Approach**: Manual testing on different platforms
- **Tools**: Docker Desktop (macOS, Windows), Docker Engine (Linux)

**Test Matrix:**
```
| Platform | Docker Version | Status | Notes |
|----------|---------------|--------|-------|
| macOS    | Docker Desktop 4.x | ✓ | Test volume mount performance |
| Windows WSL2 | Docker Desktop 4.x | ✓ | Test WSL2 integration |
| Linux    | Docker Engine 24.x | ✓ | Native performance |
```

### Edge Cases & Negative Tests

**Edge Case 1: Port Conflicts**
- **Scenario**: Port 3000 already in use (another app running)
- **Expected**: docker-compose up fails with clear error message
- **Test**: Start another service on port 3000, then try docker-compose up

**Edge Case 2: Insufficient Resources**
- **Scenario**: Docker Desktop memory limit < 2.5GB
- **Expected**: Containers may crash or become slow
- **Test**: Reduce Docker Desktop resources, observe behavior

**Edge Case 3: Missing Environment Variables**
- **Scenario**: .env.development eksik (DATABASE_URL missing)
- **Expected**: App startup fails with validation error
- **Test**: Remove DATABASE_URL, start app, verify error

**Edge Case 4: Database Connection Failure**
- **Scenario**: PostgreSQL container not ready (health check failing)
- **Expected**: App retries connection (NestJS Prisma default)
- **Test**: Stop postgres container mid-operation, observe app behavior

### Test Coverage Goals

- **Functional Coverage**: 100% of AC-10.1 through AC-10.7
- **Platform Coverage**: macOS, Windows WSL2, Linux (minimum 2/3)
- **Performance Coverage**: All NFR metrics measured (startup, hot reload, resource)
- **Edge Case Coverage**: 4 major edge cases validated

### Definition of Done (Testing)

Epic 10 test edilmiş sayılır eğer:
1. ✅ Tüm 7 AC grubu manuel olarak validate edilmiş
2. ✅ End-to-end setup workflow başarıyla çalışıyor (AC-10.7)
3. ✅ Performance metrics target'lara uyuyor (< 30s, < 3s, < 2.5GB)
4. ✅ En az 2 farklı platformda test edilmiş (macOS + Linux veya Windows)
5. ✅ 4 edge case scenario test edilmiş
6. ✅ README documentation complete ve accurate
