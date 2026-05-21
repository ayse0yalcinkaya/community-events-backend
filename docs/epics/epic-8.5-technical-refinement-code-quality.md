# Epic 8.5: Technical Refinement & Code Quality

**Goal:** Teknik borçları temizleyerek kod kalitesini artırma, standartları ve best practice'leri uygulama

**Value Proposition:** Temiz, bakımı kolay, tutarlı kod yapısı; geliştiricilerin hızlı ve güvenli ilerlemesini sağlayan foundation

**Prerequisites:** Epic 1-8 (Mevcut codebase ve infrastructure)

**Technical Stack:**
- NestJS Base Classes & DTOs
- Custom Decorators
- Global Interceptors
- i18n
- Winston Logger

---

## Story 8.5-1: Code Organization, Standards & Base Architecture

**As a** developer,
**I want** organize edilmiş import'lar ve base class/DTO architecture,
**So that** kod tutarlı, maintainable ve DRY olsun.

**Acceptance Criteria:**
1. **Import Organization - Tüm dosyalarda grup bazlı import yapısı:**
   ```typescript
   // Libraries (external dependencies)
   import { Controller, Get } from '@nestjs/common';

   // DTOs
   import { UserResDto } from './dto/user-res.dto';

   // Services
   import { AuthService } from './auth.service';

   // Guards/Decorators
   import { JwtAuthGuard } from '@/common/guards';

   // Interfaces/Types
   import type { JwtPayload } from './interfaces';
   ```

2. **Base DTOs oluşturulmuş:**
   - `BaseDto` - Temel DTO özellikleri
   - `BaseQueryDto` - Pagination, sorting, filtering (PageOptionsDto benzeri)
   - `BaseResponseDto` - Standart response formatı
   - `BaseIdDto` - ID gerektiren operasyonlar
   - `BaseTimestampDto` - createdAt, updatedAt gibi alanlar

3. **Base Entities oluşturulmuş:**
   - `BaseEntity` - id, createdAt, updatedAt, deletedAt (soft delete)
   - `BaseAuditEntity` - createdBy, updatedBy gibi audit alanları

4. **Base Query/Filter Classes:**
   - `BasePaginationDto` - sayfalama
   - `BaseSortDto` - sıralama
   - `BaseFilterDto` - filtreleme

5. **Base Response Classes:**
   - `BaseSuccessResponse` - başarılı response'lar için
   - `BaseErrorResponse` - hata response'ları için
   - `BasePaginatedResponse` - paginated response'lar için

6. **Mevcut DTOs ve Entities base class'ları extend ediyor:**
   - Tekrar eden kod (createdAt, updatedAt, vb.) kaldırılmış
   - Tüm entities BaseEntity veya BaseAuditEntity extend ediyor
   - Tüm query DTOs BaseQueryDto extend ediyor

7. **Guards Controller seviyesine taşınmış:**
   - `@UseGuards(JwtAuthGuard, PermissionsGuard)` controller class üstünde
   - Endpoint seviyesinde sadece override gerekiyorsa guard kullanılıyor
   - Public endpoints `@Public()` decorator kullanıyor

8. **Import organization tüm dosyalarda uygulanmış:**
   - Controllers
   - Services
   - DTOs
   - Modules
   - Guards
   - Decorators

**Technical Notes:**
- Base class'lar `src/common/base/` altında organize edilmeli
- Generic type support eklenecek: `BaseResponseDto<T>`
- Tüm validation decorators base class'larda tanımlı
- @ApiProperty() decorators base class'larda mevcut
- Migration oluşturulması gerekmez (schema değişikliği yok)

**Dependencies:** None (refactoring story)

---

## Story 8.5-2: API Documentation & Response Standardization

**As a** developer,
**I want** ApiEndpoint decorator'ın geliştirilmesi ve global response interceptor,
**So that** API documentation tutarlı ve response'lar standart formatta olsun.

**Acceptance Criteria:**
1. **ApiEndpoint decorator geliştirilmiş (`src/common/decorators/api-endpoint.decorator.ts`):**
   - ApiBody entegrasyonu eklendi
   - Şu parametreleri destekliyor:
     ```typescript
     interface ApiEndpointOptions {
       summary: string;
       type?: Type<any>;
       status?: number;
       consumes?: string; // 'application/json' | 'multipart/form-data'
       bodySchema?: SchemaObject; // ApiBody için schema
       isArray?: boolean;
       isPaginated?: boolean;
     }
     ```
   - File upload için özel destek:
     ```typescript
     @ApiEndpoint('Dosya yükle', {
       type: FileResDto,
       consumes: 'multipart/form-data',
       status: 201,
       bodySchema: {
         type: 'object',
         properties: {
           files: {
             type: 'array',
             items: { type: 'string', format: 'binary' }
           }
         }
       }
     })
     ```

2. **ApiCrud decorator geliştirilmiş (`src/common/decorators/api-crud.decorator.ts`):**
   - CRUD operasyonları için body schema desteği eklendi
   - File upload senaryolarını destekliyor

3. **Tüm controller'larda ApiBody kaldırılmış:**
   - ApiEndpoint veya ApiCrud kullanılıyor
   - Özellikle file upload endpoint'lerinde ApiBody yerine ApiEndpoint bodySchema parametresi kullanılıyor

