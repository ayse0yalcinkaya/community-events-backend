# Community Events Backend

NestJS tabanli backend baslangic projesi. Bu repo, etkinlik ve topluluk odakli bir urunun API altyapisini hizli baslatmak icin hazirlandi.

## Teknolojiler

- NestJS
- TypeScript
- Prisma
- PostgreSQL
- Redis
- Swagger (`/api/docs`)

## Hizli Baslangic

```bash
npm install
cp .env.example .env
```

`.env` icinde en az su alanlari guncelle:

- `DATABASE_URL`
- `JWT_SECRET`
- `AES_SECRET_KEY`
- `CHAT_ENCRYPTION_KEY`

Ardindan uygulamayi baslat:

```bash
npm run dev
```

## Varsayilan Gelistirme Ayarlari

- API: `http://localhost:3000`
- Swagger: `http://localhost:3000/api/docs`
- PostgreSQL veritabani adi: `community_events`
- Test veritabani adi: `community_events_test`

## Test Ortami

Yerel integration ve e2e testleri icin:

```bash
cp .env.test.example .env.test
```

Sonra test veritabanini hazirlayip testleri calistir:

```bash
npm test
```

## Seed

Ornek admin kullanicisi:

- `admin@communityevents.local`
- `Admin123!`

Seed calistirmak icin:

```bash
npm run prisma:seed
```

## Docker

Production image almak icin:

```bash
npm run docker:build:prod
```

Container calistirmak icin:

```bash
npm run docker:run:prod
```
