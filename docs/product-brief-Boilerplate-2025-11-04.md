# Product Brief: Boilerplate

**Date:** 2025-11-04
**Author:** BMad
**Context:** Enterprise

---

## Executive Summary

**Boilerplate**, şirketimizin tüm backend projelerinin omurgası olacak production-ready, enterprise-grade bir NestJS temel projesidir. Her yeni backend projesinde 1 hafta alan sıfırdan kurulum sürecini 1 güne indirerek, 9-12 developer'dan oluşan 3 takımımızın iş değeri üreten özelliklere odaklanmasını sağlayacak.

**Temel Değer Önerisi:** hrsync-backend projesinden kanıtlanmış modülleri (authentication, permissions, files, SMS, mail, document-generator, i18n) alarak, NestJS best practices ile yapılandırılmış, hem PostgreSQL hem MongoDB destekli, comprehensive test coverage'a sahip bir başlangıç noktası sunuyoruz.

**Kapsam:** 12 kategori production-ready modül ile tam donanımlı MVP - hiçbir temel özellik sonraya ertelenmiyor. Swagger documentation, Docker environment, CI/CD templates, ESLint/Prettier kuralları ve %70+ test coverage ile enterprise-ready bir çözüm.

**Organizasyonel Model:** Her proje bağımsız fork olarak yönetilecek, merkezi bir maintainer güncellemelerden sorumlu olacak. Big-bang delivery ile tüm modüller birlikte teslim edilip ilk fırsatta production kullanımına açılacak.

**Etki:** Yıllık 12+ proje × 1 hafta = 12 haftalık developer zamanı tasarrufu. Tutarlı kod kalitesi, hızlı code review, kolay takım geçişleri ve junior developer'ların Prisma ORM ile büyümesi için ideal öğrenme ortamı.

---

## Core Vision

### Problem Statement

Şirketimizde her yeni backend projesi başladığında, takımlar projeyi sıfırdan kurmak zorunda kalıyor. Authentication, permissions, logging, configuration gibi temel modüller her projede tekrar tekrar yazılıyor veya önceki projelerden kopyalanıyor. Bu süreç yaklaşık 1 hafta alıyor ve asıl iş değeri yaratan özelliklerin geliştirilmesini geciktiriyor.

Farklı takımlar benzer ama birebir aynı olmayan yapılar oluşturuyor, bu da:
- Code review süreçlerinde yapısal farklılıklardan kaynaklanan sorunlara
- Takımlar arası geçişlerde öğrenme maliyetine
- Ortak kod kalitesi ve güvenlik standartlarının uygulanmasında zorluklar yaratıyor

### Problem Impact

**Zaman Kaybı:** Her yeni proje başlangıcında ortalama 1 hafta, temel altyapının kurulumuna harcanıyor. Bu süre boyunca hiçbir iş değeri üretilmiyor.

**Ölçeksizlik:** Şirket büyüdükçe ve proje sayısı arttıkça, bu 1 haftalık maliyetler katlanarak artıyor. 10 proje = 10 hafta kayıp geliştirme zamanı.

**Kalite Tutarsızlığı:** Her takımın farklı implementasyonu, güvenlik açıkları ve hataların tüm projelere yayılma riskini artırıyor. Best practices'in otomatik olarak uygulanmaması, kod kalitesinde dalgalanmalara yol açıyor.

**Yetenek Kaybı:** Deneyimli geliştiriciler, değer yaratan özellikler yerine tekrarlayan kurulum işlerine zaman harcıyor.

### Why Existing Solutions Fall Short

**Önceki projelerden kopyalama:** Mevcut çözüm olarak kullanılan "copy-paste" yaklaşımı, eski hataları ve güncel olmayan bağımlılıkları da beraberinde getiriyor. Her kopya, orijinalden biraz daha farklı olduğu için tutarsızlık artıyor.

