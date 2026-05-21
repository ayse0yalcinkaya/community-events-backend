# Epic 6.5: Common Cache & Retry Services

**Goal:** Projenin her yerinde kullanılabilir genel amaçlı cache ve retry servislerini implement etmek

**Value Proposition:** Tüm modüller tarafından kullanılabilecek reusable cache ve retry servisleri. Document generator, S3 uploads, external API calls ve diğer tüm async operasyonlar için standart cache ve retry mekanizması sağlamak.

**Prerequisites:** Epic 1 (Database Infrastructure), Epic 7.2 (Common Utilities)

**Technical Stack:**
- **Caching**: NestJS `@nestjs/cache-manager`, Redis store, SHA-256 hash-based cache keys, generic key generation
- **Retry Mechanism**: Exponential backoff (configurable attempts, base delay), generic operation wrapper
- **Location**: `src/common/services/` - tüm modüller tarafından import edilebilir
- **Integration**: DocumentGeneratorService, S3Service, ve diğer tüm servisler tarafından kullanılabilir

---

## Story 6.5: Common Cache Service (SHA-256 Hash-Based)

**As a** developer,
**I want** proje genelinde kullanılabilir hash-based caching system,
**So that** tüm modüllerde cache ihtiyacı olan operasyonlar için reusable cache servisi kullanabilirim.

**Acceptance Criteria:**

**1. CacheService:**
   - `src/common/services/cache.service.ts`
   - Dependencies: NestJS `@nestjs/cache-manager`, Cache instance (injected via CACHE_MANAGER)
   - Default TTL: 1 hour (3600000ms), configurable per operation
   - Generic type support: `<T>` for any cached value type

**2. Methods:**
   - `generateCacheKey(prefix: string, ...parts: any[]): string`
     - Generic key generation: `{prefix}:{hash(parts)}`
     - Data hash: SHA-256 of sorted JSON (sortObjectKeys)
     - Example: `doc:PDF:invoice:a1b2c3d4...`, `user:profile:123:abc...`
   - `get<T>(key: string): Promise<T | null>`: Retrieve cached value (generic type)
   - `set<T>(key: string, value: T, ttl?: number): Promise<void>`: Store value with optional TTL
   - `delete(key: string): Promise<void>`: Invalidate cache
   - `clear(): Promise<void>`: Clear all cache entries

**3. Data Hashing:**
   - `generateDataHash(data: any): string` (private)
     - Sort object keys recursively (consistent hash)
     - JSON.stringify
     - SHA-256 hash (64 hex characters)
   - `sortObjectKeys(obj: any): any` (private)
     - Recursive key sorting
     - Handles arrays, objects, primitives

**4. NestJS Cache Module Integration:**
   - Global CacheModule.register() in AppModule veya CommonModule
   - Redis store configuration:
     - Store: Redis (cache-manager-redis-store)
     - Redis client: ioredis
     - Configuration: Environment variables (REDIS_HOST, REDIS_PORT, REDIS_PASSWORD, REDIS_DB)
     - TTL: 3600 seconds (1 hour) - default
     - Connection pooling: Redis connection pool management

**5. CommonModule Export:**
   - CacheService exported from `src/common/services/index.ts`
   - Available to all modules via CommonModule import

**Technical Notes:**
- SHA-256: Node.js `crypto.createHash('sha256')`
- Key sorting: Ensures `{a:1, b:2}` and `{b:2, a:1}` produce same hash
- Cache invalidation: Manual via delete() or TTL expiry
- Generic type support: Works with any TypeScript type
- Usage examples:
  ```typescript
  // Document generation
  const key = cacheService.generateCacheKey('doc', 'PDF', 'invoice', data);
  const cached = await cacheService.get<string>(key);
  
  // User profile
  const key = cacheService.generateCacheKey('user', 'profile', userId);
  await cacheService.set(key, userProfile, 1800000); // 30 min TTL
  ```

**Dependencies:** Epic 7.2 (Common Utilities)

---

## Story 6.6: Common Retry Service (Exponential Backoff)

**As a** developer,
**I want** proje genelinde kullanılabilir retry mechanism,
**So that** tüm async operasyonlar (S3 upload, external API calls, database operations) için transient failures otomatik retry edilsin.

