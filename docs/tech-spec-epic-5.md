# Epic Technical Specification: Communication Infrastructure (FONIVA SMS Pattern)

Date: 2025-11-07
Author: BMad
Epic ID: 5
Status: Draft

---

## Overview

Epic 5, **Communication Infrastructure (FONIVA SMS Pattern)** sistemini implement eder. Bu epic, multi-channel communication (SMS via FONIVA, Email, Push Notification) altyapısını, database tracking, delivery callbacks, retry mechanism ve unified notification sistemi ile sağlar. Production-proven FONIVA SMS integration pattern'i hrsync-backend'den kopyalanarak adapt edilir ve boilerplate'in communication capability'sini oluşturur.

**Epic Kapsamı:**
- FONIVA SMS Module: hrsync-backend proven pattern ile database tracking, delivery status, retry mechanism, statistics
- Email Provider Interface & SendGrid Implementation: Provider abstraction ile kolay provider değişimi
- Email Templates (Handlebars): Template engine ile dynamic email content
- Epic 2 Integration: Email verification ve password reset'e gerçek email gönderimi
- OTP Sending Integration: Epic 2'deki OTP gönderimini SMS ile implement (FONIVA)
- Notification Preferences Entity: Kullanıcı notification tercihleri yönetimi
- Unified Notification Service: Multi-channel notification orchestration
- Firebase Push Notification (Optional): Mobile push notification desteği

Bu epic, Epic 1 (Database Infrastructure), Epic 2 (Authentication), Epic 3 (User Management) ve Epic 4 (File Management) üzerine inşa edilir ve boilerplate'in communication infrastructure'sını tamamlar.

## Objectives and Scope

### Objectives

1. **Production-Ready SMS Infrastructure**: FONIVA SMS entegrasyonu ile database tracking, delivery callbacks, retry mechanism ve statistics
2. **Provider Abstraction**: SMS ve Email provider'ları kolayca değiştirilebilir interface pattern'i
3. **Template-Based Communication**: EJS (SMS) ve Handlebars (Email) template engine'leri ile dynamic content
4. **Epic 2 Integration**: Authentication flow'larına gerçek SMS ve Email gönderimi entegrasyonu
5. **Unified Notification System**: Multi-channel (SMS, Email, Push) notification orchestration
6. **User Preferences**: Kullanıcı notification tercihleri yönetimi
7. **Multi-Tenancy**: domainID-based communication tracking ve isolation

### In Scope

**SMS Module (FONIVA Pattern):**
- SMS Entity (Prisma model): domainID, phoneNumber, message, type, status, provider, providerId, attemptCount, errorMessage, timestamps
- FONIVA Service: FONIVA REST API integration (axios), environment variables (FONIVA_API_URL, FONIVA_USERNAME, FONIVA_PASSWORD, FONIVA_API_KEY, FONIVA_SENDER)
- SMS Service: Main orchestrator with database tracking, retry mechanism (max 3 attempts, exponential backoff)
- Delivery Callbacks: Webhook endpoint (POST /sms/callback/delivery) for FONIVA status updates
- SMS Statistics: GET /sms/stats endpoint (admin only) with aggregation (total sent/delivered/failed, success rate by type, date range filtering)
- Module structure: `src/modules/sms/` (entities, services, dto, enums, __tests__)

**Email Module:**
- Email Provider Interface: `IEmailProvider` interface (send method)
- SendGrid Provider: SendGrid SDK implementation (@sendgrid/mail)
- Mail Service: Provider-agnostic email service with dynamic provider injection (MAIL_PROVIDER env var)
- Email Templates: Handlebars template engine (verification.hbs, password-reset.hbs, welcome.hbs)
- Template Service: Template rendering with compile and cache
- Module structure: `src/modules/mail/` (interfaces, providers, templates, services)

**Notification Module:**
- Notification Entity: domainID, userID, type, channel, title, message, data (JSON), sent, sentAt, createdAt
- NotificationPreference Entity: domainID, userID, channel (EMAIL|SMS|PUSH), enabled (default: true)
- Unified Notification Service: Multi-channel sending based on user preferences
- DeviceToken Entity (Push): domainID, userID, token, platform (iOS|Android), createdAt
- Module structure: `src/modules/notifications/` (entities, services)

**Epic 2 Integration:**
- Auth module → MailService injection for email verification and password reset
- Auth module → SmsService injection for OTP sending (registration, login, password reset)
- Async sending (fire-and-forget) for non-blocking operations
- Error handling: Log errors, don't block auth flows

**Firebase Push (Optional):**
- Firebase Admin SDK configuration (FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL)
- FirebaseService: sendPush method with device token management
- Device token registration endpoint (POST /users/me/device-tokens)
- Optional feature: Skip if FIREBASE_ENABLED=false

### Out of Scope

- SMS provider switching UI (admin panel) - Future enhancement
- Email bounce/complaint handling automation - Future enhancement
- Notification scheduling system - Future enhancement
- SMS template management UI - Future enhancement
- Email template management UI - Future enhancement
- Push notification scheduling - Future enhancement
- Multi-language SMS templates (beyond TR/EN) - Future enhancement
- SMS/Email analytics dashboard - Future enhancement
- Bulk notification sending - Future enhancement

## System Architecture Alignment

Epic 5, boilerplate architecture'ın **modules/sms/**, **modules/mail/** ve **modules/notifications/** bileşenlerini implement eder ve aşağıdaki architecture kararlarına align olur:

### Architecture Decisions Alignment

| Architecture Decision | Epic 5 Implementation |
|----------------------|----------------------|
| **Controller-Service Pattern** | SmsController → SmsService → FonivaService pattern<br>MailController → MailService → SendGridProvider pattern<br>NotificationController → NotificationService → Multi-channel orchestration |
| **Multi-Tenancy (Hybrid)** | @DomainID decorator + domainID filtering in all queries<br>SMS, Notification, NotificationPreference entities include domainID |
| **Authorization Model (RBAC)** | PermissionsGuard + SMS.*, MAIL.*, NOTIFICATIONS.* permissions |
| **Provider Abstraction** | IEmailProvider interface, ISMSProvider pattern (FONIVA implementation)<br>Dynamic provider injection via environment variables |
| **Module Organization** | sms/, mail/, notifications/ modules with clear boundaries<br>hrsync-backend proven pattern replication |
| **Response Format** | Global interceptor ile consistent API responses |
| **Error Handling** | Layered exceptions + i18n translated messages<br>Retry mechanism for SMS failures |
| **Database Tracking** | SMS entity for audit trail<br>Notification entity for history tracking |

### Component Integration

