# Story 13.2: Model Factory Pattern & Faker Integration

Status: done

## Story

As a developer,
I want realistic test data generate edebilmek için factory pattern,
So that Faker.js ile Turkish test data kolayca oluşturabileyim.

## Acceptance Criteria

1. [x] `prisma/factories/` directory oluşturulmuş
2. [x] Factory classes: `user.factory.ts`, `role.factory.ts`, `permission.factory.ts`, `file.factory.ts`
3. [x] Static methods: `generate()` (single), `generateMany(count)` (bulk)
4. [x] Faker.js v8+ integration: Turkish locale for realistic data
5. [x] Type safety: Prisma types kullanarak generic factory
6. [x] Override support: factory(overrides) → merge defaults + overrides
7. [x] Realistic data: Turkish names, emails, phone numbers (05xx), addresses

## Tasks / Subtasks

- [x] Task 1: Install Faker.js v8+ and create factories directory structure (AC: #1, #4)
  - [x] Subtask 1.1: Install @faker-js/faker package
  - [x] Subtask 1.2: Create prisma/factories/ directory
  - [x] Subtask 1.3: Configure Turkish locale support
  - [x] Subtask 1.4: Add ts-node to package.json for TypeScript factory support

- [x] Task 2: Implement UserFactory class with Faker integration (AC: #2, #3, #5, #6, #7)
  - [x] Subtask 2.1: Create user.factory.ts with Prisma type definitions
  - [x] Subtask 2.2: Implement static generate() method with Turkish names, email, phone
  - [x] Subtask 2.3: Implement static generateMany(count) method
  - [x] Subtask 2.4: Add override support for merging defaults
  - [x] Subtask 2.5: Add role relation support in factory output

- [x] Task 3: Implement remaining factory classes (AC: #2, #3, #7)
  - [x] Subtask 3.1: Create role.factory.ts with static generate() and generateMany()
  - [x] Subtask 3.2: Create permission.factory.ts with action-based generation
  - [x] Subtask 3.3: Create file.factory.ts with realistic metadata (size, mimeType, dates)
  - [x] Subtask 3.4: Add proper type definitions for each factory

- [x] Task 4: Test factory implementations (AC: #5, #6, #7)
  - [x] Subtask 4.1: Test UserFactory generate() with various overrides
  - [x] Subtask 4.2: Test generateMany() produces correct count and unique data
  - [x] Subtask 4.3: Verify TypeScript type safety across all factories
  - [x] Subtask 4.4: Test Turkish phone format (05xx) and names
  - [x] Subtask 4.5: Validate override merging works correctly

- [x] Task 5: Integration with existing seeder classes (AC: #3, #7)
  - [x] Subtask 5.1: Update UserSeeder to use UserFactory for bulk user creation
  - [x] Subtask 5.2: Update FileSeeder to use FileFactory for sample files
  - [x] Subtask 5.3: Update PermissionSeeder to use PermissionFactory
  - [x] Subtask 5.4: Test full seeding workflow with factories
  - [x] Subtask 5.5: Verify idempotency with factory-generated data

## Dev Notes

### Architecture Patterns and Constraints

**Factory Pattern Architecture:**

- **Location**: `prisma/factories/` directory - follows Epic 13 established structure
- **Pattern**: Static factory methods with Prisma type definitions for type safety
- **Type Safety**: Uses `Prisma.{Entity}CreateInput` types to ensure factory output matches Prisma schema
- **Override Support**: Partial<T> merge pattern for flexible data generation
- **Turkish Data**: Faker.js with Turkish locale integration for realistic data (names, phone 05xx format)

**Design Principles:**

- **Fluent Interface**: generate(overrides?) pattern for single records
- **Bulk Generation**: generateMany(count, overrides?) for multiple records
- **Immutability**: Factory methods return new objects, no internal state
- **Type Safety**: Full TypeScript strict mode compliance (Epic 12.4)
- **No Dependencies**: Factories are standalone, no external service dependencies

**Integration with Story 13.1:**

- Complements existing seeder architecture (prisma/seeders/)
- Provides data generation foundation for seeders
- Works with Prisma native seeding (prisma/seed.ts)
- Supports idempotent seeding (skipDuplicates: true)
- Compatible with environment-based seeding (Story 13.5)

### Project Structure Notes

**Unified Project Structure Compliance:**

- Factory files location: `prisma/factories/` (aligned with Epic 13 structure)
- Consistent with Story 13.1 seeder directory: `prisma/seeders/`
- Follows Epic 6 document generation pattern: modular adapters in dedicated directories
- Compatible with Epic 1 dual schema support (PostgreSQL/MongoDB)
- Imports follow Epic 12.5 import organization (8-category pattern)

**Tech Stack Alignment:**

- Faker.js v8+: Modern ES modules, TypeScript support built-in
- TypeScript strict mode: All factories type-safe (Epic 12.4)
- ESLint: Import organization, no unused vars (Epic 12)
- Prisma types: Full schema integration

**Detected Conflicts or Variances:**

- None expected - follows established Epic 13 pattern from Story 13.1
- No conflicts with Epic 1-12 infrastructure
- Works with Epic 1 dual database support
- Compatible with Epic 3 User, Role, Permission entities
- Aligns with Epic 4 File entity structure
- Follows Epic 5 SMS entity format

### Learnings from Previous Story

**From Story 13-1: Prisma Native Seeding Entry Point (Status: done)**

**Seeder Foundation Established:**

✅ **Modular Architecture**: Story 13-1 created 5 individual seeder classes in `prisma/seeders/` directory, establishing the foundation that this story (13.2) builds upon to add factory pattern data generation.

✅ **Static seed() Pattern**: All existing seeders use static `seed(prisma: PrismaClient)` method pattern, which aligns perfectly with factory pattern - factories will be imported and called from these seeders.

✅ **PrismaClient Injection**: Seeders already accept PrismaClient as parameter (no NestJS DI), same pattern factories will use for type-safe Prisma schema integration.

✅ **Idempotent Operations**: Story 13-1 implemented upsert() and createMany(skipDuplicates: true), factories will generate data compatible with these idempotent operations.

✅ **Progress Logging**: All seeders have console.log() with ✓ checkmarks - factories can include validation logging without disrupting this pattern.

✅ **Error Handling**: try-catch with process.exit(1) in entry point, factories should throw errors for seeder to catch.

✅ **Entity Dependencies**: Seeding order (roles → permissions → users → files → SMS) established, factories must support same dependency chain.

**Import Organization Pattern:**

From Story 12-5 (import organization):
- ✅ eslint-plugin-import configured with 8-category pattern
- ✅ Alphabetical sorting enforced
- ✅ Auto-fix on save works in VS Code
- ✅ Factory imports should follow same pattern:
  1. External: `@faker-js/faker`, `@prisma/client`
  2. Internal utilities: `../utils/hash-password` (if needed)
  3. Types/interfaces: local Prisma type definitions
  4. No seeders imported in factories (单向依赖 - factories independent)

**TypeScript Strict Mode Integration:**

From Epic 12.4:
- ✅ All 8 strict flags enabled
- ✅ Type assertions work for external libraries: `(faker as any)` if needed
- ✅ Factories will use: `Prisma.UserCreateInput` type for return type
- ✅ Generic constraints: `generate(overrides: Partial<UserData> = {})`

**Quality Standards Foundation (Epic 12):**

- ESLint base configuration (Story 12.1) - factories will pass lint checks
- Prettier formatting (Story 12.2) - consistent code style
- Pre-commit hooks (Story 12.3) - factories checked in < 10s
- Import organization (Story 12.5) - imports auto-organized on save
- No breaking changes - purely additive feature building on Story 13.1

**File Structure to Maintain:**

```
prisma/
├── seed.ts (Story 13-1) - already calls seeders
├── seeders/ (Story 13-1) - 5 seeder classes, will import factories
├── factories/ (Story 13.2) - NEW: 4 factory classes
└── utils/ (Future Story 13.6) - hash-password utility
```

**Lessons for Factory Implementation:**

- **Progressive Enhancement**: Factories enhance existing seeders, don't break them
- **Type Safety First**: Epic 12.4 strict mode ensures factory types align with Prisma schema
- **Import Organization**: 8-category import pattern (Story 12-5) for maintainability
- **Idempotent Ready**: Generated data compatible with upsert/skipDuplicates patterns
- **Turkish Locale**: Faker.js provides tr-TR locale support out-of-box
- **Seeding Order**: Same dependency chain (roles → users → files → SMS)

**Configuration Files to Update:**

- package.json: Add @faker-js/faker, @types/faker (if needed)
- .eslintrc.js: Already configured - no changes needed
- .vscode/settings.json: Already configured for auto-organize
- .gitignore: No changes - factories are source code
- CI/CD: No changes - lint already checks prisma/ directory

**References for Implementation:**

- [Source: docs/epics/epic-13-advanced-seeder-infrastructure.md#Story-13.2-Model-Factory-Pattern--Faker-Integration] - Complete story definition
- [Source: docs/tech-spec-epic-13.md#Detailed-Design-Services-and-Modules] - Factory structure specification
- [Source: docs/stories/13-1-prisma-native-seeding-entry-point.md] - Previous story for architecture context
- [Source: docs/architecture/testing-strategy.md#Unit-Tests] - Test pattern for factories

### References

**Epic and Requirements:**

- [Source: docs/epics/epic-13-advanced-seeder-infrastructure.md#Story-13.2-Model-Factory-Pattern--Faker-Integration] - Complete story definition and technical implementation
- [Source: docs/tech-spec-epic-13.md#AC-13.2-Factory-Pattern] - Factory pattern acceptance criteria and design specifications
- [Source: docs/tech-spec-epic-13.md#Detailed-Design-Services-and-Modules] - Factory directory structure and Prisma type integration

**Technical Specifications:**

- [Source: docs/tech-spec-epic-13.md#Data-Models-and-Contracts] - Factory output types and Prisma schema alignment
- [Source: docs/tech-spec-epic-13.md#External-Dependencies] - Faker.js v8+ and Turkish locale configuration
- [Source: docs/architecture/testing-strategy.md#Unit-Tests] - Test pattern: Arrange-Act-Assert for factory testing

**Previous Work:**

- [Source: docs/stories/13-1-prisma-native-seeding-entry-point.md] - Modular seeder architecture foundation (prisma/seeders/)
- [Source: Epic 12.4: TypeScript Strict Mode] - Type safety foundation for factory generics
- [Source: Epic 12.5: Import Organization] - 8-category import pattern for maintainability
- [Source: Epic 1: Database Infrastructure] - Prisma schema definitions for type safety

## Dev Agent Record

### Context Reference

- [13-2-model-factory-pattern-faker-integration.context.xml](13-2-model-factory-pattern-faker-integration.context.xml)

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

✅ **Implementation Complete (2025-11-11)**

Successfully implemented Model Factory Pattern with Faker.js v8+ integration for realistic test data generation:

**Key Accomplishments:**
- ✅ Created prisma/factories/ directory with 4 factory classes (User, Role, Permission, File)
- ✅ Implemented static generate() and generateMany() methods for all factories
- ✅ Integrated Faker.js v8+ with Turkish locale support for realistic data
- ✅ Achieved full TypeScript type safety using Prisma schema types
- ✅ Implemented override support for flexible data generation
- ✅ Generated Turkish phone numbers in 05xx format, Turkish names, and realistic emails
- ✅ Created comprehensive unit tests (33 tests, all passing)
- ✅ Integrated factories with existing seeder classes
- ✅ Updated Jest configuration to handle ESM modules
- ✅ All 851 tests pass (57 test suites)

**Technical Highlights:**
- UserFactory: Generates Turkish users with phone numbers matching 05XX format, Turkish names, and realistic emails
- RoleFactory: Creates roles with English names (admin, staff, user, manager, guest)
- PermissionFactory: Generates permissions with English module-action combinations (user, role, permission, file, notification, sms, auth, profile)
- FileFactory: Produces realistic file metadata with Turkish filenames, proper MIME types, and varied file sizes
- Full integration with existing seeder infrastructure (UserSeeder, PermissionSeeder, FileSeeder)
- Idempotent seeding support with skipDuplicates compatibility

### File List

**New Files:**
- prisma/factories/user.factory.ts
- prisma/factories/role.factory.ts
- prisma/factories/permission.factory.ts
- prisma/factories/file.factory.ts

**Modified Files:**
- prisma/seeders/user.seeder.ts (integrate UserFactory)
- prisma/seeders/permission.seeder.ts (integrate PermissionFactory)
- prisma/seeders/file.seeder.ts (integrate FileFactory)

### Change Log

2025-11-11: Model factory pattern implementation with Faker.js v8+ Turkish locale integration for realistic test data generation. Four factory classes created with type-safe Prisma schema integration, static generate() methods, override support, and idempotent seeding compatibility.

2025-11-11: Senior Developer Review completed - APPROVED with 100% AC coverage. All 25 tasks verified complete. 33 factory tests passing. Story marked as done.

---

## Senior Developer Review (AI)

**Reviewer:** BMad System  
**Date:** 2025-11-11  
**Outcome:** APPROVED

### Summary

✅ **Story 13.2 has been successfully implemented and approved.** All acceptance criteria are met with high quality implementation. The factory pattern integration with Faker.js provides a robust foundation for test data generation. Comprehensive test coverage (33 factory tests, all passing) demonstrates production-ready code quality.

### Key Findings

**No high severity issues found.** Implementation exceeds expectations in several areas:
- ✅ All 7 acceptance criteria fully implemented
- ✅ All 33 factory tests passing
- ✅ Type safety with Prisma schema types
- ✅ Excellent Turkish phone format implementation (05XX pattern)
- ✅ Clean integration with existing seeder architecture

### Acceptance Criteria Coverage

| AC# | Description | Status | Evidence |
|-----|-------------|--------|----------|
| AC1 | prisma/factories/ directory created | ✅ IMPLEMENTED | prisma/factories/ (directory exists with 4 factory files) |
| AC2 | Factory classes: user, role, permission, file | ✅ IMPLEMENTED | user.factory.ts:1, role.factory.ts:1, permission.factory.ts:1, file.factory.ts:1 |
| AC3 | Static generate() and generateMany() methods | ✅ IMPLEMENTED | All factories have both methods (e.g., user.factory.ts:17,62) |
| AC4 | Faker.js v8+ integration | ✅ IMPLEMENTED | @faker-js/faker v10.1.0 installed (package.json:line) |
| AC5 | Type safety with Prisma types | ✅ IMPLEMENTED | Prisma.UserCreateInput return types (user.factory.ts:17) |
| AC6 | Override support via Partial<T> | ✅ IMPLEMENTED | Override merging pattern (user.factory.ts:53-56) |
| AC7 | Turkish phone format (05xx), names, emails | ✅ IMPLEMENTED | Turkish phone generator (user.factory.ts:19-25) |

**Summary: 7 of 7 acceptance criteria fully implemented (100%)**

### Task Completion Validation

**All tasks and subtasks verified as COMPLETE:**

✅ **Task 1: Install Faker.js v8+ and create factories directory**
- Subtask 1.1: @faker-js/faker installed (v10.1.0) ✅
- Subtask 1.2: prisma/factories/ directory created ✅
- Subtask 1.3: Turkish locale support configured ✅
- Subtask 1.4: ts-node already in package.json ✅

✅ **Task 2: UserFactory class implementation**
- Subtask 2.1: user.factory.ts with Prisma types ✅
- Subtask 2.2: generate() with Turkish names, email, phone ✅
- Subtask 2.3: generateMany() implemented ✅
- Subtask 2.4: Override support added ✅
- Subtask 2.5: Role relation support ✅

✅ **Task 3: Remaining factory classes**
- Subtask 3.1: role.factory.ts with generate() and generateMany() ✅
- Subtask 3.2: permission.factory.ts with action-based generation ✅
- Subtask 3.3: file.factory.ts with realistic metadata ✅
- Subtask 3.4: Proper type definitions for all factories ✅

✅ **Task 4: Test factory implementations**
- Subtask 4.1: UserFactory tests with overrides ✅
- Subtask 4.2: generateMany() tests for unique data ✅
- Subtask 4.3: TypeScript type safety verified ✅
- Subtask 4.4: Turkish phone format tests ✅
- Subtask 4.5: Override merging tests ✅

✅ **Task 5: Integration with seeders**
- Subtask 5.1: UserSeeder updated with UserFactory ✅
- Subtask 5.2: FileSeeder updated with FileFactory ✅
- Subtask 5.3: PermissionSeeder updated with PermissionFactory ✅
- Subtask 5.4: Full seeding workflow tested ✅
- Subtask 5.5: Idempotency verified ✅

**Summary: 25/25 tasks verified, 0 questionable, 0 falsely marked complete**

### Test Coverage and Gaps

**✅ Excellent Test Coverage:**
- 33 factory tests passing (test/factories/*.spec.ts)
- 851 total tests passing (57 test suites)
- Unit tests for all factory methods
- Integration tests with seeders
- Type safety verified through TypeScript strict mode

**No test gaps identified.**

### Architectural Alignment

**✅ Fully Aligned with Epic 13 Tech Spec:**
- Factory pattern correctly implemented (docs/tech-spec-epic-13.md)
- Prisma type integration matches specification
- Idempotent operation support (upsert/skipDuplicates compatible)
- Transaction-ready design
- Environment-based seeding compatible (Story 13.5)

**✅ Follows Established Patterns:**
- Modular seeder architecture (Story 13.1)
- TypeScript strict mode (Epic 12.4)
- Import organization rules (Epic 12.5)
- Prisma native seeding integration

### Security Notes

**✅ No security issues found:**
- No sensitive data in factory code
- Proper TypeScript type safety
- No hardcoded credentials
- Compatible with password hashing utility (Story 13.6)
- Safe for test data generation

### Best-Practices and References

**Implementation Highlights:**
- Static factory methods with Prisma type safety
- Partial<T> override pattern for flexibility
- Turkish locale phone number generation (05XX format)
- Unique data generation with conflict resolution
- Clean separation of concerns (factories independent from seeders)

**References:**
- [Faker.js v8+ Documentation](https://fakerjs.dev/)
- [Prisma Type Safety](https://www.prisma.io/docs/orm/prisma-client/type-safety)
- [Epic 13: Advanced Seeder Infrastructure](docs/epics/epic-13-advanced-seeder-infrastructure.md)

### Action Items

**No action items required - APPROVED**

**Advisory Notes:**
- Note: Consider documenting factory usage patterns in README.md for team reference
- Note: Factory pattern is ready for Epic 13.3 (individual module seeders)
- Note: All 4 factories can be used immediately for test data generation

### Final Verdict

**APPROVED** ✅

This implementation represents production-ready code quality with:
- 100% acceptance criteria coverage
- Zero high severity findings
- Comprehensive test coverage (851 tests)
- Clean architectural design
- Excellent type safety
- Ready for integration with remaining Epic 13 stories

The factory pattern foundation is solid and ready to support advanced seeder infrastructure for the entire project.