**Acceptance Criteria:**

**1. RetryService:**
   - `src/common/services/retry.service.ts`
   - Configurable max attempts (default: 3)
   - Configurable base delay (default: 1000ms)
   - Exponential backoff: 2^(attempt-1) * baseDelay
   - Generic type support: `<T>` for any return type

**2. Method - executeWithRetry():**
   ```typescript
   async executeWithRetry<T>(
     operation: () => Promise<T>,
     options?: RetryOptions
   ): Promise<T>
   ```
   
   **RetryOptions interface:**
   ```typescript
   interface RetryOptions {
     maxAttempts?: number;      // Default: 3
     baseDelay?: number;         // Default: 1000ms
     context?: string;           // For logging: 'S3 upload: invoice-001.pdf'
     onRetry?: (attempt: number, error: Error) => void;  // Optional callback
   }
   ```
   
   - Retry logic:
     - Attempt 1: Execute immediately
     - Attempt 2: Wait baseDelay (2^0 * baseDelay), retry
     - Attempt 3: Wait 2*baseDelay (2^1 * baseDelay), retry
     - Success → Return result
     - All attempts fail → Throw last error

**3. Logging:**
   - Use Common LoggerService (Epic 7.3)
   - Log each attempt: `[context] Attempt 1/3`
   - Log retry delay: `[context] Waiting 1000ms before retry attempt 2`
   - Log success on retry: `[context] Succeeded on attempt 2/3`
   - Log final failure: `[context] All 3 attempts failed`

**4. Usage Examples:**
   ```typescript
   // S3 upload
   const result = await retryService.executeWithRetry(
     async () => await s3Service.upload(buffer, path),
     { context: 'S3 upload: invoice-001.pdf' }
   );
   
   // External API call
   const data = await retryService.executeWithRetry(
     async () => await httpService.get('/api/data'),
     { maxAttempts: 5, baseDelay: 2000, context: 'External API: data fetch' }
   );
   
   // Database operation
   const user = await retryService.executeWithRetry(
     async () => await prisma.user.findUnique({ where: { id } }),
     { context: `Database: find user ${id}` }
   );
   ```

**5. CommonModule Export:**
   - RetryService exported from `src/common/services/index.ts`
   - Available to all modules via CommonModule import

**Technical Notes:**
- Generic type support: `<T>` works with any Promise return type
- Exponential backoff formula: `Math.pow(2, attempt - 1) * BASE_DELAY`
- Delay sequence: 0ms → baseDelay → 2*baseDelay → 4*baseDelay...
- Context string for debugging and logging
- Optional retry callback for custom handling
- Integration with LoggerService for structured logging

**Dependencies:** Story 6.5, Epic 7.3 (Structured Logging)

---

## Story 6.5-3: Document Generator Cache & Retry Integration

**As a** developer,
**I want** DocumentGeneratorService'te cache ve retry mekanizmalarını entegre etmek,
**So that** PDF/Excel generation işlemleri cache'lensin ve geçici hatalar otomatik retry edilsin.

**Acceptance Criteria:**

**1. DocumentGeneratorService Integration:**
   - `src/modules/document-generator/services/document-generator.service.ts`
   - Constructor'da CacheService ve RetryService inject et
   - Generate metodunu cache ve retry ile sarmalama

**2. Cache Implementation:**
   - Cache key generation:
     ```typescript
     const cacheKey = this.cacheService.generateCacheKey(
       'document',
       format, // 'PDF' | 'EXCEL'
       templateName,
       data
     );
     ```
   - Cache check before generation
   - Cache result after successful generation
   - TTL: 1 hour (configurable via environment variable)
   - Cached value type: `GenerationResult` (Base64 string or Buffer)

**3. Retry Implementation:**
   - Wrap Puppeteer PDF generation with retry:
     ```typescript
     const result = await this.retryService.executeWithRetry(
       async () => await this.generatePDFWithPuppeteer(html),
       {
         maxAttempts: 3,
         baseDelay: 1000,
         context: `PDF Generation: ${templateName}`
       }
     );
     ```
   - Wrap Excel generation with retry:
     ```typescript
     const result = await this.retryService.executeWithRetry(
       async () => await this.excelAdapter.generate(data),
       {
         maxAttempts: 3,
         baseDelay: 1000,
         context: `Excel Generation: ${templateName}`
       }
     );
     ```