**Dependencies:**
- **Database Module**: PrismaService injection for SMS, Notification, NotificationPreference operations
- **Auth Module**: JwtAuthGuard for protected routes, @CurrentUser decorator, OTP integration points
- **Permissions Module**: PermissionsGuard, SMS.*, MAIL.*, NOTIFICATIONS.* permissions
- **Common Module**: Guards (JwtAuthGuard, PermissionsGuard), Decorators (@Permission, @CurrentUser, @DomainID), Interceptors (ResponseTransformInterceptor)
- **Config Module**: FONIVA, SendGrid, Firebase configuration (environment variables)

**Provided Services:**
- **SmsService**: SMS sending orchestration (used by Auth module for OTP delivery)
- **MailService**: Email sending orchestration (used by Auth module for verification emails)
- **NotificationService**: Unified notification sending (used by other modules for multi-channel notifications)
- **FonivaService**: FONIVA provider implementation (internal to SMS module)
- **SendGridProvider**: SendGrid implementation (internal to Mail module)
- **FirebaseService**: Push notification service (optional, internal to Notifications module)

### Module Structure

```
src/modules/
├── sms/                             # SMS Communication (hrsync-backend FONIVA pattern)
│   ├── __tests__/
│   ├── controllers/
│   │   └── sms.controller.ts        # SMS endpoints (stats, callback)
│   ├── entities/
│   │   └── sms.entity.ts            # SMS database tracking (Prisma model)
│   ├── services/
│   │   ├── sms.service.ts           # Main SMS service with DB tracking
│   │   └── foniva.service.ts        # FONIVA provider implementation
│   ├── dto/
│   │   ├── send-sms.dto.ts
│   │   └── delivery-callback.dto.ts # FONIVA webhook DTO
│   ├── enums/
│   │   ├── sms-type.enum.ts         # OTP, NOTIFICATION, MARKETING, ALERT
│   │   └── sms-status.enum.ts      # PENDING, SENT, DELIVERED, FAILED
│   └── sms.module.ts
│
├── mail/                            # Email Communication
│   ├── __tests__/
│   ├── controllers/
│   │   └── mail.controller.ts       # Mail endpoints (optional admin)
│   ├── interfaces/
│   │   └── mail-provider.interface.ts # IEmailProvider interface
│   ├── providers/
│   │   ├── sendgrid.provider.ts     # SendGrid implementation
│   │   └── aws-ses.provider.ts      # AWS SES implementation (future)
│   ├── templates/
│   │   ├── verification.hbs
│   │   ├── password-reset.hbs
│   │   └── welcome.hbs
│   ├── services/
│   │   ├── mail.service.ts          # Provider-agnostic mail service
│   │   └── template.service.ts     # Handlebars template rendering
│   └── mail.module.ts
│
└── notifications/                   # Unified Notification System
    ├── __tests__/
    ├── controllers/
    │   └── notifications.controller.ts # Notification endpoints
    ├── entities/
    │   ├── notification.entity.ts    # Notification history
    │   ├── notification-preference.entity.ts # User preferences
    │   └── device-token.entity.ts    # Push device tokens (optional)
    ├── services/
    │   ├── notification.service.ts   # Unified notification orchestration
    │   └── firebase.service.ts       # Firebase push (optional)
    └── notifications.module.ts
```

## Detailed Design

### Services and Modules

#### SMS Module Services

**SmsService** (`src/modules/sms/services/sms.service.ts`):
- **Responsibility**: Main SMS orchestration service with database tracking
- **Key Methods**:
  - `sendSms(domainID: string, phoneNumber: string, message: string, type: SmsType): Promise<SMS>`
    - Creates SMS record (status: PENDING)
    - Calls FonivaService.sendSms()
    - Updates SMS record: Success → status: SENT, providerId, sentAt | Failure → status: FAILED, errorMessage, attemptCount++
    - Returns SMS entity
  - `retrySms(smsId: string): Promise<SMS>`
    - Checks attemptCount < 3
    - Re-attempts FONIVA send with exponential backoff (1min → 5min → 15min)
    - Updates SMS record
- **Inputs**: domainID, phoneNumber, message, type
- **Outputs**: SMS entity with tracking information
- **Dependencies**: PrismaService, FonivaService

**FonivaService** (`src/modules/sms/services/foniva.service.ts`):
- **Responsibility**: FONIVA REST API integration
- **Key Methods**:
  - `sendSms(phoneNumber: string, message: string, type: SmsType): Promise<FonivaResult>`
    - FONIVA API call via axios
    - Returns providerId (FONIVA message ID)
- **Inputs**: phoneNumber, message, type
- **Outputs**: FonivaResult (providerId, success status)
- **Dependencies**: Axios, FONIVA API credentials (environment variables)
- **Error Handling**: Network failures, invalid credentials

#### Mail Module Services

**MailService** (`src/modules/mail/services/mail.service.ts`):
- **Responsibility**: Provider-agnostic email sending orchestration
- **Key Methods**:
  - `sendEmail(to: string, subject: string, html: string, text?: string): Promise<void>`
    - Delegates to configured provider (SendGrid/AWS SES)
    - Wraps provider exceptions
  - `sendTemplateEmail(to: string, subject: string, templateName: string, data: object): Promise<void>`
    - Renders template via TemplateService
    - Calls sendEmail with rendered content
- **Inputs**: to, subject, html/text, templateName + data
- **Outputs**: void (async operation)
- **Dependencies**: IEmailProvider (dynamic injection), TemplateService

**TemplateService** (`src/modules/mail/services/template.service.ts`):
- **Responsibility**: Handlebars template rendering with compile and cache
- **Key Methods**:
  - `render(templateName: string, data: object): Promise<string>`
    - Compiles template (cached)
    - Renders with data
    - Returns HTML string
- **Inputs**: templateName, data object
- **Outputs**: Rendered HTML string
- **Dependencies**: Handlebars library

**SendGridProvider** (`src/modules/mail/providers/sendgrid.provider.ts`):
- **Responsibility**: SendGrid SDK implementation
- **Implements**: IEmailProvider interface
- **Key Methods**:
  - `send(to: string, subject: string, html: string, text?: string): Promise<EmailResult>`
    - SendGrid SDK call (@sendgrid/mail)
    - Returns EmailResult (messageId, success status)
- **Inputs**: to, subject, html, text
- **Outputs**: EmailResult
- **Dependencies**: @sendgrid/mail SDK, SENDGRID_API_KEY, MAIL_FROM

#### Notification Module Services

**NotificationService** (`src/modules/notifications/services/notification.service.ts`):
- **Responsibility**: Unified multi-channel notification orchestration
- **Key Methods**:
  - `send(userID: string, type: string, title: string, message: string, data?: object): Promise<void>`
    - Fetches user notification preferences
    - Sends to enabled channels (SMS + Email + Push)
    - Records notification history in database
    - Handles partial success (log failures, mark channel as failed)
- **Inputs**: userID, type, title, message, data
- **Outputs**: void (async operation)
- **Dependencies**: SmsService, MailService, FirebaseService (optional), PrismaService

