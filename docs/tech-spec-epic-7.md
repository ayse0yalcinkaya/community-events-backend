# Epic Technical Specification: Developer Infrastructure

Date: 2025-11-06
Author: BMad
Epic ID: 7
Status: Ready

---

## Overview

Epic 7, Boilerplate projesinin developer productivity katmanını oluşturur. Bu epic, development sürecini hızlandıran, hata ayıklamayı kolaylaştıran ve kod kalitesini artıran temel araçları sağlar: çok dilli destek (i18n), ortak yardımcı fonksiyonlar ve decorator'lar, yapılandırılmış loglama (Winston), request/response interceptor'ları, Sentry error tracking ve health check endpoint'leri.

Bu epic'in amacı, tüm diğer epic'lerin kullanacağı shared infrastructure'ı oluşturmaktır. I18n modülü tüm error message'ları ve response'ları çoklu dilde sunma yeteneği sağlarken, Winston structured logging production'da log analizi ve debugging'i kolaylaştırır. Sentry entegrasyonu proaktif error monitoring sağlar ve health check endpoint'leri load balancer ve monitoring sistemlerinin uygulama durumunu izlemesine olanak verir.

## Objectives and Scope

### In Scope

1. **Internationalization (i18n) - Story 7.1**
   - nestjs-i18n entegrasyonu ile çok dilli destek
   - TR ve EN translation file'ları (common, auth, users modülleri için)
   - Accept-Language header ile dil seçimi
   - Translation helper servisi (dynamic variable replacement)

2. **Common Utilities & Decorators - Story 7.2**
   - Custom decorator'lar: @CurrentUser(), @Public(), @ApiPaginatedResponse()
   - Utility fonksiyonlar: hash.util (bcrypt wrapper), date.util, string.util, validation.util
   - Tüm utilities için unit test coverage

3. **Structured Logging (Winston) - Story 7.3**
   - Winston konfigürasyonu (JSON structured format)
   - Log levels: debug, info, warn, error
   - Console transport (development) ve file transport (production)
   - Environment-based log level configuration
   - Sensitive data exclusion (passwords, tokens)

4. **Request/Response Logging Interceptor - Story 7.4**
   - Global LoggingInterceptor (method, URL, user agent, request ID)
   - Response logging (status code, duration ms)
   - X-Request-ID header support (UUID generation)
   - Sensitive data filtering

5. **Sentry Error Tracking - Story 7.5**
   - @sentry/node entegrasyonu
   - Exception filter (unhandled exceptions → Sentry)
   - User context (userID, domainID) ve request context
   - Source maps support (TypeScript stack traces)
   - Breadcrumbs (log trail) ve sensitive data scrubbing

6. **Health Check Endpoints - Story 7.6**
   - @nestjs/terminus kullanımı
   - GET /health (basic liveness check)
   - GET /health/db (database connection check, response time)
   - GET /health/services (stub for future: redis, S3, Sentry)

### Out of Scope (Future Enhancements)

- Advanced APM (Application Performance Monitoring) - Prometheus/Grafana integration
- Distributed tracing (Jaeger/Zipkin)
- Custom metric'ler ve business analytics
- Real-time log streaming (ELK stack entegrasyonu)
- Performance profiling tools
- Advanced health checks (memory usage, CPU, disk)

## System Architecture Alignment

Epic 7, Architecture document'inde tanımlanan **Cross-Cutting Concerns** katmanına denk gelir ve tüm feature module'larının kullanacağı shared infrastructure'ı oluşturur.

**Architecture'dan Key Alignment'lar:**

1. **Modular Organization (src/common/):**
   - Decorators, guards, interceptors, pipes, filters Architecture'daki `src/common/` yapısıyla tam uyumlu
   - I18n modülü `src/modules/i18n/` altında feature module olarak
   - Health endpoints `src/health/` altında ayrı module

2. **Configuration Management:**
   - `config/sentry.config.ts` - Architecture'da belirtilen config pattern
   - Winston logging configuration - `main.ts`'te app.useLogger() ile global enable
   - Environment-based configuration (.env.development, .env.production)

3. **Error Handling Strategy:**
   - `common/filters/all-exceptions.filter.ts` - Global exception handler
   - `common/filters/sentry-exception.filter.ts` - Sentry integration
   - I18n ile translated error messages - hrsync-backend pattern

4. **Logging & Observability:**
   - Winston structured logging - Architecture'da belirtilen JSON format
   - Sentry integration - Architecture decision table'da "Monitoring" satırı
   - Health checks - Architecture'da `/health` endpoint spesifikasyonu

5. **Dependencies:**
   - nestjs-i18n: Architecture'da "i18n" bölümünde belirtilen
   - Winston: Architecture "Logging" bölümünde
   - @sentry/node: Architecture "Monitoring" bölümünde
   - @nestjs/terminus: Architecture "Health Check Endpoints" bölümünde

**Integration Points:**
- Tüm module'lar i18n'i kullanacak (error messages, notifications)
- Tüm controller'lar LoggingInterceptor'ı otomatik kullanacak (global)
- Tüm exception'lar Sentry'ye gönderilecek (exception filter)
- Health check'ler load balancer ve monitoring sistemleri tarafından kullanılacak

## Detailed Design

### Services and Modules

| Module/Service | Responsibility | Inputs | Outputs | Owner Story |
|----------------|----------------|---------|---------|-------------|
| **I18nModule** | Multi-language support, translation management | Accept-Language header, translation keys | Translated strings | Story 7.1 |
| **I18nService** | Translation key resolution, variable replacement | `t(key, params)` | Translated text with replaced variables | Story 7.1 |
| **@CurrentUser() Decorator** | Extract authenticated user from request context | ExecutionContext (JWT payload) | User object | Story 7.2 |
| **@Public() Decorator** | Mark routes as public (bypass JWT guard) | Metadata | Boolean flag | Story 7.2 |
| **@ApiPaginatedResponse() Decorator** | Swagger decorator for paginated responses | DTO class | Swagger schema | Story 7.2 |
| **hash.util** | Password hashing and comparison (bcrypt wrapper) | Plain password, hash | Hash string, boolean (comparison) | Story 7.2 |
| **date.util** | Date formatting, timezone conversion | Date, format string, timezone | Formatted date string | Story 7.2 |
| **string.util** | String manipulation (slugify, truncate) | String, options | Transformed string | Story 7.2 |
| **validation.util** | Custom validators for complex rules | Value, validation rule | Boolean, error message | Story 7.2 |
| **WinstonLogger** | Structured logging service (JSON format) | Log level, message, context | Log entry to console/file | Story 7.3 |
| **LoggingInterceptor** | Request/response logging, performance tracking | Request, Response | Logged request/response with duration | Story 7.4 |
| **SentryExceptionFilter** | Capture and send exceptions to Sentry | Exception, request context | Sentry error event | Story 7.5 |
| **HealthController** | Health check endpoints | - | Health status JSON | Story 7.6 |
| **TerminusHealthIndicator** | Database health check | Prisma connection | Health status with response time | Story 7.6 |