**4. Error Handling:**
   - Cache miss: Generate document normally
   - Generation failure: Log error, throw DocumentGenerationException
   - Retry exhausted: Throw error with clear message
   - Cache write failure: Log warning but continue (non-blocking)

**5. Logging:**
   - Log cache hit/miss: `[DocumentGenerator] Cache hit for key: doc:PDF:invoice:...`
   - Log generation start: `[DocumentGenerator] Generating PDF: invoice`
   - Log retry attempts: `[DocumentGenerator] Retry attempt 2/3 for PDF: invoice`
   - Log cache write: `[DocumentGenerator] Cached result for key: doc:PDF:invoice:...`

**6. Configuration:**
   - Environment variables:
     - `DOCUMENT_CACHE_TTL` (default: 3600000ms = 1 hour)
     - `DOCUMENT_RETRY_MAX_ATTEMPTS` (default: 3)
     - `DOCUMENT_RETRY_BASE_DELAY` (default: 1000ms)
   - Add to `.env.example`

**7. Unit Tests:**
   - `src/modules/document-generator/services/__tests__/document-generator.service.spec.ts`
   - Test cache hit scenario
   - Test cache miss scenario
   - Test retry on failure
   - Test retry exhaustion
   - Mock CacheService and RetryService

**Technical Notes:**
- Cache key includes template name and data hash for uniqueness
- Puppeteer timeout errors are good candidates for retry
- Excel generation errors (file I/O, template rendering) benefit from retry
- Cache invalidation: Manual or TTL expiry
- Consider cache size limits for large documents

**Dependencies:** Story 6.5-1, Story 6.5-2

---

## Story 6.5-4: S3 Service Retry Integration

**As a** developer,
**I want** S3Service'te retry mekanizmasını entegre etmek,
**So that** file upload/download işlemlerinde geçici network hataları otomatik retry edilsin.

**Acceptance Criteria:**

**1. S3Service Integration:**
   - `src/modules/files/services/s3.service.ts`
   - Constructor'da RetryService inject et
   - Upload, download, delete metodlarını retry ile sarmalama

**2. Upload Retry:**
   - Wrap S3 upload operation:
     ```typescript
     const result = await this.retryService.executeWithRetry(
       async () => await this.s3Client.send(new PutObjectCommand(params)),
       {
         maxAttempts: 5,
         baseDelay: 2000,
         context: `S3 Upload: ${key}`
       }
     );
     ```
   - Max attempts: 5 (network operations benefit from more retries)
   - Base delay: 2000ms (longer delay for external service)

**3. Download Retry:**
   - Wrap S3 getObject operation:
     ```typescript
     const result = await this.retryService.executeWithRetry(
       async () => await this.s3Client.send(new GetObjectCommand(params)),
       {
         maxAttempts: 5,
         baseDelay: 2000,
         context: `S3 Download: ${key}`
       }
     );
     ```

**4. Delete Retry:**
   - Wrap S3 deleteObject operation:
     ```typescript
     await this.retryService.executeWithRetry(
       async () => await this.s3Client.send(new DeleteObjectCommand(params)),
       {
         maxAttempts: 3,
         baseDelay: 1000,
         context: `S3 Delete: ${key}`
       }
     );
     ```

**5. Pre-signed URL Generation:**
   - No retry needed (synchronous operation)
   - Keep existing implementation

**6. Error Handling:**
   - Network timeout errors: Retry
   - Connection errors: Retry
   - 5xx server errors: Retry
   - 4xx client errors (InvalidBucket, NoSuchKey): Don't retry, throw immediately
   - Retry exhausted: Throw S3ServiceException with clear message

**7. Configuration:**
   - Environment variables:
     - `S3_RETRY_MAX_ATTEMPTS` (default: 5)
     - `S3_RETRY_BASE_DELAY` (default: 2000ms)
   - Add to `.env.example`

