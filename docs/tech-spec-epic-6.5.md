# Epic Technical Specification: Common Cache & Retry Services

Date: 2025-11-07
Author: BMad
Epic ID: 6.5
Status: Ready

---

## Overview

Epic 6.5, Boilerplate projesinin tüm modülleri tarafından kullanılabilecek genel amaçlı cache ve retry servislerini sağlar. Bu epic, Epic 6'da document generator için placeholder olarak bırakılan CacheService ve RetryService'in proje genelinde kullanılabilir hale getirilmesini hedefler.

Cache servisi, SHA-256 hash-based key generation ile herhangi bir veri tipini cache'leyebilir ve NestJS cache-manager entegrasyonu ile Redis store kullanır. Retry servisi, exponential backoff stratejisi ile tüm async operasyonlar (S3 upload, external API calls, database operations) için transient failure'ları otomatik olarak retry eder.

Bu servisler `src/common/services/` altında yer alır ve CommonModule üzerinden tüm modüllere export edilir, böylece document generator, S3 service, external API clients ve diğer tüm servisler tarafından kullanılabilir.

## Objectives and Scope

### In Scope

1. **Common Cache Service (Story 6.5)**
   - Generic cache key generation (`generateCacheKey(prefix, ...parts)`)
   - SHA-256 hash-based key generation (consistent hash için sorted keys)
   - Generic type support (`get<T>`, `set<T>`)
   - TTL support (default 1 hour, configurable per operation)
   - Cache operations: get, set, delete, clear
   - NestJS cache-manager entegrasyonu (Redis store)
   - CommonModule export

2. **Common Retry Service (Story 6.6)**
   - Generic retry mechanism (`executeWithRetry<T>`)
   - Configurable max attempts (default: 3)
   - Configurable base delay (default: 1000ms)
   - Exponential backoff: 2^(attempt-1) * baseDelay
   - Context-based logging (LoggerService entegrasyonu)
   - Optional retry callback
   - CommonModule export

3. **Integration Points**
   - DocumentGeneratorService: Cache ve retry kullanımı
   - S3Service: Retry mechanism entegrasyonu
   - External API clients: Retry mechanism
   - Database operations: Retry mechanism (optional)

### Out of Scope (Future Enhancements)

- Advanced cache strategies (LRU, LFU, etc.)
- Cache warming strategies
- Distributed cache coordination
- Circuit breaker pattern (retry ile birlikte)
- Retry strategies other than exponential backoff (linear, fixed delay)
- Cache invalidation strategies (event-based, time-based)

## System Architecture Alignment

Epic 6.5, Architecture document'inde tanımlanan **Common Infrastructure** katmanına denk gelir ve tüm feature module'larının kullanacağı shared services'i oluşturur.

**Architecture'dan Key Alignment'lar:**

1. **Modular Organization (`src/common/services/`):**
   - CacheService ve RetryService `src/common/services/` altında
   - CommonModule üzerinden export edilir
   - Tüm modüller CommonModule'ü import ederek kullanabilir

2. **Dependency Injection Pattern:**
   - NestJS dependency injection kullanılır
   - CacheService: `CACHE_MANAGER` token ile inject edilir
   - RetryService: LoggerService dependency'si var

3. **Configuration Management:**
   - CacheModule global olarak AppModule'de register edilir
   - Redis configuration: Environment variables (REDIS_HOST, REDIS_PORT, REDIS_PASSWORD, REDIS_DB)
   - TTL configurable per operation
   - Retry options per-operation configurable

4. **Integration with Existing Infrastructure:**
   - LoggerService (Epic 7.3) kullanılır retry logging için
   - CacheModule (NestJS) kullanılır cache storage için
   - DocumentGeneratorService (Epic 6) bu servisleri kullanacak

5. **Error Handling:**
   - RetryService son denemede başarısız olursa son error'ı throw eder
   - CacheService cache miss durumunda null return eder (error throw etmez)