**Module Structure:**

```
src/
├── modules/
│   └── i18n/
│       ├── i18n.module.ts
│       ├── translations/
│       │   ├── en/
│       │   │   ├── common.json
│       │   │   ├── auth.json
│       │   │   └── users.json
│       │   └── tr/
│       │       ├── common.json
│       │       ├── auth.json
│       │       └── users.json
│       └── __test__/
│           └── i18n.service.spec.ts
├── common/
│   ├── decorators/
│   │   ├── current-user.decorator.ts
│   │   ├── public.decorator.ts
│   │   └── api-paginated-response.decorator.ts
│   ├── utils/
│   │   ├── hash.util.ts
│   │   ├── date.util.ts
│   │   ├── string.util.ts
│   │   └── validation.util.ts
│   ├── interceptors/
│   │   └── logging.interceptor.ts
│   └── filters/
│       └── sentry-exception.filter.ts
├── config/
│   └── sentry.config.ts
└── health/
    ├── health.controller.ts
    ├── health.module.ts
    └── __test__/
        └── health.controller.spec.ts
```

### Data Models and Contracts

**Translation File Structure (JSON):**

```typescript
// src/modules/i18n/translations/en/common.json
{
  "SUCCESS": "Operation successful",
  "ERROR": "An error occurred",
  "NOT_FOUND": "Resource not found",
  "UNAUTHORIZED": "Unauthorized access",
  "FORBIDDEN": "Access forbidden",
  "VALIDATION_ERROR": "Validation failed",
  "INTERNAL_ERROR": "Internal server error"
}

// src/modules/i18n/translations/en/auth.json
{
  "LOGIN_SUCCESS": "Login successful",
  "LOGIN_FAILED": "Invalid credentials",
  "LOGOUT_SUCCESS": "Logout successful",
  "TOKEN_EXPIRED": "Token has expired",
  "TOKEN_INVALID": "Invalid token",
  "OTP_SENT": "OTP sent to {{phone}}",
  "OTP_INVALID": "Invalid OTP code",
  "PASSWORD_RESET_SUCCESS": "Password reset successful"
}
```

**Winston Log Entry Interface:**

```typescript
interface LogEntry {
  timestamp: string;          // ISO 8601 format
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  context?: {
    module?: string;          // Service/Controller name
    method?: string;          // Method name
    requestId?: string;       // UUID
    userId?: string;          // Authenticated user ID
    domainId?: string;        // Multi-tenant domain ID
    duration?: number;        // Request duration in ms
    statusCode?: number;      // HTTP status code
    [key: string]: any;       // Additional context
  };
  stack?: string;             // Error stack trace (only for errors)
}
```

**Health Check Response Interfaces:**

```typescript
// Basic health check response
interface HealthCheckResponse {
  status: 'ok' | 'error';
  timestamp: string;
}

// Database health check response
interface DatabaseHealthResponse {
  status: 'ok' | 'error';
  database: 'connected' | 'disconnected';
  responseTime: number;       // milliseconds
  timestamp: string;
}

// Services health check response (future)
interface ServicesHealthResponse {
  status: 'ok' | 'degraded' | 'error';
  services: {
    database: ServiceHealth;
    redis?: ServiceHealth;
    s3?: ServiceHealth;
    sentry?: ServiceHealth;
  };
  timestamp: string;
}

interface ServiceHealth {
  status: 'healthy' | 'unhealthy';
  responseTime?: number;
  error?: string;
}
```

**Sentry Exception Context:**

```typescript
interface SentryContext {
  user?: {
    id: string;
    phone?: string;
    domainId?: string;
  };
  request?: {
    method: string;
    url: string;
    headers: Record<string, string>;
    query: Record<string, any>;
    body?: any;               // Scrubbed of sensitive data
  };
  extra?: {
    [key: string]: any;
  };
  tags?: {
    environment: string;
    version: string;
    [key: string]: string;
  };
}
```

**Environment Variables:**

```bash
# Winston Logging
LOG_LEVEL=info                          # debug, info, warn, error
LOG_DIR=logs                            # Log file directory
LOG_MAX_SIZE=20m                        # Max log file size
LOG_MAX_FILES=14d                       # Log retention period

# Sentry
SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
SENTRY_ENVIRONMENT=production           # development, staging, production
SENTRY_TRACES_SAMPLE_RATE=0.1          # Performance monitoring sample rate (0-1)
SENTRY_DEBUG=false                      # Enable Sentry debug logs

# I18n
I18N_DEFAULT_LANG=en                    # Default language
I18N_FALLBACK_LANG=en                   # Fallback language
```

### APIs and Interfaces

**Health Check Endpoints:**

```typescript
// GET /health - Basic liveness check
@Get('health')
@Public()
async healthCheck(): Promise<HealthCheckResponse> {
  return {
    status: 'ok',
    timestamp: new Date().toISOString()
  };
}

// GET /health/db - Database health check
@Get('health/db')
@Public()
async healthCheckDb(): Promise<DatabaseHealthResponse> {
  const startTime = Date.now();

  try {
    await this.prisma.$queryRaw`SELECT 1`;
    const responseTime = Date.now() - startTime;

    return {
      status: 'ok',
      database: 'connected',
      responseTime,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      status: 'error',
      database: 'disconnected',
      responseTime: Date.now() - startTime,
      timestamp: new Date().toISOString()
    };
  }
}

// GET /health/services - Services health check (stub for future)
@Get('health/services')
@Public()
async healthCheckServices(): Promise<ServicesHealthResponse> {
  // Future implementation: Check Redis, S3, Sentry
  return {
    status: 'ok',
    services: {
      database: { status: 'healthy', responseTime: 15 }
    },
    timestamp: new Date().toISOString()
  };
}
```

**I18n Service Interface:**

```typescript
interface I18nService {
  // Translate key with optional parameters
  t(key: string, options?: I18nTranslateOptions): string;

  // Translate with language override
  translate(key: string, options?: I18nTranslateOptions): string;

  // Get current language
  getCurrentLang(): string;
}

interface I18nTranslateOptions {
  lang?: string;              // Override language
  args?: Record<string, any>; // Variable replacement {{key}}
  defaultValue?: string;      // Fallback if key not found
}

// Usage examples:
this.i18n.t('auth.LOGIN_SUCCESS')
// => "Login successful"

this.i18n.t('auth.OTP_SENT', { args: { phone: '+905551234567' } })
// => "OTP sent to +905551234567"

this.i18n.t('users.NOT_FOUND', { lang: 'tr' })
// => "Kullanıcı bulunamadı"
```

**Winston Logger Interface:**

