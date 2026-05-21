# Product Scope

## Scope Philosophy

Bu proje **"big-bang delivery"** yaklaşımını benimsiyor - MVP, production-ready, tam kapsamlı bir boilerplate içerir. Temel hiçbir modül sonraya kalmaz. Mantık basit: Bir backend projesi başlattığınızda authentication, permissions, file management gibi özelliklere hemen ihtiyacınız var. Kısmi bir boilerplate, zaman tasarrufu vaadini karşılamaz.

**Strateji:** İlk teslimatta tüm temel modüller dahil, sonraki fazlar advanced optimizations ve platform expansion'a odaklanır.

## MVP - Minimum Viable Product

**MVP = Production-Ready, Comprehensive Boilerplate**

MVP başarı kriteri: **Fork + setup + deployment < 1 gün** ve **%70+ test coverage** ile production'a hazır.

### 1. Database Infrastructure

**PostgreSQL ve MongoDB desteği** - Proje başlangıcında kullanıcı seçimi yapabilir

- Prisma ORM ile her iki database için schema yapıları
- Otomatik database seçimi ve yapılandırma
- Migration yönetimi sistemi
- Seed data scripts (development ve test için)
- Connection pooling ve configuration management
- Database health checks

### 2. Authentication & Authorization System

**Phone-based JWT authentication** - Production-ready güvenlik katmanı

- **Admin Authentication:** Telefon numarası + Şifre ile giriş
- **Staff/Other Roles Authentication:** Telefon numarası + OTP ile giriş
- JWT token generation ve validation
- Access token + Refresh token pattern
- OTP verification entegrasyonu (SMS-based only)
- Session yönetimi
- Password reset flow (phone + OTP based, admin only)
- Login rate limiting (brute-force protection)
- Token blacklisting (logout/revoke)
- ❌ Email verification removed (phone-based system)

### 3. User & Permissions Management

**Module-based, role-aware permission system with multi-tenant support** (hrsync-backend proven pattern)

- **Database Schema Design (Multi-Tenant):**
  - **User Model:** Clean relational design - NO legacy role string field, only `userRoles` relation
  - **Role Model:** Domain-specific roles (roles scoped to domain/tenant)
  - **RolePermission Model:** Many-to-many relationship (roles have permission sets)
  - **UserRole Model:** User-to-role assignment with domain context (ONLY way to assign roles)
  - **UserPermission Model:** Direct user-specific permissions (optional override)
  - **Permission Model:** Individual permissions (module.action format)

- User CRUD operations (create, read, update, soft-delete)
- Profile management (user self-service)
- **Multi-Tenant Role Management:**
  - Create, read, update, delete roles (domain-scoped)
  - Role validation within domain context
  - Assign roles to users (registration & admin panel)
  - Bulk role assignment for user groups within domain
  - Seed data for default roles per domain (admin, staff, user)

- **Advanced RBAC (Role-Based Access Control):**
  - Roles inherit permission sets via RolePermission junction
  - Users can have multiple roles (UserRole junction)
  - Direct user permissions override role permissions (UserPermission)
  - Permission calculation: User Permission = (User Roles → RolePermissions) + UserPermissions

- Authorization service (centralized permission checks)
- **Registration Integration:**
  - User registration assigns default role within domain
  - Domain context required for all role operations
  - Seed data for default roles per domain (admin, staff, user)
  - Email/phone verification before role assignment (if required)

- Dev permission sync (development ortamı kolaylığı)
- Permission guard decorators (route-level protection)
- Dynamic permission loading (domain-aware)

### 4. File Management Module

**AWS S3 entegrasyonu** - Production-grade file handling

- File upload (single & multiple)
- File download (secure pre-signed URLs)
- Multiple file type support (image, document, video)
- File validation (size, type, mime-type)
- File metadata tracking
- Thumbnail generation (images için)
- Virus scanning integration hooks
- File access permissions

### 5. Communication Modules

**Multi-channel communication infrastructure**