**Integration Points:**
- Epic 6 (Document Generation): Cache ve retry kullanımı
- Epic 4 (File Management/S3): Retry mechanism entegrasyonu
- Epic 7 (Developer Infrastructure): LoggerService kullanımı
- Future external API integrations: Retry mechanism

## Detailed Design

### Services and Modules

| Service/Module | Responsibility | Inputs | Outputs | Owner |
|---------------|---------------|---------|---------|-------|
| **CacheService** | Generic cache operations with SHA-256 hash-based keys | Cache key parts, value to cache, optional TTL | Cached value or null | `src/common/services/cache.service.ts` |
| **RetryService** | Exponential backoff retry mechanism for async operations | Operation function, retry options | Operation result or throws last error | `src/common/services/retry.service.ts` |
| **CommonModule** | Export CacheService and RetryService | - | Exported services | `src/common/services/index.ts` (export) |

**CacheService Methods:**
- `generateCacheKey(prefix: string, ...parts: any[]): string` - Generate cache key with hash
- `get<T>(key: string): Promise<T | null>` - Retrieve cached value
- `set<T>(key: string, value: T, ttl?: number): Promise<void>` - Store value with optional TTL
- `delete(key: string): Promise<void>` - Invalidate cache entry
- `clear(): Promise<void>` - Clear all cache entries

**RetryService Methods:**
- `executeWithRetry<T>(operation: () => Promise<T>, options?: RetryOptions): Promise<T>` - Execute operation with retry

**RetryOptions Interface:**
```typescript
interface RetryOptions {
  maxAttempts?: number;      // Default: 3
  baseDelay?: number;         // Default: 1000ms
  context?: string;           // For logging
  onRetry?: (attempt: number, error: Error) => void;  // Optional callback
}
```

### Data Models and Contracts

**Cache Key Format:**
- Pattern: `{prefix}:{hash(parts)}`
- Example: `doc:PDF:invoice:a1b2c3d4e5f6...` (64 hex characters)
- Hash algorithm: SHA-256
- Key sorting: Recursive object key sorting for consistent hash

**Cache Storage:**
- Backend: NestJS cache-manager with Redis store
- Redis client: ioredis
- TTL: Default 3600 seconds (1 hour), configurable per operation
- Redis configuration: Environment-based (REDIS_HOST, REDIS_PORT, REDIS_PASSWORD)
- Connection pooling: Redis connection pool management

**Retry Configuration:**
- Max attempts: 3 (default, configurable)
- Base delay: 1000ms (default, configurable)
- Exponential backoff formula: `2^(attempt-1) * baseDelay`
- Delay sequence: 0ms → 1000ms → 2000ms → 4000ms...

### APIs and Interfaces

**CacheService Interface:**
```typescript
@Injectable()
export class CacheService {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache);
  
  generateCacheKey(prefix: string, ...parts: any[]): string;
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
}
```

**RetryService Interface:**
```typescript
@Injectable()
export class RetryService {
  constructor(private readonly logger: LoggerService);
  
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    options?: RetryOptions
  ): Promise<T>;
}
```

**Usage Examples:**

```typescript
// Cache Service Usage
const cacheKey = cacheService.generateCacheKey('doc', 'PDF', 'invoice', data);
const cached = await cacheService.get<string>(cacheKey);
if (!cached) {
  const result = await generateDocument();
  await cacheService.set(cacheKey, result, 3600000); // 1 hour TTL
}

// Retry Service Usage
const result = await retryService.executeWithRetry(
  async () => await s3Service.upload(buffer, path),
  { context: 'S3 upload: invoice-001.pdf', maxAttempts: 3 }
);
```

### Workflows and Sequencing

**Cache Workflow:**
1. Generate cache key using `generateCacheKey(prefix, ...parts)`
2. Check cache: `get<T>(key)`
3. If cache hit: Return cached value
4. If cache miss: Execute operation, store result with `set<T>(key, value, ttl)`
5. Return result

