# Decision Summary

| Category | Decision | Version/Pattern | Affects Epics | Rationale | Provided By |
|----------|----------|-----------------|---------------|-----------|-------------|
| **Core Framework** | NestJS | v11.1.8 | All | Enterprise-grade, TypeScript-native, proven patterns | Starter |
| **Language** | TypeScript Strict | v5.3+ | All | Type safety, better DX, compile-time error detection | Starter |
| **Package Manager** | npm | Latest | All | Default choice, widely supported | Starter |
| **ORM** | Prisma | v6.16.0 | Epic 1 | Type-safe queries, dual DB support, migration system | Manual |
| **Primary Database** | PostgreSQL (option 1) | v15+ | Epic 1, 3, 4, 5, 6 | Relational data, ACID, proven reliability | Setup Script |
| **Alternative Database** | MongoDB (option 2) | v6+ | Epic 1, 3, 4, 5, 6 | Document flexibility, schema evolution | Setup Script |
| **Database Selection** | Interactive CLI Script | - | Epic 1 | One-time setup, user-friendly, automatic config | Custom |
| **Schema Organization** | Dual Schema Files | - | Epic 1 | Clean separation, no conflicts, maintainable | Custom |
| **Multi-Tenancy** | Hybrid (Decorator + Prisma Middleware) | - | All | Explicit in controllers, safety net in Prisma | hrsync-backend |
| **Authentication** | Phone-based JWT + DB Refresh Tokens | - | Epic 2 | Phone + Password (Admin), Phone + OTP (Staff), Stateless access | hrsync-backend |
| **Access Token** | JWT (stateless) | 15-60 min | Epic 2 | Fast validation, no DB lookup | Decision |
| **Refresh Token** | Database-stored | 7-30 days | Epic 2 | Revokable, secure, rotation support | Decision |
| **OTP System** | Database table + expiry | 5 min | Epic 2 | Phone verification via SMS (FONIVA provider) | hrsync-backend |
| **Permission System** | Hybrid Enum + DB | module.action | Epic 3 | Type safety + runtime flexibility + dev sync | hrsync-backend |
| **Authorization Model** | RBAC (Role-Based) | - | Epic 3 | User → Roles → Permissions mapping | hrsync-backend |
| **Module Organization** | Feature Modules + Common | - | All | NestJS convention, clear boundaries, scalable | hrsync-backend |
| **File Storage** | AWS S3 | SDK v3 | Epic 4 | Production-grade, pre-signed URLs, scalable | Industry Standard |
| **SMS Provider** | FONIVA (hrsync-backend pattern) | FONIVA API | Epic 5 | Database tracking, retry mechanism, delivery callbacks | hrsync-backend |
| **Email Provider** | Interface-based | SendGrid/SES | Epic 5 | Easy provider switching, template engine | Decision |
| **Response Format** | Global Interceptor | hrsync pattern | All | Consistent API responses, auto-wrapping | hrsync-backend |
| **Error Handling** | Layered Exceptions + i18n | - | All | Consistent errors, translated messages, Sentry | hrsync-backend |
| **API Documentation** | Swagger + Factory Functions | OpenAPI 3.0 | Epic 8 | Auto-generated, type-safe, always up-to-date | Decision |
| **Testing Framework** | Jest | v29.x | Epic 9 | Unit, integration, E2E support, coverage reports | Starter |
| **Code Quality** | ESLint + Prettier + Husky | - | Epic 12 | Enforced standards, pre-commit checks | Starter + Custom |
| **Containerization** | Docker + Docker Compose | - | Epic 10 | Local dev environment, production deployment | Industry Standard |
| **CI/CD** | GitHub Actions | - | Epic 11 | Automated testing, deployment pipelines | Industry Standard |
| **Monitoring** | Sentry | Latest | Epic 7 | Error tracking, performance monitoring | Industry Standard |
| **Logging** | Winston + JSON format | - | Epic 7 | Structured logs, aggregation-ready | NestJS Standard |
| **i18n** | nestjs-i18n | Latest | Epic 7 | Multi-language support, message translation | NestJS Ecosystem |

---
