# Epic 5: Communication Infrastructure (FONIVA SMS Pattern)

**Goal:** Multi-channel communication (SMS via FONIVA, Email, Push Notification) with database tracking, delivery callbacks, retry mechanism

**Value Proposition:** Production-proven FONIVA SMS integration (hrsync-backend pattern) with database tracking, delivery status, retry mechanism, statistics. Unified notification system for Email/Push. Module can be copied from hrsync-backend.

**Prerequisites:** Epic 3 (Users), Epic 1 (Database)

**Technical Stack:**
- SMS: FONIVA (hrsync-backend proven pattern with database tracking)
  - Module source: `/Users/ahmet/Documents/Bitbucket/hrsync-backend/src/sms`
  - Database tracking: SMS entity with delivery status
  - Delivery callbacks: Webhook support
  - Retry mechanism: Exponential backoff
  - Statistics: SMS reporting
- Email: SendGrid or AWS SES (interface-based)
- Push: Firebase Cloud Messaging (optional)
- Template engine: EJS for SMS, Handlebars for Email

---

## Story 5.1: FONIVA SMS Module (hrsync-backend Pattern)

**As a** developer,
**I want** FONIVA SMS integration with database tracking, delivery callbacks, retry mechanism,
**So that** SMS gönderimi production-ready ve audit edilebilir olsun.

**Acceptance Criteria:**

**1. SMS Entity (Database Tracking):**
   - `src/modules/sms/entities/sms.entity.ts` oluşturulmuş (Prisma model)
   - Fields:
     - id, domainID, phoneNumber, message
     - type: 'OTP' | 'NOTIFICATION' | 'MARKETING' | 'ALERT'
     - status: 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED'
     - provider: 'FONIVA' (default)
     - providerId: string (FONIVA message ID)
     - attemptCount: number (retry tracking)
     - errorMessage: string (failure details)
     - sentAt, deliveredAt, createdAt, updatedAt
   - Indexes: [domainID], [phoneNumber], [status], [createdAt]

**2. FONIVA Service:**
   - `src/modules/sms/services/foniva.service.ts` oluşturulmuş
   - FONIVA REST API integration (axios)
   - Environment variables:
     - SMS_PROVIDER=FONIVA
     - FONIVA_API_URL
     - FONIVA_USERNAME
     - FONIVA_PASSWORD
     - FONIVA_API_KEY
     - FONIVA_SENDER
   - `sendSms(phoneNumber, message, type): Promise<FonivaResult>`
     - FONIVA API call
     - Return providerId (FONIVA message ID)
   - Error handling: Network failures, invalid credentials

**3. SMS Service (Main Orchestrator):**
   - `src/modules/sms/services/sms.service.ts` oluşturulmuş
   - `sendSms(domainID, phoneNumber, message, type): Promise<SMS>`
     - Create SMS record (status: PENDING)
     - Call FonivaService.sendSms()
     - Update SMS record:
       - Success → status: SENT, providerId, sentAt
       - Failure → status: FAILED, errorMessage, attemptCount++
     - Return SMS entity
   - Database tracking for all SMS (audit trail)

**4. Retry Mechanism:**
   - Failed SMS'ler retry edilebilir
   - `retrySms(smsId): Promise<SMS>`
     - attemptCount < 3 check
     - Re-attempt FONIVA send
     - Update SMS record
   - Exponential backoff: 1min → 5min → 15min

**5. Delivery Callbacks (Webhook):**
   - `POST /sms/callback/delivery` endpoint (public, FONIVA webhook)
   - Request DTO: providerId, status ('DELIVERED' | 'FAILED')
   - SMS record update:
     - Find by providerId
     - Update status, deliveredAt
   - Webhook signature verification (FONIVA API key)

**6. SMS Statistics:**
   - `GET /sms/stats` endpoint (admin only)
   - Aggregation:
     - Total sent, delivered, failed
     - Success rate by type (OTP, NOTIFICATION, etc.)
     - Date range filtering
     - domainID filtering (multi-tenant)

**7. SMS DTOs:**
   - SendSmsDto: { phoneNumber, message, type }
   - DeliveryCallbackDto: { providerId, status }

**8. Enums:**
   - SmsType: OTP, NOTIFICATION, MARKETING, ALERT
   - SmsStatus: PENDING, SENT, DELIVERED, FAILED

