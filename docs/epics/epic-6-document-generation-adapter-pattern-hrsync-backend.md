# Epic 6: Document Generation (Adapter Pattern - hrsync-backend)

**Goal:** Extensible document generation with adapter pattern, caching, S3 integration, retry mechanism

**Value Proposition:** Production-proven document generation pattern (hrsync-backend). Adapter pattern for easy extensibility, decorator-based auto-discovery, factory management, SHA-256 caching, S3 integration, retry mechanism. Module can be copied from hrsync-backend.

**Prerequisites:** Epic 3 (Users), Epic 4 (Files/S3), Epic 1 (Database)

**Technical Stack:**
- **Adapter Pattern**: BasePdfAdapter, BaseExcelAdapter with decorator-based registration
- **PDF Generation**: EJS templates + Puppeteer (reusable browser instance)
- **Excel Generation**: ExcelJS with workbook building
- **Caching**: SHA-256 hash-based with NestJS cache-manager
- **S3 Integration**: AWS S3 with pre-signed URLs
- **Retry Mechanism**: Exponential backoff (3 attempts)
- **Multi-language**: nestjs-i18n integration
- **Module Source**: `/Users/ahmet/Documents/Bitbucket/hrsync-backend/src/document-generator`

---

## Story 6.1: Base Excel Adapter & Interface

**As a** developer,
**I want** base Excel adapter abstract class ve interface,
**So that** Excel adapter'ları kolayca extend edebilleyim.

**Acceptance Criteria:**

**1. IExcelAdapter Interface:**
   - `src/modules/document-generator/interfaces/excel-adapter.interface.ts`
   ```typescript
   interface IExcelAdapter {
     readonly adapterName: string;
     generate(data: any, lang: string): Promise<Buffer>;
     buildWorkbook(workbook: ExcelJS.Workbook, data: any, lang: string): Promise<void>;
   }
   ```

**2. BaseExcelAdapter Abstract Class:**
   - `src/modules/document-generator/base/base-excel-adapter.abstract.ts`
   - Abstract properties:
     - `adapterName: string` (required)
   - Abstract methods:
     - `buildWorkbook(workbook, data, lang): Promise<void>` (must implement)
   - Implemented methods:
     - `generate(data, lang): Promise<Buffer>` (creates workbook, calls buildWorkbook, returns buffer)
   - Helper methods (protected):
     - `applyCellStyle(cell, style)` - Apply font, fill, alignment, border, numFmt
     - `addFormula(cell, formula)` - Add Excel formula
     - `applyAutoFilter(worksheet, range)` - Enable auto-filter
     - `freezePanes(worksheet, {row, column})` - Freeze header rows/columns
     - `mergeCells(worksheet, range)` - Merge cell range
     - `addDataValidation(cell, validation)` - Add dropdown/validation
     - `setColumnWidths(worksheet, widths[])` - Set column widths
     - `createChart(worksheet, config)` - Chart placeholder (future)

**3. @RegisterExcelAdapter Decorator:**
   - `src/modules/document-generator/decorators/register-excel-adapter.decorator.ts`
   - `@RegisterExcelAdapter(adapterName: string)`
   - Reflection metadata: `EXCEL_ADAPTER_NAME_KEY`
   - Auto-registration for factory discovery
   - Normalize adapter name (trim, lowercase)

**Technical Notes:**
- ExcelJS: `exceljs` library
- Workbook creator: 'Boilerplate Document Generator'
- Buffer return: `workbook.xlsx.writeBuffer()`
- Helper methods: Reusable styling, formulas, freeze
- Module source: `/Users/ahmet/Documents/Bitbucket/hrsync-backend/src/document-generator/base/base-excel-adapter.abstract.ts`

**Dependencies:** Story 5.8

---

## Story 6.2: Base PDF Adapter & Template Engine

**As a** developer,
**I want** base PDF adapter ve EJS template engine,
**So that** PDF adapter'ları template-based oluşturabilileyim.

**Acceptance Criteria:**