```typescript
interface Logger {
  // Log with context
  log(level: LogLevel, message: string, context?: LogContext): void;

  // Convenience methods
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, trace?: string, context?: LogContext): void;
}

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  module?: string;
  method?: string;
  requestId?: string;
  userId?: string;
  domainId?: string;
  [key: string]: any;
}

// Usage example:
this.logger.info('User created successfully', {
  module: 'UsersService',
  method: 'create',
  userId: user.id,
  domainId: user.domainId
});
```

**Decorator Interfaces:**

```typescript
// @CurrentUser() - Extract user from request
const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user; // Set by JwtStrategy
  }
);

// Usage:
async getProfile(@CurrentUser() user: JwtPayload) {
  return this.usersService.findById(user.userId);
}

// @Public() - Mark route as public (bypass JWT guard)
const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

// Usage:
@Public()
@Post('auth/login')
async login(@Body() dto: LoginDto) { ... }

// @ApiPaginatedResponse() - Swagger decorator
function ApiPaginatedResponse<T>(dataDto: Type<T>) {
  return applyDecorators(
    ApiOkResponse({
      schema: {
        allOf: [
          { $ref: getSchemaPath(PaginatedResponseDto) },
          {
            properties: {
              data: {
                type: 'array',
                items: { $ref: getSchemaPath(dataDto) }
              }
            }
          }
        ]
      }
    })
  );
}

// Usage:
@ApiPaginatedResponse(UserResDto)
@Get('users')
async findAll() { ... }
```

**Utility Function Signatures:**

```typescript
// hash.util.ts
export async function hashPassword(password: string, rounds = 10): Promise<string>;
export async function comparePassword(password: string, hash: string): Promise<boolean>;

// date.util.ts
export function formatDate(date: Date, format: string): string;
export function toUTC(date: Date): Date;
export function addDays(date: Date, days: number): Date;
export function diffInMs(start: Date, end: Date): number;

// string.util.ts
export function slugify(text: string): string;
export function truncate(text: string, maxLength: number): string;
export function capitalize(text: string): string;
export function removeSpecialChars(text: string): string;

// validation.util.ts
export function isValidPhone(phone: string, countryCode?: string): boolean;
export function isStrongPassword(password: string): boolean;
export function sanitizeInput(input: string): string;
```

### Workflows and Sequencing

**Application Bootstrap Flow (main.ts):**

```
1. Load environment variables (.env)
2. Create NestJS application instance
3. Configure Winston logger → app.useLogger(winstonLogger)
4. Initialize Sentry → Sentry.init(sentryConfig)
5. Configure global pipes (ValidationPipe)
6. Configure global filters (SentryExceptionFilter, AllExceptionsFilter)
7. Configure global interceptors (LoggingInterceptor, TransformInterceptor)
8. Configure Swagger (if not production)
9. Enable CORS
10. Start listening on PORT
11. Log application startup info
```

**Request Lifecycle with Developer Infrastructure:**

```
Incoming HTTP Request
  ↓
[LoggingInterceptor] → Log request start (method, URL, requestId, timestamp)
  ↓
[JwtAuthGuard] → Validate JWT token (unless @Public)
  ↓
[PermissionsGuard] → Check user permissions (if @Permission)
  ↓
[ValidationPipe] → Validate DTO with class-validator
  ↓
Controller Method Execution
  ↓
  [I18nService] → Translate messages (if needed)
  ↓
  [WinstonLogger] → Log business operations
  ↓
Service Layer Execution
  ↓
[If Error Occurs]
  ↓
  [SentryExceptionFilter] → Capture exception → Send to Sentry
  ↓
  [AllExceptionsFilter] → Format error response with i18n
  ↓
[TransformInterceptor] → Wrap response in standard format
  ↓
[LoggingInterceptor] → Log response (status, duration)
  ↓
HTTP Response to Client
```

**Health Check Monitoring Flow:**

```
Load Balancer / Monitoring System
  ↓
[Poll] GET /health (every 30 seconds)
  ↓
[HealthController] → Return { status: 'ok', timestamp }
  ↓
200 OK → Instance considered healthy
  ↓
[If Unhealthy] → Remove instance from load balancer pool

---

Monitoring System
  ↓
[Poll] GET /health/db (every 60 seconds)
  ↓
[HealthController] → Test database connection
  ↓
  [PrismaService] → SELECT 1
  ↓
  [Measure response time]
  ↓
[Return] { status: 'ok', database: 'connected', responseTime: 23ms }
  ↓
200 OK → Database healthy
  ↓
[If 503 Service Unavailable] → Alert ops team
```

**Logging Flow:**

```
Application Event (User Creation)
  ↓
Service calls: this.logger.info('User created', context)
  ↓
[WinstonLogger]
  ↓
  Format log entry (JSON structure)
  ↓
  Add timestamp, level, context metadata
  ↓
  [Console Transport] → Output to stdout (development)
  ↓
  [File Transport] → Write to logs/app-YYYY-MM-DD.log (production)
  ↓
[Log Aggregation System] → Collect logs (ELK, CloudWatch)
  ↓
Searchable logs for debugging
```

**Error Tracking Flow (Sentry):**

```
Unhandled Exception Occurs
  ↓
[SentryExceptionFilter] → Catch exception
  ↓
  Extract request context (method, URL, headers, body)
  ↓
  Extract user context (userId, domainId, phone)
  ↓
  Scrub sensitive data (passwords, tokens)
  ↓
  Add breadcrumbs (recent log trail)
  ↓
  Add tags (environment, version, module)
  ↓
Sentry.captureException(exception, context)
  ↓
Send to Sentry API
  ↓
[Sentry Dashboard] → Error appears with full context
  ↓
[Ops Team] → Notified via email/Slack
  ↓
Investigate and fix issue
```

## Non-Functional Requirements

### Performance

**Logging Performance:**
- Log entry creation: < 1ms overhead per request
- File write operations: Asynchronous (non-blocking)
- Console output: Minimal performance impact in development
- Log rotation: Zero-downtime (winston-daily-rotate-file)
- Target: Logging should add < 5ms to total request duration (p95)

**I18n Performance:**
- Translation lookup: < 1ms per key (in-memory cache)
- Translation file loading: Once at application startup
- Memory usage: < 10MB for all translation files (TR + EN)
- No performance degradation with Accept-Language header parsing

**Health Check Performance:**
- GET /health: < 10ms response time (no DB call)
- GET /health/db: < 50ms response time (simple SELECT 1 query)
- Health checks should not impact application performance
- Rate limiting: None (public endpoints, designed for frequent polling)

**Sentry Performance:**
- Error capture: < 5ms overhead (async send to Sentry)
- No user-facing latency impact
- Breadcrumbs: Minimal memory overhead (circular buffer, max 100 items)
- Source map lookup: Lazy-loaded, doesn't block request

**General Performance Constraints:**
- Interceptors (Logging, Transform): Total overhead < 10ms per request
- Decorators: Zero runtime overhead (metadata only)
- Utilities: Pure functions, no I/O, < 1ms execution
- Winston file transport: Async writes, buffer flushing every 1 second

### Security

