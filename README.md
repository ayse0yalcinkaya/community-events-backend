# Community Events Backend

Community Events urunu icin NestJS tabanli backend API.

## Stack

- NestJS
- TypeScript
- Prisma
- PostgreSQL
- Redis
- Swagger

## Quick Start

```bash
npm install
cp .env.example .env
cp .env.test.example .env.test
```

En az su alanlari guncellenmeli:

- `DATABASE_URL`
- `JWT_SECRET`
- `AES_SECRET_KEY`
- `CHAT_ENCRYPTION_KEY`

Gelistirme ortamini baslat:

```bash
npm run dev
```

## Local URLs

- API: `http://localhost:3000`
- Swagger: `http://localhost:3000/api/docs`
- PostgreSQL: `community_events`
- Test database: `community_events_test`

## Seed Data

Varsayilan admin hesabi:

- `admin@communityevents.local`
- `Admin123!`

Seed komutu:

```bash
npm run prisma:seed
```

## Useful Commands

```bash
npm run dev
npm run test
npm run test:e2e
npm run prisma:migrate
npm run prisma:seed
```

## Docker

```bash
npm run docker:build:prod
npm run docker:run:prod
```

## Project Notes

- Uygulama varsayilan olarak `main` branch uzerinden ilerler.
- Detayli teknik dokumanlar `docs/` altindadir.
- Editor ve ekip kurulumu notlari icin `SETUP.md` dosyasina bak.
