# Wireframe Backend Roadmap

## Amac

Bu dokuman, wireframe'deki 10 ana ekranin backend ihtiyaclarini mevcut kod tabani ile karsilastirir ve uygulama sirasini netlestirir.

## Mevcut Durum Ozeti

Bu projede temelde guclu bir iskelet zaten var:

- Auth, role/permission, file upload, notification, chat, i18n, logging altyapisi hazir.
- Kategori, ilgi alani, topluluk, etkinlik, katilim, bookmark ve kesif tarafinda anlamli bir temel var.
- Etkinlik yaratma akisinin temel adimlari parcalara ayrilmis durumda.
- Speaker, sponsor, gallery ve ticket icin schema/controller/service seviyesi calisma baslamis.

Onemli teknik notlar:

- `src/app.module.ts` icinde `SpeakersModule` import edilmis ama `imports` listesine eklenmemis.
- `SponsorsModule` ve `TicketsModule` `app.module.ts` icinde henuz aktif degil.
- `speakers`, `sponsors`, `tickets` servisleri event bazli yetki dogrulamasi yapmiyor; controller guard'i var ama servis seviyesinde ownership/manage access kontrolu eksik.
- Takvim, network/matching, odeme/satin alma, blog ve fuar taraflari backend olarak henuz yok.

## Ekran Bazli Analiz

### 1. Ana Sayfa

Mevcut:

- `GET /discover/home` ile one cikan etkinlikler, yaklasan etkinlikler, populer kategoriler ve topluluk ozetleri var.
- `GET /discover/search` ve `GET /events` ile etkinlik arama/listeleme var.

Eksik:

- Tek endpoint uzerinden etkinlik + topluluk + kisi + kategori aramasi yok.
- "Yaklasan Etkinlikler", "Katilacaklarim", "Kaydettiklerim" icin home'a uygun toplu quick-access endpoint yok.
- Sehir secimine gore kisisellestirilmis home feed yok.
- Bildirim kutularindaki event reminder / suggestion / community update mantigi domain bazli degil.

### 2. Kategoriler

Mevcut:

- `GET /categories/tree`
- `GET /categories/:slug`
- `GET /interests`

Eksik:

- Kategori detayinda ilgili etkinlikler, topluluklar ve kisiler icin aggregate endpoint yok.
- Alt kategori bazli filtreli kesif akisina ozel endpoint yok.

### 3. Etkinlik Olusturma

Mevcut:

- Draft olusturma var.
- Temel bilgi, tarih/saat, konum, detay, medya ve publish endpoint'leri var.
- Event response DTO'su speaker, sponsor, gallery ve ticket alanlarini donmeye hazir.
- Taslak mantigi `EventStatus.DRAFT` ile var.

Eksik veya tamamlanmamis:

- `SpeakersModule`, `SponsorsModule`, `TicketsModule` uygulamaya tam bagli degil.
- Bu uc modulde servis seviyesi yetki kontrolu eksik.
- Event gallery sadece `events.controller.ts` icinde var; dosya sahipligi ve event ownership daha sikilastirilmali.
- Event preview icin frontend'in kullanacagi acik bir "preview summary" veya "wizard completeness" endpoint'i yok.
- Katilim secenekleri var ama approval workflow yonetimi yok: pending listesi, approve/reject, waitlist, capacity handling.

### 4. Etkinlik Sayfasi

Mevcut:

- Public event detail var: `GET /events/:slug`
- Attend, leave, bookmark, attendance visibility endpoint'leri var.
- Session, location, speaker, sponsor, gallery, ticket alanlari modelde mevcut.

Eksik:

- Program/agenda daha detayli degil; session bazli baslik/aciklama/konusmaci baglantisi yok.
- Katilimci listesi ve gorunurluk filtreleme endpoint'i yok.
- Organizer icin attendee management endpoint'leri yok.
- "Takvime ekle" icin ICS/export endpoint'i yok.
- Benzer etkinlikler ve event-page recommendation endpoint'i yok.

### 5. Profil Sistemi

Mevcut:

- `GET /users/me`
- `PATCH /users/me`
- `GET /users/me/bookmarks`
- `GET /users/me/attendances`
- `GET /users/me/communities`
- User interest set/get altyapisi var.

Eksik:

- Public profile deneyimi wireframe seviyesinde degil.
- Profil sekmelerini tek response'ta toparlayan endpoint yok.
- Kullanici baglantilari, takip edilen kisiler, profil uzerinden network onerileri yok.
- Ilk kayit akisi icin "3 ilgi alani secimi"ni zorlayan onboarding endpoint'i yok.

### 6. Network ve Eslesme

Mevcut:

- Prisma tarafinda `UserConnection` modeli var.
- Chat altyapisi var.

Eksik:

- `connections` veya `network` modulu yok.
- Baglanti istegi gonder/kabul/ret/listele endpoint'leri yok.
- Event bazli "bu etkinlikte tanisman gerekenler" recommendation mantigi yok.
- Mentor/danisman eslestirme kurallari yok.

### 7. Topluluk Sayfasi

Mevcut:

- Topluluk create/list/detail/update/join/leave var.
- `members` ve `events` endpoint'leri var.

Eksik:

- Topluluk duyurulari topluluk sayfasina bagli degil.
- Topluluk galerisi yok.
- Topluluk rollerini yonetme endpoint'leri yok.
- Topluluk tab bazli ozet endpoint'i yok.

### 8. Takvim Gorunumu

Mevcut:

- Event session verisi var.