**Genel açık kaynak boilerplate'ler:** Genel amaçlı boilerplate'ler şirketimizin özel ihtiyaçlarını (spesifik modüller, internal standartlar, kurumsal güvenlik gereksinimleri) karşılamıyor ve yine özelleştirme gerektiriyor.

### Proposed Solution

Şirket standardı, production-ready bir NestJS boilerplate geliştireceğiz. Bu boilerplate, her yeni backend projesi için fork edilerek kullanılabilir ve dakikalar içinde çalışır hale getirilebilir bir temel sunacak.

**Temel Yaklaşım:**

**1. Esnek Database Desteği**
- Proje başlangıcında kullanıcı database seçimi yapacak (PostgreSQL veya MongoDB)
- Prisma ORM ile her iki database için hazır schema yapıları
- Database seçimine göre otomatik yapılandırma

**2. Hazır Production Modülleri** (hrsync-backend projesinden alınacak)

*Temel Infrastructure:*
- **Authentication:** JWT-based authentication sistemi (OTP desteği ile)
- **Permissions:** Module-based, role-aware yetki yönetimi sistemi (dev sync, assignment, authorization service)
- **User Management:** Temel kullanıcı CRUD ve profil yönetimi
- **Token Management:** JWT token oluşturma, refresh, validation

*Integration Modülleri:*
- **Files Module:** AWS S3 entegrasyonu ile file upload/download
- **SMS Integration:** SMS gönderimi için hazır servis
- **Mail Integration:** Email gönderimi için hazır servis yapısı
- **Document Generator:** Excel ve PDF export için hazır modül
- **Sentry Integration:** Hata takibi ve monitoring
- **Firebase:** Push notification desteği (opsiyonel)

*Developer Infrastructure:*
- **i18n:** Çoklu dil desteği altyapısı
- **Common/Shared:** Ortak utilities, decorators, guards, interceptors
- **Database:** Prisma ORM setup ve migration yönetimi

**3. Clean Architecture**
- Controller-Service pattern (Prisma ORM kullanıldığı için repository katmanı opsiyonel)
- Modül-bazlı organizasyon (her feature kendi modülü)
- Dependency injection ile loosely coupled yapı
- NestJS best practices ve design patterns

**4. Developer Experience**
- Swagger/OpenAPI otomatik dokümantasyonu (zorunlu)
- Postman collection export (opsiyonel)
- Comprehensive test setup (unit, integration, e2e)
- Environment-based configuration
- Docker compose ile local development ortamı
- CI/CD pipeline template'leri

### Key Differentiators

**Şirkete Özel:** Genel açık kaynak boilerplate'lerin aksine, şirketimizin gerçek projelerinde test edilmiş ve ihtiyaç duyduğumuz tüm modülleri içeriyor.

**Production-Ready:** Demo ya da öğretim amaçlı değil, gerçek production projelerinde kullanılabilir seviyede güvenlik, error handling, logging ve monitoring altyapısı.

**Esnek Database Seçimi:** PostgreSQL veya MongoDB seçimi ile hem relational hem NoSQL projelere tek kaynaktan başlama imkanı.

**Comprehensive Module Set:** Authentication'dan document generation'a kadar, çoğu backend projesinde ihtiyaç duyulan 8+ temel modül hazır durumda.

**Sürdürülebilir:** Copy-paste yerine merkezi bir repository - güncellemeler ve iyileştirmeler tüm yeni projelere otomatik olarak aktarılabilir.

**Test-First Mindset:** Unit, integration ve e2e test setup'ı ile baştan test edilebilir kod yazma alışkanlığını teşvik ediyor.

---

## Target Users

### Primary Users

**Backend Developer'lar (3 takım, toplam 9-12 kişi)**

**Profil:**
- Çoğunlukla junior ve mid-level developer'lar
- NestJS framework'üne hakim
- Prisma ORM konusunda henüz deneyim yok (öğrenme aşamasında)
- Takım başına 3-4 kişilik çalışma grupları

