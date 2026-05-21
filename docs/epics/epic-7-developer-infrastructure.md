# Epic 7: Developer Infrastructure

**Goal:** Developer productivity tools - i18n, common utilities, logging, error tracking, health checks

**Value Proposition:** Structured logging, error monitoring (Sentry), multi-language support, shared utilities

**Prerequisites:** Epic 1 (App setup)

**Technical Stack:**
- i18n: nestjs-i18n
- Logging: Winston
- Error tracking: Sentry
- Health checks: @nestjs/terminus

---

## Story 7.1: Internationalization (i18n) Setup

**As a** developer,
**I want** multi-language support,
**So that** response message'ları farklı dillerde döndürebilleyim.

**Acceptance Criteria:**
1. `nestjs-i18n` package installed ve configured
2. `src/modules/i18n/translations/` klasörü oluşturulmuş
3. Translation files:
   - `en/common.json`, `en/auth.json`, `en/users.json`
   - `tr/common.json`, `tr/auth.json`, `tr/users.json`
4. I18nModule configured:
   - Default language: EN
   - Fallback: EN
   - Language detection: Accept-Language header
5. Translation usage:
   ```typescript
   this.i18n.t('auth.LOGIN_SUCCESS')
   ```
6. Error messages i18n ile:
   ```typescript
   throw new NotFoundException(this.i18n.t('users.NOT_FOUND'))
   ```

**Technical Notes:**
- Translation key format: namespace.KEY (e.g., auth.LOGIN_SUCCESS)
- Dynamic variables: {{firstName}}
- Plural support (future)

**Dependencies:** Story 6.4

---

## Story 7.2: Common Utilities & Decorators

**As a** developer,
**I want** shared utilities ve decorators,
**So that** tekrar eden kod yazmayayım.

**Acceptance Criteria:**
1. `src/common/decorators/` oluşturulmuş:
   - `current-user.decorator.ts` → @CurrentUser() (extract user from request)
   - `public.decorator.ts` → @Public() (bypass JWT guard)
   - `api-paginated-response.decorator.ts` → Swagger pagination decorator
2. `src/common/utils/` oluşturulmuş:
   - `hash.util.ts` → bcrypt wrapper (hash, compare)
   - `date.util.ts` → Date formatting, timezone
   - `string.util.ts` → String manipulation (slugify, truncate)
   - `validation.util.ts` → Custom validators
3. All utilities tested (unit tests)

**Technical Notes:**
- @CurrentUser() decorator: ExecutionContext → request.user extract
- Hash util: bcrypt.hash(), bcrypt.compare() wrapper
- Pure functions, easily testable

**Dependencies:** Story 7.1

---

## Story 7.3: Structured Logging (Winston)

**As a** developer,
**I want** structured logging,
**So that** log'ları easily searchable olsun.

**Acceptance Criteria:**
1. Winston configured ve global olarak kullanılabilir
2. Log format: JSON structured
   ```json
   {
     "timestamp": "2025-11-04T12:00:00Z",
     "level": "info",
     "message": "User created",
     "context": {
       "module": "UsersService",
       "method": "create",
       "domainID": "...",
       "userID": "..."
     }
   }
   ```
3. Log levels: debug, info, warn, error
4. Console transport (development)
5. File transport (production) - daily rotation
6. Log level: Environment-based (dev: debug, prod: info)
7. Sensitive data exclusion (passwords, tokens)

**Technical Notes:**
- winston + winston-daily-rotate-file
- NestJS logger replacement: app.useLogger(winstonLogger)
- Context metadata: request ID, user ID, domain ID

**Dependencies:** Story 7.2

---

## Story 7.4: Request/Response Logging Interceptor

**As a** developer,
**I want** request ve response'ları otomatik log etmek,
**So that** API activity track edebilleyim.

**Acceptance Criteria:**
1. `LoggingInterceptor` oluşturulmuş
2. Her request için log:
   - Method, URL, user agent, request ID
   - Timestamp (start)
3. Her response için log:
   - Status code, duration (ms)
   - Timestamp (end)
4. Sensitive data exclude (passwords, tokens in body)
5. Request ID header support (X-Request-ID)
6. Global interceptor olarak registered

**Technical Notes:**
- NestJS Interceptor: tap() operator ile response log
- Performance: Duration = Date.now() - startTime
- Request ID: uuid() generate if not present

**Dependencies:** Story 7.3

---

## Story 7.5: Sentry Error Tracking

**As a** developer,
**I want** Sentry error tracking,
**So that** production error'ları monitor edebilleyim.

**Acceptance Criteria:**
1. `@sentry/node` package installed
2. `src/config/sentry.config.ts` oluşturulmuş
   - SENTRY_DSN, SENTRY_ENVIRONMENT env vars
3. Sentry.init() configured (main.ts'te)
4. Sentry exception filter oluşturulmuş
   - All unhandled exceptions → Sentry'e gönderiliyor
   - User context set (userID, domainID)
   - Request context set (URL, method, headers)
5. Sentry breadcrumbs (log trail)
6. Source maps support (TypeScript stack traces)
7. Sensitive data scrubbing (passwords, tokens)

**Technical Notes:**
- Sentry.captureException() for errors
- BeforeSend hook: Scrub sensitive data
- Release tracking: package.json version

**Dependencies:** Story 7.4

---

## Story 7.6: Health Check Endpoints

**As a** developer,
**I want** health check endpoints,
**So that** load balancer ve monitoring sistemleri app durumunu check edebilsin.

**Acceptance Criteria:**
1. `@nestjs/terminus` package installed
2. `src/health/health.controller.ts` oluşturulmuş
3. GET /health endpoint (public)
   - Response: { status: 'ok', timestamp: '...' }
   - Always 200 (basic liveness check)
4. GET /health/db endpoint (public)
   - Database connection check (Prisma.$queryRaw)
   - Response: { status: 'ok', database: 'connected', responseTime: 23 }
   - 200 if healthy, 503 if unhealthy
5. GET /health/services endpoint (future, stub)
   - Check: database, redis, S3, Sentry
   - Response: { status: 'ok', services: { ... } }

**Technical Notes:**
- Terminus HealthCheckService kullan
- Database health: Simple query (SELECT 1)
- Load balancer target: /health endpoint

**Dependencies:** Story 7.5

---