**Sensitive Data Protection:**
- **Logging:** Passwords, tokens, credit cards MUST be excluded from logs
  - Implement sensitive field detection (password, token, secret, apiKey, creditCard)
  - Automatic scrubbing in LoggingInterceptor
  - Request body sanitization before logging
- **Sentry:** Sensitive data scrubbing before sending to Sentry
  - BeforeSend hook to remove sensitive fields
  - Header filtering (Authorization, Cookie headers excluded)
  - Body sanitization (passwords, tokens removed)

**Password Hashing (hash.util):**
- bcrypt with minimum 10 rounds (configurable via BCRYPT_ROUNDS env)
- Never log or expose password hashes in responses
- Timing-safe comparison (bcrypt.compare prevents timing attacks)

**Security Headers:**
- X-Request-ID: UUID v4 generation (cryptographically secure)
- No exposure of internal error details in production
- Stack traces only in development environment

**Input Validation & Sanitization:**
- validation.util.sanitizeInput(): XSS prevention
- String utilities: Remove special characters where appropriate
- No eval() or Function() constructor usage

**Sentry Security:**
- SENTRY_DSN in environment variables (never hardcoded)
- Sentry communications over HTTPS only
- User context: Only non-sensitive data (userId, domainId, role)
- No PII (Personally Identifiable Information) sent to Sentry

**Health Check Security:**
- Health endpoints are public (@Public decorator)
- No sensitive information exposed in health responses
- Database health: Only connection status, no schema info
- Generic error messages (no stack traces, no query details)

### Reliability/Availability

**Logging Reliability:**
- Winston transports: Graceful degradation if file write fails
- Console transport always available as fallback
- Log rotation: Automatic, no manual intervention required
- File transport errors logged to console (meta-logging)
- No data loss: Buffered writes with retry on transient failures

