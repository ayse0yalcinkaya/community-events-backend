# Deployment Architecture

## Docker Configuration

**Production Dockerfile (Multi-Stage):**
```dockerfile
# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# Stage 2: Build
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci
COPY . .
RUN npm run build
RUN npx prisma generate

# Stage 3: Production
FROM node:20-alpine AS production
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY package*.json ./
USER node
EXPOSE 3000
CMD ["node", "dist/main"]
```

**Docker Compose (Local Development):**
```yaml
version: '3.8'
services:
  app:
    build:
      context: .
      dockerfile: docker/Dockerfile.dev
    ports:
      - "3000:3000"
    volumes:
      - .:/app
      - /app/node_modules
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://user:pass@postgres:5432/boilerplate
    depends_on:
      - postgres
      - mongodb
      - redis

  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
      POSTGRES_DB: boilerplate
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  mongodb:
    image: mongo:6
    environment:
      MONGO_INITDB_ROOT_USERNAME: user
      MONGO_INITDB_ROOT_PASSWORD: pass
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  mongo_data:
  redis_data:
```

## Environment Configuration

**Required Environment Variables:**
```bash
# Application
NODE_ENV=development|staging|production
PORT=3000
API_PREFIX=api

# Database (setup script generates appropriate URL)
DATABASE_URL=postgresql://user:pass@localhost:5432/db
# OR
DATABASE_URL=mongodb://user:pass@localhost:27017/db

# JWT
JWT_SECRET=<random-32+-char-string>
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

# AWS S3
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=<key>
AWS_SECRET_ACCESS_KEY=<secret>
S3_BUCKET=boilerplate-{env}
S3_PRESIGNED_URL_EXPIRATION=900

# SMS Provider (FONIVA - hrsync-backend pattern)
SMS_PROVIDER=FONIVA
FONIVA_API_URL=<api-url>
FONIVA_USERNAME=<username>
FONIVA_PASSWORD=<password>
FONIVA_API_KEY=<api-key>
FONIVA_SENDER=<sender-name>

# Email Provider (SendGrid example)
MAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=<key>
MAIL_FROM=noreply@example.com

# Sentry
SENTRY_DSN=<dsn>
SENTRY_ENVIRONMENT=development|staging|production

# Optional: Firebase (Push Notifications)
FIREBASE_PROJECT_ID=<project-id>
FIREBASE_PRIVATE_KEY=<key>
FIREBASE_CLIENT_EMAIL=<email>
```

**Configuration Validation:**
```typescript
// config/app.config.ts
import Joi from 'joi';

const envSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'staging', 'production').required(),
  PORT: Joi.number().default(3000),
  DATABASE_URL: Joi.string().required(),
  JWT_SECRET: Joi.string().min(32).required(),
  // ... all required vars
}).unknown();

const { error, value } = envSchema.validate(process.env);
if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}
```

## CI/CD Pipeline

**GitHub Actions (ci.yml):**
```yaml
name: CI
on: [pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run lint
      - run: npm run test
      - run: npm run test:e2e
      - run: npm run build
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

**Deployment (cd-production.yml):**
```yaml
name: Deploy Production
on:
  push:
    tags:
      - 'v*'
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Build Docker image
        run: docker build -t boilerplate:${{ github.ref_name }} .
      - name: Push to registry
        run: docker push boilerplate:${{ github.ref_name }}
      - name: Deploy to production
        run: |
          # Deployment commands (Kubernetes, ECS, etc.)
      - name: Run migrations
        run: npx prisma migrate deploy
      - name: Health check
        run: curl https://api.example.com/health
```

---
