# Story 7.2: Common Utilities & Decorators

Status: done

## Story

As a developer,
I want shared utilities and decorators,
So that I don't have to write repetitive code and can maintain consistency across the application.

## Acceptance Criteria

1. **AC-7.2.1:** Decorators created in `src/common/decorators/`:
   - `current-user.decorator.ts` → @CurrentUser() extracts user from request.user
   - `public.decorator.ts` → @Public() sets IS_PUBLIC_KEY metadata
   - `api-paginated-response.decorator.ts` → @ApiPaginatedResponse() creates Swagger schema

2. **AC-7.2.2:** Utility files created in `src/common/utils/`:
   - `hash.util.ts` → hashPassword(), comparePassword() using bcrypt
   - `date.util.ts` → formatDate(), toUTC(), addDays(), diffInMs()
   - `string.util.ts` → slugify(), truncate(), capitalize(), removeSpecialChars()
   - `validation.util.ts` → isValidPhone(), isStrongPassword(), sanitizeInput()

3. **AC-7.2.3:** All utilities have 100% unit test coverage
   - Each utility function has comprehensive unit tests
   - Test files located in `src/common/utils/__tests__/`
   - Coverage verified with `npm run test:cov`

4. **AC-7.2.4:** @CurrentUser() decorator successfully extracts authenticated user in controllers
   - Decorator extracts user from request.user (set by JwtStrategy)
   - Works with existing JWT authentication from Epic 2
   - Returns typed JwtPayload with userId, domainId

5. **AC-7.2.5:** @Public() decorator bypasses JwtAuthGuard when applied to routes
   - Sets IS_PUBLIC_KEY metadata to true
   - JwtAuthGuard checks for this metadata
   - Public routes (login, register, health checks) work without authentication

## Tasks / Subtasks

- [x] Task 1: Create custom decorators (AC: 7.2.1, 7.2.4, 7.2.5)
  - [x] Subtask 1.1: Create `src/common/decorators/` directory
  - [x] Subtask 1.2: Implement @CurrentUser() decorator
  - [x] Subtask 1.3: Implement @Public() decorator  
  - [x] Subtask 1.4: Implement @ApiPaginatedResponse() decorator
  - [x] Subtask 1.5: Create index.ts barrel export for decorators

- [x] Task 2: Implement hash utilities (AC: 7.2.2)
  - [x] Subtask 2.1: Create `src/common/utils/` directory
  - [x] Subtask 2.2: Implement hash.util.ts
  - [x] Subtask 2.3: Add type definitions and JSDoc comments

- [x] Task 3: Implement date utilities (AC: 7.2.2)
  - [x] Subtask 3.1: Implement date.util.ts
  - [x] Subtask 3.2: Add type definitions and JSDoc comments

- [x] Task 4: Implement string utilities (AC: 7.2.2)
  - [x] Subtask 4.1: Implement string.util.ts
  - [x] Subtask 4.2: Add type definitions and JSDoc comments

- [x] Task 5: Implement validation utilities (AC: 7.2.2)
  - [x] Subtask 5.1: Implement validation.util.ts
  - [x] Subtask 5.2: Add type definitions and JSDoc comments
  - [x] Subtask 5.3: Create index.ts barrel export for utilities

- [x] Task 6: Write comprehensive unit tests (AC: 7.2.3)
  - [x] Subtask 6.1: Create `src/common/utils/__tests__/` directory
  - [x] Subtask 6.2: Write hash.util.spec.ts
  - [x] Subtask 6.3: Write date.util.spec.ts
  - [x] Subtask 6.4: Write string.util.spec.ts
  - [x] Subtask 6.5: Write validation.util.spec.ts
  - [x] Subtask 6.6: Write decorator tests
  - [x] Subtask 6.7: Run coverage report and verify 100% coverage for utilities

- [x] Task 7: Integration testing with existing modules (AC: 7.2.4, 7.2.5)
  - [x] Subtask 7.1: Test @CurrentUser() decorator in AuthController
  - [x] Subtask 7.2: Test @Public() decorator on login endpoint
  - [x] Subtask 7.3: Verify hash utilities work with existing AuthService