**Health Check Reliability:**
- GET /health: Always returns 200 OK (unless app crashed)
- GET /health/db: Graceful failure handling
  - Database down → 503 Service Unavailable
  - Timeout after 5 seconds → 503 with timeout error
  - No cascading failures (health check doesn't crash app)
- Load balancer compatible: Standard HTTP status codes

**Sentry Reliability:**
- Network failures: Errors queued locally, sent when connection restored
- Sentry down: Application continues normally (no user impact)
- Retry mechanism: Automatic retries for failed sends (exponential backoff)
- Circuit breaker: If Sentry consistently fails, temporarily disable sending
- Fallback: Critical errors still logged locally via Winston

**I18n Reliability:**
- Missing translation key: Returns key itself (graceful degradation)
- Fallback language: EN used if requested language missing
- Translation file load error: Application startup fails (fail-fast)
- Runtime translation errors: Log warning, return key

**Utilities Reliability:**
- All utility functions: Pure functions with no side effects
- Input validation: Throw descriptive errors for invalid inputs
- Error handling: Never swallow errors silently
- Unit test coverage: 100% for all utilities

**Graceful Degradation Priority:**
1. **Critical:** Application stays up (health checks, logging fallback)
2. **Important:** Core functionality continues (i18n fallback, Sentry queue)
3. **Nice-to-have:** Enhanced features degrade gracefully (detailed context)

### Observability

**Structured Logging (Winston):**
- JSON format: Machine-parsable logs for aggregation tools
- Consistent schema: All log entries follow LogEntry interface
- Context enrichment: requestId, userId, domainId, module, method
- Log levels: debug, info, warn, error (filterable)
- Correlation: Request ID tracks entire request lifecycle
- Searchable: All context fields indexed in log aggregation systems
- Retention: 14 days default (configurable via LOG_MAX_FILES)

**Request/Response Tracing:**
- X-Request-ID header: Auto-generated UUID for each request
- Request logging: Method, URL, user agent, timestamp
- Response logging: Status code, duration (ms), timestamp
- Full request lifecycle visibility
- Performance tracking: Duration calculated automatically

**Error Tracking (Sentry):**
- Automatic exception capture: All unhandled exceptions
- User context: userId, domainId, phone (for support)
- Request context: Method, URL, headers, query, body
- Breadcrumbs: Log trail leading to error (last 100 events)
- Tags: environment, version, module, errorType
- Stack traces: Source-mapped TypeScript traces
- Error grouping: Similar errors grouped in Sentry dashboard
- Alerting: Configurable alerts (email, Slack, PagerDuty)

**Health & Status Monitoring:**
- Basic health: Application liveness (GET /health)
- Database health: Connection status + response time (GET /health/db)
- Service health: Future extensibility (GET /health/services)
- Metrics: Response times tracked in health check responses
- Load balancer integration: Standard HTTP status codes (200, 503)

**Debugging Capabilities:**
- Log level: Environment-based (debug in dev, info in prod)
- Stack traces: Full traces in development, sanitized in production
- Source maps: TypeScript → JavaScript mapping for Sentry
- Context propagation: Request ID through entire call stack
- Meta-logging: Winston logs its own errors to console

**Observability Best Practices:**
- Log on entry and exit: Critical operations logged at start/end
- Log errors with context: Always include request/user context
- Avoid log spam: Rate-limit repetitive logs
- Structured data: Use context objects, not string interpolation
- PII compliance: Never log sensitive data (passwords, tokens)

**Integration Points:**
- Log aggregation: ELK Stack, CloudWatch Logs, Datadog
- Error tracking: Sentry dashboard
- APM tools: Future integration (Prometheus, Grafana)
- Alerting: Sentry alerts + log-based alerts

## Dependencies and Integrations

### NPM Package Dependencies

**Core Dependencies (New for Epic 7):**

```json
{
  "nestjs-i18n": "^10.4.0",           // I18n module (Story 7.1)
  "winston": "^3.11.0",               // Structured logging (Story 7.3)
  "winston-daily-rotate-file": "^4.7.1", // Log rotation (Story 7.3)
  "@sentry/node": "^7.99.0",          // Error tracking (Story 7.5)
  "@nestjs/terminus": "^11.0.1",      // Health checks (Story 7.6)
  "uuid": "^13.0.0"                   // Request ID generation (already exists)
}
```

**Existing Dependencies (Used by Epic 7):**

```json
{
  "bcrypt": "^6.0.0",                 // Used by hash.util (Story 7.2)
  "@nestjs/common": "^11.0.1",        // Decorators, interceptors, filters
  "@nestjs/core": "^11.0.1",          // NestJS core functionality
  "@nestjs/config": "^4.0.2",         // Configuration management
  "class-transformer": "^0.5.1",      // Used in decorators
  "class-validator": "^0.14.2",       // Validation utilities
  "reflect-metadata": "^0.2.2"        // Decorator metadata
}
```

**DevDependencies:**

```json
{
  "@types/uuid": "^10.0.0",           // TypeScript types for uuid
  "@types/node": "^22.10.7"           // Node.js types
}
```

### External Service Integrations

**Sentry (Error Tracking):**
- Service: Sentry.io cloud platform
- Integration: @sentry/node SDK
- Configuration: SENTRY_DSN environment variable
- Data flow: Application → Sentry API (HTTPS)
- Retry: Automatic with exponential backoff
- Fallback: Local Winston logging if Sentry unavailable

**Log Aggregation (Future):**
- Services: ELK Stack, CloudWatch Logs, Datadog
- Integration: Winston transports (future)
- Format: JSON structured logs
- Protocol: HTTP/HTTPS or file-based collection

### Internal Module Dependencies

**Epic 7 depends on:**
- **Epic 1 (Database):** Health check uses PrismaService for DB health
- **Epic 2 (Auth):** @CurrentUser decorator extracts JWT payload from auth module

**Epic 7 provides to:**
- **All Epics:** I18n service for translated messages
- **All Epics:** Winston logger for structured logging
- **All Epics:** Common utilities (hash, date, string, validation)
- **All Epics:** Decorators (@CurrentUser, @Public, @ApiPaginatedResponse)
- **All Epics:** LoggingInterceptor (automatic request/response logging)
- **All Epics:** SentryExceptionFilter (automatic error tracking)
- **Operations:** Health check endpoints for monitoring

### Integration Architecture

```
┌─────────────────────────────────────────────────┐
│                  Application                     │
│                                                  │
│  ┌──────────────────────────────────────────┐  │
│  │         Developer Infrastructure         │  │
│  │                                          │  │
│  │  ┌─────────┐  ┌─────────┐  ┌────────┐  │  │
│  │  │  I18n   │  │ Winston │  │ Sentry │  │  │
│  │  └────┬────┘  └────┬────┘  └───┬────┘  │  │
│  │       │            │            │       │  │
│  └───────┼────────────┼────────────┼───────┘  │
│          │            │            │          │
│  ┌───────▼────────────▼────────────▼───────┐  │
│  │       All Feature Modules               │  │
│  │  (Auth, Users, Files, Permissions...)   │  │
│  └──────────────────────────────────────────┘  │
│                                                 │
└─────────────────────────────────────────────────┘
           │                │              │
           │                │              │
           ▼                ▼              ▼
    Translation       File System    Sentry API
     Files (.json)    (logs/)        (sentry.io)
```

### Version Constraints and Compatibility

**nestjs-i18n:**
- Minimum: v10.4.0
- Compatible with: NestJS v11.x
- Breaking changes: None expected in v10.x

**winston:**
- Minimum: v3.11.0
- Stable: v3.x is LTS
- Breaking changes: None expected in v3.x

**winston-daily-rotate-file:**
- Minimum: v4.7.1
- Requires: winston v3.x
- Breaking changes: None expected in v4.x

**@sentry/node:**
- Minimum: v7.99.0
- Recommended: Latest v7.x (v8.x is major breaking change)
- Breaking changes: Avoid v8.x for now (API changes)

**@nestjs/terminus:**
- Minimum: v11.0.1
- Must match: NestJS version (v11.x)
- Breaking changes: Follow NestJS major version

**Compatibility Matrix:**

| Package | Version | Node.js | NestJS | TypeScript |
|---------|---------|---------|--------|------------|
| nestjs-i18n | v10.4.0 | >=18.x | v11.x | >=5.3 |
| winston | v3.11.0 | >=18.x | Any | >=5.0 |
| @sentry/node | v7.99.0 | >=18.x | Any | >=5.0 |
| @nestjs/terminus | v11.0.1 | >=18.x | v11.x | >=5.3 |

### Installation Commands

```bash
# Install core dependencies
npm install nestjs-i18n@^10.4.0
npm install winston@^3.11.0 winston-daily-rotate-file@^4.7.1
npm install @sentry/node@^7.99.0
npm install @nestjs/terminus@^11.0.1

# Install type definitions (devDependencies)
npm install -D @types/uuid@^10.0.0
```

## Acceptance Criteria (Authoritative)

### Story 7.1: Internationalization (i18n) Setup

**AC-7.1.1:** nestjs-i18n package installed and configured in I18nModule
**AC-7.1.2:** Translation files created for TR and EN languages:
  - `src/modules/i18n/translations/en/common.json`
  - `src/modules/i18n/translations/en/auth.json`
  - `src/modules/i18n/translations/en/users.json`
  - `src/modules/i18n/translations/tr/common.json`
  - `src/modules/i18n/translations/tr/auth.json`
  - `src/modules/i18n/translations/tr/users.json`
**AC-7.1.3:** I18nModule configured with:
  - Default language: EN
  - Fallback language: EN
  - Language detection via Accept-Language header
**AC-7.1.4:** Translation usage works: `this.i18n.t('auth.LOGIN_SUCCESS')` returns translated string
**AC-7.1.5:** Error messages use i18n: `throw new NotFoundException(this.i18n.t('users.NOT_FOUND'))`
**AC-7.1.6:** Dynamic variables work: `this.i18n.t('auth.OTP_SENT', { args: { phone: '...' } })`

### Story 7.2: Common Utilities & Decorators

**AC-7.2.1:** Decorators created in `src/common/decorators/`:
  - `current-user.decorator.ts` → @CurrentUser() extracts user from request.user
  - `public.decorator.ts` → @Public() sets IS_PUBLIC_KEY metadata
  - `api-paginated-response.decorator.ts` → @ApiPaginatedResponse() creates Swagger schema
**AC-7.2.2:** Utility files created in `src/common/utils/`:
  - `hash.util.ts` → hashPassword(), comparePassword() using bcrypt
  - `date.util.ts` → formatDate(), toUTC(), addDays(), diffInMs()
  - `string.util.ts` → slugify(), truncate(), capitalize(), removeSpecialChars()
  - `validation.util.ts` → isValidPhone(), isStrongPassword(), sanitizeInput()
**AC-7.2.3:** All utilities have 100% unit test coverage
**AC-7.2.4:** @CurrentUser() decorator successfully extracts authenticated user in controllers
**AC-7.2.5:** @Public() decorator bypasses JwtAuthGuard when applied to routes

### Story 7.3: Structured Logging (Winston)

**AC-7.3.1:** Winston configured and usable globally via dependency injection
**AC-7.3.2:** Log format is JSON structured with fields: timestamp, level, message, context
**AC-7.3.3:** Log levels implemented: debug, info, warn, error
**AC-7.3.4:** Console transport configured for development environment
**AC-7.3.5:** File transport configured for production with daily rotation
**AC-7.3.6:** Log level is environment-based (dev: debug, prod: info)
**AC-7.3.7:** Sensitive data (passwords, tokens) excluded from logs
**AC-7.3.8:** Log files written to `logs/` directory with rotation (app-YYYY-MM-DD.log)

### Story 7.4: Request/Response Logging Interceptor

**AC-7.4.1:** LoggingInterceptor created and registered globally
**AC-7.4.2:** Each request logged with: method, URL, user agent, request ID, timestamp
**AC-7.4.3:** Each response logged with: status code, duration (ms), timestamp
**AC-7.4.4:** Sensitive data excluded from request/response logs (passwords, tokens in body)
**AC-7.4.5:** X-Request-ID header support: Generate UUID if not present, propagate if exists
**AC-7.4.6:** Request ID included in all log entries for correlation

### Story 7.5: Sentry Error Tracking

**AC-7.5.1:** @sentry/node package installed and Sentry.init() configured in main.ts
**AC-7.5.2:** Sentry configuration reads SENTRY_DSN and SENTRY_ENVIRONMENT from env
**AC-7.5.3:** SentryExceptionFilter created and registered globally
**AC-7.5.4:** All unhandled exceptions captured and sent to Sentry
**AC-7.5.5:** User context set in Sentry events (userID, domainID)
**AC-7.5.6:** Request context set in Sentry events (URL, method, headers)
**AC-7.5.7:** Breadcrumbs included (log trail before error)
**AC-7.5.8:** Source maps configured for TypeScript stack traces
**AC-7.5.9:** Sensitive data scrubbed before sending to Sentry (passwords, tokens)

### Story 7.6: Health Check Endpoints

**AC-7.6.1:** @nestjs/terminus package installed
**AC-7.6.2:** HealthController created in `src/health/`
**AC-7.6.3:** GET /health endpoint returns: `{ status: 'ok', timestamp: '...' }` with 200 OK
**AC-7.6.4:** GET /health endpoint is public (no authentication required)
**AC-7.6.5:** GET /health/db endpoint checks database connection (Prisma.$queryRaw SELECT 1)
**AC-7.6.6:** GET /health/db returns: `{ status: 'ok', database: 'connected', responseTime: 23, timestamp: '...' }` when healthy
**AC-7.6.7:** GET /health/db returns 503 Service Unavailable when database disconnected
**AC-7.6.8:** GET /health/services endpoint created as stub for future expansion

## Traceability Mapping

| AC ID | PRD Requirement | Architecture Component | Implementation | Test Strategy |
|-------|----------------|------------------------|----------------|---------------|
| **AC-7.1.1** | FR-7: I18n multi-language support | `src/modules/i18n/i18n.module.ts` | I18nModule with nestjs-i18n | Unit: Module config test |
| **AC-7.1.2** | FR-7.1: Translation file management | `src/modules/i18n/translations/{lang}/*.json` | JSON translation files (TR/EN) | Unit: Translation file loading |
| **AC-7.1.3** | FR-7.2: Language selection | I18nModule config | Default lang: EN, Fallback: EN, Accept-Language header | Integration: Header parsing |
| **AC-7.1.4** | FR-7.3: Translation helper | I18nService.t() | Translation key resolution | Unit: Translation lookup |
| **AC-7.1.5** | FR-7: Error messages i18n | Exception filters with i18n | Translated error responses | E2E: Error message translation |
| **AC-7.1.6** | FR-7.3: Dynamic variable replacement | I18nService with args | `{{variable}}` replacement | Unit: Variable interpolation |
| **AC-7.2.1** | FR-8.4: Custom decorators | `src/common/decorators/` | @CurrentUser, @Public, @ApiPaginatedResponse | Unit: Decorator metadata |
| **AC-7.2.2** | FR-8.4: Utility functions | `src/common/utils/` | hash, date, string, validation utils | Unit: 100% coverage |
| **AC-7.2.3** | Quality: Test coverage %70+ | Jest unit tests | All utility functions tested | Coverage: Minimum 100% |
| **AC-7.2.4** | FR-2: Authentication integration | @CurrentUser decorator | Extract JWT payload from request | Integration: Auth context |
| **AC-7.2.5** | API: Public routes | @Public decorator + JwtAuthGuard | Bypass JWT validation | E2E: Public endpoint access |
| **AC-7.3.1** | FR-8.1: Logging infrastructure | Winston logger (global) | app.useLogger(winstonLogger) | Unit: Logger injection |
| **AC-7.3.2** | FR-8.1: Structured logging | Winston JSON format | LogEntry interface | Unit: Log format validation |
| **AC-7.3.3** | FR-8.1: Log levels | Winston config | debug, info, warn, error | Unit: Log level filtering |
| **AC-7.3.4** | DevOps: Development logging | Console transport | winston.transports.Console | Integration: Console output |
| **AC-7.3.5** | DevOps: Production logging | File transport with rotation | winston-daily-rotate-file | Integration: File writing |
| **AC-7.3.6** | DevOps: Environment-based config | LOG_LEVEL env variable | Dynamic log level | Unit: Config parsing |
| **AC-7.3.7** | NFR-2.3: Data security | Sensitive data scrubbing | Exclude passwords, tokens | Unit: Scrubbing logic |
| **AC-7.3.8** | DevOps: Log retention | File transport config | logs/app-YYYY-MM-DD.log | Integration: File rotation |
| **AC-7.4.1** | FR-8.1: Request/Response logging | LoggingInterceptor (global) | NestJS interceptor | Unit: Interceptor logic |
| **AC-7.4.2** | NFR-6.1: Request logging | LoggingInterceptor | Method, URL, user agent, requestId | E2E: Request logs |
| **AC-7.4.3** | NFR-1.1: Performance logging | LoggingInterceptor | Status code, duration (ms) | E2E: Response logs |
| **AC-7.4.4** | NFR-2.3: Sensitive data protection | Request body sanitization | Password, token exclusion | Unit: Sanitization |
| **AC-7.4.5** | Observability: Request tracing | X-Request-ID header | UUID generation/propagation | Integration: Header handling |
| **AC-7.4.6** | Observability: Correlation | Request ID in logs | Context propagation | E2E: Log correlation |
| **AC-7.5.1** | FR-8.2: Sentry integration | Sentry.init() in main.ts | @sentry/node SDK | Unit: Sentry initialization |
| **AC-7.5.2** | DevOps: Configuration | Sentry config | SENTRY_DSN, SENTRY_ENVIRONMENT | Unit: Config validation |
| **AC-7.5.3** | FR-8.2: Error tracking | SentryExceptionFilter | Global exception filter | Unit: Filter registration |
| **AC-7.5.4** | NFR-6.2: Automatic error capture | Exception filter catch | Unhandled exceptions | E2E: Error captured |
| **AC-7.5.5** | Observability: User context | Sentry user context | userId, domainId | E2E: Context in Sentry |
| **AC-7.5.6** | Observability: Request context | Sentry request context | Method, URL, headers | E2E: Request in Sentry |
| **AC-7.5.7** | Observability: Breadcrumbs | Sentry breadcrumbs | Log trail (100 events) | E2E: Breadcrumb tracking |
| **AC-7.5.8** | DevOps: Stack traces | Source maps | TypeScript → JavaScript | Unit: Source map config |
| **AC-7.5.9** | NFR-2.3: Sensitive data scrubbing | BeforeSend hook | Remove passwords, tokens | Unit: Scrubbing hook |
| **AC-7.6.1** | FR-8.3: Health check endpoints | @nestjs/terminus | HealthCheckService | Unit: Terminus integration |
| **AC-7.6.2** | Architecture: Health module | `src/health/` | HealthController, HealthModule | Unit: Module structure |
| **AC-7.6.3** | DevOps: Basic liveness check | GET /health | Always 200 OK | E2E: Health endpoint |
| **AC-7.6.4** | API: Public endpoint | @Public on health routes | No authentication | E2E: Public access |
| **AC-7.6.5** | FR-8.3: Database health check | Prisma.$queryRaw | SELECT 1 query | Integration: DB connection |
| **AC-7.6.6** | Observability: DB health response | GET /health/db | Status, responseTime | E2E: Healthy response |
| **AC-7.6.7** | NFR-3.3: Reliability | Error handling | 503 if DB down | E2E: Unhealthy response |
| **AC-7.6.8** | Architecture: Extensibility | GET /health/services | Stub for future services | Unit: Endpoint structure |

**Requirements Coverage Summary:**

- **PRD FR-7 (I18n):** Fully covered by AC-7.1.x
- **PRD FR-8 (Developer Infrastructure):** Fully covered by AC-7.2.x through AC-7.6.x
- **PRD NFR-1 (Performance):** Covered by AC-7.4.3 (performance logging)
- **PRD NFR-2 (Security):** Covered by AC-7.3.7, AC-7.4.4, AC-7.5.9 (sensitive data)
- **PRD NFR-3 (Reliability):** Covered by AC-7.6.7 (graceful degradation)
- **PRD NFR-6 (Observability):** Fully covered by AC-7.3.x, AC-7.4.x, AC-7.5.x

**Epic Dependencies Met:**
- Epic 1 (Database): AC-7.6.5 uses PrismaService
- Epic 2 (Auth): AC-7.2.4 integrates with JWT authentication

## Risks, Assumptions, Open Questions

### Risks

**RISK-7.1: Sentry Service Unavailability** [Medium]
- **Description:** Sentry.io service downtime could prevent error tracking
- **Impact:** Loss of error visibility during outage
- **Mitigation:**
  - Local queue for failed sends (retry when service restored)
  - Circuit breaker to disable Sentry if consistently failing
  - Winston logging as fallback (errors still logged locally)
  - Monitor Sentry status page proactively

**RISK-7.2: Log File Disk Space Exhaustion** [Low]
- **Description:** Excessive logging could fill disk space in production
- **Impact:** Application crash or degraded performance
- **Mitigation:**
  - Daily log rotation configured (winston-daily-rotate-file)
  - 14-day retention by default (LOG_MAX_FILES=14d)
  - Disk space monitoring alerts
  - Log level set to 'info' in production (not 'debug')

**RISK-7.3: Sensitive Data Leakage in Logs** [High]
- **Description:** Passwords, tokens accidentally logged despite scrubbing
- **Impact:** Security breach, compliance violation
- **Mitigation:**
  - Comprehensive sensitive field detection (password, token, secret, apiKey, creditCard)
  - Automated tests for sensitive data scrubbing
  - Code review checklist: Never log request bodies without sanitization
  - Regular audit of production logs

**RISK-7.4: Performance Degradation from Logging** [Low]
- **Description:** Excessive logging could slow down requests
- **Impact:** API response time increase
- **Mitigation:**
  - Async file writes (non-blocking)
  - Log level optimization (info in prod, not debug)
  - Performance testing with logging enabled
  - Target: < 5ms overhead per request

**RISK-7.5: Translation File Synchronization** [Medium]
- **Description:** TR and EN translation files could become out of sync
- **Impact:** Missing translations, inconsistent user experience
- **Mitigation:**
  - Automated validation: Check all keys exist in both languages
  - Pre-commit hook to validate translation completeness
  - Fallback to EN if TR key missing
  - Translation management in future (Phrase, Lokalise)

### Assumptions

**ASSUMPTION-7.1:** Sentry DSN will be provided by operations team before deployment
- **Validation:** Confirmed with DevOps team
- **Risk if invalid:** Error tracking won't work (fallback to Winston logs)

**ASSUMPTION-7.2:** Production environment has write permissions for `logs/` directory
- **Validation:** Docker container configuration
- **Risk if invalid:** File logging fails (fallback to console only)

**ASSUMPTION-7.3:** Load balancer polls /health endpoint every 30 seconds
- **Validation:** Standard AWS ALB/ELB configuration
- **Risk if invalid:** Health check design may need adjustment

**ASSUMPTION-7.4:** Only TR and EN languages needed for MVP
- **Validation:** Confirmed in PRD
- **Risk if invalid:** Need to add more translation files

**ASSUMPTION-7.5:** bcrypt rounds=10 sufficient for password security
- **Validation:** Industry standard (OWASP recommendation)
- **Risk if invalid:** Increase rounds via BCRYPT_ROUNDS env variable

**ASSUMPTION-7.6:** UTC timezone for all timestamps in logs
- **Validation:** Architecture decision (standardize on UTC)
- **Risk if invalid:** Timezone confusion in distributed systems

### Open Questions

**QUESTION-7.1:** Should health check endpoints include Redis, S3, external API status?
- **Decision needed:** Phase 1 (MVP) vs Phase 2 (future)
- **Current plan:** Stub endpoint (/health/services) for future expansion
- **Blocker:** No

**QUESTION-7.2:** Should we implement log sampling for high-traffic endpoints?
- **Decision needed:** If request volume > 1000 req/sec
- **Current plan:** Log all requests in MVP, revisit if performance issue
- **Blocker:** No

**QUESTION-7.3:** Should Sentry performance monitoring (APM) be enabled?
- **Decision needed:** Depends on Sentry plan (costs)
- **Current plan:** Error tracking only (MVP), APM in Phase 2
- **Blocker:** No

**QUESTION-7.4:** Should we support additional log transports (e.g., CloudWatch, Datadog)?
- **Decision needed:** Based on infrastructure choice
- **Current plan:** File + Console for MVP, cloud transport in Phase 2
- **Blocker:** No

**QUESTION-7.5:** Should i18n support plural forms (e.g., "1 item" vs "2 items")?
- **Decision needed:** User experience requirement
- **Current plan:** Not in MVP, nestjs-i18n supports plurals if needed later
- **Blocker:** No

## Test Strategy Summary

### Test Coverage Goals

**Overall Target:** 80%+ coverage for Epic 7 components
- **Utilities:** 100% coverage (pure functions, critical functionality)
- **Services:** 80%+ coverage
- **Controllers:** 70%+ coverage (E2E tests cover integration)
- **Interceptors/Filters:** 80%+ coverage (critical for logging/errors)

### Unit Tests

**Story 7.1: I18n (nestjs-i18n)**
- **Module Configuration:**
  - Test: I18nModule loads with correct config (default lang, fallback)
  - Test: Translation files loaded successfully
- **Translation Service:**
  - Test: `t()` returns correct translation for existing key
  - Test: `t()` returns key if translation missing (graceful degradation)
  - Test: Variable replacement works (`{{phone}}` replaced with value)
  - Test: Language override works (force TR even if header says EN)
- **Coverage Target:** 90%+

**Story 7.2: Utilities & Decorators**
- **hash.util.ts:**
  - Test: `hashPassword()` produces valid bcrypt hash
  - Test: `comparePassword()` returns true for matching password
  - Test: `comparePassword()` returns false for wrong password
  - Test: Hash with different rounds produces different hashes
- **date.util.ts:**
  - Test: `formatDate()` formats correctly
  - Test: `toUTC()` converts to UTC
  - Test: `addDays()` adds correct number of days
  - Test: `diffInMs()` calculates difference correctly
- **string.util.ts:**
  - Test: `slugify()` converts to URL-safe slug
  - Test: `truncate()` truncates to max length
  - Test: `capitalize()` capitalizes first letter
  - Test: `removeSpecialChars()` removes special characters
- **validation.util.ts:**
  - Test: `isValidPhone()` validates Turkish phone format
  - Test: `isStrongPassword()` checks password strength
  - Test: `sanitizeInput()` removes XSS vectors
- **Decorators:**
  - Test: `@CurrentUser()` extracts user from request.user
  - Test: `@Public()` sets IS_PUBLIC_KEY metadata
  - Test: `@ApiPaginatedResponse()` generates correct Swagger schema
- **Coverage Target:** 100%

**Story 7.3: Winston Logging**
- **Logger Configuration:**
  - Test: Winston logger initializes with correct transports
  - Test: Console transport enabled in development
  - Test: File transport enabled in production
  - Test: Log level respects LOG_LEVEL env variable
- **Log Format:**
  - Test: Log entry has JSON structure
  - Test: Log entry includes timestamp, level, message, context
  - Test: Sensitive fields (password, token) excluded from logs
- **Coverage Target:** 85%

**Story 7.4: Logging Interceptor**
- **Request Logging:**
  - Test: Request logged with method, URL, user agent
  - Test: X-Request-ID generated if not present
  - Test: X-Request-ID propagated if present in header
- **Response Logging:**
  - Test: Response logged with status code, duration
  - Test: Duration calculated correctly (ms)
- **Sensitive Data:**
  - Test: Password field excluded from request body log
  - Test: Token field excluded from request body log
- **Coverage Target:** 90%

**Story 7.5: Sentry Error Tracking**
- **Initialization:**
  - Test: Sentry.init() called with correct DSN
  - Test: Environment set from SENTRY_ENVIRONMENT
- **Exception Filter:**
  - Test: Unhandled exception captured by filter
  - Test: User context added (userId, domainId)
  - Test: Request context added (method, URL, headers)
  - Test: Sensitive data scrubbed (passwords, tokens)
- **Coverage Target:** 85%

**Story 7.6: Health Checks**
- **Basic Health:**
  - Test: GET /health returns 200 OK
  - Test: Response has correct structure (status, timestamp)
- **Database Health:**
  - Test: GET /health/db returns 200 when DB connected
  - Test: GET /health/db returns 503 when DB disconnected
  - Test: Response includes responseTime in ms
- **Coverage Target:** 90%

### Integration Tests

**I18n Integration:**
- Test: Accept-Language header changes response language
- Test: Missing translation key falls back to EN
- Test: Translation works in exception filters (error messages translated)

**Logging Integration:**
- Test: Log files created in logs/ directory
- Test: Log rotation creates new file daily
- Test: Console output visible in development
- Test: File output written in production

**Health Check Integration:**
- Test: /health endpoint accessible without authentication
- Test: /health/db queries actual database
- Test: Database reconnection detected by health check

**Sentry Integration:**
- Test: Exception sent to Sentry (mocked Sentry API)
- Test: User context included in Sentry event
- Test: Request context included in Sentry event

### E2E Tests

**Full Request Lifecycle:**
- Test: Incoming request → LoggingInterceptor → Controller → Response logged
- Test: Request ID propagates through entire request
- Test: Exception in controller → SentryExceptionFilter → Sentry + Winston

**Health Check E2E:**
- Test: Load balancer can poll /health endpoint
- Test: /health/db returns correct status based on DB state
- Test: Health checks don't require authentication

**I18n E2E:**
- Test: API response messages in EN when Accept-Language: en
- Test: API response messages in TR when Accept-Language: tr
- Test: Error messages translated based on language

**Utilities E2E:**
- Test: @CurrentUser() decorator works in actual request
- Test: @Public() decorator bypasses auth in real endpoint
- Test: Password hashing works end-to-end (register → login)

### Test Data & Mocks

**Mocks:**
- **Sentry:** Mock Sentry.captureException() to avoid external calls
- **File System:** Mock fs for log file tests (avoid actual file writes)
- **PrismaService:** Mock database queries for health check tests

**Test Data:**
- **Translation Files:** Sample EN/TR translations for testing
- **Log Entries:** Sample log entries with various contexts
- **Health Responses:** Sample health check responses (healthy/unhealthy)

### Performance Tests

**Logging Performance:**
- Test: Request with logging < 5ms overhead
- Test: 1000 log entries written < 1 second
- Test: File transport doesn't block request thread

**Health Check Performance:**
- Test: /health responds < 10ms
- Test: /health/db responds < 50ms
- Test: Health checks under load (100 req/sec)

### Edge Cases & Error Scenarios

**I18n Edge Cases:**
- Missing translation key → Returns key itself
- Invalid Accept-Language header → Falls back to default (EN)
- Translation file loading fails → Application fails to start (fail-fast)

**Logging Edge Cases:**
- Log directory not writable → Falls back to console only
- Disk full → Winston handles gracefully (drops new logs, doesn't crash)
- Circular reference in context object → Logged as [Circular]

**Sentry Edge Cases:**
- Sentry API unavailable → Errors queued locally
- SENTRY_DSN missing → Sentry disabled (graceful degradation)
- Network timeout → Retry with exponential backoff

**Health Check Edge Cases:**
- Database query timeout (> 5s) → Returns 503 with timeout message
- Database connection refused → Returns 503 with connection error
- Multiple rapid health checks → No race conditions

### Test Execution Strategy

**Pre-commit:**
- Run unit tests for utilities (fast feedback, < 1s)
- Linting and formatting checks

**CI Pipeline:**
- All unit tests (< 30s)
- All integration tests (< 2 min)
- All E2E tests (< 5 min)
- Coverage report generation
- Fail build if coverage < 70%

**Manual Testing:**
- Sentry dashboard verification (actual error captured)
- Log aggregation tool verification (logs searchable)
- Load balancer health check configuration

### Test Documentation

Each test file should include:
- **Arrange-Act-Assert** pattern
- Clear test names describing behavior
- Comments for complex setup/mocking
- Coverage of happy path + edge cases
