# Technology Stack Details

## Core Technologies

**Runtime & Framework:**
```yaml
Node.js: v20.x LTS
  Reason: Long-term support, performance, ecosystem maturity

NestJS: v11.1.8
  Reason: Enterprise-grade, TypeScript-native, dependency injection, modular architecture
  Verified: 2025-11-04 (8 days ago release)

TypeScript: v5.3+
  Mode: Strict (noImplicitAny, strictNullChecks, strictFunctionTypes)
  Reason: Compile-time safety, better refactoring, IDE support
```

**Database & ORM:**
```yaml
Prisma ORM: v6.16.0
  Features: Type-safe queries, schema migrations, multi-DB support
  Verified: 2025-11-04 (Rust-free, production-ready)

PostgreSQL: v15+ (Option 1)
  Use Case: Relational data, complex queries, ACID transactions
  Connection Pool: 5-20 connections

MongoDB: v6+ (Option 2)
  Use Case: Document flexibility, schema evolution
  Note: No migrations (schemaless)
```

**Authentication & Security:**
```yaml
Passport: v0.7+
  Strategies: passport-jwt, passport-local

bcrypt: v5.1+
  Rounds: 10 minimum (configurable)
  Purpose: Password hashing

JWT: jsonwebtoken v9.0+
  Algorithm: HS256 or RS256
  Access Token: 15-60 minutes
  Refresh Token: 7-30 days
```

**File Storage:**
```yaml
AWS SDK: @aws-sdk/client-s3 v3.x
  Features: S3 upload, pre-signed URLs, multipart upload

multer: v1.4+
  Purpose: Multipart form-data handling (file uploads)
```

**Communication:**
```yaml
SMS Providers:
  - FONIVA: axios v1.x (FONIVA REST API integration - hrsync-backend pattern)
  - Note: Module structure copied from /Users/ahmet/Documents/Bitbucket/hrsync-backend/src/sms

Email Providers:
  - SendGrid: @sendgrid/mail v7.x
  - AWS SES: @aws-sdk/client-ses v3.x

Email Template Engine: Handlebars v4.x
  Purpose: Email HTML templates
```

**Document Generation (Adapter Pattern - hrsync-backend):**
```yaml
Architecture: Adapter Pattern + Factory + Auto-Discovery
  Module Source: /Users/ahmet/Documents/Bitbucket/hrsync-backend/src/document-generator
  Base Adapters: BasePdfAdapter, BaseExcelAdapter
  Decorators: @RegisterPdfAdapter, @RegisterExcelAdapter
  Factories: PdfAdapterFactory, ExcelAdapterFactory (auto-discovery)

PDF Generation:
  - EJS: v3.x (template engine with i18n support)
  - Puppeteer: v21.x (HTML-to-PDF, headless Chrome)
  - Features: Reusable browser instance, CSS styling, A4 format
  - Templates: templates/pdf/*.ejs
  - Styles: templates/pdf/styles/*.css

Excel Generation:
  - ExcelJS: v4.x (workbook building)
  - Features: Multi-sheet, formulas (SUM, AVERAGE), styling, auto-filter, freeze panes
  - Helper methods: applyCellStyle(), addFormula(), applyAutoFilter(), freezePanes()

Caching:
  - @nestjs/cache-manager: v2.x
  - Strategy: SHA-256 hash-based (template + data)
  - TTL: 1 hour (configurable)
  - Store: Memory (default), Redis (future)

Retry Mechanism:
  - Exponential backoff: 3 attempts
  - Delay sequence: 0ms → 1000ms → 2000ms
  - Purpose: S3 upload retry

S3 Integration:
  - Document storage with pre-signed URLs
  - ACL configuration: private, public-read
  - Content-Type detection: application/pdf, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
```

**Developer Tools:**
```yaml
Testing: Jest v29.x
  Coverage: Istanbul
  Threshold: 70% minimum

Logging: winston v3.x
  Format: JSON (structured)

Error Tracking: @sentry/node v7.x
  Features: Error capture, performance monitoring, releases

i18n: nestjs-i18n v10.x
  Languages: EN (default), TR (initial)
  Fallback: EN
```

**Code Quality:**
```yaml
ESLint: v8.x
  Plugins: @typescript-eslint, eslint-plugin-import
  Config: NestJS best practices + custom rules

Prettier: v3.x
  Integration: eslint-config-prettier

Husky: v8.x
  Hooks: pre-commit (lint + format)
```

**DevOps:**
```yaml
Docker: v24+
  Images: node:20-alpine (production), node:20 (development)

Docker Compose: v2.x
  Services: app, postgres, mongodb, redis (future)

GitHub Actions: Latest
  Workflows: CI (test, lint, build), CD (deploy)
```

## Integration Points

**Service Communication Diagram:**
```
┌─────────────────────────────────────────────────────────────┐
│                        API Gateway                          │
│                   (NestJS Controllers)                      │
└─────────────────┬───────────────────────────────────────────┘
                  │
       ┌──────────┼──────────┬──────────────┬─────────────┐
       │          │           │              │             │
   ┌───▼───┐  ┌──▼──┐  ┌────▼────┐  ┌─────▼─────┐  ┌───▼───┐
   │ Auth  │  │Users│  │   File  │  │   Mail    │  │  SMS  │
   │Module │  │Mod. │  │  Module │  │  Module   │  │Module │
   └───┬───┘  └──┬──┘  └────┬────┘  └─────┬─────┘  └───┬───┘
       │         │           │             │            │
       └─────────┴───────────┴─────────────┴────────────┘
                              │
                    ┌─────────▼──────────┐
                    │  Prisma Service    │
                    │  (Database Layer)  │
                    └─────────┬──────────┘
                              │
                    ┌─────────▼──────────┐
                    │ PostgreSQL/MongoDB │
                    └────────────────────┘

External Services:
  - AWS S3 (File Module)
  - Twilio/SNS (SMS Module)
  - SendGrid/SES (Mail Module)
  - Sentry (Exception Filters)
```

**Dependency Graph:**
```
common/ (leaf - no dependencies)
  ↑
  ├── database/ (uses common utilities)
  ↑
  ├── permissions/ (database + common)
  ↑
  ├── users/ (database + common + permissions)
  ↑
  ├── files/ (database + common + users)
  ├── sms/ (common + external provider)
  ├── mail/ (common + external provider)
  ↑
  ├── auth/ (users + permissions + mail + sms)
  ├── notifications/ (sms + mail + users)
  └── documents/ (database + files + common)
```

---
