# Non-Functional Requirements

Bu bölüm, Boilerplate projesinin kalite attribute'lerini, performans gereksinimlerini, güvenlik standartlarını ve geliştirme konvansiyonlarını tanımlar. Tüm coding standartları **hrsync-backend** projesinden çıkarılmış ve kanıtlanmış pattern'lerdir.

## NFR-1: Performance Requirements

**Gereksinim:** API response times ve system throughput

**Requirements:**

**NFR-1.1: API Response Time**
- Simple CRUD operations: < 200ms (p95)
- Complex queries (with joins): < 500ms (p95)
- File upload operations: < 2s for files up to 10MB
- Document generation: < 5s for small documents, async for large ones
- Acceptance: Performance monitoring ile ölçülür, SLA violations track edilir

**NFR-1.2: Database Query Performance**
- Database queries should use indexes for filter fields
- Pagination always required for list endpoints (max 100 items)
- N+1 query problem'leri önlenmeli (eager loading)
- Connection pooling: min 5, max 20 connections
- Acceptance: Query execution time < 100ms (p95)

**NFR-1.3: Concurrent Request Handling**
- Minimum 100 concurrent requests support (MVP)
- Horizontal scaling ready (stateless design)
- No blocking operations in request handlers
- Acceptance: Load testing ile validate edilir

**Domain Constraints:**
- Performance degradation acceptable for cold starts (serverless)
- Local development performance'ı production'dan farklı olabilir

---

## NFR-2: Security Requirements

**Gereksinim:** Application security ve data protection

**Requirements:**

**NFR-2.1: Authentication Security**
- JWT tokens cryptographically signed (RS256 or HS256)
- Token secrets minimum 32 characters, environment-specific
- Password hashing: bcrypt with minimum 10 rounds
- Brute-force protection: Rate limiting on auth endpoints
- Acceptance: Security audit pass, no authentication bypass

**NFR-2.2: Authorization Security**
- Permission-based access control enforced at route level
- No permission checks in frontend only (always backend validation)
- Default deny (all routes protected unless explicitly public)
- Acceptance: Authorization tests pass, no privilege escalation

**NFR-2.3: Data Security**
- Sensitive data encrypted at rest (database encryption)
- HTTPS only in production (TLS 1.2+)
- Secrets managed via environment variables (never hardcoded)
- SQL injection prevention (parameterized queries via Prisma/TypeORM)
- XSS prevention (input sanitization, output encoding)
- Acceptance: OWASP Top 10 compliance

**NFR-2.4: CORS Configuration**
- CORS configured per environment
- Allowed origins whitelist only
- Credentials support optional
- Acceptance: CORS policy enforced, no cross-origin vulnerabilities

**NFR-2.5: Dependencies Security**
- No high/critical vulnerabilities in dependencies (npm audit)
- Automated dependency updates (Dependabot/Renovate)
- Regular security patches applied
- Acceptance: npm audit clean, no known vulnerabilities