**FirebaseService** (`src/modules/notifications/services/firebase.service.ts`) - Optional:
- **Responsibility**: Firebase Cloud Messaging push notification
- **Key Methods**:
  - `sendPush(deviceToken: string, title: string, body: string, data?: object): Promise<void>`
    - Firebase Admin SDK call
    - Returns void
- **Inputs**: deviceToken, title, body, data
- **Outputs**: void
- **Dependencies**: firebase-admin SDK, FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL

### Data Models and Contracts

#### SMS Entity (Prisma Schema)

```prisma
model SMS {
  id            String    @id @default(uuid())
  domainID      String    @db.Uuid
  phoneNumber   String
  message       String
  type          SmsType   // OTP | NOTIFICATION | MARKETING | ALERT
  status        SmsStatus @default(PENDING) // PENDING | SENT | DELIVERED | FAILED
  provider      String    @default("FONIVA")
  providerId    String?   // FONIVA message ID
  attemptCount  Int       @default(0)
  errorMessage  String?
  sentAt        DateTime?
  deliveredAt   DateTime?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  @@index([domainID])
  @@index([phoneNumber])
  @@index([status])
  @@index([createdAt])
  @@map("sms")
}

enum SmsType {
  OTP
  NOTIFICATION
  MARKETING
  ALERT
}

enum SmsStatus {
  PENDING
  SENT
  DELIVERED
  FAILED
}
```

#### Notification Entity (Prisma Schema)

```prisma
model Notification {
  id        String   @id @default(uuid())
  domainID  String   @db.Uuid
  userID    String   @db.Uuid
  type      String   // verification, password-reset, otp, etc.
  channel   String   // EMAIL | SMS | PUSH
  title     String?
  message   String
  data      Json?
  sent      Boolean  @default(false)
  sentAt    DateTime?
  createdAt DateTime @default(now())

  user User @relation(fields: [userID], references: [id])

  @@index([domainID, userID])
  @@index([type])
  @@index([createdAt])
  @@map("notifications")
}

model NotificationPreference {
  id        String  @id @default(uuid())
  domainID  String  @db.Uuid
  userID    String  @db.Uuid
  channel   String  // EMAIL | SMS | PUSH
  enabled   Boolean @default(true)

  user User @relation(fields: [userID], references: [id])

  @@unique([domainID, userID, channel])
  @@index([domainID, userID])
  @@map("notification_preferences")
}

model DeviceToken {
  id        String   @id @default(uuid())
  domainID  String   @db.Uuid
  userID    String   @db.Uuid
  token     String   @unique
  platform  String   // iOS | Android
  createdAt DateTime @default(now())

  user User @relation(fields: [userID], references: [id])

  @@index([domainID, userID])
  @@index([token])
  @@map("device_tokens")
}
```

#### DTOs

**SendSmsDto** (`src/modules/sms/dto/send-sms.dto.ts`):
```typescript
export class SendSmsDto {
  phoneNumber: string; // E.164 format
  message: string;
  type: SmsType;
}
```

**DeliveryCallbackDto** (`src/modules/sms/dto/delivery-callback.dto.ts`):
```typescript
export class DeliveryCallbackDto {
  providerId: string; // FONIVA message ID
  status: 'DELIVERED' | 'FAILED';
}
```

**SendEmailDto** (`src/modules/mail/dto/send-email.dto.ts`):
```typescript
export class SendEmailDto {
  to: string;
  subject: string;
  html: string;
  text?: string;
}
```

**SendTemplateEmailDto** (`src/modules/mail/dto/send-template-email.dto.ts`):
```typescript
export class SendTemplateEmailDto {
  to: string;
  subject: string;
  templateName: string;
  data: Record<string, any>;
}
```

**UpdateNotificationPreferencesDto** (`src/modules/notifications/dto/update-notification-preferences.dto.ts`):
```typescript
export class UpdateNotificationPreferencesDto {
  preferences: Array<{
    channel: 'EMAIL' | 'SMS' | 'PUSH';
    enabled: boolean;
  }>;
}
```

**RegisterDeviceTokenDto** (`src/modules/notifications/dto/register-device-token.dto.ts`):
```typescript
export class RegisterDeviceTokenDto {
  token: string;
  platform: 'iOS' | 'Android';
}
```

#### Interfaces

**IEmailProvider** (`src/modules/mail/interfaces/mail-provider.interface.ts`):
```typescript
export interface IEmailProvider {
  send(to: string, subject: string, html: string, text?: string): Promise<EmailResult>;
}

export interface EmailResult {
  messageId: string;
  success: boolean;
}
```

### APIs and Interfaces

#### SMS Endpoints

**GET /sms/stats** (Admin only):
- **Permission**: `SMS.VIEW_STATS`
- **Query Parameters**: 
  - `domainID` (optional, from @DomainID decorator)
  - `startDate` (optional, ISO date string)
  - `endDate` (optional, ISO date string)
  - `type` (optional, SmsType filter)
- **Response**: 
```typescript
{
  total: { sent: number, delivered: number, failed: number },
  successRate: number,
  byType: { [type: string]: { sent: number, delivered: number, failed: number } }
}
```

**POST /sms/callback/delivery** (Public, FONIVA webhook):
- **Authentication**: Webhook signature verification (FONIVA_API_KEY)
- **Request Body**: DeliveryCallbackDto
- **Response**: 200 OK
- **Action**: Updates SMS record by providerId

#### Mail Endpoints

**POST /mail/send** (Optional admin endpoint):
- **Permission**: `MAIL.SEND`
- **Request Body**: SendEmailDto
- **Response**: 200 OK

**POST /mail/send-template** (Optional admin endpoint):
- **Permission**: `MAIL.SEND`
- **Request Body**: SendTemplateEmailDto
- **Response**: 200 OK

#### Notification Endpoints

**GET /users/me/notification-preferences**:
- **Authentication**: Required (JwtAuthGuard)
- **Response**: Array of NotificationPreference entities
- **Default**: Returns all channels enabled if no preferences exist

**PATCH /users/me/notification-preferences**:
- **Authentication**: Required (JwtAuthGuard)
- **Request Body**: UpdateNotificationPreferencesDto
- **Response**: Updated NotificationPreference entities
- **Action**: Bulk update user preferences

**POST /users/me/device-tokens** (Optional, Firebase enabled):
- **Authentication**: Required (JwtAuthGuard)
- **Request Body**: RegisterDeviceTokenDto
- **Response**: DeviceToken entity
- **Action**: Registers device token for push notifications

### Workflows and Sequencing

#### SMS Sending Flow

