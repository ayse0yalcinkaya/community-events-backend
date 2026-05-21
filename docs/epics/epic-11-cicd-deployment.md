# Epic 11: CI/CD & Deployment

**Goal:** Automated testing and deployment pipelines with GitHub Actions

**Value Proposition:** Continuous integration, automated testing, automated deployment, quality gates

**Prerequisites:** Epic 9 (Tests exist)

**Technical Stack:**
- GitHub Actions
- Docker multi-stage build
- Container registry (Docker Hub or AWS ECR)

---

## Story 11.1: Production Dockerfile (Multi-Stage)

**As a** developer,
**I want** production-optimized Dockerfile,
**So that** minimal image size ile deploy edebilleyim.

**Acceptance Criteria:**
1. `docker/Dockerfile` oluşturulmuş (multi-stage)
2. Stage 1: Dependencies (npm ci --only=production)
3. Stage 2: Build (npm run build, prisma generate)
4. Stage 3: Production
   - Base: node:20-alpine
   - Copy: node_modules, dist, prisma
   - User: node (non-root)
   - Expose: 3000
   - CMD: node dist/main
5. Image size: < 200MB
6. Health check: Dockerfile HEALTHCHECK instruction
7. .dockerignore: node_modules, dist, coverage, .git

**Technical Notes:**
- Multi-stage for small image size
- Alpine base (minimal)
- Non-root user (security)

**Dependencies:** Story 10.5

---

## Story 11.2: CI Pipeline (GitHub Actions)

**As a** developer,
**I want** automated testing pipeline,
**So that** PR'larda tests otomatik çalışsın.

**Acceptance Criteria:**
1. `.github/workflows/ci.yml` oluşturulmuş
2. Trigger: pull_request
3. Jobs:
   - `test`:
     - Setup Node.js 20
     - Install dependencies (npm ci)
     - Lint check (npm run lint)
     - Unit tests (npm run test)
     - Integration tests (npm run test:integration)
     - E2E tests (npm run test:e2e)
     - Build (npm run build)
     - Coverage upload (Codecov optional)
4. Status: PR merge'e kadar pass gerekli
5. Parallel execution (test + lint)

**Technical Notes:**
- GitHub Actions syntax
- Matrix strategy (optional, multiple Node versions)
- Secrets: TEST_DATABASE_URL (GitHub Secrets)

**Dependencies:** Story 11.1

---

## Story 11.3: CD Pipeline (Staging)

**As a** developer,
**I want** staging'e automated deployment,
**So that** develop branch merge'de otomatik deploy olsun.

**Acceptance Criteria:**
1. `.github/workflows/cd-staging.yml` oluşturulmuş
2. Trigger: push to develop branch
3. Jobs:
   - `build`:
     - Docker image build
     - Tag: staging-{sha}
     - Push to container registry
   - `deploy`:
     - Deploy to staging environment
     - Run database migrations (prisma migrate deploy)
     - Health check (curl /health)
     - Rollback on failure
4. Environment: staging (GitHub Environments)
5. Secrets: DOCKER_USERNAME, DOCKER_PASSWORD, STAGING_SERVER_HOST

**Technical Notes:**
- Docker build & push action
- SSH to staging server or use AWS ECS/Kubernetes
- Migration before deployment

**Dependencies:** Story 11.2

---

## Story 11.4: CD Pipeline (Production)

**As a** developer,
**I want** production'a tag-based deployment,
**So that** versioned release'ler deploy edebilleyim.

**Acceptance Criteria:**
1. `.github/workflows/cd-production.yml` oluşturulmuş
2. Trigger: push tag (v*)
3. Jobs:
   - `build`:
     - Docker image build
     - Tag: production-{version}
     - Push to container registry
   - `deploy`:
     - Manual approval required (GitHub Environment protection)
     - Deploy to production
     - Run migrations
     - Health check
     - Rollback on failure
4. Environment: production (protected)
5. Deployment strategy: Blue-green or rolling (configurable)

**Technical Notes:**
- Tag format: v1.0.0 (semantic versioning)
- Manual approval: GitHub Environment protection rules
- Rollback: Previous image tag

**Dependencies:** Story 11.3

---

## Story 11.5: Database Migration Automation

**As a** developer,
**I want** migrations automated in CI/CD,
**So that** schema değişiklikleri deploy ile birlikte apply edilsin.

**Acceptance Criteria:**
1. Migration command: `npx prisma migrate deploy`
2. CD pipeline'da migration step:
   - Before app deployment
   - Failure → rollback, don't deploy app
3. Migration lock (prevent concurrent migrations)
4. Migration history tracking
5. Dry-run option (manual trigger)

**Technical Notes:**
- Prisma migrate deploy: Production-safe
- Migration lock: Database-level lock or file-based
- Rollback: Down migrations (create if needed)

**Dependencies:** Story 11.4

---