**1. IPdfAdapter Interface:**
   - `src/modules/document-generator/interfaces/pdf-adapter.interface.ts`
   ```typescript
   interface IPdfAdapter {
     readonly templateName: string;
     readonly styleName?: string;
     generate(templateName: string, data: any, lang: string): Promise<Buffer>;
     getTemplatePath(): string;
     getStylePath(): string | null;
   }
   ```

**2. BasePdfAdapter Abstract Class:**
   - `src/modules/document-generator/base/base-pdf-adapter.abstract.ts`
   - Abstract properties:
     - `templateName: string` (required)
     - `styleName?: string` (optional, for CSS)
   - Abstract methods:
     - `generate(templateName, data, lang): Promise<Buffer>` (must implement)
   - Implemented methods:
     - `getTemplatePath()`: Returns absolute path to `templates/pdf/{templateName}.ejs`
     - `getStylePath()`: Returns absolute path to `templates/pdf/styles/{styleName}.css` or null

**3. @RegisterPdfAdapter Decorator:**
   - `src/modules/document-generator/decorators/register-pdf-adapter.decorator.ts`
   - `@RegisterPdfAdapter(templateName: string)`
   - Reflection metadata: `PDF_ADAPTER_TEMPLATE_KEY`
   - Auto-registration for factory discovery
   - Normalize template name (trim, lowercase)

**4. Template Engine Service:**
   - `src/modules/document-generator/services/template-engine.service.ts`
   - Methods:
     - `renderTemplate(templatePath, data, lang): Promise<string>` - Render EJS template with i18n
     - `generatePdfFromHtml(html, cssPath?): Promise<Buffer>` - HTML → PDF via Puppeteer
   - EJS template rendering:
     - Inject i18n `t()` function into template data
     - `{ ...data, t: (key, params) => this.i18n.translate(key, { lang, ...params }) }`
   - Puppeteer integration:
     - Shared browser instance (initialized on module init)
     - New page per PDF generation
     - HTML + CSS injection
     - PDF options: A4 format, printBackground: true, margins (20px)
     - Timeout: 30 seconds
     - Resource cleanup (page.close())
   - Lifecycle:
     - `onModuleInit()`: Launch Puppeteer browser
     - `onModuleDestroy()`: Close Puppeteer browser

**5. Template Directory Structure:**
   ```
   templates/
   └── pdf/
       ├── invoice.ejs
       ├── report.ejs
       └── styles/
           ├── invoice.css
           └── report.css
   ```

**Technical Notes:**
- EJS: `ejs` library for template rendering
- Puppeteer: `puppeteer` library, headless Chrome
- Browser reuse: Performance optimization (single browser instance)
- i18n integration: `t()` function available in templates
- Template example:
  ```ejs
  <h1><%= t('invoice.title') %></h1>
  <p><%= t('invoice.amount', { amount: data.total }) %></p>
  ```
- Module source: `/Users/ahmet/Documents/Bitbucket/hrsync-backend/src/document-generator/`

**Dependencies:** Story 6.1

---

## Story 6.3: Adapter Factories (Auto-Discovery)

**As a** developer,
**I want** adapter factory'ler ile auto-discovery,
**So that** adapter'ları otomatik register edilsin ve kolayca access edebilleyim.

**Acceptance Criteria:**

**1. PdfAdapterFactory:**
   - `src/modules/document-generator/factories/pdf-adapter.factory.ts`
   - `OnModuleInit` lifecycle hook
   - Properties:
     - `adapterRegistry: Map<templateName, AdapterRegistryEntry>`
     - AdapterRegistryEntry: `{ templateName, adapterClass, instance? }`
   - Methods:
     - `onModuleInit()`: Scan all providers, find @RegisterPdfAdapter decorated classes, build registry
     - `getAdapter(templateName): IPdfAdapter`: Get adapter instance (cached), lazy init via NestJS DI
     - `getRegisteredTemplates(): string[]`: List all template names
   - Auto-discovery:
     - Use NestJS ModuleRef to scan providers
     - Read reflection metadata: `PDF_ADAPTER_TEMPLATE_KEY`
     - Build adapter registry
   - Instance caching: First call creates instance, subsequent calls return cached