**Retry Workflow:**
1. Attempt 1: Execute operation immediately
2. If success: Return result
3. If failure: Wait `baseDelay * 2^(attempt-1)` milliseconds
4. Attempt 2: Retry operation
5. If success: Log success, return result
6. If failure: Wait `baseDelay * 2^(attempt-2)` milliseconds
7. Attempt 3: Final retry
8. If success: Log success, return result
9. If failure: Log final failure, throw last error

**Integration Sequence (Document Generator Example):**
1. DocumentGeneratorService.generate() called
2. Generate cache key from template + data
3. Check cache via CacheService.get()
4. If cache hit: Return cached S3 URL
5. If cache miss:
   a. Generate document via adapter
   b. Upload to S3 via RetryService.executeWithRetry()
   c. Store S3 URL in cache via CacheService.set()
   d. Return S3 URL

## Non-Functional Requirements

### Performance

- **Cache Performance:**
  - Cache hit rate target: > 70% for frequently accessed data
  - Cache key generation: < 1ms (SHA-256 hash)
  - Cache get operation: < 10ms (Redis, network latency included)
  - Cache set operation: < 15ms (Redis, network latency included)
  - Redis connection: Persistent connection pool

- **Retry Performance:**
  - Retry delay overhead: Minimal (async delay, non-blocking)
  - Max retry duration: ~3 seconds (3 attempts with exponential backoff)
  - Retry logging: Non-blocking (async logging)

- **Integration Performance:**
  - Document generation with cache: < 50ms (cache hit) vs < 5s (cache miss)
  - S3 upload with retry: Adds ~3s max delay on transient failures

**Performance Targets (NFR-1.1 alignment):**
- Cache operations should not add significant latency (< 10ms overhead)
- Retry mechanism should handle transient failures without blocking other requests
- Cache memory usage should be bounded (max items limit)

### Security

- **Cache Security:**
  - Cache keys do not expose sensitive data (hash-based)
  - Cache values may contain sensitive data (S3 URLs, user data) - application responsibility
  - Cache TTL prevents stale data exposure
  - Cache clear operation available for security incidents

- **Retry Security:**
  - Retry mechanism does not expose sensitive data in logs
  - Context strings should not contain PII (user responsibility)
  - Retry failures logged but not expose internal errors to external callers

**Security Alignment (NFR-2.3):**
- No sensitive data in cache keys (hash-based)
- Logging follows NFR-6.1 (structured logging, sensitive data exclusion)
- Error handling follows NFR-2.3 (no information leakage)

### Reliability/Availability

- **Cache Reliability:**
  - Cache miss gracefully handled (null return, no exception)
  - Cache failures do not break application (fallback to no-cache, error handling)
  - Redis store: Persistent, survives application restarts
  - Redis connection retry: Automatic reconnection on connection loss
  - Redis failover: Graceful degradation if Redis unavailable

- **Retry Reliability:**
  - Retry mechanism handles transient failures automatically
  - Final failure throws last error (no silent failures)
  - Retry logging helps diagnose persistent failures
  - Configurable retry attempts and delays for different operation types

**Reliability Alignment (NFR-3.3):**
- Error recovery via retry mechanism
- Graceful degradation: Cache miss → execute operation
- Health checks unaffected by cache/retry services

### Observability

- **Cache Observability:**
  - Cache hit/miss metrics (via logging or future metrics)
  - Cache key generation logged (debug level)
  - Cache operations logged (debug level)

- **Retry Observability:**
  - Each retry attempt logged with context (info level)
  - Retry delays logged (debug level)
  - Success on retry logged (info level)
  - Final failure logged (error level)

**Observability Alignment (NFR-6.1, NFR-6.2):**
- Structured logging via LoggerService (Epic 7.3)
- Context strings for debugging
- Error tracking via Sentry (if retry fails)
- Performance logging (cache hit/miss timing)

