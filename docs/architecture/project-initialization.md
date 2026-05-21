# Project Initialization

**First Implementation Story:** Project setup using NestJS CLI

```bash
# Create project with strict TypeScript
npx @nestjs/cli@latest new boilerplate --strict

# Navigate to project
cd boilerplate

# Run interactive setup (database selection)
npm run setup

# Install dependencies
npm install

# Start development server
npm run start:dev
```

**Setup Script Process:**
1. Prompts user: PostgreSQL or MongoDB?
2. Copies appropriate Prisma schema (`schema-postgres.prisma` or `schema-mongodb.prisma` → `schema.prisma`)
3. Updates `package.json` dependencies (removes unused DB packages)
4. Generates `.env` file from template
5. Initializes database and runs migrations (PostgreSQL only)
6. Seeds initial data (admin user, permissions)

**Base Architectural Decisions Provided by Starter:**
- TypeScript with strict mode enabled
- Jest testing framework configured
- ESLint with NestJS best practices
- Module-based project structure
- Hot reload for development
- Build tooling (TypeScript compiler + NestJS CLI)

---