**2. ExcelAdapterFactory:**
   - `src/modules/document-generator/factories/excel-adapter.factory.ts`
   - Same pattern as PdfAdapterFactory
   - Methods:
     - `onModuleInit()`: Scan and register Excel adapters
     - `getAdapter(adapterName): IExcelAdapter`: Get adapter instance (cached)
     - `getRegisteredAdapters(): string[]`: List all adapter names
   - Reflection metadata: `EXCEL_ADAPTER_NAME_KEY`

**3. Custom Exceptions:**
   - `AdapterNotFoundException(templateName, type)`: Thrown when adapter not found
   - `TemplateNotFoundException(templatePath)`: Thrown when template file not found
   - `GenerationFailedException(message, context)`: Thrown when generation fails

**4. Example Adapter Implementation (Sample):**
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

**5. Example Excel Adapter (Sample):**
   ```typescript
   @RegisterExcelAdapter('sales-report')
   @Injectable()
   export class SalesReportExcelAdapter extends BaseExcelAdapter {
     readonly adapterName = 'sales-report';

     async buildWorkbook(workbook: ExcelJS.Workbook, data: any, lang: string): Promise<void> {
       const worksheet = workbook.addWorksheet('Sales');
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
       // Add data
       data.sales.forEach(sale => worksheet.addRow(sale));
       // Add features
       this.applyAutoFilter(worksheet, 'A1:C100');
       this.freezePanes(worksheet, { row: 2, column: 1 });
     }
   }
   ```

**Technical Notes:**
- Auto-discovery via reflection metadata
- Lazy initialization via NestJS DI (ModuleRef.get())
- Instance caching for performance
- Type-safe adapter retrieval
- Template name normalization (trim, lowercase)
- Module source: `/Users/ahmet/Documents/Bitbucket/hrsync-backend/src/document-generator/factories/`

**Dependencies:** Story 6.2

---

## Story 6.4: Document Generator Service (Orchestration)

**As a** developer,
**I want** main document generator service orchestration,
**So that** cache, generation, S3 upload flow yönetebilleyim.

**Acceptance Criteria:**

**1. DocumentGeneratorService:**
   - `src/modules/document-generator/services/document-generator.service.ts`
   - Dependencies injection:
     - CacheService
     - RetryService
     - AwsService (S3)
     - PdfAdapterFactory
     - ExcelAdapterFactory
     - I18nService (optional)

**2. Main Method - generate():**
   ```typescript
   async generate(
     documentType: DocumentType,  // PDF | EXCEL
     options: DocumentGeneratorOptions
   ): Promise<GenerationResult>
   ```
   - DocumentGeneratorOptions:
     ```typescript
     {
       templateName: string,        // Template/adapter name
       data: any,                   // Data for generation
       lang: string,                // Language code
       s3Options: {
         path: string,              // S3 folder path
         filename?: string,         // Optional filename
         contentType?: string,
         acl?: 'private' | 'public-read' | 'public-read-write'
       },
       cacheStrategy?: CacheStrategy,  // TEMPLATE_HASH | NO_CACHE
       cacheTtl?: number,           // Cache TTL in ms (default 1 hour)
       metadata?: any               // Optional metadata
     }
     ```
   - GenerationResult:
     ```typescript
     {
       success: boolean,
       fileUrl: string,             // S3 URL
       cached: boolean,             // Cache hit/miss
       generatedAt: Date,
       fileSize?: number,           // In bytes
       generationTime?: number,     // In milliseconds
       metadata?: any
     }
     ```

**3. Generation Flow:**
   1. Check cache (if strategy !== NO_CACHE):
      - Generate cache key: `doc:{type}:{template}:{dataHash}`
      - If cache hit → Return cached S3 URL
   2. If cache miss:
      - Get adapter from factory (PDF or Excel)
      - Generate document (adapter.generate())
      - Upload to S3 with retry (Story 6.6)
      - Update cache with S3 URL
   3. Return GenerationResult