**Domain Constraints:**
- Security standards must meet industry best practices (OWASP)
- Compliance requirements may vary per project (fork'tan sonra customize)

---

## NFR-3: Scalability & Reliability

**Gereksinim:** System scalability ve availability

**Requirements:**

**NFR-3.1: Horizontal Scalability**
- Stateless application design (no session state in memory)
- Database connection pooling
- Cache-ready architecture (Redis support in Phase 2)
- Load balancer ready (health checks)
- Acceptance: Multiple instances çalışabilir, state conflicts yok

**NFR-3.2: Database Scalability**
- Database migration support (Prisma migrations)
- Soft-delete pattern (data retention)
- Indexed foreign keys and filter columns
- Acceptance: Database scale edilebilir, query performance düşmez

**NFR-3.3: Reliability**
- Health check endpoints (/health, /health/db)
- Graceful shutdown (pending requests complete)
- Database transaction support
- Error recovery (retry strategies)
- Acceptance: 99% uptime target, graceful degradation

**Domain Constraints:**
- MVP için single instance yeterli, scale out optional
- High availability (HA) Phase 2 concern

---

## NFR-4: Maintainability & Code Quality ⭐

**Gereksinim:** Kod okunabilirliği, maintainability, ve consistency

**Bu bölümdeki TÜM standartlar hrsync-backend projesinden çıkarılmış, production-tested pattern'lerdir.**

**📄 Detaylı Coding Standards Dokümantasyonu:**
Tüm coding standards detayları (file naming, class naming, import organization, DTO patterns, Controller/Service/Repository patterns, entity patterns, error handling, testing patterns, documentation standards) ayrı bir dokümanda belgelenmiştir:

**Dosya:** `/docs/PRD-NFR-CodingStandards.md`

Bu dokümantasyon şunları içerir:
- File & folder naming conventions
- Class, variable, method naming patterns
- Import organization & grouping rules
- Response standards (hrsync-backend format)
- Status enum standards (integer-based pattern)
- TypeScript DTO patterns (Request/Response)
- NestJS Controller/Service/Repository patterns
- Database entity patterns
- Error handling patterns
- Testing patterns (Arrange-Act-Assert)
- JSDoc & Swagger documentation standards
- Multi-tenancy, i18n, event-driven, permission patterns

**Acceptance:** Tüm kod hrsync-backend proven standards'ı takip eder, detaylar ayrı dokümanda

---

## NFR-5: Integration Requirements

**Gereksinim:** External service integration guidelines

**Requirements:**

**NFR-5.1: AWS S3 Integration**
- AWS SDK v3 kullanılmalı
- Environment-specific bucket configuration
- Pre-signed URLs for secure access (15 dakika geçerlilik)
- Error handling for S3 operations (retry strategies)
- Multipart upload for large files
- Acceptance: S3 operations reliable, errors gracefully handled

**NFR-5.2: SMS Provider Integration (FONIVA - hrsync-backend)**
- **FONIVA API integration:** Tam implementasyon hrsync-backend'den kopyalanacak
- Provider abstraction interface (ISMSProvider) - easy provider switching
- **Database entity:** SMS entity (TypeORM → Prisma'ya adapt edilecek)
- **Delivery status tracking:** Webhook endpoints for FONIVA callbacks
- **Retry mechanism:** Failed SMS'ler otomatik retry (max 3 attempts)
- **Statistics:** SMS sending stats, provider performance, type breakdown
- Rate limiting per provider constraints + attempt tracking
- Template-based messaging (TR/EN OTP templates)
- Multi-tenant support (domainID-based)
- **Module structure:** `/src/sms` - tam module hrsync-backend'den kopyalanabilir
- Acceptance: SMS provider değiştirilebilir, delivery track edilir, statistics çalışır

**NFR-5.3: Email Provider Integration**
- SMTP or service provider support (SendGrid, AWS SES)
- HTML template engine (Handlebars/Pug)
- Queue-based async sending
- Bounce/complaint handling
- HTML + Plain text support
- Acceptance: Email reliable gönderilir, failures track edilir

**NFR-5.4: Sentry Integration**
- Error tracking and reporting
- Performance monitoring
- Release tracking
- User context in error reports (domainID, userID)
- Source map support
- Acceptance: Errors otomatik Sentry'e gönderilir, context included

**NFR-5.5: Firebase Integration (Optional)**
- Push notification support (FCM)
- Device token management
- Notification scheduling
- Topic-based messaging
- Acceptance: Push notifications device'lara ulaşır

**Domain Constraints:**
- Provider credentials environment variable'lardan okunmalı
- Provider abstraction ile kolay switching
- Integration failures gracefully handled (fallback/retry)

---

## NFR-6: Observability & Monitoring

**Gereksinim:** System observability ve debugging capability

**Requirements:**

**NFR-6.1: Logging**
- Structured logging (JSON format)
- Log levels: debug, info, warn, error
- Request/Response logging (sensitive data excluded)
- Performance logging (request duration)
- Log aggregation ready (ELK, CloudWatch compatible)
- Acceptance: Tüm log'lar structured, searchable

**NFR-6.2: Error Tracking**
- Sentry integration configured
- Automatic error capture
- User context included (domainID, userID)
- Release tracking (version info)
- Source maps for stack traces
- Acceptance: Production errors tracked, actionable

**NFR-6.3: Health Checks**
- Basic health: GET /health (200 OK)
- Database health: GET /health/db
- External service health checks (S3, Redis)
- Memory/CPU metrics available
- Acceptance: Health checks accurate, load balancer compatible

**NFR-6.4: Metrics (Phase 2)**
- Application metrics (request count, response time, error rate)
- Business metrics hooks (custom counters)
- Prometheus/Grafana ready
- Acceptance: Metrics exportable, dashboards creatable

**Domain Constraints:**
- Logs sensitive data içermemeli (PII, passwords, tokens)
- Log retention policy tanımlı olmalı (7-30 days)
- Production log level: info or higher (debug disabled)

---

## NFR-7: Deployment & DevOps

**Gereksinim:** Deployment ease ve automation

**Requirements:**

**NFR-7.1: Docker Support**
- Multi-stage Dockerfile (build + runtime stages)
- Production-optimized image (minimal size, < 200MB)
- Docker Compose for local development
- Health check in Dockerfile
- Non-root user for security
- Acceptance: Docker image builds, containers çalışır

**NFR-7.2: Environment Configuration**
- Environment-based config (.env files)
- Configuration validation on startup (fail-fast)
- Fail-fast if required config missing
- Secrets via environment variables only (never commit)
- .env.example template provided
- Acceptance: Configuration flexible, secure

**NFR-7.3: CI/CD Ready**
- GitHub Actions / GitLab CI templates
- Automated testing on PR (lint, test, build)
- Automated deployment on merge/tag
- Database migration automation
- Health check after deployment
- Rollback capability
- Acceptance: CI/CD pipeline functional, reliable

**NFR-7.4: Database Migrations**
- Prisma migration support
- Migration scripts version controlled
- Rollback capability (down migrations)
- Migration testing in CI
- Migration execution logged
- Acceptance: Migrations safe, reversible

**Domain Constraints:**
- Production deployment may require manual approval
- Rollback strategy documented
- Zero-downtime deployment preferred (blue-green or rolling)

---