```
1. Client/Service calls SmsService.sendSms(domainID, phoneNumber, message, type)
   ↓
2. SmsService creates SMS record (status: PENDING, attemptCount: 0)
   ↓
3. SmsService calls FonivaService.sendSms(phoneNumber, message, type)
   ↓
4. FonivaService makes HTTP POST to FONIVA API
   ↓
5a. Success Path:
    - FonivaService returns providerId
    - SmsService updates SMS record (status: SENT, providerId, sentAt)
    - Returns SMS entity
   ↓
5b. Failure Path:
    - FonivaService throws error
    - SmsService updates SMS record (status: FAILED, errorMessage, attemptCount++)
    - Returns SMS entity with FAILED status
   ↓
6. FONIVA sends delivery callback to POST /sms/callback/delivery
   ↓
7. Callback handler verifies webhook signature
   ↓
8. Updates SMS record (status: DELIVERED/FAILED, deliveredAt)
```

#### SMS Retry Flow

```
1. Admin/System calls SmsService.retrySms(smsId)
   ↓
2. SmsService loads SMS record, checks attemptCount < 3
   ↓
3. Calculates exponential backoff delay (1min → 5min → 15min)
   ↓
4. Waits for backoff delay (or schedules job)
   ↓
5. Re-attempts FonivaService.sendSms()
   ↓
6. Updates SMS record with new attempt result
```

#### Email Sending Flow (Template)

```
1. Client/Service calls MailService.sendTemplateEmail(to, subject, templateName, data)
   ↓
2. MailService calls TemplateService.render(templateName, data)
   ↓
3. TemplateService compiles Handlebars template (cached)
   ↓
4. TemplateService renders template with data → HTML string
   ↓
5. MailService calls configured provider (SendGridProvider.send())
   ↓
6. SendGridProvider makes API call to SendGrid
   ↓
7. Returns EmailResult (messageId, success)
```

#### Unified Notification Flow

```
1. Client/Service calls NotificationService.send(userID, type, title, message, data)
   ↓
2. NotificationService fetches user NotificationPreference entities
   ↓
3. For each enabled channel:
   ↓
   3a. EMAIL enabled:
       - Calls MailService.sendEmail()
       - Creates Notification record (channel: EMAIL, sent: true/false)
   ↓
   3b. SMS enabled:
       - Calls SmsService.sendSms()
       - Creates Notification record (channel: SMS, sent: true/false)
   ↓
   3c. PUSH enabled (if Firebase enabled):
       - Fetches user DeviceToken entities
       - For each token: Calls FirebaseService.sendPush()
       - Creates Notification record (channel: PUSH, sent: true/false)
   ↓
4. All operations async (fire-and-forget)
   ↓
5. Returns void (non-blocking)
```

#### Epic 2 Integration Flow (OTP SMS)

```
1. AuthService calls SmsService.sendSms(domainID, phoneNumber, message, type: 'OTP')
   ↓
2. SMS sending happens asynchronously (fire-and-forget)
   ↓
3. Auth flow continues (doesn't wait for SMS delivery)
   ↓
4. SMS tracked in database for audit
   ↓
5. If SMS fails: Logged to Sentry, doesn't block auth flow
```

## Non-Functional Requirements

### Performance

**SMS Sending Performance:**
- SMS API call to FONIVA: < 2s (p95) for successful requests
- Database SMS record creation: < 50ms (p95)
- SMS statistics aggregation: < 500ms (p95) for date range queries
- Retry mechanism: Exponential backoff delays (1min → 5min → 15min) don't block main flow
- Async SMS sending: Fire-and-forget pattern, doesn't block auth flows

**Email Sending Performance:**
- Email template rendering: < 100ms (p95) with Handlebars cache
- SendGrid API call: < 1s (p95) for successful requests
- Email sending: Async operation, non-blocking
- Template compilation: Cached after first use, < 10ms subsequent renders

**Notification Service Performance:**
- Multi-channel notification sending: Parallel execution, < 3s (p95) for all channels
- Notification preference lookup: < 50ms (p95) with database indexes
- Notification history recording: < 100ms (p95) per notification

**Database Query Performance:**
- SMS entity queries: Indexed on domainID, phoneNumber, status, createdAt
- Notification queries: Indexed on domainID+userID, type, createdAt
- NotificationPreference queries: Unique index on domainID+userID+channel
- Statistics aggregation: Optimized with date range indexes

**Scalability Considerations:**
- SMS sending: Rate limiting per provider constraints (FONIVA limits)
- Email sending: SendGrid rate limits (configurable)
- Async operations: All communication operations fire-and-forget to prevent blocking
- Database connection pooling: Reuses PrismaService connections (min: 5, max: 20)

### Security

**SMS Security:**
- FONIVA API credentials: Stored in environment variables (never hardcoded)
- Webhook signature verification: FONIVA_API_KEY used for callback verification
- Phone number validation: E.164 format validation
- SMS content: No sensitive data in SMS messages (OTP codes only)
- Database tracking: All SMS records include domainID for multi-tenant isolation

**Email Security:**
- SendGrid API key: Stored in environment variables (SENDGRID_API_KEY)
- Email content: HTML sanitization (Handlebars templates)
- Email addresses: Validation and sanitization before sending
- Template injection prevention: Handlebars auto-escaping enabled

**Notification Security:**
- User preferences: Only accessible by authenticated user (GET /users/me/notification-preferences)
- Device token registration: Requires authentication, user can only register own tokens
- Multi-tenant isolation: All notification operations filtered by domainID
- Permission checks: SMS.*, MAIL.*, NOTIFICATIONS.* permissions enforced

**Webhook Security:**
- FONIVA delivery callback: Signature verification using FONIVA_API_KEY
- Public endpoint protection: Webhook endpoint validates signature before processing
- Rate limiting: Webhook endpoints protected by rate limiting middleware

**Data Privacy:**
- SMS messages: Stored in database for audit trail (encrypted at rest)
- Notification history: Stored with userID, domainID isolation
- Device tokens: Encrypted storage, user can delete own tokens
- GDPR compliance: User can request deletion of notification history

### Reliability/Availability

**SMS Reliability:**
- Retry mechanism: Failed SMS automatically retried (max 3 attempts)
- Exponential backoff: Prevents provider overload (1min → 5min → 15min delays)
- Database tracking: All SMS attempts tracked for audit and recovery
- Delivery callbacks: Webhook updates SMS status (DELIVERED/FAILED)
- Failure handling: SMS failures logged to Sentry, don't block auth flows

**Email Reliability:**
- Provider abstraction: Easy switching between SendGrid/AWS SES
- Error handling: Provider exceptions wrapped and logged
- Template fallback: Plain text fallback if HTML rendering fails
- Async sending: Fire-and-forget pattern prevents blocking

**Notification Reliability:**
- Partial success handling: If one channel fails, others still send
- Preference fallback: Default to all channels enabled if preferences missing
- Device token management: Invalid tokens marked inactive, don't block other tokens
- History tracking: All notification attempts recorded for audit