**İhtiyaçlar:**
- **Hızlı başlangıç:** Yeni bir backend projesi için 1 hafta kurulum yerine dakikalar içinde başlama
- **Öğrenme kolaylığı:** Prisma ORM ve modül yapılarını öğrenmek için iyi organize edilmiş, örnek kod
- **Tutarlılık:** Takımdan takıma geçişte veya code review'da aynı yapıyı görmek
- **Best practices:** NestJS community standartlarını takip eden, production-ready kod
- **Documentation:** Her modülün nasıl çalıştığını anlatan net dokümantasyon

**Kullanım Senaryoları:**
- **Müşteri projeleri:** Farklı müşteriler için özel backend API'lar (ayda ~1 yeni proje)
- **Kendi ürünler:** Şirket internal ürünleri için backend servisleri
- **Hepsi backend API:** Monolithic API veya REST servisleri (mikroservis değil)

**Zorlukları:**
- Prisma ORM'i ilk kez kullanacaklar - migration yönetimi, schema tasarımı gibi konularda rehberlik gerekli
- Junior developer'lar için örnek implementasyonlar ve pattern'ler kritik
- Farklı takımların farklı yaklaşımlar geliştirmesini önlemek

---

## Success Metrics

### Business Objectives

**Zaman Tasarrufu:** Yeni proje başlangıç süresini 1 haftadan 1 iş gününe (veya daha az) düşürmek.

**Standardizasyon:** Şirket genelinde tutarlı kod kalitesi ve yapı sağlamak, takımlar arası geçişleri kolaylaştırmak.

**Ölçeklenebilirlik:** Artan proje sayısı ile kurulum maliyetinin orantısız artmamasını sağlamak.

**Kalite Artışı:** Production-ready modüller ile güvenlik ve stabilite sorunlarını minimize etmek.

### Key Performance Indicators

**Zaman Metrikleri:**
- **Proje başlangıç süresi:** 1 hafta → 1 gün (85% azalma)
- **İlk deployment süresi:** Fork'tan production'a kadar geçen toplam süre
- **Onboarding süresi:** Yeni developer'ın boilerplate ile çalışmaya başlama süresi

**Adoption Metrikleri:**
- **Kullanım oranı:** Yeni projelerin %100'ü bu boilerplate'i kullanmalı (copy-paste değil, fork)
- **Aktif proje sayısı:** Boilerplate'ten türetilmiş kaç production projesi var
- **Proje başlangıç sıklığı:** Ayda ~1 yeni fork

**Kalite Metrikleri:**
- **Code review süresi:** Yapısal tartışmalar yerine iş mantığına odaklanma
- **Bug/security issue oranı:** Temel modüllerde (auth, permissions) sıfır kritik hata
- **Test coverage hedefi:** Minimum %70 coverage (unit + integration + e2e)
- **Code consistency score:** Farklı projelerde aynı pattern'lerin kullanılması

**Developer Experience:**
- **Learning curve:** Yeni developer 2-3 gün içinde boilerplate'i kavrayıp geliştirme yapabilmeli
- **Developer satisfaction:** Quarterly feedback survey'de 4/5+ memnuniyet skoru
- **Documentation usage:** Her modül için README ve örnek kullanım dokümantasyonu erişimi

**Sürdürülebilirlik:**
- **Güncellik:** Dependencies her quarter güncellenmeli
- **Maintenance cost:** Boilerplate'in kendisi için ayrılan developer-hour
- **Backward compatibility:** Mevcut projelerin yeni güncellemeleri kolayca alabilmesi

---

## MVP Scope

### Core Features

**MVP, production-ready, tam kapsamlı boilerplate - hiçbir temel modül sonraya kalmayacak.**

**1. Database Infrastructure**
- PostgreSQL ve MongoDB için Prisma schema yapıları
- Proje başlangıç script'i ile database seçimi
- Migration yönetimi ve seed data
- Database connection pooling ve configuration