**8. Logging:**
   - Log upload start: `[S3Service] Uploading file: ${key}`
   - Log retry attempts: `[S3Service] Retry attempt 2/5 for upload: ${key}`
   - Log success: `[S3Service] Successfully uploaded: ${key}`
   - Log final failure: `[S3Service] Upload failed after 5 attempts: ${key}`

**9. Unit Tests:**
   - Test successful upload on first attempt
   - Test retry on network error
   - Test retry exhaustion
   - Test no retry for 4xx errors
   - Mock RetryService

**Technical Notes:**
- S3 SDK already has built-in retry, but custom retry provides better logging and control
- Network errors are most common: ETIMEDOUT, ECONNRESET, ECONNREFUSED
- Consider exponential backoff with jitter for production
- Large file uploads may need longer timeouts

**Dependencies:** Story 6.5-2

---

## Story 6.5-5: Mail & SMS Services Retry Integration

**As a** developer,
**I want** MailService ve SMSService'te retry mekanizmasını entegre etmek,
**So that** email ve SMS gönderimlerinde geçici hatalar otomatik retry edilsin.

**Acceptance Criteria:**

**1. MailService Integration:**
   - `src/modules/mail/services/mail.service.ts`
   - Constructor'da RetryService inject et
   - SendGrid send metodunu retry ile sarmalama

**2. Mail Send Retry:**
   - Wrap SendGrid send operation:
     ```typescript
     await this.retryService.executeWithRetry(
       async () => await this.sendgridClient.send(mailOptions),
       {
         maxAttempts: 5,
         baseDelay: 2000,
         context: `Email Send: ${to} - ${subject}`
       }
     );
     ```
   - Max attempts: 5 (critical communication)
   - Base delay: 2000ms

**3. Template Email Retry:**
   - Wrap template rendering + send:
     ```typescript
     const html = await this.templateService.render(template, data);
     await this.retryService.executeWithRetry(
       async () => await this.sendgridClient.send({ to, subject, html }),
       {
         maxAttempts: 5,
         baseDelay: 2000,
         context: `Template Email: ${template} to ${to}`
       }
     );
     ```

**4. SMSService Integration:**
   - `src/modules/sms/services/sms.service.ts`
   - Constructor'da RetryService inject et
   - Foniva send metodunu retry ile sarmalama

**5. SMS Send Retry:**
   - Wrap Foniva HTTP call:
     ```typescript
     await this.retryService.executeWithRetry(
       async () => await this.fonivaService.send(phone, message),
       {
         maxAttempts: 5,
         baseDelay: 2000,
         context: `SMS Send: ${phone} - ${message.substring(0, 50)}...`
       }
     );
     ```

**6. Error Handling:**
   - **Mail Errors:**
     - Network timeout: Retry
     - SendGrid rate limit (429): Retry with longer delay
     - Invalid email (400): Don't retry, throw immediately
     - Retry exhausted: Throw MailServiceException
   - **SMS Errors:**
     - Network timeout: Retry
     - Foniva API errors (5xx): Retry
     - Invalid phone number (400): Don't retry, throw immediately
     - Retry exhausted: Throw SmsServiceException

**7. Configuration:**
   - Environment variables:
     - `MAIL_RETRY_MAX_ATTEMPTS` (default: 5)
     - `MAIL_RETRY_BASE_DELAY` (default: 2000ms)
     - `SMS_RETRY_MAX_ATTEMPTS` (default: 5)
     - `SMS_RETRY_BASE_DELAY` (default: 2000ms)
   - Add to `.env.example`

**8. Logging:**
   - **Mail:**
     - Log send start: `[MailService] Sending email to: ${to} - ${subject}`
     - Log retry: `[MailService] Retry attempt 2/5 for email: ${to}`
     - Log success: `[MailService] Email sent successfully: ${to}`
   - **SMS:**
     - Log send start: `[SMSService] Sending SMS to: ${phone}`
     - Log retry: `[SMSService] Retry attempt 2/5 for SMS: ${phone}`
     - Log success: `[SMSService] SMS sent successfully: ${phone}`

**9. Unit Tests:**
   - **MailService tests:**
     - Test successful send
     - Test retry on network error
     - Test no retry for invalid email
     - Test retry exhaustion
   - **SMSService tests:**
     - Test successful send
     - Test retry on API error
     - Test no retry for invalid phone
     - Test retry exhaustion