## Dependencies and Integrations

**NestJS Dependencies:**
- `@nestjs/cache-manager`: ^11.x (cache storage backend)
- `@nestjs/common`: ^11.x (Injectable, Inject decorators)
- `cache-manager`: ^5.x (cache store interface)
- `cache-manager-redis-store`: ^3.x (Redis store adapter)
- `ioredis`: ^5.x (Redis client)

**Node.js Built-in:**
- `crypto`: SHA-256 hash generation

**Internal Dependencies:**
- `LoggerService` (Epic 7.3): Retry logging
- `CommonModule`: Service export

**External Service Dependencies:**
- Redis server: Required for cache storage (local or remote)

**Integration Points:**
- DocumentGeneratorService (Epic 6): Cache and retry usage
- S3Service (Epic 4): Retry mechanism integration
- External API clients: Retry mechanism
- Database operations: Optional retry mechanism

## Acceptance Criteria (Authoritative)

**Story 6.5: Common Cache Service**

1. CacheService implemented at `src/common/services/cache.service.ts`
2. `generateCacheKey(prefix, ...parts)` generates consistent hash-based keys
3. `get<T>(key)` retrieves cached values with generic type support
4. `set<T>(key, value, ttl?)` stores values with optional TTL
5. `delete(key)` invalidates cache entries
6. `clear()` clears all cache entries
7. SHA-256 hash generation with recursive key sorting
8. CacheModule registered globally in AppModule with Redis store
9. Redis configuration via environment variables
10. CacheService exported from CommonModule
11. Unit tests cover all methods with > 80% coverage
12. Integration tests with Redis mock/container

**Story 6.6: Common Retry Service**

1. RetryService implemented at `src/common/services/retry.service.ts`
2. `executeWithRetry<T>(operation, options?)` executes operations with retry
3. Exponential backoff: 2^(attempt-1) * baseDelay
4. Default max attempts: 3, configurable
5. Default base delay: 1000ms, configurable
6. Context-based logging via LoggerService
7. Optional retry callback support
8. RetryService exported from CommonModule
9. Unit tests cover retry logic with > 80% coverage
10. Integration tests verify retry behavior with mock failures

**Integration Acceptance:**

1. DocumentGeneratorService uses CacheService for caching
2. DocumentGeneratorService uses RetryService for S3 upload retry
3. S3Service can use RetryService for upload operations
4. All services can import CacheService and RetryService via CommonModule
5. Cache and retry work correctly in production scenarios

## Traceability Mapping

| AC | Spec Section | Component/API | Test Idea |
|---|-------------|---------------|-----------|
| AC-6.5.1 | Services and Modules | CacheService | Unit test: Service instantiation |
| AC-6.5.2 | APIs and Interfaces | generateCacheKey() | Unit test: Key generation with various inputs |
| AC-6.5.3 | APIs and Interfaces | get<T>() | Unit test: Cache hit/miss scenarios |
| AC-6.5.4 | APIs and Interfaces | set<T>() | Unit test: Value storage with TTL |
| AC-6.5.5 | APIs and Interfaces | delete() | Unit test: Cache invalidation |
| AC-6.5.6 | APIs and Interfaces | clear() | Unit test: All cache cleared |
| AC-6.5.7 | Data Models | SHA-256 hash | Unit test: Consistent hash for same data |
| AC-6.5.8 | Dependencies | CacheModule | Integration test: Module registration |
| AC-6.5.9 | System Architecture | CommonModule export | Integration test: Service import |
| AC-6.5.10 | Test Strategy | Unit tests | Coverage report > 80% |
| AC-6.6.1 | Services and Modules | RetryService | Unit test: Service instantiation |
| AC-6.6.2 | APIs and Interfaces | executeWithRetry() | Unit test: Retry execution |
| AC-6.6.3 | Data Models | Exponential backoff | Unit test: Delay calculation |
| AC-6.6.4 | APIs and Interfaces | maxAttempts option | Unit test: Configurable attempts |
| AC-6.6.5 | APIs and Interfaces | baseDelay option | Unit test: Configurable delay |
| AC-6.6.6 | Observability | LoggerService integration | Unit test: Logging calls |
| AC-6.6.7 | APIs and Interfaces | onRetry callback | Unit test: Callback invocation |
| AC-6.6.8 | System Architecture | CommonModule export | Integration test: Service import |
| AC-6.6.9 | Test Strategy | Unit tests | Coverage report > 80% |
| AC-6.6.10 | Test Strategy | Integration tests | Mock failure scenarios |
| AC-INT.1 | Workflows | DocumentGeneratorService | Integration test: Cache usage |
| AC-INT.2 | Workflows | DocumentGeneratorService | Integration test: Retry usage |
| AC-INT.3 | Integration Points | S3Service | Integration test: Retry integration |
| AC-INT.4 | System Architecture | CommonModule | Integration test: Service availability |
| AC-INT.5 | Reliability | Production scenarios | E2E test: End-to-end cache/retry flow |