## Dev Notes

### Architecture Patterns and Constraints

**Decorator Pattern:**
- Custom decorators use NestJS ExecutionContext to extract data from requests
- @CurrentUser() leverages JWT authentication setup from Epic 2
- @Public() works with existing JwtAuthGuard by setting metadata
- @ApiPaginatedResponse() is a Swagger decorator for consistent API documentation
- [Source: docs/tech-spec-epic-7.md#Services-and-Modules]

**Utility Functions Pattern:**
- All utilities are pure functions (no side effects, stateless)
- Functions accept inputs and return outputs without modifying global state
- Testability: Pure functions are easily testable (predictable, no mocking required)
- Reusability: Can be used across all modules without dependencies
- [Source: docs/tech-spec-epic-7.md#APIs-and-Interfaces]

**Security Considerations:**
- Password hashing: bcrypt with minimum 10 rounds (BCRYPT_ROUNDS env)
- Timing-safe comparison: bcrypt.compare() prevents timing attacks
- XSS prevention: sanitizeInput() removes HTML tags and script content
- Strong password policy: Min 8 chars, uppercase, lowercase, number, special char
- [Source: docs/tech-spec-epic-7.md#Security]

**Integration with i18n (Story 7.1):**
- Error messages from utilities can use i18n translations
- Validation error messages: Use i18n keys (e.g., "validation.INVALID_PHONE")
- Future enhancement: Localized validation messages
- [Source: docs/tech-spec-epic-7.md#Dependencies-and-Integrations]

### Learnings from Previous Story

**From Story 7.1 (i18n-setup) (Status: done)**

- **I18n Service Available:**
  - I18nService can be injected into any service/controller
  - Translation keys format: namespace.KEY (e.g., common.VALIDATION_ERROR)
  - Utilities can use i18n for error messages in future enhancements
  - [Source: stories/7-1-internationalization-i18n-setup.md#Dev-Notes]

- **Module Integration Pattern:**
  - Import modules in AppModule imports array
  - Services exported as global modules
  - Configuration in forRoot() pattern
  - [Source: stories/7-1-internationalization-i18n-setup.md#Project-Structure-Notes]

- **Testing Infrastructure:**
  - Jest unit test structure established
  - TestingModule pattern for NestJS testing
  - Mock services using jest.fn()
  - Coverage reporting configured
  - [Source: stories/7-1-internationalization-i18n-setup.md#Testing-Standards-Summary]

- **File Structure:**
  - Common modules under `src/common/`
  - Feature modules under `src/modules/`
  - Test files in `__tests__/` subdirectories
  - Barrel exports (index.ts) for clean imports
  - [Source: stories/7-1-internationalization-i18n-setup.md#Project-Structure-Notes]

**Key Takeaways:**
- Story 7.2 creates reusable utilities that will be used throughout the application
- Decorators simplify common patterns (user extraction, public routes, Swagger docs)
- 100% test coverage is critical for utilities (they're used everywhere)
- Pure functions enable easy testing and reusability
- Integration with Epic 2 (Auth) via @CurrentUser() decorator

### Source Tree Components to Touch

**Files to Create:**
```
src/common/
├── decorators/
│   ├── current-user.decorator.ts         # NEW - @CurrentUser() decorator
│   ├── public.decorator.ts               # NEW - @Public() decorator
│   ├── api-paginated-response.decorator.ts # NEW - Swagger pagination decorator
│   └── index.ts                          # NEW - Barrel export
└── utils/
    ├── hash.util.ts                      # NEW - Password hashing utilities
    ├── date.util.ts                      # NEW - Date manipulation utilities
    ├── string.util.ts                    # NEW - String manipulation utilities
    ├── validation.util.ts                # NEW - Custom validation utilities
    ├── index.ts                          # NEW - Barrel export
    └── __tests__/
        ├── hash.util.spec.ts             # NEW - Unit tests for hash utilities
        ├── date.util.spec.ts             # NEW - Unit tests for date utilities
        ├── string.util.spec.ts           # NEW - Unit tests for string utilities
        ├── validation.util.spec.ts       # NEW - Unit tests for validation utilities
        ├── current-user.decorator.spec.ts # NEW - Unit tests for @CurrentUser()
        └── public.decorator.spec.ts      # NEW - Unit tests for @Public()
```

**Files to Modify (for integration testing):**
```
src/
├── modules/
│   ├── auth/
│   │   └── controllers/
│   │       └── auth.controller.ts        # MODIFIED - Use @CurrentUser(), @Public()
│   └── users/
│       └── controllers/
│           └── users.controller.ts       # MODIFIED - Use @CurrentUser()
```

**Dependencies:**
- bcrypt: Already installed (Epic 2) - Used by hash.util
- @nestjs/common: Already installed - Used by decorators
- @nestjs/swagger: Will be used by @ApiPaginatedResponse() (Epic 8 dependency)
- class-validator: Already installed - Used by validation utilities
- Epic 1 completed: AppModule exists for module integration
- Epic 2 (Auth) completed: JwtStrategy sets request.user for @CurrentUser()

### Testing Standards Summary

**Unit Testing (Utilities):**
- **Coverage Target:** 100% (critical shared functions)
- **Test Pattern:** Arrange-Act-Assert
- **Test Cases per Utility:**
  - hash.util: Hash generation, password comparison (match/no match), different rounds
  - date.util: Format conversion, UTC conversion, date arithmetic, difference calculation
  - string.util: Slugify, truncate, capitalize, special char removal
  - validation.util: Phone validation (valid/invalid), password strength, XSS sanitization
- **Performance:** All utility tests < 100ms total execution time
- **No Mocking Required:** Pure functions, no external dependencies

**Unit Testing (Decorators):**
- **Coverage Target:** 90%+
- **Test Pattern:** Mock ExecutionContext
- **Test Cases:**
  - @CurrentUser(): Extract user from request.user (mock request object)
  - @Public(): Verify metadata set correctly (SetMetadata mock)
  - @ApiPaginatedResponse(): Verify Swagger schema generation (decorator composition)

**Integration Testing:**
- **Test 1:** @CurrentUser() works in actual controller endpoint (JWT authentication flow)
- **Test 2:** @Public() bypasses JWT guard on login endpoint
- **Test 3:** Hash utilities integrate with AuthService (password hashing on register, comparison on login)
- **Test 4:** Decorators work with existing Epic 2 authentication infrastructure

**E2E Testing:**
- **Test 1:** Public endpoint (login) accessible without JWT token
- **Test 2:** Protected endpoint requires JWT token, @CurrentUser() extracts user
- **Test 3:** Password hashing end-to-end (register → login with correct/wrong password)

**Test Data:**
- Sample passwords: "Test1234!", "weak", "Str0ng!Pass"
- Sample phone numbers: "+905551234567", "invalid", "05551234567"
- Sample dates: ISO strings, UTC timestamps, timezone-aware dates
- Sample strings: "Test String", "special!@#chars", "VeryLongStringForTruncation..."

### Project Structure Notes

Story 7.2 creates the common utilities and decorators foundation used throughout the application:

```
src/common/
├── decorators/                           # Custom decorators
│   ├── current-user.decorator.ts         # Extract authenticated user from request
│   ├── public.decorator.ts               # Mark routes as public (bypass auth)
│   ├── api-paginated-response.decorator.ts # Swagger pagination decorator
│   └── index.ts                          # Barrel export: export * from './...'
└── utils/                                # Utility functions
    ├── hash.util.ts                      # Password hashing (bcrypt wrapper)
    ├── date.util.ts                      # Date formatting and manipulation
    ├── string.util.ts                    # String manipulation (slugify, truncate)
    ├── validation.util.ts                # Custom validators (phone, password)
    ├── index.ts                          # Barrel export
    └── __tests__/                        # Unit tests
        ├── hash.util.spec.ts
        ├── date.util.spec.ts
        ├── string.util.spec.ts
        ├── validation.util.spec.ts
        ├── current-user.decorator.spec.ts
        └── public.decorator.spec.ts
```

**Decorator Implementation Example (@CurrentUser):**
```typescript
// src/common/decorators/current-user.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user; // Set by JwtStrategy from Epic 2
  },
);
```

**Decorator Usage in Controllers:**
```typescript
import { CurrentUser } from '@common/decorators';

@Controller('users')
export class UsersController {
  @Get('profile')
  async getProfile(@CurrentUser() user: JwtPayload) {
    // user.userId, user.domainId available directly
    return this.usersService.findById(user.userId);
  }
}
```

**Public Decorator Implementation:**
```typescript
// src/common/decorators/public.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
```

**Public Decorator Usage:**
```typescript
import { Public } from '@common/decorators';

@Controller('auth')
export class AuthController {
  @Public()  // No JWT required
  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }
}
```

**Hash Utility Implementation:**
```typescript
// src/common/utils/hash.util.ts
import * as bcrypt from 'bcrypt';

/**
 * Hash a password using bcrypt
 * @param password - Plain text password
 * @param rounds - Salt rounds (default: 10)
 * @returns Hashed password
 */
export async function hashPassword(
  password: string,
  rounds: number = parseInt(process.env.BCRYPT_ROUNDS || '10', 10),
): Promise<string> {
  return bcrypt.hash(password, rounds);
}

/**
 * Compare plain password with hash
 * @param password - Plain text password
 * @param hash - Bcrypt hash
 * @returns True if match, false otherwise
 */
export async function comparePassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
```

**Hash Utility Usage:**
```typescript
import { hashPassword, comparePassword } from '@common/utils';

// In AuthService:
async register(dto: RegisterDto) {
  const passwordHash = await hashPassword(dto.password);
  // Store passwordHash in database
}

async login(dto: LoginDto) {
  const user = await this.findUser(dto.phoneNumber);
  const isValid = await comparePassword(dto.password, user.passwordHash);
  if (!isValid) {
    throw new UnauthorizedException('Invalid credentials');
  }
  // Generate JWT token
}
```

**String Utility Implementation:**
```typescript
// src/common/utils/string.util.ts

/**
 * Convert string to URL-safe slug
 * @param text - Input string
 * @returns Slugified string (lowercase, hyphens, no special chars)
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')      // Remove special chars
    .replace(/[\s_-]+/g, '-')      // Replace spaces/underscores with hyphens
    .replace(/^-+|-+$/g, '');      // Remove leading/trailing hyphens
}

/**
 * Truncate string to max length with ellipsis
 * @param text - Input string
 * @param maxLength - Maximum length (including ellipsis)
 * @returns Truncated string
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * Capitalize first letter of string
 * @param text - Input string
 * @returns Capitalized string
 */
export function capitalize(text: string): string {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Remove special characters from string
 * @param text - Input string
 * @returns String with only alphanumeric characters
 */
export function removeSpecialChars(text: string): string {
  return text.replace(/[^a-zA-Z0-9]/g, '');
}
```

**Validation Utility Implementation:**
```typescript
// src/common/utils/validation.util.ts

/**
 * Validate Turkish phone number format
 * @param phone - Phone number string
 * @param countryCode - Country code (default: '+90' for Turkey)
 * @returns True if valid, false otherwise
 */
export function isValidPhone(phone: string, countryCode: string = '+90'): boolean {
  const phoneRegex = /^\+90\d{10}$/; // +905551234567 format
  return phoneRegex.test(phone);
}

/**
 * Check if password meets strong password requirements
 * Min 8 chars, at least 1 uppercase, 1 lowercase, 1 number, 1 special char
 * @param password - Password string
 * @returns True if strong, false otherwise
 */
export function isStrongPassword(password: string): boolean {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  return (
    password.length >= minLength &&
    hasUpperCase &&
    hasLowerCase &&
    hasNumbers &&
    hasSpecialChar
  );
}

/**
 * Sanitize input to prevent XSS attacks
 * Removes HTML tags and script content
 * @param input - User input string
 * @returns Sanitized string
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove <script> tags
    .replace(/<[^>]+>/g, '');                                            // Remove all HTML tags
}
```

**Epic 7 Story Progression:**
- **Story 7.1** (I18n Setup): DONE - Multi-language support available
- **Story 7.2** (Common Utilities): THIS STORY - Shared utilities and decorators
- **Story 7.3** (Winston Logging): Will use date.util for timestamp formatting
- **Story 7.4** (Logging Interceptor): Will use validation.util for sanitization
- **Story 7.5** (Sentry Error Tracking): Will use sanitization for sensitive data
- **Story 7.6** (Health Check Endpoints): Will use @Public() decorator

**Integration with Other Epics:**
- Epic 2 (Auth): hash.util for password hashing, @CurrentUser() for user extraction
- Epic 3 (Users): @CurrentUser() for profile access, validation utilities
- Epic 8 (Swagger): @ApiPaginatedResponse() for API documentation
- All future epics: All utilities and decorators available for use

**No Conflicts:**
- Common utilities are self-contained, no external dependencies beyond bcrypt
- Decorators integrate seamlessly with existing NestJS infrastructure
- Pure functions have no side effects or global state
- Backward compatible - existing code continues to work unchanged

### References

**Acceptance Criteria and Requirements:**
- [Source: docs/tech-spec-epic-7.md#Story-7.2] - Complete AC specifications (AC-7.2.1 through AC-7.2.5)
- [Source: docs/epics.md#Story-7.2] - Epic-level story breakdown

**Architecture and Design:**
- [Source: docs/tech-spec-epic-7.md#Services-and-Modules] - Decorator and utility design patterns
- [Source: docs/tech-spec-epic-7.md#APIs-and-Interfaces] - Utility function signatures
- [Source: docs/tech-spec-epic-7.md#Security] - Security constraints for hash and validation utilities

**Dependencies:**
- [Source: docs/tech-spec-epic-7.md#Dependencies-and-Integrations] - bcrypt package (already installed)
- [Source: docs/tech-spec-epic-7.md#Version-Constraints-and-Compatibility] - NestJS v11.x compatibility

**Testing:**
- [Source: docs/tech-spec-epic-7.md#Test-Strategy-Summary] - Unit, integration, E2E test approach
- [Source: docs/tech-spec-epic-7.md#Traceability-Mapping] - AC-7.2.1 through AC-7.2.5 test coverage requirements

**Previous Story Learnings:**
- [Source: stories/7-1-internationalization-i18n-setup.md] - Testing patterns, module integration patterns, file structure

## Dev Agent Record

### Context Reference

- Story Context: `docs/stories/7-2-common-utilities-decorators.context.xml`

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

**Completed:** 2025-11-06
**Definition of Done:** All acceptance criteria met, code reviewed, tests passing
- AC-7.2.1 through AC-7.2.5: All acceptance criteria verified ✅
- 100% test coverage achieved for all utility functions
- Integration testing completed with AuthService refactoring
- All import paths updated across 9 files
- Build successful, no TypeScript errors
- 107 tests passing

### File List

## Change Log

- **2025-11-06 (Story Completed):** Story 7.2 implemented and ready for review
  - Created all utility files (hash, date, string, validation) with 100% test coverage
  - Moved @CurrentUser and @Public decorators from auth module to common/decorators
  - Created @ApiPaginatedResponse decorator with Swagger schema generation
  - Installed @nestjs/swagger package for pagination decorator
  - Refactored AuthService to use hash utilities instead of direct bcrypt calls
  - Updated all import paths across 9 files (controllers, guards, tests)
  - Wrote comprehensive unit tests (107 tests passed, 100% coverage for utilities)
  - All acceptance criteria met (AC-7.2.1 through AC-7.2.5)
  - Story status: ready-for-dev → review

- **2025-11-06 (Story Drafted):** Story 7.2 drafted
  - Created story file with complete acceptance criteria from tech-spec-epic-7.md
  - Incorporated learnings from Story 7.1 (testing patterns, module integration, file structure)
  - All tasks and subtasks mapped to AC requirements (AC-7.2.1 through AC-7.2.5)
  - Ready for development

### Debug Log

**2025-11-06 - Story Implementation**

Implementation plan:
1. Moved @CurrentUser and @Public decorators from auth module to common/decorators
2. Installed @nestjs/swagger for @ApiPaginatedResponse decorator
3. Created all utility functions (hash, date, string, validation) in common/utils
4. Wrote comprehensive unit tests achieving 100% coverage for all utilities
5. Integrated hash utilities with existing AuthService (refactored bcrypt usage)
6. Updated all import paths across controllers and guards

Key decisions:
- Used environment variable BCRYPT_ROUNDS (default: 10) for password hashing
- All utilities are pure functions (stateless, no side effects)
- Comprehensive JSDoc documentation for all functions
- PaginationMetadata as interface (not class) to avoid TypeScript strict mode issues

### Completion Notes List

✅ **All Acceptance Criteria Met:**
- AC-7.2.1: Decorators created (@CurrentUser, @Public, @ApiPaginatedResponse) ✅
- AC-7.2.2: Utility files created (hash, date, string, validation) ✅  
- AC-7.2.3: 100% unit test coverage achieved for all utilities ✅
- AC-7.2.4: @CurrentUser decorator successfully extracts authenticated user ✅
- AC-7.2.5: @Public decorator bypasses JwtAuthGuard on public routes ✅

**Integration:**
- Refactored AuthService to use hashPassword() and comparePassword() utilities
- Updated AuthService tests to mock hash.util instead of bcrypt
- All controllers using @CurrentUser decorator updated to import from common/decorators
- JwtAuthGuard and PermissionsGuard updated to import IS_PUBLIC_KEY from common/decorators

**Test Results:**
- Utility tests: 107 tests passed (100% coverage)
- Hash utility: 100% coverage (5 tests)
- Date utility: 100% coverage (15 tests)
- String utility: 100% coverage (24 tests)
- Validation utility: 100% coverage (36 tests)
- Decorator tests: 27 tests passed

**Files Created:**
- src/common/decorators/current-user.decorator.ts
- src/common/decorators/public.decorator.ts
- src/common/decorators/api-paginated-response.decorator.ts
- src/common/utils/hash.util.ts
- src/common/utils/date.util.ts
- src/common/utils/string.util.ts
- src/common/utils/validation.util.ts
- src/common/utils/index.ts
- Test files: 6 comprehensive test suites

**Files Modified:**
- src/common/decorators/index.ts (added new decorator exports)
- src/common/guards/jwt-auth.guard.ts (updated IS_PUBLIC_KEY import)
- src/common/guards/permissions.guard.ts (updated IS_PUBLIC_KEY import)
- src/modules/auth/auth.service.ts (refactored to use hash utilities)
- src/modules/auth/auth.service.spec.ts (updated mocks for hash utilities)
- src/modules/files/controllers/files.controller.ts (updated @CurrentUser import)
- src/modules/users/controllers/users.controller.ts (updated @CurrentUser import)
- src/modules/users/controllers/profile.controller.ts (updated @CurrentUser import)
- src/modules/permissions/controllers/permissions.controller.ts (updated @CurrentUser import)
- package.json (added @nestjs/swagger and swagger-ui-express)

### File List

**Created Files:**
- src/common/decorators/current-user.decorator.ts
- src/common/decorators/public.decorator.ts
- src/common/decorators/api-paginated-response.decorator.ts
- src/common/utils/hash.util.ts
- src/common/utils/date.util.ts
- src/common/utils/string.util.ts
- src/common/utils/validation.util.ts
- src/common/utils/index.ts
- src/common/utils/__tests__/hash.util.spec.ts
- src/common/utils/__tests__/date.util.spec.ts
- src/common/utils/__tests__/string.util.spec.ts
- src/common/utils/__tests__/validation.util.spec.ts
- src/common/decorators/__tests__/current-user.decorator.spec.ts
- src/common/decorators/__tests__/public.decorator.spec.ts

**Modified Files:**
- src/common/decorators/index.ts
- src/common/guards/jwt-auth.guard.ts
- src/common/guards/permissions.guard.ts
- src/common/guards/permissions.guard.spec.ts
- src/modules/auth/auth.service.ts
- src/modules/auth/auth.service.spec.ts
- src/modules/files/controllers/files.controller.ts
- src/modules/users/controllers/users.controller.ts
- src/modules/users/controllers/profile.controller.ts
- src/modules/permissions/controllers/permissions.controller.ts
- package.json
- package-lock.json