**Technical Notes:**
- **Module can be copied from:** `/Users/ahmet/Documents/Bitbucket/hrsync-backend/src/sms`
- Adapt TypeORM entities to Prisma
- FONIVA API: REST API with Basic Auth + API Key
- Multi-tenant: domainID in SMS entity
- Audit trail: All SMS tracked in database
- Template support: EJS templates for message content (optional)
- Module structure:
  ```
  sms/
  ├── sms.module.ts
  ├── entities/
  │   └── sms.entity.ts
  ├── services/
  │   ├── sms.service.ts
  │   └── foniva.service.ts
  ├── dto/
  │   ├── send-sms.dto.ts
  │   └── delivery-callback.dto.ts
  ├── enums/
  │   ├── sms-type.enum.ts
  │   └── sms-status.enum.ts
  └── __tests__/
  ```

**Implementation Strategy:**
1. Copy `/Users/ahmet/Documents/Bitbucket/hrsync-backend/src/sms` module
2. Adapt TypeORM entities to Prisma
3. Update imports (TypeORM → Prisma)
4. Test FONIVA API credentials
5. Verify delivery callback webhook

**Dependencies:** Story 1.7 (Database), Story 4.5 (File Module - for AWS integration pattern)

---

## Story 5.2: Email Provider Interface & SendGrid Implementation

**As a** developer,
**I want** email provider abstraction,
**So that** email provider'ı kolayca değiştirebilleyim.

**Acceptance Criteria:**
1. `src/modules/mail/interfaces/mail-provider.interface.ts` oluşturulmuş
   ```typescript
   interface IEmailProvider {
     send(to: string, subject: string, html: string, text?: string): Promise<EmailResult>;
   }
   ```
2. `src/modules/mail/providers/sendgrid.provider.ts` oluşturulmuş
3. SendGrid SDK configured (SENDGRID_API_KEY, MAIL_FROM)
4. MailModule dynamic provider injection (MAIL_PROVIDER env var)
5. `MailService` oluşturulmuş (provider-agnostic)
   - `sendEmail(to: string, subject: string, html: string): Promise<void>`
6. Error handling: Provider exceptions wrapped

**Technical Notes:**
- SendGrid SDK: @sendgrid/mail kullan
- HTML + plain text support
- Template support (next story)

**Dependencies:** Story 5.1

---

## Story 5.3: Email Templates (Handlebars)

**As a** developer,
**I want** email template engine,
**So that** dynamic email content oluşturabileyim.

**Acceptance Criteria:**
1. `src/modules/mail/templates/` klasörü oluşturulmuş
2. Template files:
   - `verification.hbs` - Email verification template
   - `password-reset.hbs` - Password reset template
   - `welcome.hbs` - Welcome email template
3. `TemplateService` oluşturulmuş
   - `render(templateName: string, data: object): Promise<string>`
4. Handlebars configured ve compile ediliyor
5. Template variables: {{firstName}}, {{verificationLink}}, etc.
6. MailService.sendEmail() template support eklendi:
   - `sendTemplateEmail(to, subject, templateName, data): Promise<void>`

**Technical Notes:**
- Handlebars library kullan
- Template compile ve cache (performance)
- Template path: src/modules/mail/templates/

**Dependencies:** Story 5.2

---

## Story 5.4: Integrate Email Verification & Password Reset

**As a** developer,
**I want** Epic 2'deki email verification ve password reset'e gerçek email gönderimi,
**So that** kullanıcılar email alabilsin.

**Acceptance Criteria:**
1. Auth module, MailService inject ediyor
2. Register'da verification email gönderiliyor:
   - Template: verification.hbs
   - Variables: firstName, verificationLink (with JWT token)
3. Forgot password'da reset email gönderiliyor:
   - Template: password-reset.hbs
   - Variables: firstName, resetLink (with JWT token)
