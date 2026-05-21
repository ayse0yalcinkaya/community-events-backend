# Development Environment

## Prerequisites

```bash
Node.js: v20.x LTS
npm: v10+
Docker: v24+
Docker Compose: v2+
Git: v2.30+
```

## Setup Commands

```bash
# 1. Clone repository
git clone <repo-url> boilerplate
cd boilerplate

# 2. Install dependencies
npm install

# 3. Run interactive setup (database selection)
npm run setup

# 4. Generate Prisma client
npx prisma generate

# 5. Run database migrations (PostgreSQL only)
npx prisma migrate dev

# 6. Seed database
npx prisma db seed

# 7. Start development server
npm run start:dev

# Application running at http://localhost:3000
# Swagger docs at http://localhost:3000/api/docs
```

**Docker Setup (Alternative):**
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f app

# Run migrations
docker-compose exec app npx prisma migrate dev

# Seed database
docker-compose exec app npx prisma db seed
```

**NPM Scripts:**
```json
{
  "start": "node dist/main",
  "start:dev": "nest start --watch",
  "start:debug": "nest start --debug --watch",
  "build": "nest build",
  "lint": "eslint \"{src,apps,libs,test}/**/*.ts\" --fix",
  "format": "prettier --write \"src/**/*.ts\" \"test/**/*.ts\"",
  "test": "jest",
  "test:watch": "jest --watch",
  "test:cov": "jest --coverage",
  "test:e2e": "jest --config ./test/jest-e2e.json",
  "prisma:generate": "prisma generate",
  "prisma:migrate": "prisma migrate dev",
  "prisma:seed": "ts-node prisma/seed.ts",
  "setup": "ts-node scripts/setup.ts",
  "permission:sync": "ts-node scripts/permission-sync.ts"
}
```

---
