# Epic 12: Code Quality & Standards

**Goal:** Enforced code quality, consistent style, pre-commit checks

**Value Proposition:** Consistent codebase, fewer code review iterations, automated quality gates

**Prerequisites:** Epic 1 (App setup)

**Technical Stack:**
- ESLint + @typescript-eslint
- Prettier
- Husky (Git hooks)
- TypeScript strict mode

---

## Story 12.1: ESLint Configuration

**As a** developer,
**I want** ESLint configured,
**So that** code quality rules enforce edilsin.

**Acceptance Criteria:**
1. `.eslintrc.js` oluşturulmuş
2. Extends:
   - `@typescript-eslint/recommended`
   - `plugin:@typescript-eslint/recommended`
   - `plugin:prettier/recommended`
3. Rules:
   - NestJS best practices
   - TypeScript strict rules
   - No console.log in production
   - Consistent import order
   - No unused vars
4. `package.json`: `"lint": "eslint \"{src,apps,libs,test}/**/*.ts\" --fix"`
5. VS Code integration: .vscode/settings.json (eslint.autoFixOnSave)
6. CI/CD: Lint check mandatory

**Technical Notes:**
- @typescript-eslint/parser
- eslint-plugin-prettier
- Custom rules (optional, company-specific)

**Dependencies:** Story 11.5

---

## Story 12.2: Prettier Configuration

**As a** developer,
**I want** Prettier configured,
**So that** code formatting consistent olsun.

**Acceptance Criteria:**
1. `.prettierrc` oluşturulmuş
2. Configuration:
   - Semi: true
   - Single quote: true
   - Tab width: 2
   - Trailing comma: all
   - Arrow parens: always
3. `.prettierignore`: node_modules, dist, coverage
4. `package.json`: `"format": "prettier --write \"src/**/*.ts\" \"test/**/*.ts\""`
5. ESLint integration: eslint-config-prettier (conflict resolution)
6. VS Code: Format on save

**Technical Notes:**
- Prettier + ESLint cooperation (no conflicts)
- Format on save: Editor config
- Pre-commit hook (next story)

**Dependencies:** Story 12.1

---

## Story 12.3: Husky Pre-Commit Hooks

**As a** developer,
**I want** pre-commit hooks,
**So that** bad code commit edilemesin.

**Acceptance Criteria:**
1. Husky installed ve initialized
2. `.husky/pre-commit` hook oluşturulmuş
3. Pre-commit checks:
   - Lint check (eslint --fix)
   - Format check (prettier --check)
   - Optional: Test run (fast unit tests only)
4. Commit blocked if checks fail
5. `package.json`: `"prepare": "husky install"`
6. README: Hook'ları bypass etme (--no-verify) discouraged

**Technical Notes:**
- Husky v8+
- Lint-staged (optional): Only staged files check
- Fast checks (< 10s)

**Dependencies:** Story 12.2

---

## Story 12.4: TypeScript Strict Mode

**As a** developer,
**I want** TypeScript strict mode enforced,
**So that** type safety maksimum seviyede olsun.

**Acceptance Criteria:**
1. `tsconfig.json` strict settings:
   - `strict: true`
   - `noImplicitAny: true`
   - `strictNullChecks: true`
   - `strictFunctionTypes: true`
   - `strictBindCallApply: true`
   - `strictPropertyInitialization: true`
   - `noImplicitThis: true`
   - `alwaysStrict: true`
2. All existing code compiles without errors
3. CI/CD: TypeScript compilation check
4. VS Code: TypeScript IntelliSense fully leveraged

**Technical Notes:**
- Strict mode: Maximum type safety
- Fix existing violations (if any)
- `tsc --noEmit` for type checking only

**Dependencies:** Story 12.3

---

## Story 12.5: Import Organization Rules

**As a** developer,
**I want** import organization rules,
**So that** import statements consistent olsun.

**Acceptance Criteria:**
1. ESLint plugin: eslint-plugin-import
2. Import order rules (hrsync-backend pattern):
   ```typescript
   // 1. Libraries (external packages)
   import { Injectable } from '@nestjs/common';

   // 2. DTOs
   import { CreateUserDto } from '../dto/request/create-user.dto';

   // 3. Services (other modules)
   import { MailService } from '../../mail/services/mail.service';

   // 4. Repositories
   import { UsersRepository } from '../repositories/users.repository';

   // 5. Entities
   import { User } from '../entities/user.entity';

   // 6. Interfaces
   import { IUsersService } from '../interfaces/users.service.interface';

   // 7. Enums
   import { UserStatus } from '../enums/user-status.enum';

   // 8. Events
   import { UserCreatedEvent } from '../events/user.events';
   ```
3. Auto-fix on save
4. CI/CD: Import order check

**Technical Notes:**
- eslint-plugin-import rules
- import/order rule configuration
- hrsync-backend exact pattern

**Dependencies:** Story 12.4

---