**Availability:**
- External dependencies: FONIVA, SendGrid, Firebase (optional) - graceful degradation
- Health checks: Communication module health checks (Epic 7)
- Error recovery: Retry mechanisms for transient failures
- Monitoring: SMS/Email success rates tracked via statistics endpoints

**Graceful Degradation:**
- SMS provider down: OTP sending fails gracefully, logged to Sentry
- Email provider down: Email sending fails gracefully, logged to Sentry
- Firebase disabled: Push notifications skipped, other channels continue
- Database unavailable: Communication operations fail gracefully with error logging

### Observability

**Logging:**
- SMS sending: Log all SMS attempts (phoneNumber, type, status, providerId)
- Email sending: Log email sends (to, subject, templateName, success/failure)
- Notification sending: Log multi-channel notification attempts (userID, type, channels, results)
- Error logging: All communication failures logged to Sentry with context (domainID, userID)
- Webhook callbacks: Log all FONIVA delivery callbacks (providerId, status)

**Metrics:**
- SMS statistics endpoint: GET /sms/stats provides aggregated metrics
  - Total sent/delivered/failed counts
  - Success rate by type (OTP, NOTIFICATION, MARKETING, ALERT)
  - Date range filtering for trend analysis
- Notification metrics: Track notification success rates per channel
- Provider performance: Track FONIVA/SendGrid response times and success rates

**Monitoring:**
- SMS delivery rates: Monitor via statistics endpoint and Sentry alerts
- Email delivery rates: Monitor via SendGrid dashboard integration
- Retry attempts: Track failed SMS retry counts
- Webhook health: Monitor FONIVA callback delivery success

**Tracing:**
- Request correlation: Include request ID in all communication logs
- User context: Include domainID, userID in all communication operations
- Provider context: Include providerId (FONIVA message ID) in logs for traceability

**Alerting:**
- High failure rates: Alert if SMS/Email failure rate > 10%
- Provider downtime: Alert if FONIVA/SendGrid API unavailable
- Retry exhaustion: Alert if SMS retry attempts exceed threshold
- Webhook failures: Alert if FONIVA callbacks fail verification

## Dependencies and Integrations

### External Dependencies (NPM Packages)

**SMS Module:**
- `axios`: ^1.7.0 - HTTP client for FONIVA API integration
- `ejs`: ^3.1.10 (optional) - Template engine for SMS messages

**Mail Module:**
- `@sendgrid/mail`: ^8.1.0 - SendGrid SDK for email sending
- `handlebars`: ^4.7.8 - Template engine for email templates

**Notification Module:**
- `firebase-admin`: ^13.0.0 (optional) - Firebase Admin SDK for push notifications

**Existing Dependencies (Already in package.json):**
- `@nestjs/common`: ^11.0.1 - NestJS framework
- `@nestjs/config`: ^4.0.2 - Configuration management
- `@prisma/client`: ^6.18.0 - Prisma ORM client
- `class-validator`: ^0.14.2 - DTO validation
- `class-transformer`: ^0.5.1 - DTO transformation
- `@nestjs/swagger`: ^11.2.1 - API documentation
- `@nestjs/throttler`: ^6.4.0 - Rate limiting
- `winston`: ^3.18.3 - Logging (Epic 7)
- `@sentry/node`: ^7.120.4 - Error tracking (Epic 7)

### External Service Integrations

**FONIVA SMS Provider:**
- **API Endpoint**: Configurable via `FONIVA_API_URL` environment variable
- **Authentication**: Basic Auth (username/password) + API Key
- **Environment Variables**:
  - `SMS_PROVIDER=FONIVA`
  - `FONIVA_API_URL` - FONIVA API base URL
  - `FONIVA_USERNAME` - FONIVA account username
  - `FONIVA_PASSWORD` - FONIVA account password
  - `FONIVA_API_KEY` - FONIVA API key (for webhook signature verification)
  - `FONIVA_SENDER` - Default sender name/number
- **Webhook Callback**: POST /sms/callback/delivery (public endpoint)
- **Rate Limits**: Per FONIVA account limits (configurable)
- **Documentation**: FONIVA API documentation (external)

