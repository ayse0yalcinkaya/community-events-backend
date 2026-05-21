# Functional Requirements

Aşağıdaki functional requirement'lar, capability-based organize edilmiştir (teknoloji değil, işlevsellik odaklı). Her requirement'ın user value'su, acceptance criteria'sı ve domain constraint'leri belirtilmiştir.

## FR-1: User Management

**Capability:** Kullanıcı yaşam döngüsü yönetimi ve profil işlemleri

**User Value:** Backend API'ların temel yapı taşı - her projede kullanıcı yönetimi gerekir

**Requirements:**

**FR-1.1: User Registration (Multi-Tenant)**
- **Admin kullanıcı:** Telefon numarası + password ile kayıt
- **Staff/diğer roller:** Telefon numarası ile kayıt (password optional)
- **Phone Number Uniqueness:** Unique per domain (same phone can exist in different domains)
- Password güvenlik gereksinimleri (admin için): minimum 8 karakter, en az 1 harf ve 1 rakam
- **Domain Context Required:** Registration must specify domain/tenant
- **Role Assignment:** Kayıt sırasında kullanıcı otomatik olarak domain-specific default role alır
- **Role Validation:** Kayıt akışında role existence doğrulanır (within user's domain)
- **Registration Flow:** Domain validation → User creation → Default role assignment (within domain) → OTP SMS
- Acceptance: Kullanıcı kayıt olduğunda, database'e kaydedilir, domain's roles tablosundan default role atanır ve OTP SMS gönderilir

**FR-1.2: User Profile Management**
- Kullanıcı kendi profilini görüntüleyebilmeli (GET /users/me)
- Kullanıcı profil bilgilerini güncelleyebilmeli (firstName, lastName, email-optional)
- **Admin kullanıcı** password'ünü güncelleyebilmeli (mevcut password doğrulaması ile)
- Telefon numarası değişikliği OTP verification gerektirmeli
- Acceptance: Kullanıcı profil bilgilerini güncelleyince değişiklikler hemen yansır

**FR-1.3: User CRUD (Admin)**
- Admin users, tüm kullanıcıları listeleyebilmeli (paginated)
- Admin users, kullanıcı detayını görüntüleyebilmeli
- Admin users, kullanıcı oluşturabilmeli
- Admin users, kullanıcı bilgilerini güncelleyebilmeli
- Admin users, kullanıcıyı silebilmeli (soft-delete)
- Filtering: status (active/inactive), role
- Sorting: createdAt, phoneNumber, lastName
- Acceptance: Admin tüm kullanıcı işlemlerini yapabilir, değişiklikler audit log'a kaydedilir

**FR-1.4: Phone Verification (OTP-based)**
- Kayıt sonrası kullanıcıya OTP kodu SMS ile gönderilmeli
- OTP, 5 dakika geçerli olmalı, 3 deneme hakkı
- Kullanıcı OTP'yi doğrulayınca phone verified olmalı
- Verified olmayan kullanıcılar login yapamaz
- OTP tekrar gönderilebilmeli (rate limited)
- Acceptance: Kullanıcı OTP'yi doğrulayınca hesabı aktif olur

**Domain Constraints:**
- Phone number unique olmalı (E.164 format: +90XXXXXXXXXX)
- Soft-delete kullanılmalı (hard delete yasak)
- Password hash'lenmiş saklanmalı (bcrypt, 10 rounds minimum) - Admin only

---

## FR-2: Authentication & Session Management

**Capability:** Phone-based güvenli kimlik doğrulama ve oturum yönetimi

**User Value:** Güvenli API erişimi ve kullanıcı kimliği doğrulama

**Requirements:**

**FR-2.1: Admin Login (Phone + Password)**
- Admin kullanıcı telefon numarası ve password ile login olabilmeli
- Başarılı login sonrası access token + refresh token dönmeli
- Login rate limiting: Phone başına 5 deneme / 15 dakika
- Yanlış credentials'da generic error mesajı (security)
- Acceptance: Doğru credentials ile login, JWT tokens döner

**FR-2.2: Staff Login (Phone + OTP)**
- Staff kullanıcı telefon numarası ile OTP request edebilmeli
- OTP SMS ile gönderilmeli (5 dakika geçerlilik)
- OTP doğrulandıktan sonra access token + refresh token dönmeli
- OTP retry limit: 3 deneme
- Rate limiting: Phone başına 3 OTP request / saat
- Acceptance: Doğru OTP ile login, JWT tokens döner

**FR-2.3: JWT Token Management**
- Access token: 15-60 dakika geçerli (configurable)
- Refresh token: 7-30 gün geçerli (configurable)
- Token payload: userId, phoneNumber, role (minimal data)
- Token'lar environment-specific secret ile imzalanmalı
- Acceptance: Token'lar oluşturulur, validate edilir, expire olur

**FR-2.4: Token Refresh**
- Kullanıcı refresh token ile yeni access token alabilmeli
- Refresh token tek kullanımlık olmalı (rotation)
- Expired refresh token reddedilmeli
- Acceptance: Valid refresh token, yeni access token + refresh token döner

**FR-2.5: Logout**
- Kullanıcı logout olabilmeli
- Logout sonrası token'lar invalidate edilmeli (optional blacklist)
- Acceptance: Logout sonrası eski token'lar geçersiz olur

**FR-2.6: Password Reset (Admin Only)**
- Admin kullanıcı "forgot password" ile telefon numarasına OTP alabilmeli
- OTP 5 dakika geçerli olmalı
- OTP doğrulandıktan sonra yeni password belirleyebilmeli
- Rate limiting: Phone başına 3 istek / saat
- Acceptance: Kullanıcı OTP ile verify edip password değiştirebilir

**Domain Constraints:**
- JWT secret environment variable'dan okunmalı
- Token expiration configurable olmalı
- Failed login attempts track edilmeli (brute-force protection)
- OTP'ler database'de saklanmalı ve expire edilmeli

---

## FR-3: Authorization & Permissions

**Capability:** Module-based, granular permission yönetimi

**User Value:** Esnek, ölçeklenebilir yetki kontrol sistemi

**Requirements:**

**FR-3.1: Permission Model**
- Permission tanımı: module + action (örn: "users.read", "users.create")
- Permission'lar database'de saklanmalı
- System startup'ta permission sync edilebilmeli (dev environment)
- Acceptance: Tüm permission'lar module.action format'ında tanımlanır

**FR-3.2: Multi-Tenant Role-Based Access Control (Advanced RBAC)**
- **Database Schema (Multi-Tenant):**
  - User model: CLEAN relational design - NO role string field, ONLY `userRoles` relation
  - Role model: Domain-specific roles (scoped to tenant)
  - RolePermission model: Many-to-many (roles have permission sets)
  - UserPermission model: Direct user permissions (optional override)
  - Prisma foreign key constraints with @db.Uuid and proper indexes

- **Advanced Permission Calculation:**
  - Users can have multiple roles (UserRole junction)
  - Roles inherit permission sets via RolePermission junction
  - Direct user permissions (UserPermission) override role permissions
  - Formula: Effective Permissions = (User Roles → RolePermissions) + UserPermissions
  - Kullanıcılara multiple role atanabilmeli (örn: admin + manager)
  - Each role belongs to a domain (multi-tenant isolation)

- Acceptance: Kullanıcının effective permission'ları hesaplanır (roles + direct permissions)

**FR-3.3: Multi-Tenant Role & Permission Management**
- **Domain-Scoped Role CRUD Operations:**
  - Create, read, update, delete roles (admin only, within domain)
  - Role validation: unique per domain (domainID + name)
  - Seed data for default roles per domain (admin, staff, user)
  - Role names are unique within domain, not globally

- **Role Assignment Operations:**
  - Assign roles to users (registration & admin panel) with domain context
  - Bulk role assignment for user groups within domain
  - Role validation within domain context
  - Users can be assigned multiple roles within same domain

- **Permission Assignment (Two Types):**
  - **Role-Based Permissions:** Admin assigns permissions to roles (RolePermission)
  - **Direct User Permissions:** Admin assigns specific permissions to users (UserPermission)
  - Direct user permissions override role-based permissions
  - Both operations require domain context

- **Registration Flow Integration:**
  - User registration assigns default role within domain
  - Domain context required for all role/permission operations
  - Acceptance: Yeni kayıt olan user domain context'inde default role alır

**FR-3.4: Authorization Guards**
- Route-level permission check (@RequirePermissions decorator)
- Yetkisiz erişim 403 Forbidden dönmeli
- Authorization check'ler performanslı olmalı (cached)
- Acceptance: Permission olmayan kullanıcı protected endpoint'e erişemez

**FR-3.5: Dev Permission Sync**
- Development environment'ta permission'lar otomatik sync edilebilmeli
- Code'daki permission tanımları database'e eklenebilmeli
- Permission sync, production'da disable olmalı
- Acceptance: Dev'de yeni permission eklendinde otomatik database'e gelir

**Domain Constraints:**
- Permission module hierarchy tutarlı olmalı (module isimleri standardize)
- Permission check'ler centralize edilmeli (authorization service)
- Permission caching yapılmalı (performance)

---

## FR-4: File Management

**Capability:** Güvenli file upload, storage ve erişim yönetimi

**User Value:** AWS S3 entegrasyonu ile production-ready file handling

**Requirements:**

**FR-4.1: File Upload**
- Single file upload desteklenmeli
- Multiple file upload desteklenmeli (max 10 file)
- Desteklenen formatlar: image, document, video
- File size limit: 10MB (configurable)
- File validation: mime-type, extension, size
- Acceptance: File başarıyla S3'e yüklenir, metadata database'e kaydedilir

**FR-4.2: File Download**
- File download için pre-signed S3 URL oluşturulmalı
- Pre-signed URL 15 dakika geçerli olmalı
- Sadece file owner veya authorized user download edebilmeli
- Acceptance: Authorized user, file'ı download edebilir

**FR-4.3: File Metadata Management**
- File metadata database'de saklanmalı (filename, size, mimeType, uploadDate, userId)
- Kullanıcı kendi file'larını listeleyebilmeli
- Admin tüm file'ları listeleyebilmeli
- Acceptance: File metadata doğru şekilde saklanır ve sorgulanır

**FR-4.4: File Deletion**
- Kullanıcı kendi file'larını silebilmeli
- Admin tüm file'ları silebilmeli
- File deletion soft-delete olmalı (S3'ten hemen silinmez)
- S3 cleanup job ayrı çalışmalı (scheduled)
- Acceptance: File silindiğinde metadata soft-delete, S3'ten cleanup job ile silinir

**FR-4.5: Image Thumbnail Generation (Optional)**
- Image upload'ta thumbnail otomatik oluşturulmalı
- Thumbnail sizes: small (150x150), medium (300x300)
- Thumbnail'lar S3'te ayrı path'te saklanmalı
- Acceptance: Image upload'ta thumbnail'lar otomatik oluşur

**Domain Constraints:**
- S3 bucket per environment (dev, staging, production)
- File access permission kontrolü yapılmalı
- Rate limiting: User başına 20 upload / saat

---

## FR-5: Communication Infrastructure

**Capability:** Multi-channel iletişim (SMS, Email, Push Notification)

**User Value:** Kullanıcı engagement ve transactional messaging

**Requirements:**

**FR-5.1: SMS Sending (hrsync-backend pattern - FONIVA)**
- SMS gönderimi FONIVA provider ile (ISMSProvider abstraction)
- Template-based SMS support (Turkish + English)
- **Database tracking:** Her SMS database'e kaydedilmeli (SMS entity)
- **SMS entity fields:** domainID, phone_number, message, type (OTP/NOTIFICATION/MARKETING/ALERT), status (PENDING/SENT/DELIVERED/FAILED), provider, attempt_count, timestamps
- **Delivery status tracking:** Webhook callback ile status güncellenmeli
- **Retry mechanism:** Failed SMS'ler retry edilebilmeli (max 3 attempts)
- **Statistics:** SMS success/failure rates, provider stats, type-based stats
- Rate limiting: Provider limits'e uygun + attempt count tracking
- Multi-tenant support: domainID-based isolation
- Acceptance: SMS başarıyla gönderilir, database'e kaydedilir, delivery status track edilir

**FR-5.2: Email Sending**
- Transactional email gönderimi (verification, password reset)
- HTML + plain text email desteği
- Email template engine (Handlebars/Pug)
- Email queue for async sending
- Acceptance: Email başarıyla gönderilir, queue üzerinden işlenir

**FR-5.3: OTP Generation & Validation**
- OTP (One-Time Password) generate edilebilmeli
- OTP SMS veya Email ile gönderilebilmeli
- OTP 5 dakika geçerli olmalı
- OTP validation yapılabilmeli
- OTP retry limit: 3 deneme
- Acceptance: OTP generate edilir, gönderilir, doğrulanır

**FR-5.4: Notification Preferences**
- Kullanıcı notification tercihlerini ayarlayabilmeli (SMS, Email, Push)
- Notification channel per notification type seçilebilmeli
- Acceptance: Kullanıcı tercihleri kaydedilir, notification'lar tercihlere göre gönderilir

**FR-5.5: Push Notifications (Optional - Firebase)**
- Device token registration
- Push notification gönderimi (title, body, data)
- Notification scheduling support
- Acceptance: Push notification device'a ulaşır

**Domain Constraints:**
- SMS/Email provider credentials environment variable'lardan okunmalı
- Provider abstraction layer ile provider switch kolay olmalı
- Notification history tutulmalı (audit trail)

---

## FR-6: Document Generation (hrsync-backend adapter pattern)

**Capability:** Extensible document generation with adapter pattern

**User Value:** Business reporting, data export, ve document generation ihtiyaçları

**Architecture Pattern:** Adapter Pattern + Factory + Auto-Discovery (hrsync-backend production pattern)

**Requirements:**

**FR-6.1: Adapter Architecture**
- **Base Abstract Adapters:**
  - `BasePdfAdapter`: Abstract class with common PDF functionality
    - `templateName` property (required)
    - `styleName` property (optional)
    - `getTemplatePath()` method
    - `getStylePath()` method
    - `generate(templateName, data, lang)` abstract method
  - `BaseExcelAdapter`: Abstract class with common Excel functionality
    - `adapterName` property (required)
    - `buildWorkbook(workbook, data, lang)` abstract method
    - `generate(data, lang)` implementation
    - Helper methods: `applyCellStyle()`, `addFormula()`, `applyAutoFilter()`, `freezePanes()`, `mergeCells()`, etc.
- **Decorator-based Registration:**
  - `@RegisterPdfAdapter(templateName)`: Auto-register PDF adapters
  - `@RegisterExcelAdapter(adapterName)`: Auto-register Excel adapters
  - Reflection metadata for adapter discovery
- **Factory Pattern:**
  - `PdfAdapterFactory`: Discovers ve manages PDF adapters
    - `onModuleInit()`: Auto-discover registered adapters
    - `getAdapter(templateName)`: Get adapter instance (cached)
    - `getRegisteredTemplates()`: List all registered templates
  - `ExcelAdapterFactory`: Discovers ve manages Excel adapters
    - `onModuleInit()`: Auto-discover registered adapters
    - `getAdapter(adapterName)`: Get adapter instance (cached)
    - `getRegisteredAdapters()`: List all registered adapters
- Acceptance: Yeni adapter eklemek sadece base class extend + decorator ile olmalı

**FR-6.2: PDF Generation (EJS + Puppeteer)**
- **Template Engine Service:**
  - EJS template rendering with i18n support
  - Template data injection: `{ ...data, t: (key) => translate(key) }`
  - Template files: `templates/pdf/[template-name].ejs`
  - CSS styling: `templates/pdf/styles/[style-name].css`
  - Template existence validation
- **Puppeteer Integration:**
  - Reusable browser instance (initialized on module init)
  - New page per PDF generation
  - HTML injection with CSS inlining
  - PDF options: A4 format, printBackground: true, margins
  - Timeout management (30 seconds default)
  - Resource cleanup (page close after generation)
- **PDF Adapter Implementation Example:**
  ```typescript
  @RegisterPdfAdapter('invoice')
  @Injectable()
  export class InvoicePdfAdapter extends BasePdfAdapter {
    readonly templateName = 'invoice';
    readonly styleName = 'invoice';

    constructor(private templateEngine: TemplateEngineService) {
      super();
    }

    async generate(templateName: string, data: any, lang: string): Promise<Buffer> {
      const html = await this.templateEngine.renderTemplate(
        this.getTemplatePath(),
        data,
        lang
      );
      return await this.templateEngine.generatePdfFromHtml(html, this.getStylePath());
    }
  }
  ```
- Acceptance: PDF dosyası EJS template + CSS ile doğru şekilde oluşturulur

**FR-6.3: Excel Generation (ExcelJS)**
- **ExcelJS Integration:**
  - Workbook creation ve configuration
  - Multiple worksheet support
  - Column definitions (header, key, width)
  - Row data insertion
  - Cell styling ve formatting
- **Excel Adapter Implementation Example:**
  ```typescript
  @RegisterExcelAdapter('sales-report')
  @Injectable()
  export class SalesReportExcelAdapter extends BaseExcelAdapter {
    readonly adapterName = 'sales-report';

    async buildWorkbook(workbook: ExcelJS.Workbook, data: any, lang: string): Promise<void> {
      const worksheet = workbook.addWorksheet('Sales');

      // Define columns
      worksheet.columns = [
        { header: 'Date', key: 'date', width: 15 },
        { header: 'Product', key: 'product', width: 30 },
        { header: 'Total', key: 'total', width: 15 }
      ];

      // Style header
      const headerRow = worksheet.getRow(1);
      headerRow.eachCell(cell => {
        this.applyCellStyle(cell, {
          font: { bold: true, color: { argb: 'FFFFFFFF' } },
          fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2C3E50' } }
        });
      });

      // Add data rows
      data.sales.forEach(sale => worksheet.addRow(sale));

      // Add formulas, filters, freeze
      this.applyAutoFilter(worksheet, 'A1:C100');
      this.freezePanes(worksheet, { row: 2, column: 1 });
    }
  }
  ```
- **Advanced Excel Features:**
  - Formula support: `SUM()`, `AVERAGE()`, conditional formulas
  - Data validation (lists, ranges)
  - Cell merging
  - Freeze panes (header rows/columns)
  - Auto-filter for data analysis
  - Number formatting (currency, dates, percentages)
  - Border ve background styling
- Acceptance: Excel dosyası workbook ile doğru data, formulas, styling ile oluşturulur

**FR-6.4: Document Generator Service (Orchestration)**
- **Main Service Responsibilities:**
  - Cache check (if strategy !== NO_CACHE)
  - Document generation via adapter factory
  - S3 upload with retry mechanism
  - Cache update
  - Result return with metadata
- **Generation Flow:**
  1. Check cache using hash-based key
  2. If cache hit: return cached S3 URL
  3. If cache miss: Generate document using adapter
  4. Upload to S3 with retry (exponential backoff)
  5. Update cache with S3 URL
  6. Return GenerationResult
- **API Example:**
  ```typescript
  const result = await documentGeneratorService.generate(DocumentType.PDF, {
    templateName: 'invoice',
    data: { invoiceNumber: 'INV-001', amount: 2360 },
    lang: 'en',
    s3Options: {
      path: 'invoices',
      filename: 'invoice-001.pdf',
      acl: 'public-read'
    },
    cacheStrategy: CacheStrategy.TEMPLATE_HASH,
    cacheTtl: 3600000, // 1 hour
    metadata: { orderId: '123' }
  });
  // result: { success: true, fileUrl: 's3-url', cached: false, generationTime: 1234ms }
  ```
- Acceptance: Service orchestration doğru çalışır, cache, generation, S3 upload seamless

**FR-6.5: Caching System (SHA-256 hash-based)**
- **Cache Service:**
  - Cache key generation: `doc:{type}:{template}:{dataHash}`
  - SHA-256 hash from data (sorted keys for consistency)
  - Cache manager integration (NestJS @nestjs/cache-manager)
  - TTL support (default 1 hour, configurable per document)
- **Cache Strategies (Enum):**
  - `TEMPLATE_HASH`: Cache based on template + data hash
  - `NO_CACHE`: Skip caching, always generate fresh
- **Cache Operations:**
  - `get(key)`: Retrieve cached value
  - `set(key, value, ttl)`: Store value with TTL
  - `delete(key)`: Invalidate cache
- Acceptance: Cache hit/miss correctly tracked, identical data returns cached result

**FR-6.6: S3 Integration**
- **AwsService Integration:**
  - Buffer upload to S3
  - Pre-signed URL generation
  - ACL configuration (private, public-read, public-read-write)
  - Content-Type detection (application/pdf, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet)
- **S3 Options:**
  - `path`: S3 folder path
  - `filename`: Document filename (auto-generated if not provided)
  - `contentType`: MIME type
  - `acl`: Access control
- Acceptance: Generated documents S3'e upload edilir, URL return edilir

**FR-6.7: Retry Mechanism (Exponential Backoff)**
- **Retry Service:**
  - Max attempts: 3
  - Base delay: 1000ms
  - Exponential backoff: 2^(attempt-1) * baseDelay
  - Delay sequence: 0ms → 1000ms → 2000ms
  - Total max delay: ~3 seconds
- **Retry Logic:**
  - Attempt 1: Execute immediately
  - Attempt 2: Wait 1s, retry
  - Attempt 3: Wait 2s, retry
  - If all fail: throw last error
- **Usage:**
  ```typescript
  const result = await retryService.executeWithRetry(
    async () => await s3.upload(buffer),
    'S3 upload: invoice-001.pdf'
  );
  ```
- Acceptance: Failed operations retry edilir, exponential backoff çalışır

**FR-6.8: Multi-language Support (i18n)**
- **Translation Integration:**
  - nestjs-i18n service injection into templates
  - Translation function: `t(key, params)`
  - Language-specific rendering
  - Fallback language: English
- **Template Usage:**
  ```ejs
  <h1><%= t('invoice.title') %></h1>
  <p><%= t('invoice.amount', { amount: data.total }) %></p>
  ```
- Acceptance: Documents farklı dillerde doğru şekilde generate edilir

**FR-6.9: Custom Exceptions**
- `AdapterNotFoundException`: Adapter bulunamadığında
- `TemplateNotFoundException`: Template file bulunamadığında
- `GenerationFailedException`: Generation sırasında hata oluştuğunda
- Acceptance: Hatalar descriptive exception'lar ile handle edilir

**Technical Implementation (hrsync-backend pattern):**
- **Module:**
  - `DocumentGeneratorModule`: Main module
  - Import: `CacheModule` (with TTL config)
  - Providers: All services, factories, adapters
  - Exports: `DocumentGeneratorService`, factories
- **Interfaces:**
  - `IPdfAdapter`: PDF adapter contract
  - `IExcelAdapter`: Excel adapter contract
  - `DocumentGeneratorOptions`: Generation options interface
  - `GenerationResult`: Result interface
- **Enums:**
  - `DocumentType`: PDF, EXCEL
  - `CacheStrategy`: TEMPLATE_HASH, NO_CACHE
- **Module Can Be Copied:** `/Users/ahmet/Documents/Bitbucket/hrsync-backend/src/document-generator` module structure can be directly adapted (TypeORM → Prisma)

**Domain Constraints:**
- Puppeteer browser instance shared for performance (initialized on module init, closed on destroy)
- Template files must exist in file system before generation
- Large document generation için Puppeteer timeout management (30s default)
- Cache TTL recommended: 1 hour for dynamic documents, longer for static
- S3 upload retry max: 3 attempts with exponential backoff
- Generated documents S3'de permanent (7 gün cleanup opsiyonel, S3 lifecycle policy ile)
- Adapter registration automatic via decorators (no manual factory registration)

---

## FR-7: Internationalization (i18n)

**Capability:** Multi-language support

**User Value:** Farklı dillerde API response'ları ve messaging

**Requirements:**

**FR-7.1: Translation Management**
- Translation'lar JSON file'larda saklanmalı (per language)
- Fallback language: English (default)
- Translation key format: namespace.key (örn: "auth.login.success")
- Acceptance: Translation'lar language file'lardan okunur

**FR-7.2: Language Selection**
- API request'lerde language header ile dil seçilebilmeli (Accept-Language)
- User profile'da preferred language saklanabilmeli
- Acceptance: Response'lar seçilen dilde döner

**FR-7.3: Translation Helper**
- Translation helper service/decorator
- Dynamic variable replacement (örn: "Welcome {name}")
- Plural form support
- Acceptance: Translation'lar helper ile kolayca kullanılır

**Domain Constraints:**
- Supported languages: TR, EN (MVP için, genişletilebilir)
- Translation key'leri standardize edilmeli
- Missing translation'larda fallback language kullanılmalı

---

## FR-8: Developer Infrastructure

**Capability:** Developer productivity tools ve utilities

**User Value:** Kod kalitesi, debugging, ve geliştirme kolaylığı

**Requirements:**

**FR-8.1: Logging Infrastructure**
- Structured logging (JSON format)
- Log levels: debug, info, warn, error
- Request/Response logging (exclude sensitive data)
- Performance logging (request duration)
- Acceptance: Tüm log'lar structured format'ta kaydedilir

**FR-8.2: Error Tracking (Sentry)**
- Sentry integration için configuration
- Automatic error capture
- User context in error reports
- Release tracking
- Acceptance: Error'lar otomatik Sentry'e gönderilir

**FR-8.3: Health Check Endpoints**
- Basic health check: GET /health (200 OK)
- Database health check: GET /health/db
- External service health checks (S3, Redis, etc.)
- Acceptance: Health check'ler servis durumunu doğru raporlar

**FR-8.4: Common Utilities**
- Custom decorators: @CurrentUser, @RequirePermissions, @ApiPaginatedResponse
- Custom guards: JwtAuthGuard, PermissionGuard, RateLimitGuard
- Custom interceptors: TransformInterceptor, LoggingInterceptor
- Custom pipes: ValidationPipe, ParseUUIDPipe
- Utility functions: date helpers, string helpers, array helpers
- Acceptance: Utilities tüm module'lerde kullanılabilir

**FR-8.5: API Documentation (Swagger)**
- Swagger UI: /api/docs
- Auto-generated from decorators
- Try-it-out functionality
- Authentication support (Bearer token)
- Export to JSON/YAML
- Acceptance: Tüm endpoint'ler Swagger'da documented

---

## FR-9: Testing Infrastructure

**Capability:** Comprehensive test framework ve tools

**User Value:** Kod kalitesi ve regression prevention

**Requirements:**

**FR-9.1: Unit Test Setup**
- Jest configuration
- Service layer test examples
- Mock factories (users, permissions)
- 100% coverage for utilities
- Acceptance: Unit testler çalışır, coverage raporlanır

**FR-9.2: Integration Test Setup**
- API endpoint integration tests
- Test database setup (separate from dev)
- Database seeding for tests
- Acceptance: Integration testler API endpoint'leri doğru test eder

**FR-9.3: E2E Test Setup**
- Critical user journey E2E tests (auth flow, user CRUD)
- E2E test environment isolation
- Database reset between tests
- Acceptance: E2E testler complete flow'ları test eder

**FR-9.4: Test Coverage Reporting**
- Coverage report generation (Istanbul)
- Coverage threshold enforcement (70% minimum)
- Coverage badges for README
- Acceptance: Coverage %70+ olmadan CI/CD fail olur

**Domain Constraints:**
- Test database production data içermemeli
- Tests birbirinden bağımsız olmalı (isolation)
- Tests deterministik olmalı (random failure yasak)

---

## FR-10: Development Environment

**Capability:** Docker-based local development setup

**User Value:** Tek komutla çalışır development ortamı

**Requirements:**

**FR-10.1: Docker Compose Setup**
- Application container
- PostgreSQL container
- MongoDB container (optional)
- Redis container (future-ready)
- Hot reload support (volume mount)
- Acceptance: `docker-compose up` ile tüm servisler ayağa kalkar

**FR-10.2: Environment Configuration**
- .env.example template
- Environment variable validation on startup
- Separate configs: development, staging, production, test
- Acceptance: Tüm required env vars validated, missing ise fail

**FR-10.3: Database Seeding**
- Seed scripts for sample data
- Sample users (admin, user)
- Sample permissions
- Test data for development
- Acceptance: `npm run seed` ile database sample data ile doldurulur

**Domain Constraints:**
- Development environment production data içermemeli
- Secrets .env.example'a commit edilmemeli (.env.example placeholder içermeli)

---

## FR-11: CI/CD & Deployment

**Capability:** Automated testing ve deployment pipelines

**User Value:** Continuous integration ve automated deployment

**Requirements:**

**FR-11.1: CI Pipeline (GitHub Actions)**
- Automated test run on PR
- Lint check
- Build verification
- Coverage threshold check
- Acceptance: PR'da testler otomatik çalışır, fail olursa merge engelenir

**FR-11.2: CD Pipeline**
- Automated deployment to staging (on merge to develop)
- Automated deployment to production (on tag)
- Database migration execution
- Health check after deployment
- Acceptance: Deployment otomatik, başarısız olursa rollback

**FR-11.3: Docker Image Build**
- Multi-stage Docker build
- Production-optimized image
- Image push to container registry
- Acceptance: Docker image başarıyla build edilir, registry'e push olur

**Domain Constraints:**
- Production deployment manual approval gerektirebilir
- Database migrations deployment öncesi test edilmeli
- Rollback strategy tanımlı olmalı

---

## FR-12: Code Quality & Standards

**Capability:** Consistent code style ve quality enforcement

**User Value:** Kod okunabilirliği ve maintainability

**Requirements:**

**FR-12.1: ESLint Configuration**
- NestJS best practices rules
- TypeScript strict rules
- Custom company rules (will be defined)
- Auto-fix on save
- Acceptance: ESLint kuralları enforce edilir, violations CI'da fail olur

**FR-12.2: Prettier Configuration**
- Consistent code formatting
- Auto-format on save
- Integration with ESLint
- Acceptance: Kod otomatik formatlanır, inconsistent format commit edilemez

**FR-12.3: Pre-commit Hooks (Husky)**
- Lint check before commit
- Format check before commit
- Optional test run before commit
- Acceptance: Bad code commit edilemez

**FR-12.4: TypeScript Strict Mode**
- strict: true
- noImplicitAny: true
- strictNullChecks: true
- strictFunctionTypes: true
- Acceptance: TypeScript strict mode violations compile error verir

---

**Requirements Traceability:**

Tüm functional requirement'lar aşağıdaki bölümlere trace edilebilir:
- **Product Scope (MVP):** 12 core feature category
- **Success Criteria:** Zaman tasarrufu, kalite standardizasyonu
- **API Specifications:** Endpoint design, authentication model
- **Product Magic:** 1 hafta → 1 gün setup, Prisma öğrenme ortamı, enterprise-ready modüller

---
