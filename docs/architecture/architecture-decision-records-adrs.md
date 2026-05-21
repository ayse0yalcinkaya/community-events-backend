# Architecture Decision Records (ADRs)

## ADR-001: Database Selection Mechanism

**Status:** Accepted
**Date:** 2025-11-04
**Context:** Boilerplate must support both PostgreSQL and MongoDB for different project needs.
**Decision:** Interactive CLI script at setup time, dual Prisma schemas, selected schema copied to active schema.
**Consequences:**
- ✅ User-friendly one-time choice
- ✅ Clean schema separation
- ✅ No runtime database switching (simpler architecture)
- ❌ Must fork new project to switch databases (acceptable for boilerplate use case)

## ADR-002: Authentication Architecture

**Status:** Accepted
**Date:** 2025-11-04
**Updated:** 2025-11-05 (Phone-based authentication)
**Context:** Need balance between stateless scalability and token revocation. Phone-based authentication for Turkish market requirements.
**Decision:**
- Hybrid JWT + DB Refresh Tokens (stateless access, DB-stored refresh)
- Phone-based authentication (phoneNumber as primary identifier)
- Admin: Phone + Password authentication
- Staff/Other roles: Phone + OTP (SMS) authentication only
- OTP delivery via FONIVA SMS provider (hrsync-backend pattern)
**Consequences:**
- ✅ Fast access token validation (no DB lookup)
- ✅ Revokable refresh tokens (logout, security)
- ✅ MVP-ready (no Redis dependency)
- ✅ Phase 2 upgrade path (Redis blacklist)
- ✅ Phone-based authentication suitable for Turkish market
- ✅ OTP authentication reduces password management burden for staff
- ✅ FONIVA SMS integration with delivery tracking
- ❌ Refresh token DB queries (acceptable overhead)
- ❌ SMS costs for OTP delivery (acceptable, necessary for security)

## ADR-003: Multi-Tenancy Implementation

**Status:** Accepted
**Date:** 2025-11-04
**Context:** Every entity must be isolated by domain, prevent cross-tenant leaks.
**Decision:** Hybrid approach - explicit `@CurrentUser('domainID')` in controllers + Prisma middleware safety net.
**Consequences:**
- ✅ Explicit and testable (domainID visible in method signatures)
- ✅ Safety net prevents accidental leaks
- ✅ hrsync-backend proven pattern
- ❌ Verbose (domainID parameter everywhere) - acceptable for clarity

## ADR-004: Permission System

**Status:** Accepted
**Date:** 2025-11-04
**Context:** Need type-safe permissions in code, flexible assignment in runtime, dev sync capability.
**Decision:** Hybrid Enum + DB (TypeScript constants synced to database).
**Consequences:**
- ✅ Type safety in code (autocomplete, refactoring)
- ✅ Runtime flexibility (database-driven checks)
- ✅ Dev sync script (code → DB)
- ✅ module.action format (clear, scalable)
- ❌ Two sources of truth (mitigated by sync script)

## ADR-005: Response Standardization

**Status:** Accepted
**Date:** 2025-11-04
**Context:** hrsync-backend response format (success/status/data/message) must be consistent across all endpoints.
**Decision:** Global ResponseTransformInterceptor + Swagger factory functions.
**Consequences:**
- ✅ Automatic wrapping (controllers return DTOs directly)
- ✅ Typed Swagger responses (factory functions)
- ✅ Consistent API contract
- ✅ hrsync-backend exact match
- ❌ Slightly more complex Swagger setup (acceptable)

## ADR-006: File Storage

**Status:** Accepted
**Date:** 2025-11-04
**Context:** Need production-grade file storage with security and scalability.
**Decision:** AWS S3 with pre-signed URLs.
**Consequences:**
- ✅ Industry standard, proven reliability
- ✅ Secure (pre-signed URLs, time-limited)
- ✅ Scalable (S3 handles any load)
- ✅ Cost-effective (pay-per-use)
- ❌ AWS dependency (acceptable, easy to abstract)

## ADR-007: Communication Abstraction

**Status:** Accepted
**Date:** 2025-11-04
**Updated:** 2025-11-05 (FONIVA SMS pattern from hrsync-backend)
**Context:** SMS/Email providers may need to be swapped (cost, deliverability, features). FONIVA is the primary SMS provider for Turkish market.
**Decision:**
- SMS: FONIVA provider with hrsync-backend proven pattern
  - Database tracking for all SMS (delivery status, retry mechanism)
  - SMS entity with domainID, phone_number, message, type, status, provider, attempt_count
  - Delivery callbacks (webhook support)
  - Statistics and reporting
  - Module can be copied from `/Users/ahmet/Documents/Bitbucket/hrsync-backend/src/sms`
- Email: Interface-based provider pattern (SendGrid/SES)
**Consequences:**
- ✅ Production-proven FONIVA integration from hrsync-backend
- ✅ Database tracking for audit and retry
- ✅ Delivery status callbacks
- ✅ Easy to replicate proven pattern
- ✅ Email provider switching (config change only)
- ✅ Testable (mock providers)
- ❌ FONIVA-specific implementation (acceptable, can be abstracted later if needed)

## ADR-008: Coding Standards Enforcement

**Status:** Accepted
**Date:** 2025-11-04
**Context:** 12 core modules + future forks must maintain consistency. AI agents may diverge.
**Decision:** Comprehensive implementation patterns document (NFR-4), ESLint/Prettier enforcement, pre-commit hooks.
**Consequences:**
- ✅ AI agent consistency (clear rules)
- ✅ Code review efficiency (structural conformity)
- ✅ hrsync-backend alignment (proven patterns)
- ✅ Automated enforcement (ESLint, Husky)
- ❌ Steeper learning curve for new devs (mitigated by docs + examples)

---