**2. Authentication & Authorization**
- JWT-based authentication sistemi
- OTP doğrulama entegrasyonu
- Token management (access + refresh tokens)
- Session yönetimi
- Password reset flow
- Email verification

**3. User & Permissions Management**
- User CRUD operations
- Profile management
- Module-based permission system (hrsync-backend pattern)
- Role-based access control (RBAC)
- Permission assignment ve authorization service
- Dev permission sync (development ortamı için)

**4. File Management**
- AWS S3 entegrasyonu
- File upload/download
- Multiple file types desteği
- File validation ve security

**5. Communication Modules**
- SMS integration - SMS gönderimi servisi
- Mail integration - Email template'leri ve gönderim
- Notification infrastructure

**6. Document Generation**
- Excel export (xlsx)
- PDF generation
- Template-based document creation

**7. Developer Infrastructure**
- i18n - Çoklu dil desteği (multi-language)
- Common/Shared utilities (decorators, guards, interceptors, pipes)
- Error handling ve exception filters
- Logging infrastructure (structured logging)
- Sentry integration - Error tracking ve monitoring
- Firebase integration - Push notifications (optional)

**8. API Documentation**
- Swagger/OpenAPI otomatik dokümantasyonu
- API endpoint'leri için detaylı açıklamalar
- Request/Response DTO documentation
- Authentication flow documentation

**9. Testing Infrastructure**
- Jest test framework setup
- Unit test örnekleri (her modül için)
- Integration test setup
- E2E test infrastructure
- Test coverage reporting (%70+ hedef)
- Mock factories ve test utilities

**10. Development Environment**
- Docker Compose ile local environment
- Environment-based configuration (.env management)
- Hot reload support
- Development vs Production configurations
- Database seed scripts

**11. CI/CD Templates**
- GitHub Actions veya GitLab CI template'leri
- Automated testing pipeline
- Build ve deployment scripts
- Environment-specific deployment

**12. Code Quality**
- ESLint configuration (NestJS best practices)
- Prettier setup
- Husky pre-commit hooks
- TypeScript strict mode
- Code organization patterns

### MVP Success Criteria

MVP başarılı kabul edilecek kriterleri:

✅ **Fonksiyonel Completeness:**
- Tüm 12 core feature kategorisi tam olarak implement edilmiş
- Her modül production-ready seviyede (error handling, logging, tests)
- hrsync-backend'den alınan modüller başarıyla entegre edilmiş

✅ **Documentation:**
- Her modül için README ve kullanım örnekleri
- Swagger API documentation otomatik oluşuyor
- Proje başlangıç kılavuzu (Quick Start Guide)
- Architecture decision records (ADR)

✅ **Quality Gates:**
- %70+ test coverage (unit + integration + e2e)
- Tüm tests geçiyor
- ESLint/Prettier kuralları uygulanıyor
- TypeScript strict mode hatasız derleniyor

✅ **Developer Experience:**
- Fork + setup süresi < 1 saat
- Docker compose ile tek komutla local environment ayağa kalkıyor
- Database migration'lar hatasız çalışıyor
- Örnek seed data ile demo yapılabiliyor

✅ **Production Readiness:**
- Environment-based configuration çalışıyor
- Error handling ve logging production-ready
- Security best practices uygulanmış (JWT, CORS, helmet, rate limiting basics)
- CI/CD pipeline template test edilmiş

### Future Vision

**Phase 2 - Advanced Features:**

**Performance & Scalability:**
- **Caching Strategies:** Redis entegrasyonu, cache invalidation patterns
- **Rate Limiting:** Request throttling, user-based ve IP-based limiting
- **API Versioning:** URI-based veya header-based versioning support
- **Postman Collection Export:** Swagger'dan otomatik Postman collection generation

**Advanced Infrastructure:**
- Queue system (Bull/BullMQ) - Background job processing
- WebSocket support - Real-time communication
- Event-driven architecture patterns
- Database read replicas configuration
- Horizontal scaling guide