Eksik:

- Takvim modulu yok.
- Ay/hafta/gun bazli grouped event feed yok.
- Kullanicinin kendi katildigi/kaydettigi etkinlikler icin takvim endpoint'i yok.
- Google/Apple/ICS export yok.

### 9. Bildirimler

Mevcut:

- Notification history, read/unread, preference, device token altyapisi var.

Eksik:

- Notification type'lari hala generic: `VERIFICATION`, `PASSWORD_RESET`, `OTP`, `GENERAL`, `ALERT`, `MARKETING`.
- Wireframe'deki `etkinlik hatirlatma`, `yeni etkinlik onerisi`, `topluluk duyurusu` gibi domain type'lari yok.
- Scheduled reminder job'lari yok.
- "Bana uygun etkinlik" recommendation notification akisi yok.

### 10. Ileride Para Kazanma

Mevcut:

- Ticket modeli ve `EventTicketPurchase` schema seviyesi hazir.
- Document generator altyapisi fatura/rapor icin ise yarayabilir.

Eksik:

- Ticket purchase API yok.
- Checkout/odeme entegrasyonu yok.
- Refund/cancel/sales reporting akisi yok.
- Kurumsal paketleme, sponsor placement, premium uyelik gibi ticari domainler yok.

## Onceliklendirilmis Yol Haritasi

### Faz 0: Stabilizasyon ve Wiring

Hedef: mevcut yazilan parcali isi gercekten calisir hale getirmek.

- `SpeakersModule`, `SponsorsModule`, `TicketsModule`'u `AppModule`'e ekle.
- Bu moduller icin e2e seviyesinde route smoke test ekle.
- Speaker/sponsor/ticket servislerine event manage access kontrolu ekle.
- Event gallery endpoint'lerinde file ownership + event ownership validation ekle.
- `EventResDto` ve ilgili mapper'lar icin regresyon testleri ekle.

### Faz 1: Event Creation MVP'yi Bitir

Hedef: wireframe'deki etkinlik olusturma akisini backend olarak gercekten tamamlamak.

- Wizard step'lerinin tumunu backend contract olarak sabitle.
- Speaker, sponsor, ticket, gallery CRUD'larini production-ready hale getir.
- Organizer dashboard'u event completeness bilgisiyle zenginlestir.
- Publish validation'a bilet/kapasite/konum/oturum kurallari ekle.
- Attendee approval endpoints ekle: pending list, approve, reject, waitlist.

### Faz 2: Event Detail ve User Utility

Hedef: wireframe'deki etkinlik sayfasi ve kullanici hizli aksiyonlarini kapatmak.

- Event attendees endpoint'i ekle.
- Similar events / recommended events endpoint'i ekle.
- `Takvime ekle` icin `.ics` export endpoint'i ekle.
- `users/me/dashboard` benzeri tek endpoint ile bookmarks, attendances, upcoming events ozetini sun.

### Faz 3: Discovery 2.0

Hedef: ana sayfa ve kategori deneyimini guclendirmek.

- Unified search endpoint: events + communities + users + categories.
- Sehir, ilgi alani ve gecmis katilima gore personalized discover feed.
- Category detail aggregate endpoint.
- Popular/trending mantigini cron veya materialized summary ile destekle.

### Faz 4: Community ve Network

Hedef: sosyal graph tarafini acmak.

- Community announcement endpoints.
- Community role management.
- Connection module: send/request/accept/reject/list.
- Event-based people recommendation.
- Chat ile connection state arasinda entegrasyon.

### Faz 5: Calendar ve Notification Domain

Hedef: retention ozelliklerini eklemek.

- Calendar module.
- `users/me/calendar` ve `events/:id/calendar.ics`
- Domain-specific notification types ekle.
- Scheduled reminder jobs.
- Community announcement broadcast akisi.

### Faz 6: Monetization Hazirligi

Hedef: gelir getirecek event commerce temelini kurmak.

- Ticket purchase API.
- Payment provider abstraction.
- Order/purchase lifecycle.
- Invoice/receipt generation.
- Organizer sales dashboard.

## API Backlog Onerisi

Ilk sprintlerde acil gerekli endpoint'ler:

- `POST /events/:eventId/speakers`
- `POST /events/:eventId/sponsors`
- `POST /events/:eventId/tickets`
- `GET /events/:slug/attendees`
- `PATCH /events/:id/attendances/:attendanceId/approve`
- `PATCH /events/:id/attendances/:attendanceId/reject`
- `GET /discover/search/all`
- `GET /users/me/dashboard`
- `GET /calendar/me`
- `GET /events/:id/calendar.ics`
- `POST /connections/:userId/request`
- `PATCH /connections/:id/accept`
- `PATCH /connections/:id/reject`

## Onerilen Ilk 2 Hafta Plani

1. `Faz 0` islerini bitir.
2. Event creation alt modullerini aktiflestir ve testlerini yaz.
3. Approval workflow endpoint'lerini ekle.
4. `users/me/dashboard` ve `events/:id/calendar.ics` endpoint'lerini cikar.
5. Sonra unified search ve network module'una gec.

## Net Sonuc

Wireframe'in backend tarafinda en hizli deger ureten sira su:

1. Mevcut event altyapisini tamamla.
2. Organizer ve attendee akislarini kapat.
3. Discovery ve profile dashboard'u tekilleştir.
4. Sonra community/network/calendar tarafina gec.
5. Monetization'i en sona, ticket purchase gercek ihtiyac oldugunda al.