**SendGrid Email Provider:**
- **API Endpoint**: SendGrid REST API (https://api.sendgrid.com/v3)
- **Authentication**: API Key authentication
- **Environment Variables**:
  - `MAIL_PROVIDER=sendgrid`
  - `SENDGRID_API_KEY` - SendGrid API key
  - `MAIL_FROM` - Default sender email address
- **Rate Limits**: Per SendGrid plan limits (configurable)
- **Documentation**: SendGrid API documentation (https://docs.sendgrid.com/)

**Firebase Cloud Messaging (Optional):**
- **Service**: Firebase Admin SDK
- **Authentication**: Service account JSON credentials
- **Environment Variables**:
  - `FIREBASE_ENABLED=true/false` - Enable/disable Firebase
  - `FIREBASE_PROJECT_ID` - Firebase project ID
  - `FIREBASE_PRIVATE_KEY` - Firebase private key (base64 encoded)
  - `FIREBASE_CLIENT_EMAIL` - Firebase client email
- **Documentation**: Firebase Admin SDK documentation (https://firebase.google.com/docs/admin/setup)

### Internal Module Dependencies

**Database Module (Epic 1):**
- PrismaService: Database operations for SMS, Notification, NotificationPreference entities
- Prisma migrations: Schema updates for new entities

**Auth Module (Epic 2):**
- Integration points: OTP sending via SmsService, email verification via MailService
- JwtAuthGuard: Protected routes for notification preferences
- @CurrentUser decorator: User context for notification operations

**Permissions Module (Epic 3):**
- PermissionsGuard: Authorization for SMS.*, MAIL.*, NOTIFICATIONS.* permissions
- Permission constants: SMS.VIEW_STATS, MAIL.SEND, NOTIFICATIONS.* permissions

**Common Module:**
- Guards: JwtAuthGuard, PermissionsGuard
- Decorators: @Permission, @CurrentUser, @DomainID
- Interceptors: ResponseTransformInterceptor (consistent API responses)
- Filters: Exception filters with i18n support

**Config Module:**
- Environment variable validation: FONIVA, SendGrid, Firebase config validation
- Configuration service: Type-safe config access

### Integration Points

**Epic 2 Integration (Authentication):**
- AuthService → SmsService: OTP sending (registration, login, password reset)
- AuthService → MailService: Email verification and password reset emails
- Async integration: Fire-and-forget pattern, doesn't block auth flows

**Epic 3 Integration (User Management):**
- User entity relations: Notification, NotificationPreference, DeviceToken entities reference User
- User creation: Default notification preferences created (all channels enabled)

**Epic 7 Integration (Developer Infrastructure):**
- Logging: Winston logger for communication operations
- Error tracking: Sentry integration for communication failures
- i18n: Internationalized error messages for communication operations

**Epic 4 Integration (File Management):**
- No direct integration, but follows same module pattern

### Version Constraints

- **NestJS**: ^11.0.1 (compatible with existing project)
- **Prisma**: ^6.18.0 (compatible with existing schema)
- **TypeScript**: ^5.7.3 (compatible with existing codebase)
- **Node.js**: >= 18.0.0 (required for NestJS 11)

### Migration Strategy

**From hrsync-backend SMS Module:**
1. Copy `/Users/ahmet/Documents/Bitbucket/hrsync-backend/src/sms` module structure
2. Adapt TypeORM entities to Prisma schema
3. Update imports (TypeORM → Prisma)
4. Adapt FONIVA service implementation (if API changes)
5. Test FONIVA API credentials and webhook callbacks

**New Dependencies Installation:**
```bash
npm install axios @sendgrid/mail handlebars
npm install --save-dev @types/ejs @types/handlebars
# Optional Firebase:
npm install firebase-admin
```

## Acceptance Criteria (Authoritative)

### Story 5.1: FONIVA SMS Module (hrsync-backend Pattern)

**AC-5.1.1**: SMS Entity (Prisma model) oluşturulmuş (`src/modules/sms/entities/sms.entity.ts`)
- Fields: id, domainID, phoneNumber, message, type, status, provider, providerId, attemptCount, errorMessage, sentAt, deliveredAt, createdAt, updatedAt
- Type enum: 'OTP' | 'NOTIFICATION' | 'MARKETING' | 'ALERT'
- Status enum: 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED'
- Indexes: [domainID], [phoneNumber], [status], [createdAt]

**AC-5.1.2**: FONIVA Service oluşturulmuş (`src/modules/sms/services/foniva.service.ts`)
- FONIVA REST API integration (axios)
- Environment variables: SMS_PROVIDER, FONIVA_API_URL, FONIVA_USERNAME, FONIVA_PASSWORD, FONIVA_API_KEY, FONIVA_SENDER
- `sendSms(phoneNumber, message, type): Promise<FonivaResult>` method
- Error handling: Network failures, invalid credentials

**AC-5.1.3**: SMS Service (Main Orchestrator) oluşturulmuş (`src/modules/sms/services/sms.service.ts`)
- `sendSms(domainID, phoneNumber, message, type): Promise<SMS>` method
- Creates SMS record (status: PENDING)
- Calls FonivaService.sendSms()
- Updates SMS record: Success → status: SENT, providerId, sentAt | Failure → status: FAILED, errorMessage, attemptCount++
- Database tracking for all SMS (audit trail)

**AC-5.1.4**: Retry Mechanism implemented
- `retrySms(smsId): Promise<SMS>` method
- attemptCount < 3 check
- Exponential backoff: 1min → 5min → 15min
- Re-attempts FONIVA send and updates SMS record

**AC-5.1.5**: Delivery Callbacks (Webhook) endpoint oluşturulmuş
- POST /sms/callback/delivery endpoint (public, FONIVA webhook)
- Request DTO: providerId, status ('DELIVERED' | 'FAILED')
- SMS record update: Find by providerId, update status, deliveredAt
- Webhook signature verification (FONIVA_API_KEY)

**AC-5.1.6**: SMS Statistics endpoint oluşturulmuş
- GET /sms/stats endpoint (admin only)
- Aggregation: Total sent, delivered, failed
- Success rate by type (OTP, NOTIFICATION, etc.)
- Date range filtering, domainID filtering (multi-tenant)

**AC-5.1.7**: SMS DTOs ve Enums oluşturulmuş
- SendSmsDto: { phoneNumber, message, type }
- DeliveryCallbackDto: { providerId, status }
- SmsType enum: OTP, NOTIFICATION, MARKETING, ALERT
- SmsStatus enum: PENDING, SENT, DELIVERED, FAILED

### Story 5.2: Email Provider Interface & SendGrid Implementation

**AC-5.2.1**: Email Provider Interface oluşturulmuş
- `src/modules/mail/interfaces/mail-provider.interface.ts`
- Interface: `IEmailProvider { send(to, subject, html, text?): Promise<EmailResult> }`

**AC-5.2.2**: SendGrid Provider oluşturulmuş
- `src/modules/mail/providers/sendgrid.provider.ts`
- SendGrid SDK configured (@sendgrid/mail)
- Environment variables: SENDGRID_API_KEY, MAIL_FROM

**AC-5.2.3**: MailModule dynamic provider injection
- MAIL_PROVIDER env var ile provider seçimi
- Dynamic provider injection pattern

**AC-5.2.4**: MailService oluşturulmuş (provider-agnostic)
- `sendEmail(to, subject, html, text?): Promise<void>` method
- Provider-agnostic implementation
- Error handling: Provider exceptions wrapped

### Story 5.3: Email Templates (Handlebars)

**AC-5.3.1**: Template files oluşturulmuş
- `src/modules/mail/templates/` klasörü
- Template files: verification.hbs, password-reset.hbs, welcome.hbs

**AC-5.3.2**: TemplateService oluşturulmuş
- `render(templateName: string, data: object): Promise<string>` method
- Handlebars configured ve compile ediliyor
- Template compile ve cache (performance)

**AC-5.3.3**: MailService template support eklendi
- `sendTemplateEmail(to, subject, templateName, data): Promise<void>` method
- Template variables: {{firstName}}, {{verificationLink}}, etc.

### Story 5.4: Integrate Email Verification & Password Reset

**AC-5.4.1**: Auth module, MailService inject ediyor
- AuthService → MailService dependency injection

**AC-5.4.2**: Register'da verification email gönderiliyor
- Template: verification.hbs
- Variables: firstName, verificationLink (with JWT token)

**AC-5.4.3**: Forgot password'da reset email gönderiliyor
- Template: password-reset.hbs
- Variables: firstName, resetLink (with JWT token)

**AC-5.4.4**: Email gönderimi async (non-blocking)
- Fire-and-forget email (async, don't await)
- Email send failure → log error, don't block registration
- Stub implementation kaldırıldı (Epic 2'den)

### Story 5.5: Integrate OTP Sending (SMS via FONIVA)

**AC-5.5.1**: Auth module, SmsService inject ediyor
- AuthService → SmsService dependency injection

**AC-5.5.2**: OTP gönderimi Epic 2 story'lerinde implement edilmiş
- Registration (Story 2.2) → Phone verification OTP
- Login (Story 2.3.1) → Login OTP
- Forgot Password (Story 2.6) → Password reset OTP
- Resend OTP (Story 2.7) → Phone verification OTP

**AC-5.5.3**: All OTP sending via SmsService.sendSms()
- `SmsService.sendSms(domainID, phoneNumber, message, type: 'OTP')`
- OTP message format: "Your verification code is: {code}. Valid for 5 minutes."
- Message templates by purpose (phone verification, login, password reset)

**AC-5.5.4**: SMS tracking implemented
- All OTP SMS tracked in SMS entity
- Status monitoring (PENDING → SENT → DELIVERED)
- Delivery callback support

**AC-5.5.5**: Error handling implemented
- SMS send failure → Log error, return 503 Service Unavailable
- Network failure → Retry mechanism (Story 5.1)
- Fire-and-forget: Async SMS sending (non-blocking)

### Story 5.6: Notification Preferences Entity

**AC-5.6.1**: NotificationPreference entity oluşturulmuş
- Fields: id, domainID, userID, channel (EMAIL|SMS|PUSH), enabled (boolean)
- Unique constraint: [domainID, userID, channel]

**AC-5.6.2**: GET /users/me/notification-preferences endpoint
- User'ın notification preferences döndürüyor
- Default: All channels enabled

**AC-5.6.3**: PATCH /users/me/notification-preferences endpoint
- Request DTO: [{ channel, enabled }]
- Bulk update

**AC-5.6.4**: NotificationService bu preferences'i check ediyor
- NotificationService uses preferences for channel selection

### Story 5.7: Unified Notification Service

**AC-5.7.1**: Notification entity oluşturulmuş
- Fields: id, domainID, userID, type, channel, title, message, data (JSON), sent, sentAt, createdAt

**AC-5.7.2**: NotificationService oluşturulmuş
- `send(userID, type, title, message, data?): Promise<void>` method
- User notification preferences fetch
- Enabled channels'a gönder (SMS + Email + Push)
- Notification history database'e kaydet

**AC-5.7.3**: Multi-channel sending implemented
- EMAIL enabled → MailService.send()
- SMS enabled → SmsService.send()
- PUSH enabled → FirebaseService.send() (stub for now, Story 5.8)

**AC-5.7.4**: Failure handling implemented
- Partial success OK (log failures, mark channel as failed)
- Async sending (don't block)

### Story 5.8: Firebase Push Notification (Optional)

**AC-5.8.1**: FirebaseService oluşturulmuş
- `src/modules/notifications/services/firebase.service.ts`
- Firebase Admin SDK configured
- Environment variables: FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL

**AC-5.8.2**: FirebaseService methods
- `sendPush(deviceToken, title, body, data?): Promise<void>` method

**AC-5.8.3**: DeviceToken entity oluşturulmuş
- Fields: id, domainID, userID, token, platform (iOS|Android), createdAt

**AC-5.8.4**: POST /users/me/device-tokens endpoint
- Register device token

**AC-5.8.5**: NotificationService, PUSH channel için FirebaseService kullanıyor
- PUSH channel integration

**AC-5.8.6**: Error handling implemented
- Invalid token → mark token as inactive
- Optional feature: Skip if FIREBASE_ENABLED=false

## Traceability Mapping

| AC ID | Spec Section | Component(s)/API(s) | Test Idea |
|-------|--------------|---------------------|-----------|
| AC-5.1.1 | Data Models | `src/modules/sms/entities/sms.entity.ts`, Prisma schema | Unit test: SMS entity creation, field validation |
| AC-5.1.2 | Services | `src/modules/sms/services/foniva.service.ts` | Unit test: FONIVA API call, error handling |
| AC-5.1.3 | Services | `src/modules/sms/services/sms.service.ts` | Unit test: SMS sending flow, database tracking |
| AC-5.1.4 | Services | `src/modules/sms/services/sms.service.ts` (retrySms) | Unit test: Retry logic, exponential backoff |
| AC-5.1.5 | APIs | POST /sms/callback/delivery | Integration test: Webhook callback, signature verification |
| AC-5.1.6 | APIs | GET /sms/stats | Integration test: Statistics aggregation, filtering |
| AC-5.1.7 | Data Models | DTOs, Enums | Unit test: DTO validation, enum values |
| AC-5.2.1 | Interfaces | `src/modules/mail/interfaces/mail-provider.interface.ts` | Unit test: Interface contract |
| AC-5.2.2 | Services | `src/modules/mail/providers/sendgrid.provider.ts` | Unit test: SendGrid API call, error handling |
| AC-5.2.3 | Module | `src/modules/mail/mail.module.ts` | Unit test: Dynamic provider injection |
| AC-5.2.4 | Services | `src/modules/mail/services/mail.service.ts` | Unit test: Provider-agnostic email sending |
| AC-5.3.1 | Templates | `src/modules/mail/templates/*.hbs` | Manual test: Template rendering |
| AC-5.3.2 | Services | `src/modules/mail/services/template.service.ts` | Unit test: Template compilation, caching |
| AC-5.3.3 | Services | `src/modules/mail/services/mail.service.ts` (sendTemplateEmail) | Integration test: Template email sending |
| AC-5.4.1 | Integration | AuthService → MailService | Integration test: Auth email sending |
| AC-5.4.2 | Integration | AuthService registration flow | E2E test: Registration email delivery |
| AC-5.4.3 | Integration | AuthService password reset flow | E2E test: Password reset email delivery |
| AC-5.4.4 | Integration | Async email sending | Integration test: Non-blocking email |
| AC-5.5.1 | Integration | AuthService → SmsService | Integration test: Auth SMS sending |
| AC-5.5.2 | Integration | AuthService OTP flows | E2E test: OTP SMS delivery (registration, login, password reset) |
| AC-5.5.3 | Integration | SmsService.sendSms() | Integration test: OTP message format |
| AC-5.5.4 | Integration | SMS tracking | Integration test: OTP SMS database tracking |
| AC-5.5.5 | Integration | Error handling | Integration test: SMS failure handling |
| AC-5.6.1 | Data Models | `src/modules/notifications/entities/notification-preference.entity.ts` | Unit test: NotificationPreference entity |
| AC-5.6.2 | APIs | GET /users/me/notification-preferences | Integration test: Get preferences, default values |
| AC-5.6.3 | APIs | PATCH /users/me/notification-preferences | Integration test: Update preferences |
| AC-5.6.4 | Services | NotificationService preference check | Unit test: Preference filtering |
| AC-5.7.1 | Data Models | `src/modules/notifications/entities/notification.entity.ts` | Unit test: Notification entity |
| AC-5.7.2 | Services | `src/modules/notifications/services/notification.service.ts` | Unit test: Unified notification sending |
| AC-5.7.3 | Services | NotificationService multi-channel | Integration test: Multi-channel sending |
| AC-5.7.4 | Services | NotificationService failure handling | Integration test: Partial success handling |
| AC-5.8.1 | Services | `src/modules/notifications/services/firebase.service.ts` | Unit test: Firebase SDK integration |
| AC-5.8.2 | Services | FirebaseService.sendPush() | Unit test: Push notification sending |
| AC-5.8.3 | Data Models | `src/modules/notifications/entities/device-token.entity.ts` | Unit test: DeviceToken entity |
| AC-5.8.4 | APIs | POST /users/me/device-tokens | Integration test: Device token registration |
| AC-5.8.5 | Integration | NotificationService → FirebaseService | Integration test: Push notification flow |
| AC-5.8.6 | Services | FirebaseService error handling | Integration test: Invalid token handling |

## Risks, Assumptions, Open Questions

### Risks

**Risk-1: FONIVA API Changes**
- **Description**: FONIVA API may change, breaking existing integration
- **Impact**: High - SMS sending would fail
- **Mitigation**: 
  - Use hrsync-backend proven pattern (already tested in production)
  - Abstract FONIVA service behind interface for easy replacement
  - Monitor FONIVA API documentation for changes
  - Version API calls if FONIVA provides versioning

**Risk-2: External Provider Downtime**
- **Description**: FONIVA, SendGrid, or Firebase may experience downtime
- **Impact**: High - Communication operations would fail
- **Mitigation**:
  - Implement graceful degradation (log errors, don't block flows)
  - Retry mechanism for SMS (exponential backoff)
  - Health checks for external services (Epic 7)
  - Monitoring and alerting for provider failures

**Risk-3: Rate Limiting Issues**
- **Description**: External providers may rate limit requests
- **Impact**: Medium - Some SMS/Email sends may fail
- **Mitigation**:
  - Respect provider rate limits
  - Implement request queuing if needed
  - Monitor rate limit errors and adjust accordingly

**Risk-4: Database Performance**
- **Description**: SMS/Notification tracking may create high database load
- **Impact**: Medium - Database queries may slow down
- **Mitigation**:
  - Proper indexing on SMS, Notification entities
  - Async database operations where possible
  - Consider archiving old SMS/Notification records

**Risk-5: hrsync-backend Migration Complexity**
- **Description**: Adapting TypeORM entities to Prisma may introduce bugs
- **Impact**: Medium - SMS module may have issues
- **Mitigation**:
  - Careful migration with thorough testing
  - Unit tests for all SMS operations
  - Integration tests with FONIVA API (test environment)

### Assumptions

**Assumption-1: FONIVA API Availability**
- FONIVA API will remain available and stable
- FONIVA webhook callbacks will be reliable
- **Validation**: Test FONIVA integration in development environment

**Assumption-2: SendGrid Account**
- SendGrid account will be available for email sending
- SendGrid API key will have sufficient permissions
- **Validation**: Verify SendGrid account setup before implementation

**Assumption-3: Firebase Optional**
- Firebase push notifications are optional feature
- Can be skipped if FIREBASE_ENABLED=false
- **Validation**: Confirm Firebase is truly optional for MVP

**Assumption-4: Template Compatibility**
- Handlebars templates will work with SendGrid
- EJS templates (if used) will work for SMS
- **Validation**: Test template rendering before production

**Assumption-5: Epic 2 Integration**
- Epic 2 auth flows are ready for SMS/Email integration
- AuthService can be modified to inject SmsService/MailService
- **Validation**: Review Epic 2 implementation before integration

### Open Questions

**Question-1: SMS Template Engine**
- Should we use EJS for SMS templates or plain string formatting?
- **Decision Needed**: Confirm SMS template approach (EJS vs simple string replacement)
- **Impact**: Affects Story 5.1 implementation

**Question-2: Email Queue System**
- Should we implement email queue system (Bull/BullMQ) or use async fire-and-forget?
- **Decision Needed**: Confirm email queue requirement for MVP
- **Impact**: Affects Story 5.2 implementation complexity

**Question-3: SMS Retry Automation**
- Should SMS retry be manual (admin-triggered) or automatic (scheduled job)?
- **Decision Needed**: Confirm retry mechanism approach
- **Impact**: Affects Story 5.1 retry implementation

**Question-4: Notification History Retention**
- How long should notification history be retained?
- **Decision Needed**: Define data retention policy
- **Impact**: Affects database schema and cleanup jobs

**Question-5: Firebase Push Priority**
- Is Firebase push notification required for MVP or can it be deferred?
- **Decision Needed**: Confirm Story 5.8 priority
- **Impact**: Affects Epic 5 scope and timeline

## Test Strategy Summary

### Test Levels

**Unit Tests:**
- SMS Service: sendSms(), retrySms() methods with mocked FonivaService
- Mail Service: sendEmail(), sendTemplateEmail() with mocked providers
- Notification Service: send() method with mocked dependencies
- Template Service: render() method with Handlebars templates
- DTOs: Validation tests for all DTOs
- Entities: Prisma model tests

**Integration Tests:**
- FONIVA API integration: Real API calls in test environment (with test credentials)
- SendGrid API integration: Real API calls in test environment (with test API key)
- Webhook callbacks: POST /sms/callback/delivery endpoint with signature verification
- Database operations: SMS, Notification, NotificationPreference CRUD operations
- Epic 2 integration: Auth flows with SMS/Email sending

**E2E Tests:**
- Registration flow: OTP SMS delivery, email verification
- Login flow: OTP SMS delivery
- Password reset flow: OTP SMS and email delivery
- Notification preferences: GET/PATCH endpoints
- Device token registration: POST /users/me/device-tokens

### Test Coverage Goals

- **Unit Tests**: 80%+ coverage for all services
- **Integration Tests**: All API endpoints covered
- **E2E Tests**: Critical user flows (registration, login, password reset)

### Test Frameworks

- **Unit Tests**: Jest (already configured)
- **Integration Tests**: Jest + Supertest (already configured)
- **E2E Tests**: Jest + Supertest (already configured)

### Mocking Strategy

- **External APIs**: Mock FONIVA, SendGrid, Firebase APIs in unit tests
- **Database**: Use Prisma test database or in-memory database
- **Services**: Mock SmsService, MailService in dependent modules

### Edge Cases to Test

- SMS sending failure: Network error, invalid credentials, rate limiting
- Email sending failure: SendGrid API error, invalid email address
- Webhook callback: Invalid signature, missing providerId, duplicate callbacks
- Retry mechanism: Max attempts exceeded, exponential backoff timing
- Notification preferences: Missing preferences (default behavior), all channels disabled
- Multi-channel notification: Partial success (one channel fails, others succeed)
- Firebase push: Invalid device token, Firebase disabled, multiple device tokens

### Performance Testing

- SMS sending: Load test with multiple concurrent SMS sends
- Email sending: Load test with multiple concurrent email sends
- Statistics endpoint: Test aggregation performance with large datasets
- Database queries: Test SMS/Notification query performance with indexes

### Security Testing

- Webhook signature verification: Test invalid signatures are rejected
- Permission checks: Test SMS.*, MAIL.*, NOTIFICATIONS.* permissions
- Multi-tenant isolation: Test domainID filtering prevents cross-tenant access
- Input validation: Test DTO validation for all endpoints