4. Email gönderimi async (non-blocking)
5. Email send failure → log error, don't block registration
6. Stub implementation kaldırıldı (Epic 2'den)

**Technical Notes:**
- Fire-and-forget email (async, don't await)
- Error handling: Log to Sentry (Epic 7)
- Link format: {FRONTEND_URL}/verify-email?token={token}

**Dependencies:** Story 5.3

---

## Story 5.5: Integrate OTP Sending (SMS via FONIVA)

**As a** developer,
**I want** Epic 2'deki OTP gönderimini SMS ile implement etmek (FONIVA),
**So that** kullanıcılar SMS OTP alabilsin.

**Acceptance Criteria:**
1. Auth module, SmsService inject ediyor (Story 5.1)
2. OTP gönderimi (Epic 2 story'lerinde):
   - Registration (Story 2.2) → Phone verification OTP
   - Login (Story 2.3.1) → Login OTP
   - Forgot Password (Story 2.6) → Password reset OTP
   - Resend OTP (Story 2.7) → Phone verification OTP
3. All OTP sending via `SmsService.sendSms(domainID, phoneNumber, message, type: 'OTP')`
4. OTP message format: "Your verification code is: {code}. Valid for 5 minutes."
5. Message templates by purpose:
   - Phone verification: "Welcome! Your phone verification code is: {code}. Valid for 5 minutes."
   - Login: "Your login code is: {code}. Valid for 5 minutes."
   - Password reset: "Your password reset code is: {code}. Valid for 5 minutes."
6. SMS tracking:
   - All OTP SMS tracked in SMS entity
   - Status monitoring (PENDING → SENT → DELIVERED)
   - Delivery callback support
7. Error handling:
   - SMS send failure → Log error, return 503 Service Unavailable
   - Network failure → Retry mechanism (Story 5.1)

**Technical Notes:**
- OTP 6-digit: Already generated in Epic 2
- SMS sending via FONIVA (Story 5.1)
- Database tracking for audit (SMS entity)
- Type: 'OTP' in SMS entity
- Multi-tenant: domainID in SMS record
- Fire-and-forget: Async SMS sending (non-blocking)
- Template variables: {code}, {firstName} (optional)

**Dependencies:** Story 5.4, Story 5.1 (FONIVA SMS Module)

---

## Story 5.6: Notification Preferences Entity

**As a** user,
**I want** notification tercihlerimi ayarlayabilmek,
**So that** hangi kanaldan notification almak istediğimi seçebilleyim.

**Acceptance Criteria:**
1. NotificationPreference entity oluşturulmuş (id, domainID, userID, channel: EMAIL|SMS|PUSH, enabled: boolean)
2. Unique constraint: [domainID, userID, channel]
3. GET /users/me/notification-preferences endpoint
   - User'ın notification preferences döndürüyor
   - Default: All channels enabled
4. PATCH /users/me/notification-preferences endpoint
   - Request DTO: [{ channel, enabled }]
   - Bulk update
5. NotificationService bu preferences'i check ediyor (next story)

**Technical Notes:**
- Default preferences: User create'te otomatik oluştur (all enabled)
- Channel enum: EMAIL, SMS, PUSH

**Dependencies:** Story 5.5

---

## Story 5.7: Unified Notification Service

**As a** developer,
**I want** unified notification service,
**So that** notification gönderirken channel logic'i abstract edilsin.

**Acceptance Criteria:**
1. Notification entity oluşturulmuş (id, domainID, userID, type, channel, title, message, data: JSON, sent: boolean, sentAt, createdAt)
2. `NotificationService` oluşturulmuş
3. `send(userID, type, title, message, data?): Promise<void>`
   - User notification preferences fetch
   - Enabled channels'a gönder (SMS + Email + Push)
   - Notification history database'e kaydet
4. Multi-channel sending:
   - EMAIL enabled → MailService.send()
   - SMS enabled → SmsService.send()
   - PUSH enabled → FirebaseService.send() (stub for now, Story 5.8)
5. Failure handling: Partial success OK (log failures, mark channel as failed)

**Technical Notes:**
- Notification types: 'verification', 'password-reset', 'otp', etc.
- History tracking for audit
- Async sending (don't block)

**Dependencies:** Story 5.6

---

## Story 5.8: Firebase Push Notification (Optional)

**As a** developer,
**I want** Firebase push notification support,
**So that** mobile app'e push notification gönderebilleyim.

**Acceptance Criteria:**
1. `src/modules/notifications/services/firebase.service.ts` oluşturulmuş
2. Firebase Admin SDK configured (FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL)
3. FirebaseService methods:
   - `sendPush(deviceToken: string, title: string, body: string, data?: object): Promise<void>`
4. DeviceToken entity oluşturulmuş (id, domainID, userID, token, platform: iOS|Android, createdAt)
5. POST /users/me/device-tokens endpoint (register device token)
6. NotificationService, PUSH channel için FirebaseService kullanıyor
7. Error handling: Invalid token → mark token as inactive

**Technical Notes:**
- firebase-admin SDK kullan
- Device token lifecycle: Register, refresh, delete (logout'ta)
- Optional feature: Skip if not needed (env var: FIREBASE_ENABLED)

**Dependencies:** Story 5.7

---