## Risks, Assumptions, Open Questions

**Risks:**

1. **Risk: Redis connection failures**
   - Impact: Cache unavailable if Redis down
   - Mitigation: Graceful fallback to no-cache, error handling, connection retry
   - Status: Acceptable, application continues without cache

2. **Risk: Cache key collisions**
   - Impact: Different data may produce same hash (low probability)
   - Mitigation: SHA-256 provides 2^256 space, prefix separation
   - Status: Low risk, monitored via logging

3. **Risk: Retry mechanism masking persistent failures**
   - Impact: Retry may delay detection of persistent issues
   - Mitigation: Logging and monitoring, configurable max attempts
   - Status: Acceptable trade-off for transient failure handling

**Assumptions:**

1. Redis server available (local development via Docker, production via managed service)
2. Default retry configuration (3 attempts, 1s base delay) suitable for most operations
3. LoggerService available (Epic 7.3 dependency)
4. Cache and retry services will be used primarily by DocumentGeneratorService initially
5. TTL-based cache expiry sufficient (no event-based invalidation needed)
6. Redis connection failures gracefully handled (fallback to no-cache)

**Open Questions:**

1. **Q: Should cache support cache tags for bulk invalidation?**
   - Answer: Not needed for MVP, can be added in Phase 2
   - Status: Deferred

2. **Q: Should retry support different strategies (linear, fixed delay)?**
   - Answer: Exponential backoff sufficient for MVP
   - Status: Deferred

3. **Q: Should cache support cache warming strategies?**
   - Answer: Not needed for MVP
   - Status: Deferred

4. **Q: Should retry support circuit breaker pattern?**
   - Answer: Not needed for MVP, can be added in Phase 2
   - Status: Deferred

## Test Strategy Summary

**Unit Tests:**

1. **CacheService Tests:**
   - Key generation with various input types
   - Cache get/set/delete/clear operations
   - TTL expiration behavior
   - Hash consistency (same data → same hash)
   - Generic type support

2. **RetryService Tests:**
   - Retry execution with success scenarios
   - Retry execution with failure scenarios
   - Exponential backoff delay calculation
   - Configurable max attempts and base delay
   - Logging calls verification
   - Callback invocation

**Integration Tests:**

1. **Cache Integration:**
   - CacheModule registration
   - CommonModule export/import
   - Cache hit/miss in DocumentGeneratorService

2. **Retry Integration:**
   - RetryService with mock failures
   - Retry logging integration
   - Retry with S3Service mock

**E2E Tests:**

1. Document generation with cache hit
2. Document generation with cache miss
3. S3 upload with retry on transient failure
4. S3 upload with retry on persistent failure

**Test Coverage Target:**
- Unit tests: > 80% coverage
- Integration tests: All integration points covered
- E2E tests: Critical user flows covered