**4. Enums:**
   - DocumentType: `PDF`, `EXCEL`
   - CacheStrategy: `TEMPLATE_HASH`, `NO_CACHE`

**5. Error Handling:**
   - Adapter not found → AdapterNotFoundException
   - Template not found → TemplateNotFoundException
   - Generation failed → GenerationFailedException
   - S3 upload failed → Retry mechanism (Story 6.6)

**Technical Notes:**
- Default cache TTL: 1 hour (3600000ms)
- Cache strategy: TEMPLATE_HASH (default)
- S3 filename auto-generation: UUID + extension
- Content-Type detection: application/pdf, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
- ACL default: public-read
- Logging: Generation time, cache hit/miss, file size
- Module source: `/Users/ahmet/Documents/Bitbucket/hrsync-backend/src/document-generator/services/document-generator.service.ts`

**Dependencies:** Story 6.3

---

## Story 6.5: Cache Service (SHA-256 Hash-Based)

**As a** developer,
**I want** hash-based caching system,
**So that** identical document requests return cached results.

**Acceptance Criteria:**

**1. CacheService:**
   - `src/modules/document-generator/services/cache.service.ts`
   - Dependencies: NestJS `@nestjs/cache-manager`, Cache instance
   - Default TTL: 1 hour (3600000ms)

**2. Methods:**
   - `generateCacheKey(documentType, templateName, data): string`
     - Format: `doc:{type}:{template}:{dataHash}`
     - Data hash: SHA-256 of sorted JSON (sortObjectKeys)
     - Example: `doc:PDF:invoice:a1b2c3d4...`
   - `get(key): Promise<string | null>`: Retrieve cached S3 URL
   - `set(key, value, ttl?): Promise<void>`: Store S3 URL with TTL
   - `delete(key): Promise<void>`: Invalidate cache

**3. Data Hashing:**
   - `generateDataHash(data): string` (private)
     - Sort object keys recursively (consistent hash)
     - JSON.stringify
     - SHA-256 hash (64 hex characters)
   - `sortObjectKeys(obj): any` (private)
     - Recursive key sorting
     - Handles arrays, objects, primitives

**4. NestJS Cache Module Integration:**
   - CacheModule.register() in DocumentGeneratorModule
   - Configuration:
     - TTL: 3600 seconds (1 hour)
     - Max items: 100
   - Store: memory (default), Redis (future)

**Technical Notes:**
- SHA-256: Node.js `crypto.createHash('sha256')`
- Key sorting: Ensures `{a:1, b:2}` and `{b:2, a:1}` produce same hash
- Cache invalidation: Manual via delete() or TTL expiry
- Module source: `/Users/ahmet/Documents/Bitbucket/hrsync-backend/src/document-generator/services/cache.service.ts`

**Dependencies:** Story 6.4

---

## Story 6.6: Retry Service (Exponential Backoff)

**As a** developer,
**I want** retry mechanism for S3 upload,
**So that** transient failures automatically retry.

**Acceptance Criteria:**

**1. RetryService:**
   - `src/modules/document-generator/services/retry.service.ts`
   - Max attempts: 3
   - Base delay: 1000ms (1 second)
   - Exponential backoff: 2^(attempt-1) * baseDelay

**2. Method - executeWithRetry():**
   ```typescript
   async executeWithRetry<T>(
     operation: () => Promise<T>,
     context: string  // For logging: 'S3 upload: invoice-001.pdf'
   ): Promise<T>
   ```
   - Retry logic:
     - Attempt 1: Execute immediately
     - Attempt 2: Wait 1000ms (2^0 * 1000), retry
     - Attempt 3: Wait 2000ms (2^1 * 1000), retry
     - Total max delay: ~3 seconds
   - Success → Return result
   - All attempts fail → Throw last error

**3. Logging:**
   - Log each attempt: `[context] Attempt 1/3`
   - Log retry delay: `[context] Waiting 1000ms before retry attempt 2`
   - Log success on retry: `[context] Succeeded on attempt 2/3`
   - Log final failure: `[context] All 3 attempts failed`