4. **Global Response Interceptor oluşturulmuş:**
   - `src/common/interceptors/transform-response.interceptor.ts`
   - Tüm success response'ları şu formata çeviriyor:
     ```typescript
     {
       success: true,
       status: 200,
       data: <actual-data>,
       message: string
     }
     ```
   - Paginated response'lar için:
     ```typescript
     {
       success: true,
       status: 200,
       data: <array>,
       count: number,
       message: string
     }
     ```
   - Error response'lar için:
     ```typescript
     {
       success: false,
       status: 4xx/5xx,
       message: string,
       errors?: array
     }
     ```

5. **Global Interceptor app'e register edilmiş:**
   - `main.ts` veya `app.module.ts` içinde
   - `app.useGlobalInterceptors(new TransformResponseInterceptor())`

6. **Mevcut controller'lar güncellendi:**
   - Manual response wrapping kaldırıldı
   - Service'ler direkt data dönüyor
   - Interceptor otomatik wrapping yapıyor

**Technical Notes:**
- Interceptor i18n ile entegre olmalı (message translate edilmeli)
- Exception filters ile uyumlu çalışmalı
- Swagger documentation otomatik güncellenmeli
- Response type detection (array, paginated, single) otomatik

**Dependencies:** Story 8.5-1 (BaseResponseDto)

---

## Story 8.5-3: Internationalization & Logging

**As a** developer,
**I want** tüm servis ve controller'larda i18n ve logger kullanımı,
**So that** multi-language support tam olsun ve console.log kullanılmasın.

**Acceptance Criteria:**
1. **Tüm Services i18n kullanıyor:**
   - Constructor'da `I18nService` inject edilmiş
   - Hata mesajları i18n ile translate ediliyor:
     ```typescript
     throw new BadRequestException(
       this.i18n.t('errors.USER_NOT_FOUND')
     );
     ```
   - Success mesajları i18n ile translate ediliyor

2. **Tüm Controllers i18n kullanıyor:**
   - Response message'lar i18n ile translate ediliyor
   - Validation error mesajları translate ediliyor

3. **i18n translation dosyaları güncellendi:**
   - `src/i18n/tr/` - Türkçe translation'lar
   - `src/i18n/en/` - İngilizce translation'lar
   - Tüm hata kodları ve mesajlar tanımlı:
     - `errors.json` - Hata mesajları
     - `success.json` - Başarı mesajları
     - `validation.json` - Validasyon mesajları

4. **Console.log'lar Logger service'e dönüştürüldü:**
   - `console.log` → `this.logger.log`
   - `console.error` → `this.logger.error`
   - `console.warn` → `this.logger.warn`
   - `console.debug` → `this.logger.debug`

5. **Logger Service tüm dosyalarda kullanılıyor:**
   - Services
   - Controllers
   - Guards
   - Interceptors
   - Middleware
   - Exception Filters

6. **Logger context eklendi:**
   ```typescript
   constructor(
     private readonly logger: Logger = new Logger(ServiceName.name)
   ) {}
   ```

7. **Hiçbir console.log kalmadı:**
   - Code review yapılarak tüm console.*  kullanımları temizlendi
   - Sadece main.ts bootstrap'ta sistem mesajları için console.log kullanılabilir

**Technical Notes:**
- i18n Epic 7.1'de kurulmuş, burada tam entegrasyon yapılacak
- Logger Epic 7.3'te kurulmuş, burada tam entegrasyon yapılacak
- Translation key'ler organized olmalı (errors., success., validation.)
- AcceptLanguage header'dan dil algılanıyor

**Dependencies:** Epic 7.1, 7.3 (i18n ve Logger infrastructure)

---

## Story 8.5-4: Test Fixes

**As a** developer,
**I want** failing testlerin düzeltilmesi,
**So that** npm run test ve test:e2e başarılı olsun.

**Acceptance Criteria:**
1. **npm run test çalıştırıldığında:**
   - Tüm unit testler pass oluyor
   - Hiçbir test fail etmiyor
   - Coverage raporu başarıyla oluşuyor

2. **npm run test:e2e çalıştırıldığında:**
   - Tüm e2e testler pass oluyor
   - Hiçbir test fail etmiyor
   - Test database bağlantısı çalışıyor

3. **Test hatalarının root cause'ları çözüldü:**
   - Import errors düzeltildi
   - Mock'lar güncellendi (yeni base class'lar için)
   - Database connection issues çözüldü
   - Deprecated API'lar güncellendi

4. **Test dosyaları refactoring ile uyumlu:**
   - Base class değişiklikleri test'lere yansıtıldı
   - Response format değişiklikleri test'lere yansıtıldı
   - New interceptor test'lerde mock'landı

5. **Test configuration doğru:**
   - jest.config.js güncel
   - test.env file'ı varsa güncel
   - Test database configuration çalışıyor

6. **CI pipeline için hazır:**
   - Test'ler isolated çalışıyor
   - No flaky tests
   - Parallel execution destekliyor

**Technical Notes:**
- Mock'lar güncellenmeli (BaseEntity, i18n, Logger için)
- Test database'de migration'lar çalışmalı
- E2E testler actual HTTP requests kullanmalı
- Test coverage düşmemeli

**Dependencies:** Story 8.5-1, 8.5-2, 8.5-3 (refactoring'ler tamamlanmalı)

---