**Technical Notes:**
- SendGrid and Foniva are external APIs - retry is critical
- Rate limiting (429) should trigger exponential backoff
- Don't retry on validation errors (4xx) - fail fast
- Consider dead letter queue for failed messages in production
- Log sanitization: Don't log full message content in production

**Dependencies:** Story 6.5-2

---

## Story 6.5-6: Firebase Notification Retry Integration

**As a** developer,
**I want** FirebaseService'te retry mekanizmasını entegre etmek,
**So that** push notification gönderimlerinde geçici hatalar otomatik retry edilsin.

**Acceptance Criteria:**

**1. FirebaseService Integration:**
   - `src/modules/notifications/services/firebase.service.ts`
   - Constructor'da RetryService inject et
   - Firebase send metodunu retry ile sarmalama

**2. Single Device Notification Retry:**
   - Wrap Firebase Admin SDK send:
     ```typescript
     const result = await this.retryService.executeWithRetry(
       async () => await this.firebaseAdmin.messaging().send(message),
       {
         maxAttempts: 5,
         baseDelay: 2000,
         context: `Firebase Notification: ${deviceToken.substring(0, 20)}...`
       }
     );
     ```

**3. Multi-Device Notification Retry:**
   - Wrap sendMulticast:
     ```typescript
     const result = await this.retryService.executeWithRetry(
       async () => await this.firebaseAdmin.messaging().sendMulticast(message),
       {
         maxAttempts: 5,
         baseDelay: 2000,
         context: `Firebase Multicast: ${tokens.length} devices`
       }
     );
     ```

**4. Topic Notification Retry:**
   - Wrap sendToTopic:
     ```typescript
     await this.retryService.executeWithRetry(
       async () => await this.firebaseAdmin.messaging().sendToTopic(topic, message),
       {
         maxAttempts: 5,
         baseDelay: 2000,
         context: `Firebase Topic: ${topic}`
       }
     );
     ```

**5. Error Handling:**
   - Network errors: Retry
   - Firebase server errors (5xx): Retry
   - Invalid token (404): Don't retry, mark token as invalid
   - Invalid message format (400): Don't retry, throw immediately
   - Quota exceeded (429): Retry with exponential backoff
   - Retry exhausted: Throw FirebaseServiceException

**6. Token Cleanup:**
   - On invalid token error (MessagingErrorCode.INVALID_REGISTRATION_TOKEN):
     - Don't retry
     - Mark device token as invalid in database
     - Log warning: `[FirebaseService] Invalid token, marked for cleanup: ${token}`

**7. Configuration:**
   - Environment variables:
     - `FIREBASE_RETRY_MAX_ATTEMPTS` (default: 5)
     - `FIREBASE_RETRY_BASE_DELAY` (default: 2000ms)
   - Add to `.env.example`

**8. Logging:**
   - Log send start: `[FirebaseService] Sending notification to device: ${token.substring(0, 20)}...`
   - Log retry: `[FirebaseService] Retry attempt 2/5 for notification`
   - Log success: `[FirebaseService] Notification sent successfully`
   - Log invalid token: `[FirebaseService] Invalid token detected, marking for cleanup`
   - Log final failure: `[FirebaseService] Notification failed after 5 attempts`

**9. BatchResponse Handling:**
   - For multicast sends, handle partial failures:
     - Success responses: Log success count
     - Failed responses: Check error codes
     - Invalid tokens: Extract and mark for cleanup
     - Retryable errors: Collect failed tokens and retry batch

**10. Unit Tests:**
   - Test successful send
   - Test retry on network error
   - Test no retry for invalid token
   - Test token cleanup on invalid token
   - Test multicast partial failure handling
   - Test retry exhaustion
   - Mock Firebase Admin SDK

**Technical Notes:**
- Firebase has rate limits: Be mindful of retry frequency
- Invalid tokens should be cleaned up to avoid repeated failures
- Multicast sends can have partial successes - handle individually
- Consider batching token cleanup operations
- Log sanitization: Don't log full device tokens in production

**Dependencies:** Story 6.5-2

---

