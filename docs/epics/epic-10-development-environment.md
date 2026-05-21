# Epic 10: Development Environment

**Goal:** Docker-based local development environment - tek komutla çalışır setup

**Value Proposition:** Consistent environment across team, no manual DB setup, hot reload support

**Prerequisites:** Epic 1 (App setup)

**Technical Stack:**
- Docker + Docker Compose
- PostgreSQL container
- MongoDB container
- Redis container (future-ready)

---

## Story 10.1: Development Dockerfile

**As a** developer,
**I want** development Dockerfile,
**So that** containerized development yapabileyim.

**Acceptance Criteria:**
1. `docker/Dockerfile.dev` oluşturulmuş
2. Base image: node:20
3. Working directory: /app
4. Dependencies install (npm ci)
5. Volume mount: Source code (hot reload support)
6. Expose port: 3000
7. CMD: npm run start:dev
8. .dockerignore oluşturulmuş (node_modules, dist, coverage)

**Technical Notes:**
- Development image: Hot reload için volume mount
- node_modules: Container içinde, local'de ignore
- npm ci for reproducible builds

**Dependencies:** Story 9.6

---

## Story 10.2: Docker Compose Setup

**As a** developer,
**I want** Docker Compose ile tüm servisleri başlatabilmek,
**So that** local environment tek komutla ayağa kalksın.

**Acceptance Criteria:**
1. `docker/docker-compose.yml` oluşturulmuş
2. Services:
   - `app` - NestJS application (Dockerfile.dev)
   - `postgres` - PostgreSQL 15 (official image)
   - `mongodb` - MongoDB 6 (official image)
   - `redis` - Redis 7 (future-ready, optional)
3. App service:
   - Depends on: postgres, mongodb
   - Volume: Source code mount
   - Environment: DATABASE_URL, JWT_SECRET, etc.
   - Port: 3000:3000
4. Postgres service:
   - Environment: POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB
   - Volume: postgres_data (persistent)
   - Port: 5432:5432
5. MongoDB service:
   - Environment: MONGO_INITDB_ROOT_USERNAME, MONGO_INITDB_ROOT_PASSWORD
   - Volume: mongo_data (persistent)
   - Port: 27017:27017
6. Commands:
   - `docker-compose up -d` → Start all services
   - `docker-compose logs -f app` → View logs
   - `docker-compose down` → Stop all services

**Technical Notes:**
- Named volumes for data persistence
- Health checks for dependencies
- Network: Default bridge network

**Dependencies:** Story 10.1

---

## Story 10.3: Environment Variable Management

**As a** developer,
**I want** environment variable management,
**So that** config kolayca değiştirebilleyim.

**Acceptance Criteria:**
1. `.env.example` comprehensive (tüm required vars)
2. `.env.development` template
3. `.env.test` template
4. `.env.production` template (secure values)
5. `.gitignore`: .env.* files (except .env.example)
6. README: Setup instructions
   - Copy .env.example → .env.development
   - Fill required values
7. Config validation: Missing vars → error at startup

**Technical Notes:**
- .env.example: Placeholder values
- Development: Local values (localhost, simple secrets)
- Production: Secure secrets, production URLs

**Dependencies:** Story 10.2

---

## Story 10.4: Database Seed Scripts

**As a** developer,
**I want** seed scripts ile development data,
**So that** testing için sample data oluşturabileyim.

**Acceptance Criteria:**
1. `prisma/seed.ts` enhanced (Epic 1'den)
2. Additional seed data:
   - 10 sample users (different roles)
   - All core permissions
   - 3 sample roles (admin, manager, user)
   - Sample files metadata
3. Seed idempotent (tekrar çalıştırılabilir)
4. Seed command: `npm run prisma:seed`
5. Docker Compose: Seed after migration
   - `docker-compose exec app npm run prisma:seed`

**Technical Notes:**
- Upsert pattern for idempotency
- Realistic sample data (faker library optional)
- Domain: Default domain for all seed data

**Dependencies:** Story 10.3

---

## Story 10.5: Hot Reload Configuration

**As a** developer,
**I want** hot reload,
**So that** code değişikliklerini otomatik görebilleyim.

**Acceptance Criteria:**
1. `nest start --watch` configured
2. Volume mount: Source code → container
3. node_modules: Container içinde (not mounted)
4. TypeScript compilation: Watch mode
5. Server restart on file change (< 3s)
6. Console output: "Restarting..."

**Technical Notes:**
- NestJS CLI watch mode
- Volume mount exclude: node_modules, dist
- ts-node for TypeScript execution

**Dependencies:** Story 10.4

---