**Monitoring & Observability:**
- Advanced metrics (Prometheus/Grafana)
- APM (Application Performance Monitoring)
- Health check endpoints
- Performance profiling tools

**Phase 3 - Platform Expansion:**
- **GraphQL Support:** GraphQL API layer (REST'in yanında)
- Microservices template (monorepo veya multi-repo)
- Message broker integration (RabbitMQ/Kafka)
- Multi-tenancy support
- Advanced permission system (attribute-based access control)

## Technical Preferences

**Framework & Language:**
- NestJS (latest stable version)
- TypeScript (strict mode)
- Node.js LTS version

**Database & ORM:**
- Prisma ORM (team öğrenecek, öğrenme eğrisi kabul edilebilir)
- PostgreSQL (primary choice)
- MongoDB (alternative choice)
- Database seçimi: Proje başlangıcında kullanıcı seçimi

**Architecture Pattern:**
- Controller-Service pattern
- Module-based organization (NestJS modules)
- Repository pattern optional (Prisma direkt kullanılabilir)

**Testing:**
- Jest framework
- Unit + Integration + E2E test layers
- %70+ coverage target

**DevOps:**
- Docker & Docker Compose
- GitHub Actions veya GitLab CI
- Environment-based configuration

**Reference Project:**
- hrsync-backend: Modül yapıları için referans (sadece başlangıçta)
- Boilerplate oluşturulduktan sonra bağımsız gelişecek

---

## Organizational Context

**Project Ownership:**
- **Sahiplik:** Şirket yönetim takımı
- **Maintenance:** Dedicated maintainer (tek kişi sorumlu)
- **Contribution Model:** İlk versiyon tamamlandıktan sonra açık kullanıma hazır

**Fork & Independence Model:**
- Her proje boilerplate'i fork edecek
- **Her fork tamamen bağımsız** - merkezi güncellemeler otomatik yansımayacak
- Takımlar kendi fork'larını ihtiyaçlarına göre özelleştirebilir
- Boilerplate'teki iyileştirmeler yeni projelere aktarılır (mevcut projelere değil)

**Code Review Process:**
- Her takım kendi fork'u için internal code review yapacak
- Boilerplate'in kendisi için: Maintainer approval gerekli
- Yeni modül ekleme: Yönetim takımı kararı

**Deployment Strategy:**
- **Release Model:** Big-bang - tüm modüller birlikte teslim
- **İlk kullanım:** Tamamlanır tamamlanmaz ilk fırsatta production kullanımına açılacak
- **Rollout:** Yeni projeler boilerplate ile başlayacak

**Knowledge Transfer:**
- Prisma ORM: Team on-the-job öğrenecek
- NestJS best practices: Kod örnekleri ve documentation ile öğretilecek
- Boilerplate kullanımı: Quick Start Guide ve README'ler

---

## Risks and Assumptions

### Assumptions

✓ **Learning Capacity:** Takımlar Prisma ORM'i proje üzerinde çalışarak öğrenebilir (formal eğitim gerekli değil)

✓ **Reference Stability:** hrsync-backend projesindeki modüller boilerplate'e adapte edilebilir durumda

✓ **Fork Independence:** Her projenin bağımsız olması kabul edilebilir (merkezi güncelleme ihtiyacı yok)

✓ **Maintenance Bandwidth:** Tek maintainer boilerplate'i güncel ve stabil tutabilir

✓ **Initial Scope:** MVP'deki tüm 12 kategori zamanında tamamlanabilir

✓ **No Migration Need:** Mevcut projeler eski yapılarında kalmaya devam edebilir

### Risks & Mitigation

**🔴 HIGH RISK: Prisma Learning Curve**
- **Risk:** Junior/mid developer'lar Prisma migration, schema design, ilişkiler konusunda zorlanabilir
- **Mitigation:**
  - Comprehensive documentation ve examples
  - hrsync-backend'den gerçek dünya örnekleri
  - Common patterns için ready-to-use schemas
  - Migration guide ve troubleshooting docs

**🟡 MEDIUM RISK: Maintenance Burden**
- **Risk:** Tek maintainer dependency updates, bug fixes, security patches konusunda yoğun iş yükü
- **Mitigation:**
  - Automated dependency updates (Dependabot)
  - Comprehensive test coverage (%70+) breaking changes'i hızlı tespit için
  - Clear contribution guidelines future support için

**🟡 MEDIUM RISK: Scope Creep**
- **Risk:** 12 kategorideki tüm özellikleri quality'den ödün vermeden teslim etmek zor
- **Mitigation:**
  - hrsync-backend'den mevcut kod kullanarak accelerate
  - Clear MVP success criteria ile focus
  - "Done is better than perfect" yaklaşımı (iterate edilebilir)

**🟡 MEDIUM RISK: Fork Divergence**
- **Risk:** Zamanla her fork farklı yönlere gidip consistency kaybolabilir
- **Mitigation:**
  - ESLint/Prettier enforcement
  - Clear architecture documentation
  - Quarterly sync meetings - best practices paylaşımı
  - Major improvements'i boilerplate'e geri besleme teşviki

**🟢 LOW RISK: hrsync-backend Dependency**
- **Risk:** hrsync-backend'deki değişiklikler boilerplate'i etkileyebilir
- **Mitigation:** Sadece initial copy - sonrasında bağımsız (düşük risk)

**🟢 LOW RISK: Technology Changes**
- **Risk:** NestJS/Prisma major breaking changes
- **Mitigation:** LTS versions kullanımı, gradual upgrade strategy

### Open Questions

- İlk production kullanımı için target tarih nedir?
- Quarterly dependency updates schedule'ı kim define edecek?
- Takımlar arası best practice sharing process'i nasıl olacak?
- Critical bug'lar için hotfix process'i nasıl işleyecek?

---

## Timeline

**Delivery Approach:** Big-bang release - tüm modüller birlikte teslim

**Target:** İlk fırsatta production kullanımına açılacak

**Rollout Plan:**
1. **MVP Complete:** Tüm 12 core feature kategorisi implement edilmiş
2. **Internal Testing:** Quality gates ve success criteria validation
3. **Documentation Complete:** README, guides, examples hazır
4. **Go-Live:** Yeni projeler boilerplate ile başlayabilir
5. **First Production Project:** İlk gerçek proje boilerplate ile deploy

**Maintenance Cycle:**
- **Quarterly:** Dependency updates
- **As-needed:** Bug fixes, security patches
- **Continuous:** Documentation improvements

## Supporting Materials

**Reference Project: hrsync-backend**

Bu product brief, şirketin mevcut production projesi olan hrsync-backend'den yararlanarak oluşturulmuştur. Aşağıdaki modüller incelenmiş ve boilerplate'e adapte edilmek üzere belirlenmiştir:

**Alınacak Modüller:**
- `/src/auth` - JWT authentication sistemi
- `/src/permissions` - Module-based permission system (entities, repositories, authorization service, dev-sync)
- `/src/user` - User management
- `/src/tokens` - Token yönetimi
- `/src/files` - S3 file management
- `/src/sms` - SMS integration
- `/src/document-generator` - Excel/PDF generation
- `/src/i18n` - Internationalization
- `/src/common` & `/src/shared` - Shared utilities
- `/src/database` - Prisma setup ve configuration
- `/src/firebase` - Push notification (optional)
- `/src/otp` - OTP verification

**Not:** hrsync-backend sadece başlangıç referansı olarak kullanılacak. Boilerplate oluşturulduktan sonra tamamen bağımsız gelişecek ve hrsync-backend'deki değişiklikler otomatik olarak yansıtılmayacak.

---

_This Product Brief captures the vision and requirements for Boilerplate._

_It was created through collaborative discovery and reflects the unique needs of this Enterprise project._

_Next: PRD workflow will transform this brief into detailed planning artifacts._
