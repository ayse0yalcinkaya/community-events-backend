# Epic Technical Specification: Document Generation (Adapter Pattern - hrsync-backend)

Date: 2025-11-07
Author: BMad
Epic ID: 6
Status: Draft

---

## Overview

Epic 6, Boilerplate projesine production-ready document generation yeteneği kazandıran kritik bir epic'tir. hrsync-backend projesinden kanıtlanmış adapter pattern mimarisi kullanılarak, PDF ve Excel doküman üretimi için extensible ve maintainable bir sistem oluşturulur. Bu epic tamamlandığında, geliştiriciler kolayca yeni document adapter'ları ekleyebilecek, template-based PDF generation ve advanced Excel features ile business reporting ihtiyaçlarını karşılayabilecekler.

PRD'de tanımlanan "Document Generation Module" gereksinimlerinin tam implementasyonu bu epic ile sağlanır. Adapter pattern, factory-based auto-discovery, SHA-256 hash-based caching, S3 entegrasyonu ve exponential backoff retry mechanism ile production-grade bir document generation infrastructure oluşturulur.

## Objectives and Scope

### In Scope

**✅ Adapter Pattern Architecture**
- BasePdfAdapter abstract class (template-based PDF generation)
- BaseExcelAdapter abstract class (workbook building with helper methods)
- IPdfAdapter ve IExcelAdapter interfaces
- @RegisterPdfAdapter ve @RegisterExcelAdapter decorators (auto-discovery)
- PdfAdapterFactory ve ExcelAdapterFactory (auto-discovery via reflection)

**✅ PDF Generation (EJS + Puppeteer)**
- TemplateEngineService (EJS rendering with i18n support)
- Puppeteer integration (reusable browser instance, HTML→PDF conversion)
- Template directory structure (`templates/pdf/*.ejs`, `templates/pdf/styles/*.css`)
- CSS styling support, A4 format, printBackground, margins
- Browser lifecycle management (init on module start, close on destroy)

**✅ Excel Generation (ExcelJS)**
- ExcelJS workbook building
- Helper methods: applyCellStyle, addFormula, applyAutoFilter, freezePanes, mergeCells, addDataValidation, setColumnWidths
- Multiple worksheet support
- Advanced features: formulas (SUM, AVERAGE), data validation, cell merging, number formatting

**✅ Document Generator Service (Orchestration)**
- Main generate() method (PDF | EXCEL)
- Cache check (SHA-256 hash-based)
- S3 upload integration
- GenerationResult interface (success, fileUrl, cached, generationTime, metadata)
- DocumentGeneratorOptions interface (templateName, data, lang, s3Options, cacheStrategy, cacheTtl)

**✅ Caching System (SHA-256 Hash-Based)**
- CacheService (NestJS cache-manager integration)
- Cache key generation: `doc:{type}:{template}:{dataHash}`
- Data hashing: SHA-256 of sorted JSON (consistent hash)
- TTL support (default 1 hour, configurable)
- Cache strategies: TEMPLATE_HASH, NO_CACHE

**✅ Retry Service (Exponential Backoff)**
- RetryService (max 3 attempts)
- Exponential backoff: 2^(attempt-1) * baseDelay (1000ms)
- Delay sequence: 0ms → 1000ms → 2000ms
- Context-based logging

**✅ S3 Integration**
- Document upload to S3 (via AwsService from Epic 4)
- Pre-signed URL generation
- ACL configuration (private, public-read, public-read-write)
- Content-Type detection (application/pdf, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet)

**✅ Multi-language Support (i18n)**
- nestjs-i18n integration
- Translation function injection into templates (`t()` function)
- Language-specific document rendering
- Fallback language: English

**✅ Custom Exceptions**
- AdapterNotFoundException
- TemplateNotFoundException
- GenerationFailedException

**✅ Sample Adapters**
- InvoicePdfAdapter (sample PDF adapter)
- SalesReportExcelAdapter (sample Excel adapter)

### Out of Scope

**❌ Document Template Management UI:** Epic 6.3'te (template CRUD endpoints)
**❌ Document History Tracking:** Future enhancement (audit trail)
**❌ Document Preview:** Future enhancement (preview before generation)
**❌ Batch Document Generation:** Future enhancement (queue-based)
**❌ Document Versioning:** Future enhancement (template versioning)
**❌ Advanced Charting:** Excel charts placeholder (future)
**❌ Document Watermarking:** Future enhancement
**❌ Document Encryption:** Future enhancement (PDF encryption)

## System Architecture Alignment

Bu epic, architecture dokümanında tanımlanan **Modular Monolith** yaklaşımına uygun olarak `modules/document-generator/` altında izole bir modül olarak implement edilir:

**Module Structure:**
```
src/modules/document-generator/
├── document-generator.module.ts
├── base/
│   ├── base-pdf-adapter.abstract.ts
│   └── base-excel-adapter.abstract.ts
├── adapters/
│   ├── pdf/
│   └── excel/
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
├── exceptions/
└── templates/
    └── pdf/
```