**4. Usage Example:**
   ```typescript
   const result = await retryService.executeWithRetry(
     async () => await s3.upload(buffer),
     'S3 upload: invoice-001.pdf'
   );
   ```

**Technical Notes:**
- Generic type support: `<T>`
- Exponential backoff formula: `Math.pow(2, attempt - 1) * BASE_DELAY`
- Delay sequence: 0ms → 1000ms → 2000ms
- Context string for debugging
- Module source: `/Users/ahmet/Documents/Bitbucket/hrsync-backend/src/document-generator/services/retry.service.ts`

**Dependencies:** Story 6.5

---

## Story 6.7: Document Generator Module & Example Adapters

**As a** developer,
**I want** complete document generator module setup,
**So that** all services, factories, adapters integrate edilsin.

**Acceptance Criteria:**

**1. DocumentGeneratorModule:**
   - `src/modules/document-generator/document-generator.module.ts`
   - Imports:
     - CacheModule.register({ ttl: 3600, max: 100 })
   - Providers:
     - All services: DocumentGeneratorService, CacheService, RetryService, TemplateEngineService
     - AwsService (from common/aws)
     - Adapter factories: PdfAdapterFactory, ExcelAdapterFactory
     - Sample adapters: InvoicePdfAdapter, SalesReportExcelAdapter (örnek)
   - Exports:
     - DocumentGeneratorService
     - PdfAdapterFactory, ExcelAdapterFactory

**2. Sample PDF Adapter - InvoicePdfAdapter:**
   - Template: `templates/pdf/invoice.ejs`
   - Style: `templates/pdf/styles/invoice.css`
   - Data: `{ invoiceNumber, date, customerName, items[], subtotal, taxAmount, total }`

**3. Sample Excel Adapter - SalesReportExcelAdapter:**
   - Worksheet: 'Sales'
   - Columns: Date, Product, Quantity, Unit Price, Total
   - Features: Header styling, formulas (SUM), auto-filter, freeze panes

**4. Module Structure (Final):**
   ```
   document-generator/
   ├── document-generator.module.ts
   ├── base/
   │   ├── base-pdf-adapter.abstract.ts
   │   └── base-excel-adapter.abstract.ts
   ├── adapters/
   │   ├── pdf/
   │   │   └── invoice-pdf.adapter.ts
   │   └── excel/
   │       └── sales-report-excel.adapter.ts
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
   │   ├── pdf-adapter.interface.ts
   │   ├── excel-adapter.interface.ts
   │   ├── document-generator-options.interface.ts
   │   └── generation-result.interface.ts
   ├── enums/
   │   ├── document-type.enum.ts
   │   └── cache-strategy.enum.ts
   ├── exceptions/
   │   ├── adapter-not-found.exception.ts
   │   ├── template-not-found.exception.ts
   │   └── generation-failed.exception.ts
   └── templates/
       └── pdf/
           ├── invoice.ejs
           └── styles/
               └── invoice.css
   ```

**5. Usage Example in Controller:**
   ```typescript
   @Post('generate-invoice')
   async generateInvoice(@Body() dto: GenerateInvoiceDto) {
     const result = await this.documentGeneratorService.generate(DocumentType.PDF, {
       templateName: 'invoice',
       data: {
         invoiceNumber: 'INV-001',
         date: '2025-11-05',
         customerName: 'Acme Corp',
         items: [{ description: 'Service A', quantity: 2, unitPrice: 1000, total: 2000 }],
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

     return result;  // { success: true, fileUrl: 's3-url', cached: false, ... }
   }
   ```

**Technical Notes:**
- Module can be copied from: `/Users/ahmet/Documents/Bitbucket/hrsync-backend/src/document-generator`
- Adapt TypeORM → Prisma (if any DB entities needed)
- Test with sample adapters
- Puppeteer browser lifecycle: init on module start, close on destroy
- Cache warming: None (lazy)

**Dependencies:** Story 6.6

---