**SMS Integration (hrsync-backend proven pattern - FONIVA provider):**
- SMS gönderim servisi (FONIVA API)
- Template-based SMS (Turkish + English OTP messages)
- OTP generation ve validation
- Database tracking (SMS entity - her SMS kaydedilir)
- Delivery status callbacks (webhook support)
- Provider abstraction (kolay provider değişimi)
- Retry mechanism (failed SMS'ler için)
- SMS statistics ve reporting
- Rate limiting ve attempt count tracking
- Multi-tenant support (domainID-based)

**Mail Integration:**
- Email template engine
- Transactional email (verification, password reset)
- Bulk email support
- Email queue management
- HTML + Plain text emails
- Attachment support
- Mail provider abstraction (SMTP, SendGrid, etc.)

**Notification Infrastructure:**
- Unified notification interface
- Multiple channel support (SMS, Email, Push)
- Notification preferences (user-level)
- Notification history tracking

### 6. Document Generation Module

**Export capabilities** - Business reporting needs (hrsync-backend proven pattern)

- **Adapter Pattern Architecture** - Extensible document generation
  - Abstract base adapters (BasePdfAdapter, BaseExcelAdapter)
  - Decorator-based auto-discovery (@RegisterPdfAdapter, @RegisterExcelAdapter)
  - Factory pattern for adapter management (PdfAdapterFactory, ExcelAdapterFactory)
  - Dependency injection with NestJS ModuleRef
- **PDF Generation (EJS + Puppeteer)**
  - Template-based PDF with EJS rendering
  - CSS styling support
  - Puppeteer for HTML-to-PDF conversion
  - Reusable browser instance (performance optimization)
  - Header/footer support, page numbering
- **Excel Generation (ExcelJS)**
  - Dynamic workbook building
  - Multiple sheet support
  - Advanced formatting (styling, borders, colors, fonts)
  - Formulas and calculations
  - Auto-filter ve freeze panes
  - Data validation
  - Column width management
- **Caching System (SHA-256 hash-based)**
  - Cache strategy: TEMPLATE_HASH veya NO_CACHE
  - Hash-based cache key generation (template + data)
  - Configurable TTL (default 1 hour)
  - Cache hit/miss tracking
- **S3 Integration**
  - Document upload to S3 with pre-signed URLs
  - Retry mechanism with exponential backoff (3 attempts)
  - Configurable ACL (private/public-read)
- **Multi-language Support (i18n)**
  - Template rendering with language-specific translations
  - Translation function injection into templates
- **Module Structure (hrsync-backend pattern):**
  ```
  document-generator/
  ├── document-generator.module.ts
  ├── base/
  │   ├── base-pdf-adapter.abstract.ts
  │   └── base-excel-adapter.abstract.ts
  ├── adapters/
  │   ├── pdf/
  │   │   └── [specific-pdf].adapter.ts
  │   └── excel/
  │       └── [specific-excel].adapter.ts
  ├── decorators/
  │   ├── register-pdf-adapter.decorator.ts
  │   └── register-excel-adapter.decorator.ts
  ├── factories/
  │   ├── pdf-adapter.factory.ts
  │   └── excel-adapter.factory.ts
  ├── services/
  │   ├── document-generator.service.ts
  │   ├── template-engine.service.ts
  │   ├── cache.service.ts
  │   └── retry.service.ts
  ├── interfaces/
  ├── enums/
  └── templates/
      └── pdf/
          ├── [template].ejs
          └── styles/
              └── [template].css
  ```

### 7. Developer Infrastructure

**Developer productivity ve code quality**

**i18n (Internationalization):**
- Multi-language support
- Translation file management (JSON-based)
- Dynamic language switching
- Fallback language mechanism
- Translation helpers ve decorators

**Common/Shared Utilities:**
- Custom decorators (validation, transformation)
- Guards (authentication, authorization, rate-limit)
- Interceptors (logging, transformation, caching)
- Pipes (validation, transformation)
- Exception filters (custom error handling)
- Utility functions (date, string, array helpers)

**Interactive CLI Tool:**
- Modern, colorful command-line interface
- **Welcome Logo:** ASCII art logo on startup
- **Environment Setup Wizard:** Interactive prompts for configuration
  - Database type selection (PostgreSQL/MongoDB)
  - Environment variables setup (JWT secrets, API keys, etc.)
  - AWS S3 configuration
  - Email/SMS provider settings
- **Interactive Menu System:**
  - Database management commands (migrate, seed, reset)
  - Service management (dev server, build, test)
  - Project configuration
- **Developer Workflow Commands:**
  - Quick start wizard
  - Environment validation
  - Project health checks
  - Development utilities
- Dependencies: `chalk` (colored output), `inquirer` (interactive prompts), `figlet` (text art)

**Error Handling:**
- Centralized exception handling
- Custom exception classes
- Error code standardization
- Error response formatting
- Stack trace management (dev vs prod)

**Logging:**
- Structured logging (JSON format)
- Multiple log levels (debug, info, warn, error)
- Request/Response logging
- Performance logging
- Log rotation ve retention
- Integration with log aggregation tools

**Monitoring & Error Tracking:**
- Sentry integration (error tracking)
- Performance monitoring hooks
- Health check endpoints
- Metrics collection infrastructure

**Firebase (Optional):**
- Push notification integration
- Firebase Cloud Messaging setup
- Device token management
- Notification scheduling

### 8. API Documentation

**Auto-generated, always up-to-date documentation**

- Swagger/OpenAPI 3.0 integration
- Automatic endpoint documentation
- Request/Response DTO documentation
- Authentication flow documentation
- Example requests ve responses
- API versioning support
- Try-it-out functionality
- Export to JSON/YAML
- **Postman Collection Export:**
  - Swagger to Postman converter
  - Auto-generated Postman collections
  - Environment variables setup (dev, staging, production)
  - One-click import into Postman

### 9. Testing Infrastructure

**Comprehensive test setup** - %70+ coverage hedefi

**Test Framework:**
- Jest configuration (optimized)
- Test utilities ve helpers
- Mock factories (user, permissions, files)
- Test database setup (isolated environments)

**Unit Tests:**
- Service layer test examples
- Repository/Data layer tests
- Utility function tests
- 100% coverage for utilities

**Integration Tests:**
- API endpoint testing
- Database integration tests
- External service mocking
- Authentication flow tests

**E2E Tests:**
- Critical user journey tests
- Complete feature flow tests
- Database seeding for E2E
- E2E test environment isolation

**Test Coverage:**
- Coverage reporting (Istanbul)
- Coverage thresholds (CI/CD gates)
- Coverage badges
- Branch, statement, function coverage

### 10. Development Environment

**Docker-based local development** - Tek komutla çalışır ortam

- Docker Compose setup
  - Application container
  - PostgreSQL container
  - MongoDB container (optional)
  - Redis container (future-ready)
- Environment-based configuration
  - .env file management
  - .env.example template
  - Environment validation
  - Secrets management
- Hot reload support (development)
- Development vs Production configs
- Database seed scripts
  - Sample users
  - Sample permissions
  - Test data
- Local HTTPS support (optional)

### 11. CI/CD Templates

**Automated pipeline templates** - Test ve deploy automation

- GitHub Actions templates
  - Test workflow
  - Build workflow
  - Deploy workflow (staging/production)
- GitLab CI templates (alternative)
- Automated testing on PR
- Build verification
- Deployment scripts
  - Environment-specific deployment
  - Database migration execution
  - Health check verification
- Docker image building
- Container registry push

### 12. Code Quality Infrastructure

**Consistent code style** - Enforced standards

- ESLint configuration
  - NestJS best practices
  - TypeScript strict rules
  - Custom company rules
- Prettier setup
  - Consistent formatting
  - Auto-fix on save
- Husky pre-commit hooks
  - Linting before commit
  - Format check
  - Test run (optional)
- TypeScript strict mode
  - No implicit any
  - Strict null checks
  - Strict function types
- Code organization patterns
  - Module structure guidelines
  - File naming conventions
  - Import organization rules

---

## MVP Success Criteria - Definition of Done

MVP ancak aşağıdaki tüm kriterler karşılandığında tamamlanmış sayılır:

✅ **Fonksiyonel Completeness:**
- Tüm 12 core feature kategorisi tam olarak implement edilmiş
- Her modül production-ready (error handling, logging, tests dahil)
- hrsync-backend'den alınan modüller başarıyla entegre ve refactor edilmiş
- Database seçimi (PostgreSQL/MongoDB) çalışıyor

✅ **Documentation Completeness:**
- Her modül için README ve kullanım örnekleri
- Swagger API documentation otomatik oluşuyor
- Quick Start Guide (fork to deployment)
- Architecture Decision Records (ADR)
- Prisma ORM guide ve examples
- Troubleshooting guide

✅ **Quality Gates Passed:**
- Test coverage ≥ %70 (unit + integration + e2e)
- Tüm testler geçiyor (CI/CD pipeline green)
- ESLint/Prettier kuralları uygulanıyor (zero violations)
- TypeScript strict mode hatasız derleniyor
- No high/critical security vulnerabilities (npm audit)

✅ **Developer Experience Validated:**
- Fork + setup süresi < 1 saat
- Docker compose ile tek komutla local environment ayağa kalkıyor
- Database migration'lar hatasız çalışıyor
- Seed data ile demo yapılabiliyor
- Swagger UI üzerinden API test edilebiliyor

✅ **Production Readiness Achieved:**
- Environment-based configuration çalışıyor (dev/staging/prod)
- Error handling ve logging production-ready
- Security best practices uygulanmış:
  - JWT implementation secure
  - CORS configured
  - Helmet middleware active
  - Rate limiting basics in place
- CI/CD pipeline template test edilmiş
- Health check endpoint çalışıyor
- Monitoring (Sentry) configured

✅ **First Fork Test:**
- En az 1 internal pilot project başarıyla fork edilip deploy edilmiş
- Pilot project feedback toplandı ve critical issues düzeltildi

---

## Growth Features (Post-MVP)

**Phase 2: Performance & Scalability** - Optimization ve scale hazırlığı

Bu özellikler MVP sonrası, ilk production projelerin ihtiyaçları netleşince eklenecek:

**Caching Strategies:**
- Redis entegrasyonu (tam implementasyon)
- Cache-aside pattern implementation
- Cache invalidation patterns
- Distributed caching support
- Response caching middleware

**Advanced Rate Limiting:**
- User-based rate limiting
- IP-based rate limiting
- API key based rate limiting
- Custom rate limit strategies
- Rate limit analytics

**API Versioning:**
- URI-based versioning (/v1/, /v2/)
- Header-based versioning (alternative)
- Version deprecation strategy
- Backward compatibility guidelines

**Postman Collection Export:**
- Swagger to Postman converter
- Auto-generated Postman collections
- Environment variables setup

**Queue System:**
- Bull/BullMQ integration
- Background job processing
- Job scheduling
- Job retry mechanisms
- Queue monitoring dashboard

**Advanced Infrastructure:**
- WebSocket support (Socket.io)
- Real-time communication patterns
- Event-driven architecture examples
- Database read replicas configuration
- Horizontal scaling guide

**Monitoring & Observability:**
- Prometheus metrics export
- Grafana dashboard templates
- Advanced APM integration
- Performance profiling tools
- Distributed tracing (Jaeger/Zipkin)

---

## Vision Features (Future)

**Phase 3: Platform Expansion** - Architectural evolution

Uzun vadede, şirket ihtiyaçları evrilince:

**GraphQL Support:**
- GraphQL API layer (REST'in yanında)
- Schema-first approach
- Query complexity limits
- DataLoader pattern
- Subscription support

**Microservices Ready:**
- Microservice template (monorepo veya multi-repo)
- Service discovery integration
- API Gateway pattern
- Service mesh compatibility

**Message Broker Integration:**
- RabbitMQ/Kafka integration
- Pub/Sub patterns
- Event sourcing examples
- CQRS pattern support

**Multi-Tenancy:**
- Database-per-tenant strategy
- Schema-per-tenant strategy
- Shared database with tenant isolation
- Tenant context management

**Advanced Permission System:**
- Attribute-Based Access Control (ABAC)
- Fine-grained permissions
- Dynamic permission evaluation
- Permission inheritance

**Developer Platform:**
- Internal developer portal
- Module marketplace (internal)
- Shared component library
- Cross-project utilities

---