**Architecture Constraints:**
- **Dependency Injection:** NestJS ModuleRef kullanarak adapter auto-discovery
- **Caching:** NestJS cache-manager (memory default, Redis Phase 2)
- **S3 Integration:** Epic 4'ten AwsService kullanımı (dependency)
- **i18n Integration:** Epic 7'den nestjs-i18n service injection
- **Multi-tenancy:** domainID context (implicit via user context, documents S3'te tenant-isolated paths)
- **Error Handling:** Custom exceptions + Sentry integration (Epic 7)
- **Logging:** Structured logging (Epic 7)

**Integration Points:**
- **Epic 4 (Files/S3):** AwsService kullanımı (document upload)
- **Epic 7 (i18n):** nestjs-i18n service (template translations)
- **Epic 1 (Database):** PrismaService (optional: document metadata tracking - future)

## Detailed Design

### Services and Modules

| Service/Module | Responsibilities | Inputs | Outputs | Dependencies |
|----------------|------------------|--------|--------|--------------|
| **DocumentGeneratorService** | Main orchestration service. Handles cache check, adapter retrieval, document generation, S3 upload, cache update. | DocumentType, DocumentGeneratorOptions | GenerationResult | CacheService, RetryService, AwsService, PdfAdapterFactory, ExcelAdapterFactory, I18nService |
| **TemplateEngineService** | EJS template rendering with i18n support. Puppeteer HTML→PDF conversion. Browser lifecycle management. | templatePath, data, lang, cssPath? | Buffer (PDF) | I18nService, Puppeteer |
| **CacheService** | SHA-256 hash-based caching. Cache key generation, data hashing, TTL management. | documentType, templateName, data, ttl? | string \| null (cached S3 URL) | @nestjs/cache-manager |
| **RetryService** | Exponential backoff retry mechanism for S3 uploads. | operation function, context string | T (operation result) | - |
| **PdfAdapterFactory** | Auto-discovery of PDF adapters via reflection. Adapter instance caching. | templateName | IPdfAdapter | ModuleRef, Reflection metadata |
| **ExcelAdapterFactory** | Auto-discovery of Excel adapters via reflection. Adapter instance caching. | adapterName | IExcelAdapter | ModuleRef, Reflection metadata |
| **BasePdfAdapter** | Abstract base class for PDF adapters. Template path resolution, style path resolution. | - | - | TemplateEngineService |
| **BaseExcelAdapter** | Abstract base class for Excel adapters. Workbook creation, helper methods (styling, formulas, filters). | - | Buffer (Excel) | ExcelJS |

### Data Models and Contracts

**No Database Entities Required (Epic 6):**
Document generation modülü stateless çalışır. Document metadata (file URL, generation time, cache status) GenerationResult interface'inde döner. S3'te saklanan dosyalar Epic 4'ün File entity'si ile ilişkilendirilebilir (future enhancement).

**Interfaces:**

```typescript
// IPdfAdapter Interface
interface IPdfAdapter {
  readonly templateName: string;
  readonly styleName?: string;
  generate(templateName: string, data: any, lang: string): Promise<Buffer>;
  getTemplatePath(): string;
  getStylePath(): string | null;
}

// IExcelAdapter Interface
interface IExcelAdapter {
  readonly adapterName: string;
  generate(data: any, lang: string): Promise<Buffer>;
  buildWorkbook(workbook: ExcelJS.Workbook, data: any, lang: string): Promise<void>;
}

// DocumentGeneratorOptions Interface
interface DocumentGeneratorOptions {
  templateName: string;        // Template/adapter name
  data: any;                   // Data for generation
  lang: string;                // Language code (en, tr)
  s3Options: {
    path: string;              // S3 folder path
    filename?: string;          // Optional filename (auto-generated if not provided)
    contentType?: string;       // MIME type (auto-detected if not provided)
    acl?: 'private' | 'public-read' | 'public-read-write';
  };
  cacheStrategy?: CacheStrategy;  // TEMPLATE_HASH (default) | NO_CACHE
  cacheTtl?: number;           // Cache TTL in ms (default 3600000 = 1 hour)
  metadata?: any;              // Optional metadata
}

// GenerationResult Interface
interface GenerationResult {
  success: boolean;
  fileUrl: string;             // S3 URL
  cached: boolean;              // Cache hit/miss
  generatedAt: Date;
  fileSize?: number;            // In bytes
  generationTime?: number;      // In milliseconds
  metadata?: any;
}

// Enums
enum DocumentType {
  PDF = 'PDF',
  EXCEL = 'EXCEL'
}

enum CacheStrategy {
  TEMPLATE_HASH = 'TEMPLATE_HASH',  // Cache based on template + data hash
  NO_CACHE = 'NO_CACHE'             // Skip caching, always generate fresh
}
```

**Base Adapter Abstract Classes:**

```typescript
// BasePdfAdapter Abstract Class
abstract class BasePdfAdapter implements IPdfAdapter {
  abstract readonly templateName: string;
  abstract readonly styleName?: string;

  constructor(protected readonly templateEngine: TemplateEngineService) {}

  abstract async generate(templateName: string, data: any, lang: string): Promise<Buffer>;

  getTemplatePath(): string {
    return path.join(process.cwd(), 'templates', 'pdf', `${this.templateName}.ejs`);
  }

  getStylePath(): string | null {
    if (!this.styleName) return null;
    return path.join(process.cwd(), 'templates', 'pdf', 'styles', `${this.styleName}.css`);
  }
}

// BaseExcelAdapter Abstract Class
abstract class BaseExcelAdapter implements IExcelAdapter {
  abstract readonly adapterName: string;

  abstract async buildWorkbook(workbook: ExcelJS.Workbook, data: any, lang: string): Promise<void>;

  async generate(data: any, lang: string): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Boilerplate Document Generator';
    await this.buildWorkbook(workbook, data, lang);
    return await workbook.xlsx.writeBuffer();
  }

  // Helper methods (protected)
  protected applyCellStyle(cell: ExcelJS.Cell, style: Partial<ExcelJS.Style>): void;
  protected addFormula(cell: ExcelJS.Cell, formula: string): void;
  protected applyAutoFilter(worksheet: ExcelJS.Worksheet, range: string): void;
  protected freezePanes(worksheet: ExcelJS.Worksheet, options: { row?: number; column?: number }): void;
  protected mergeCells(worksheet: ExcelJS.Worksheet, range: string): void;
  protected addDataValidation(cell: ExcelJS.Cell, validation: ExcelJS.DataValidation): void;
  protected setColumnWidths(worksheet: ExcelJS.Worksheet, widths: Array<{ key: string; width: number }>): void;
}
```

### APIs and Interfaces

**Document Generator Service API:**

```typescript
// Main Generation Method
async generate(
  documentType: DocumentType,
  options: DocumentGeneratorOptions
): Promise<GenerationResult>

// Example Usage
const result = await documentGeneratorService.generate(DocumentType.PDF, {
  templateName: 'invoice',
  data: {
    invoiceNumber: 'INV-001',
    date: '2025-11-07',
    customerName: 'Acme Corp',
    items: [
      { description: 'Service A', quantity: 2, unitPrice: 1000, total: 2000 }
    ],
    subtotal: 2000,
    taxAmount: 360,
    total: 2360
  },
  lang: 'en',
  s3Options: {
    path: 'invoices',
    filename: 'invoice-001.pdf',
    acl: 'public-read'
  },
  cacheStrategy: CacheStrategy.TEMPLATE_HASH,
  cacheTtl: 3600000  // 1 hour
});

// Result:
// {
//   success: true,
//   fileUrl: 'https://s3.amazonaws.com/bucket/invoices/invoice-001.pdf',
//   cached: false,
//   generatedAt: Date,
//   fileSize: 45678,
//   generationTime: 1234,
//   metadata: { orderId: '123' }
// }
```

**Factory APIs:**

```typescript
// PdfAdapterFactory
class PdfAdapterFactory {
  onModuleInit(): void;  // Auto-discover adapters
  getAdapter(templateName: string): IPdfAdapter;  // Get adapter instance (cached)
  getRegisteredTemplates(): string[];  // List all template names
}

// ExcelAdapterFactory
class ExcelAdapterFactory {
  onModuleInit(): void;  // Auto-discover adapters
  getAdapter(adapterName: string): IExcelAdapter;  // Get adapter instance (cached)
  getRegisteredAdapters(): string[];  // List all adapter names
}
```

**Error Codes:**

- `ADAPTER_NOT_FOUND`: Adapter bulunamadığında (404)
- `TEMPLATE_NOT_FOUND`: Template dosyası bulunamadığında (404)
- `GENERATION_FAILED`: Document generation sırasında hata oluştuğunda (500)
- `S3_UPLOAD_FAILED`: S3 upload başarısız olduğunda (retry sonrası 500)

### Workflows and Sequencing

**Document Generation Flow (PDF/Excel):**

```
┌─────────────────────────────────────────────────────────────┐
│                    Client Request                           │
│  POST /api/documents/generate                               │
│  { documentType: 'PDF', templateName: 'invoice', ... }      │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│            DocumentGeneratorService.generate()              │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
         ┌───────────────────────┐
         │ Cache Strategy Check │
         └───────────┬───────────┘
                     │
         ┌───────────┴───────────┐
         │                       │
    TEMPLATE_HASH            NO_CACHE
         │                       │
         ▼                       ▼
┌──────────────────┐    ┌──────────────────┐
│  CacheService     │    │  Skip Cache      │
│  generateKey()    │    │  Check           │
│  get(cacheKey)    │    └────────┬─────────┘
└────────┬──────────┘              │
         │                         │
         ▼                         │
    Cache Hit?                     │
         │                         │
    ┌────┴────┐                    │
    │        │                    │
   Yes      No                    │
    │        │                    │
    │        └────────┬───────────┘
    │                 │
    │                 ▼
    │      ┌──────────────────────┐
    │      │ Get Adapter Factory  │
    │      │ (PDF or Excel)       │
    │      └──────────┬───────────┘
    │                 │
    │                 ▼
    │      ┌──────────────────────┐
    │      │ Factory.getAdapter() │
    │      │ (cached instance)    │
    │      └──────────┬───────────┘
    │                 │
    │                 ▼
    │      ┌──────────────────────┐
    │      │ Adapter.generate()   │
    │      │ (PDF: TemplateEngine │
    │      │  Excel: buildWorkbook│
    │      └──────────┬───────────┘
    │                 │
    │                 ▼
    │      ┌──────────────────────┐
    │      │ Generate Document   │
    │      │ Buffer               │
    │      └──────────┬───────────┘
    │                 │
    │                 ▼
    │      ┌──────────────────────┐
    │      │ RetryService         │
    │      │ executeWithRetry()   │
    │      │ (S3 upload)           │
    │      └──────────┬───────────┘
    │                 │
    │                 ▼
    │      ┌──────────────────────┐
    │      │ AwsService.upload()   │
    │      │ (S3 upload)           │
    │      └──────────┬───────────┘
    │                 │
    │                 ▼
    │      ┌──────────────────────┐
    │      │ CacheService.set()    │
    │      │ (update cache)       │
    │      └──────────┬───────────┘
    │                 │
    └─────────────────┘
                     │
                     ▼
         ┌───────────────────────┐
         │ Return GenerationResult│
         │ { success, fileUrl,   │
         │   cached, ... }       │
         └───────────────────────┘
```

**PDF Generation Detailed Flow:**

```
1. InvoicePdfAdapter.generate() called
2. TemplateEngineService.renderTemplate():
   - Load EJS template from templates/pdf/invoice.ejs
   - Inject i18n t() function into data: { ...data, t: (key) => translate(key) }
   - Render template → HTML string
3. TemplateEngineService.generatePdfFromHtml():
   - Get Puppeteer browser instance (shared, initialized on module init)
   - Create new page
   - Set HTML content + CSS (from templates/pdf/styles/invoice.css)
   - Generate PDF: page.pdf({ format: 'A4', printBackground: true, margins: { top: '20px', ... } })
   - Close page
   - Return Buffer
4. Return PDF Buffer to DocumentGeneratorService
```

**Excel Generation Detailed Flow:**

```
1. SalesReportExcelAdapter.generate() called
2. BaseExcelAdapter.generate():
   - Create new ExcelJS Workbook
   - Set creator: 'Boilerplate Document Generator'
   - Call buildWorkbook(workbook, data, lang)
3. SalesReportExcelAdapter.buildWorkbook():
   - Add worksheet: 'Sales'
   - Define columns: [{ header: 'Date', key: 'date', width: 15 }, ...]
   - Style header row: applyCellStyle() with bold font, dark background
   - Add data rows: data.sales.forEach(sale => worksheet.addRow(sale))
   - Add features:
     * applyAutoFilter('A1:C100')
     * freezePanes({ row: 2, column: 1 })
     * addFormula() for totals
   - Return void
4. BaseExcelAdapter.generate() continues:
   - workbook.xlsx.writeBuffer() → Buffer
   - Return Buffer to DocumentGeneratorService
```

**Retry Mechanism Flow (S3 Upload):**

```
1. RetryService.executeWithRetry(async () => s3.upload(buffer), 'S3 upload: invoice-001.pdf')
2. Attempt 1: Execute immediately
   - Success → Return result
   - Failure → Log error, wait 1000ms
3. Attempt 2: Retry after 1000ms delay
   - Success → Log success, return result
   - Failure → Log error, wait 2000ms
4. Attempt 3: Retry after 2000ms delay
   - Success → Log success, return result
   - Failure → Throw last error (all attempts failed)
```

## Non-Functional Requirements

### Performance

**Document Generation Performance Targets:**

- **Small Documents (< 10 pages PDF, < 1000 rows Excel):**
  - Target: < 5 seconds (p95)
  - Strategy: In-memory generation, template caching, Puppeteer browser reuse
  
- **Medium Documents (10-50 pages PDF, 1000-10000 rows Excel):**
  - Target: < 15 seconds (p95)
  - Strategy: Optimized template rendering, efficient Excel workbook building
  
- **Large Documents (> 50 pages PDF, > 10000 rows Excel):**
  - Target: Async processing (future: BullMQ queue)
  - Strategy: Background job, notification on completion (Phase 2)

**Cache Performance:**
- Cache hit response time: < 50ms (p95)
- Cache key generation: < 10ms (SHA-256 hash)
- Cache lookup: O(1) via NestJS cache-manager

**S3 Upload Performance:**
- Upload time: < 2 seconds for documents up to 10MB
- Retry mechanism: Max 3 attempts, total delay ~3 seconds
- Pre-signed URL generation: < 100ms

**Puppeteer Browser Performance:**
- Browser initialization: One-time on module init (~2-3 seconds)
- Page creation: < 100ms per document
- PDF generation: < 3 seconds for typical documents (A4, 1-10 pages)

**Performance Monitoring:**
- Log generation time in GenerationResult
- Track cache hit/miss rates
- Monitor Puppeteer memory usage (browser instance reuse)

**Reference:** PRD NFR-1.1 (Document generation: < 5s for small documents, async for large ones)

### Security

**Template Security:**
- Template files must exist in file system before generation (no remote template loading)
- Template path validation: Prevent directory traversal attacks (path must be within `templates/pdf/` directory)
- EJS template injection prevention: Sanitize user-provided data before template rendering

**S3 Security:**
- Pre-signed URLs: 15 minutes expiration (configurable)
- ACL configuration: Default 'public-read', configurable per document
- S3 bucket isolation: Environment-specific buckets (dev, staging, production)
- Access control: Documents accessible only via pre-signed URLs (no direct S3 access)

**Data Privacy:**
- Sensitive data in templates: No PII (phone numbers, emails) in document metadata unless required
- Cache keys: Do not include sensitive data (use hash instead)
- Logging: Exclude sensitive data from generation logs

**Authentication & Authorization:**
- Document generation endpoints: Protected by JWT authentication (Epic 2)
- Permission-based access: `DOCUMENTS.GENERATE` permission required (Epic 3)
- Multi-tenancy: Documents stored in tenant-isolated S3 paths (domainID-based)

**Threat Mitigation:**
- **Template Injection:** EJS template data sanitization, no user-controlled template paths
- **DoS via Large Documents:** Timeout limits (30 seconds for Puppeteer), document size limits (future)
- **Cache Poisoning:** SHA-256 hash ensures consistent cache keys, no user-controlled cache keys

**Reference:** PRD NFR-2 (Security Requirements), Architecture Security Architecture section

### Reliability/Availability

**Availability Target:**
- Document generation service: 99% uptime (aligned with overall system target)
- Graceful degradation: If S3 upload fails after retries, return error (do not crash)

**Error Recovery:**
- **S3 Upload Failures:** Exponential backoff retry (3 attempts, ~3 seconds total delay)
- **Template Not Found:** Clear error message, no fallback (fail fast)
- **Puppeteer Crashes:** Browser instance recreation on error, module restart if persistent
- **Cache Failures:** Continue without cache (log warning, generate fresh document)

**Browser Instance Management:**
- **Initialization:** Browser launched on module init (onModuleInit lifecycle hook)
- **Cleanup:** Browser closed on module destroy (onModuleDestroy lifecycle hook)
- **Error Recovery:** If browser crashes, recreate on next PDF generation request
- **Resource Management:** One browser instance shared across all PDF generations (performance optimization)

**Data Consistency:**
- Cache invalidation: Manual via delete() or TTL expiry (no automatic invalidation)
- Document generation: Idempotent (same input → same output, cache ensures consistency)

**Degradation Behavior:**
- **Cache unavailable:** Generate fresh documents (slower but functional)
- **S3 unavailable:** Return error after retries (do not store locally)
- **i18n unavailable:** Fallback to English (default language)

**Reference:** PRD NFR-3.3 (Reliability: 99% uptime target, graceful degradation)

### Observability

**Logging Requirements:**

**Structured Logging (JSON format):**
```json
{
  "timestamp": "2025-11-07T12:00:00.000Z",
  "level": "info",
  "message": "Document generated successfully",
  "context": {
    "module": "DocumentGeneratorService",
    "method": "generate",
    "documentType": "PDF",
    "templateName": "invoice",
    "cacheHit": false,
    "generationTime": 1234,
    "fileSize": 45678
  },
  "meta": {
    "s3Url": "https://s3.amazonaws.com/bucket/invoices/invoice-001.pdf",
    "lang": "en"
  }
}
```

**Log Events:**
- Document generation start/complete (with timing)
- Cache hit/miss events
- S3 upload attempts (with retry count)
- Adapter retrieval (template name, adapter name)
- Template rendering (template path, rendering time)
- Puppeteer browser lifecycle (init, destroy, crash recovery)

**Error Logging:**
- AdapterNotFoundException: Log template name, available adapters
- TemplateNotFoundException: Log template path, file system check result
- GenerationFailedException: Log error details, stack trace, context
- S3 upload failures: Log retry attempts, final error

**Metrics to Track:**
- Document generation count (by type: PDF/Excel)
- Cache hit rate (hit/miss ratio)
- Average generation time (by document type)
- S3 upload success rate (after retries)
- Puppeteer browser crashes (count, recovery time)

**Tracing:**
- Request ID propagation: Include request ID in all logs
- Generation flow tracing: Track document generation from request to S3 upload

**Monitoring Alerts:**
- High error rate: > 5% generation failures
- Slow generation: > 10 seconds average generation time
- Cache miss rate: < 50% cache hit rate (indicates cache issues)
- S3 upload failures: > 10% failure rate after retries

**Reference:** PRD NFR-6 (Observability & Monitoring), Architecture Monitoring & Observability section

## Dependencies and Integrations

### External Dependencies (NPM Packages)

**Required Dependencies (to be added):**

| Package | Version | Purpose | Epic Dependency |
|---------|---------|---------|----------------|
| `ejs` | ^3.1.x | EJS template engine for PDF templates | Epic 6 |
| `puppeteer` | ^21.x | Headless Chrome for HTML→PDF conversion | Epic 6 |
| `exceljs` | ^4.x | Excel workbook generation and manipulation | Epic 6 |
| `@nestjs/cache-manager` | ^2.x | NestJS cache manager integration | Epic 6 |
| `cache-manager` | ^5.x | Cache manager implementation (memory store) | Epic 6 |

**Existing Dependencies (already in package.json):**

| Package | Version | Purpose | Used By |
|---------|---------|---------|---------|
| `@aws-sdk/client-s3` | ^3.925.0 | AWS S3 SDK for document upload | Epic 4 (AwsService) |
| `@aws-sdk/s3-request-presigner` | ^3.925.0 | Pre-signed URL generation | Epic 4 (AwsService) |
| `nestjs-i18n` | ^10.5.1 | Internationalization service | Epic 7 |
| `@nestjs/common` | ^11.0.1 | NestJS core (ModuleRef, Injectable, etc.) | All modules |
| `@nestjs/core` | ^11.0.1 | NestJS core framework | All modules |
| `reflect-metadata` | ^0.2.2 | Reflection metadata for decorators | Adapter factories |

### Internal Module Dependencies

**Epic 4 (File Management - AWS S3):**
- **AwsService:** Document upload to S3, pre-signed URL generation
- **Integration:** DocumentGeneratorService → AwsService.upload()
- **Dependency Type:** Required (Epic 4 must be completed before Epic 6)

**Epic 7 (Developer Infrastructure - i18n):**
- **I18nService:** Translation service for multi-language document generation
- **Integration:** TemplateEngineService → I18nService.translate()
- **Dependency Type:** Required (Epic 7 must be completed before Epic 6)

**Epic 1 (Database Infrastructure):**
- **PrismaService:** Optional future enhancement (document metadata tracking)
- **Integration:** Future: DocumentGeneratorService → PrismaService (document history)
- **Dependency Type:** Optional (not required for Epic 6 MVP)

**Epic 2 (Authentication):**
- **JWT Authentication:** Document generation endpoints protected by JWT
- **Integration:** Controller-level guards (@UseGuards(JwtAuthGuard))
- **Dependency Type:** Required (Epic 2 must be completed before Epic 6)

**Epic 3 (Permissions):**
- **Permission System:** Document generation requires `DOCUMENTS.GENERATE` permission
- **Integration:** Controller-level guards (@RequirePermissions('DOCUMENTS.GENERATE'))
- **Dependency Type:** Required (Epic 3 must be completed before Epic 6)

### External Service Integrations

**AWS S3:**
- **Service:** AWS S3 (via AwsService from Epic 4)
- **Purpose:** Document storage, pre-signed URL generation
- **Configuration:** Environment variables (AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, S3_BUCKET)
- **ACL Options:** private, public-read, public-read-write
- **URL Expiration:** 15 minutes (configurable)

**Reference Implementation:**
- **Module Source:** `/Users/ahmet/Documents/Bitbucket/hrsync-backend/src/document-generator`
- **Note:** Module can be copied from hrsync-backend (TypeORM → Prisma adaptation needed if database entities used)

### System Dependencies

**Node.js:**
- **Version:** v20.x LTS (required for Puppeteer)
- **Note:** Puppeteer requires Node.js 18+ for headless Chrome

**Chrome/Chromium:**
- **Provided By:** Puppeteer (bundled Chromium)
- **Version:** Latest stable (managed by Puppeteer)
- **Note:** No manual installation required

### Version Constraints

**Critical Version Constraints:**
- **Puppeteer:** ^21.x (latest stable, Node.js 20+ compatible)
- **ExcelJS:** ^4.x (latest stable, TypeScript support)
- **EJS:** ^3.1.x (latest stable, security patches)
- **@nestjs/cache-manager:** ^2.x (NestJS 11 compatible)

**Compatibility Notes:**
- All dependencies must be compatible with NestJS v11.x
- TypeScript v5.3+ required (strict mode)
- Node.js v20.x LTS required (Puppeteer compatibility)

### Integration Points Summary

```
DocumentGeneratorModule
├── Depends on:
│   ├── Epic 4: AwsService (S3 upload)
│   ├── Epic 7: I18nService (translations)
│   ├── Epic 2: JWT Auth (endpoint protection)
│   └── Epic 3: Permissions (authorization)
│
├── External Services:
│   └── AWS S3 (via AwsService)
│
└── External Libraries:
    ├── Puppeteer (PDF generation)
    ├── ExcelJS (Excel generation)
    ├── EJS (template rendering)
    └── @nestjs/cache-manager (caching)
```

## Acceptance Criteria (Authoritative)

### Story 6.1: Base Excel Adapter & Interface

1. **IExcelAdapter Interface:** Interface defined at `src/modules/document-generator/interfaces/excel-adapter.interface.ts` with `adapterName`, `generate()`, and `buildWorkbook()` methods.
2. **BaseExcelAdapter Abstract Class:** Abstract class at `src/modules/document-generator/base/base-excel-adapter.abstract.ts` with abstract `adapterName` property and `buildWorkbook()` method, implemented `generate()` method, and helper methods (applyCellStyle, addFormula, applyAutoFilter, freezePanes, mergeCells, addDataValidation, setColumnWidths, createChart placeholder).
3. **@RegisterExcelAdapter Decorator:** Decorator at `src/modules/document-generator/decorators/register-excel-adapter.decorator.ts` that registers Excel adapters with reflection metadata `EXCEL_ADAPTER_NAME_KEY` and normalizes adapter name (trim, lowercase).

### Story 6.2: Base PDF Adapter & Template Engine

4. **IPdfAdapter Interface:** Interface defined at `src/modules/document-generator/interfaces/pdf-adapter.interface.ts` with `templateName`, `styleName?`, `generate()`, `getTemplatePath()`, and `getStylePath()` methods.
5. **BasePdfAdapter Abstract Class:** Abstract class at `src/modules/document-generator/base/base-pdf-adapter.abstract.ts` with abstract `templateName` and `styleName?` properties, abstract `generate()` method, and implemented `getTemplatePath()` and `getStylePath()` methods.
6. **@RegisterPdfAdapter Decorator:** Decorator at `src/modules/document-generator/decorators/register-pdf-adapter.decorator.ts` that registers PDF adapters with reflection metadata `PDF_ADAPTER_TEMPLATE_KEY` and normalizes template name (trim, lowercase).
7. **TemplateEngineService:** Service at `src/modules/document-generator/services/template-engine.service.ts` with `renderTemplate()` method (EJS rendering with i18n `t()` function injection) and `generatePdfFromHtml()` method (Puppeteer HTML→PDF conversion with reusable browser instance, A4 format, printBackground, margins, 30s timeout).
8. **Browser Lifecycle:** Puppeteer browser initialized on module init (`onModuleInit()`), closed on module destroy (`onModuleDestroy()`), new page created per PDF generation, page closed after generation.
9. **Template Directory Structure:** Templates stored at `templates/pdf/*.ejs` and styles at `templates/pdf/styles/*.css`.

### Story 6.3: Adapter Factories (Auto-Discovery)

10. **PdfAdapterFactory:** Factory at `src/modules/document-generator/factories/pdf-adapter.factory.ts` with `onModuleInit()` lifecycle hook that scans providers, finds `@RegisterPdfAdapter` decorated classes, builds adapter registry, `getAdapter(templateName)` method returns cached adapter instance (lazy init via NestJS DI), and `getRegisteredTemplates()` method lists all template names.
11. **ExcelAdapterFactory:** Factory at `src/modules/document-generator/factories/excel-adapter.factory.ts` with same pattern as PdfAdapterFactory, `onModuleInit()` scans and registers Excel adapters, `getAdapter(adapterName)` returns cached adapter instance, and `getRegisteredAdapters()` lists all adapter names.
12. **Custom Exceptions:** Exceptions defined: `AdapterNotFoundException(templateName, type)`, `TemplateNotFoundException(templatePath)`, `GenerationFailedException(message, context)`.

### Story 6.4: Document Generator Service (Orchestration)

13. **DocumentGeneratorService:** Service at `src/modules/document-generator/services/document-generator.service.ts` with dependencies: CacheService, RetryService, AwsService, PdfAdapterFactory, ExcelAdapterFactory, I18nService.
14. **generate() Method:** Method signature `async generate(documentType: DocumentType, options: DocumentGeneratorOptions): Promise<GenerationResult>` with correct parameter types and return type.
15. **Generation Flow:** Cache check (if strategy !== NO_CACHE), cache key generation `doc:{type}:{template}:{dataHash}`, cache hit returns cached S3 URL, cache miss: get adapter from factory, generate document, upload to S3 with retry, update cache, return GenerationResult.
16. **Enums:** DocumentType enum with `PDF` and `EXCEL` values, CacheStrategy enum with `TEMPLATE_HASH` and `NO_CACHE` values.
17. **Error Handling:** AdapterNotFoundException when adapter not found, TemplateNotFoundException when template not found, GenerationFailedException when generation fails, S3 upload failures handled by retry mechanism.
18. **Default Values:** Default cache TTL: 1 hour (3600000ms), default cache strategy: TEMPLATE_HASH, default ACL: public-read, S3 filename auto-generation: UUID + extension, Content-Type auto-detection for PDF and Excel.

### Story 6.5: Cache Service (SHA-256 Hash-Based)

19. **CacheService:** Service at `src/modules/document-generator/services/cache.service.ts` with NestJS `@nestjs/cache-manager` integration, default TTL: 1 hour (3600000ms).
20. **Cache Key Generation:** `generateCacheKey(documentType, templateName, data)` method generates key in format `doc:{type}:{template}:{dataHash}` with SHA-256 hash of sorted JSON.
21. **Cache Operations:** `get(key)` retrieves cached S3 URL, `set(key, value, ttl?)` stores S3 URL with TTL, `delete(key)` invalidates cache.
22. **Data Hashing:** `generateDataHash(data)` private method sorts object keys recursively, JSON.stringify, SHA-256 hash (64 hex characters), `sortObjectKeys(obj)` private method handles arrays, objects, primitives recursively.
23. **Cache Module Integration:** CacheModule.register() in DocumentGeneratorModule with TTL: 3600 seconds, max items: 100, memory store (default).

### Story 6.6: Retry Service (Exponential Backoff)

24. **RetryService:** Service at `src/modules/document-generator/services/retry.service.ts` with max attempts: 3, base delay: 1000ms, exponential backoff: 2^(attempt-1) * baseDelay.
25. **executeWithRetry() Method:** Method signature `async executeWithRetry<T>(operation: () => Promise<T>, context: string): Promise<T>` with generic type support.
26. **Retry Logic:** Attempt 1 executes immediately, Attempt 2 waits 1000ms then retries, Attempt 3 waits 2000ms then retries, success returns result, all attempts fail throws last error.
27. **Logging:** Logs each attempt with context, logs retry delay, logs success on retry, logs final failure.

### Story 6.7: Document Generator Module & Example Adapters

28. **DocumentGeneratorModule:** Module at `src/modules/document-generator/document-generator.module.ts` with CacheModule.register() import, all services as providers (DocumentGeneratorService, CacheService, RetryService, TemplateEngineService), AwsService import, adapter factories as providers, sample adapters as providers, exports DocumentGeneratorService and factories.
29. **Sample PDF Adapter:** InvoicePdfAdapter example with template `templates/pdf/invoice.ejs`, style `templates/pdf/styles/invoice.css`, data structure with invoiceNumber, date, customerName, items[], subtotal, taxAmount, total.
30. **Sample Excel Adapter:** SalesReportExcelAdapter example with worksheet 'Sales', columns (Date, Product, Quantity, Unit Price, Total), header styling, formulas (SUM), auto-filter, freeze panes.
31. **Module Structure:** Complete module structure matches architecture specification with all required folders and files.

## Traceability Mapping

| AC # | Acceptance Criteria | PRD Section | Architecture Section | Component(s)/API(s) | Test Idea |
|------|-------------------|-------------|---------------------|---------------------|-----------|
| 1-3 | Excel Adapter Interface & Base Class | FR-6.1 (Adapter Architecture) | Technology Stack: ExcelJS | `IExcelAdapter`, `BaseExcelAdapter`, `@RegisterExcelAdapter` | Unit test: BaseExcelAdapter.generate() creates workbook, calls buildWorkbook(), returns buffer |
| 4-9 | PDF Adapter Interface & Template Engine | FR-6.2 (PDF Generation) | Technology Stack: EJS + Puppeteer | `IPdfAdapter`, `BasePdfAdapter`, `TemplateEngineService`, `@RegisterPdfAdapter` | Integration test: TemplateEngineService renders EJS template with i18n, generates PDF via Puppeteer |
| 10-12 | Adapter Factories | FR-6.1 (Factory Pattern) | Architecture: Module Structure | `PdfAdapterFactory`, `ExcelAdapterFactory`, Reflection metadata | Unit test: Factory.onModuleInit() discovers adapters, getAdapter() returns cached instance |
| 13-18 | Document Generator Service | FR-6.4 (Orchestration) | Architecture: Service Layer | `DocumentGeneratorService.generate()`, `GenerationResult` | Integration test: Full generation flow (cache check → adapter → S3 upload → cache update) |
| 19-23 | Cache Service | FR-6.5 (Caching) | Technology Stack: Cache Manager | `CacheService`, SHA-256 hashing | Unit test: generateCacheKey() produces consistent hash for same data, cache hit/miss scenarios |
| 24-27 | Retry Service | FR-6.7 (Retry Mechanism) | Architecture: Error Handling | `RetryService.executeWithRetry()` | Unit test: Retry logic with exponential backoff, max attempts enforcement |
| 28-31 | Module & Sample Adapters | FR-6.9 (Module Structure) | Architecture: Module Structure | `DocumentGeneratorModule`, sample adapters | E2E test: Generate PDF invoice and Excel sales report, verify S3 upload, cache behavior |

## Risks, Assumptions, Open Questions

### Risks

**Risk 1: Puppeteer Browser Memory Leaks**
- **Description:** Long-running application with shared browser instance may experience memory leaks if pages are not properly closed.
- **Impact:** High (application crashes, degraded performance)
- **Mitigation:** 
  - Ensure page.close() is called in finally block
  - Monitor Puppeteer memory usage
  - Implement browser recreation on error
  - Consider browser restart after N generations (future enhancement)

**Risk 2: S3 Upload Failures After Retries**
- **Description:** If S3 upload fails after 3 retry attempts, document generation fails completely.
- **Impact:** Medium (user experience degradation)
- **Mitigation:**
  - Clear error messages to users
  - Logging for monitoring
  - Future: Queue failed uploads for retry (Phase 2)

**Risk 3: Large Document Generation Timeout**
- **Description:** Large documents (> 50 pages PDF, > 10000 rows Excel) may exceed Puppeteer timeout (30s) or cause memory issues.
- **Impact:** Medium (user experience, system stability)
- **Mitigation:**
  - Current: Clear error messages, timeout limits
  - Future: Async processing with BullMQ queue (Phase 2)

**Risk 4: Cache Key Collisions**
- **Description:** SHA-256 hash collisions (extremely rare but theoretically possible) could return wrong cached document.
- **Impact:** Low (extremely rare)
- **Mitigation:**
  - SHA-256 collision probability is negligible (2^256)
  - Cache key includes template name (additional uniqueness)
  - Monitor cache hit rates for anomalies

**Risk 5: Template Path Security**
- **Description:** Directory traversal attacks if template paths are not properly validated.
- **Impact:** High (security vulnerability)
- **Mitigation:**
  - Validate template paths (must be within `templates/pdf/` directory)
  - Use path.join() and path.resolve() for path construction
  - No user-controlled template paths

### Assumptions

**Assumption 1: Epic 4 (AwsService) Available**
- **Description:** AwsService from Epic 4 will be available and functional when Epic 6 is implemented.
- **Validation:** Verify Epic 4 completion before Epic 6 implementation.
- **Impact if False:** Epic 6 cannot be completed (blocking dependency).

**Assumption 2: Epic 7 (i18n) Available**
- **Description:** nestjs-i18n service will be available for template translations.
- **Validation:** Verify Epic 7 completion before Epic 6 implementation.
- **Impact if False:** Multi-language support will not work (can fallback to English).

**Assumption 3: Template Files Exist**
- **Description:** Template files (EJS templates, CSS styles) will exist in file system before adapter usage.
- **Validation:** Template validation in adapter initialization or first use.
- **Impact if False:** TemplateNotFoundException thrown (fail fast).

**Assumption 4: S3 Bucket Configuration**
- **Description:** S3 bucket is configured and accessible via AwsService.
- **Validation:** Health check or initialization test.
- **Impact if False:** Document upload fails (retry mechanism handles transient failures).

**Assumption 5: hrsync-backend Module Compatibility**
- **Description:** Module copied from hrsync-backend can be adapted to Prisma (if database entities used).
- **Validation:** Review hrsync-backend module structure, identify TypeORM dependencies.
- **Impact if False:** Manual adaptation required (Epic 6 uses stateless design, minimal DB dependency).

### Open Questions

**Question 1: Document Metadata Tracking**
- **Description:** Should document generation history be tracked in database (who generated what, when)?
- **Status:** Out of scope for Epic 6 MVP
- **Next Step:** Future enhancement (Epic 6.x or separate epic)

**Question 2: Document Versioning**
- **Description:** Should templates support versioning (template v1, v2)?
- **Status:** Out of scope for Epic 6 MVP
- **Next Step:** Future enhancement (template management epic)

**Question 3: Batch Document Generation**
- **Description:** Should we support generating multiple documents in one request?
- **Status:** Out of scope for Epic 6 MVP
- **Next Step:** Future enhancement (queue-based processing, Phase 2)

**Question 4: Document Preview**
- **Description:** Should we support document preview before final generation?
- **Status:** Out of scope for Epic 6 MVP
- **Next Step:** Future enhancement (preview endpoint)

**Question 5: Excel Chart Support**
- **Description:** BaseExcelAdapter includes createChart() placeholder - when to implement?
- **Status:** Future enhancement
- **Next Step:** Evaluate need based on business requirements

## Test Strategy Summary

### Test Levels

**Unit Tests (70%+ coverage target):**
- **Services:** DocumentGeneratorService, TemplateEngineService, CacheService, RetryService
- **Factories:** PdfAdapterFactory, ExcelAdapterFactory (adapter discovery, caching)
- **Base Classes:** BasePdfAdapter, BaseExcelAdapter (helper methods)
- **Utilities:** Cache key generation, data hashing, retry logic

**Integration Tests:**
- **Template Engine:** EJS rendering with i18n, Puppeteer PDF generation
- **Cache Integration:** NestJS cache-manager integration, cache hit/miss scenarios
- **S3 Integration:** Document upload via AwsService, pre-signed URL generation
- **Adapter Factory:** End-to-end adapter discovery and retrieval

**E2E Tests:**
- **PDF Generation:** Full flow (request → cache check → adapter → S3 upload → response)
- **Excel Generation:** Full flow (request → cache check → adapter → S3 upload → response)
- **Cache Behavior:** Cache hit returns cached URL, cache miss generates fresh document
- **Error Scenarios:** Adapter not found, template not found, S3 upload failure after retries

### Test Frameworks

- **Unit/Integration:** Jest v29.x (already configured)
- **E2E:** Jest + Supertest (already configured)
- **Mocking:** Jest mocks for Puppeteer, ExcelJS, AwsService, CacheManager

### Coverage of Acceptance Criteria

**AC 1-3 (Excel Adapter):** Unit tests for BaseExcelAdapter.generate(), buildWorkbook() abstract method, helper methods
**AC 4-9 (PDF Adapter):** Integration tests for TemplateEngineService, browser lifecycle, template rendering
**AC 10-12 (Factories):** Unit tests for adapter discovery, caching, exception handling
**AC 13-18 (Document Generator Service):** Integration tests for full generation flow, error handling, default values
**AC 19-23 (Cache Service):** Unit tests for cache key generation, hashing, cache operations
**AC 24-27 (Retry Service):** Unit tests for retry logic, exponential backoff, logging
**AC 28-31 (Module & Samples):** E2E tests for complete module, sample adapters

### Edge Cases

**Edge Case 1: Empty Data Object**
- **Test:** Generate document with empty data object `{}`
- **Expected:** Document generated with empty content (no errors)

**Edge Case 2: Very Large Data Object**
- **Test:** Generate document with 10MB+ data object
- **Expected:** Document generated successfully (may be slow, monitor performance)

**Edge Case 3: Special Characters in Template**
- **Test:** Template contains special characters, HTML entities
- **Expected:** Properly escaped/rendered in PDF

**Edge Case 4: Concurrent Document Generation**
- **Test:** Multiple simultaneous document generation requests
- **Expected:** All requests handled correctly, browser instance shared safely

**Edge Case 5: Cache Expiry During Generation**
- **Test:** Cache TTL expires while document is being generated
- **Expected:** Fresh document generated, new cache entry created

**Edge Case 6: S3 Upload Partial Failure**
- **Test:** S3 upload fails on attempt 1, succeeds on attempt 2
- **Expected:** Retry mechanism works, document uploaded successfully

**Edge Case 7: Template File Deleted During Generation**
- **Test:** Template file deleted after adapter initialization but before generation
- **Expected:** TemplateNotFoundException thrown

**Edge Case 8: Browser Crash Recovery**
- **Test:** Puppeteer browser crashes during PDF generation
- **Expected:** Browser recreated, generation retried (or error thrown)

### Test Data

**Sample PDF Data:**
```typescript
{
  invoiceNumber: 'INV-001',
  date: '2025-11-07',
  customerName: 'Acme Corp',
  items: [
    { description: 'Service A', quantity: 2, unitPrice: 1000, total: 2000 }
  ],
  subtotal: 2000,
  taxAmount: 360,
  total: 2360
}
```

**Sample Excel Data:**
```typescript
{
  sales: [
    { date: '2025-11-07', product: 'Product A', quantity: 10, unitPrice: 100, total: 1000 },
    { date: '2025-11-08', product: 'Product B', quantity: 5, unitPrice: 200, total: 1000 }
  ]
}
```

### Test Environment Setup

- **Mock S3:** Use local S3 mock or test bucket
- **Mock Puppeteer:** Use jest-puppeteer or mock Puppeteer API
- **Mock Cache:** Use in-memory cache for tests
- **Template Files:** Include test templates in test fixtures directory

