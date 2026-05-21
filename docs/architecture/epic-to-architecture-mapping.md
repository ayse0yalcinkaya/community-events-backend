# Epic to Architecture Mapping

| Epic | Components | Integration Points | External Dependencies |
|------|-----------|-------------------|----------------------|
| **Epic 1: Database Infrastructure** | `database/prisma.service.ts`<br>`prisma/schema-*.prisma`<br>`prisma/migrations/`<br>`prisma/seed.ts` | All modules via PrismaService injection | PostgreSQL v15+ or MongoDB v6+<br>Prisma CLI v6.16.0 |
| **Epic 2: Authentication & Authorization** | `modules/auth/`<br>`common/guards/jwt-auth.guard.ts`<br>`common/decorators/current-user.decorator.ts`<br>`common/strategies/jwt.strategy.ts` | → Users (validation)<br>→ Permissions (authz)<br>→ SMS (OTP phone verification) | JWT library (passport-jwt)<br>bcrypt for hashing |
| **Epic 3: User & Permissions Management** | `modules/users/`<br>`modules/permissions/`<br>`common/guards/permissions.guard.ts`<br>`common/decorators/permissions.decorator.ts` | → Database (Prisma)<br>→ Files (profile photo)<br>← Auth (user validation) | - |
| **Epic 4: File Management** | `modules/files/`<br>`config/aws.config.ts` | → Database (metadata)<br>→ Users (ownership) | AWS S3<br>@aws-sdk/client-s3<br>multer (file upload) |
| **Epic 5: Communication Modules** | `modules/sms/`<br>`modules/mail/`<br>`modules/notifications/` | → Users (recipients)<br>← Auth (OTP delivery)<br>→ Database (SMS tracking) | FONIVA (SMS - hrsync-backend pattern)<br>SendGrid or AWS SES (Email)<br>Firebase (Push - optional) |
| **Epic 6: Document Generation** | `modules/document-generator/` | → Database (data source)<br>→ S3 (document storage)<br>→ Cache (hash-based) | ExcelJS (Excel generation)<br>EJS (PDF templates)<br>Puppeteer (HTML→PDF)<br>@nestjs/cache-manager<br>Adapter Pattern (hrsync-backend) |
| **Epic 7: Developer Infrastructure** | `modules/i18n/`<br>`health/`<br>`common/filters/`<br>`common/interceptors/`<br>`config/sentry.config.ts` | All modules (cross-cutting) | Sentry (error tracking)<br>Winston (logging)<br>nestjs-i18n |
| **Epic 8: API Documentation** | `common/swagger/`<br>All controller decorators | All modules (decorators) | @nestjs/swagger<br>swagger-ui-express |
| **Epic 9: Testing Infrastructure** | `__test__/` folders<br>`test/` (E2E)<br>`jest.config.js` | All modules (tests) | Jest v29.x<br>@nestjs/testing<br>supertest (E2E) |
| **Epic 10: Development Environment** | `docker/docker-compose.yml`<br>`docker/Dockerfile.dev`<br>`.env.*` files | All services | Docker Desktop<br>Docker Compose |
| **Epic 11: CI/CD & Deployment** | `.github/workflows/`<br>`docker/Dockerfile` | All modules (build/deploy) | GitHub Actions<br>Container Registry |
| **Epic 12: Code Quality & Standards** | `.eslintrc.js`<br>`.prettierrc`<br>`.husky/`<br>`tsconfig.json` | All modules (enforcement) | ESLint<br>Prettier<br>Husky |

---
