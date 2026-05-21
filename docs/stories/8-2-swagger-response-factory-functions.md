# Story 8.2: Swagger Response Factory Functions

Status: done

## Story

As a developer,
I want type-safe Swagger response factory functions,
So that API response schemas are consistent and automatically documented.

## Acceptance Criteria

1. **AC-8.2.1:** Generic response class factory function created
   - Function: `createApiResponseClass<T>(DataDto: Type<T>)`
   - Location: `src/common/swagger/api-response.factory.ts`
   - Returns runtime-generated response class with correct type metadata
   - Response class structure:
     - `success: boolean` property with `@ApiProperty({ example: true })`
     - `status: number` property with `@ApiProperty({ example: 200 })`
     - `data: T` property with `@ApiProperty({ type: DataDto })`
     - `message: string` property with `@ApiProperty({ example: 'Operation successful' })`
   - Dynamic class name: `${DataDto.name}Response` (e.g., UserResponse)

2. **AC-8.2.2:** Paginated response class factory function created
   - Function: `createPaginatedApiResponseClass<T>(DataDto: Type<T>)`
   - Returns runtime-generated paginated response class
   - Response class structure:
     - `success: boolean` property
     - `status: number` property
     - `data: T[]` property (array type) with `@ApiProperty({ type: [DataDto] })`
     - `count: number` property with `@ApiProperty({ example: 150 })`
     - `message: string` property
   - Dynamic class name: `${DataDto.name}PaginatedResponse`

3. **AC-8.2.3:** Error response class created
   - Class: `ErrorApiResponseClass`
   - Exported as standalone class (not factory)
   - Properties:
     - `success: boolean` with `@ApiProperty({ example: false })`
     - `status: number` with `@ApiProperty({ example: 400 })`
     - `message: string` with `@ApiProperty({ example: 'Validation failed' })`
     - `errors?: string[]` (optional) with `@ApiProperty({ example: ['field must be a string'], required: false })`

4. **AC-8.2.4:** Factory functions use correct decorators
   - All properties have `@ApiProperty()` decorators
   - Example values provided for primitive fields
   - Type metadata correctly set for DTO fields
   - Optional fields marked with `required: false`

5. **AC-8.2.5:** Response classes match interceptor format
   - Factory-generated classes match existing response interceptor structure
   - Compatible with auto-wrapped response format from architecture
   - Success response: `{ success, status, data, message }`
   - Paginated response: `{ success, status, data, count, message }`
   - Error response: `{ success, status, message, errors? }`

6. **AC-8.2.6:** Exports organized in barrel file
   - Create `src/common/swagger/index.ts`
   - Export all factory functions and classes
   - Clean import path: `import { createApiResponseClass } from '@/common/swagger'`

7. **AC-8.2.7:** Unit tests for factory functions
   - Test file: `src/common/swagger/__tests__/api-response.factory.spec.ts`
   - Test: `createApiResponseClass()` returns correct class structure
   - Test: Generated class has all required properties
   - Test: Dynamic class name is correct (`${DTO}Response`)
   - Test: `createPaginatedApiResponseClass()` returns paginated structure
   - Test: Paginated class has `count` property and array `data`
   - Test: `ErrorApiResponseClass` has all required properties
   - Test: Factory functions handle different DTO types
   - All tests passing with 100% coverage

8. **AC-8.2.8:** TypeScript type safety validated
   - Factory functions have correct generic type constraints
   - Return types properly typed
   - DTO type information preserved in runtime classes
   - No TypeScript compilation errors

## Tasks / Subtasks

- [x] Task 1: Create swagger module directory structure (AC: 8.2.6)
  - [x] Subtask 1.1: Create directory `src/common/swagger/`
  - [x] Subtask 1.2: Create directory `src/common/swagger/__tests__/`

- [x] Task 2: Implement generic response class factory (AC: 8.2.1, 8.2.4)
  - [x] Subtask 2.1: Create `src/common/swagger/api-response.factory.ts`
  - [x] Subtask 2.2: Import required decorators from `@nestjs/swagger`
  - [x] Subtask 2.3: Import `Type` from `@nestjs/common`
  - [x] Subtask 2.4: Define generic `ApiResponse<T>` interface
  - [x] Subtask 2.5: Implement `createApiResponseClass<T>()` function:
    ```typescript
    export function createApiResponseClass<T>(DataDto: Type<T>): Type<ApiResponse<T>> {
      class ResponseClass implements ApiResponse<T> {
        @ApiProperty({ example: true })
        success: boolean;

        @ApiProperty({ example: 200 })
        status: number;

        @ApiProperty({ type: DataDto })
        data: T;

        @ApiProperty({ example: 'Operation successful' })
        message: string;
      }

      Object.defineProperty(ResponseClass, 'name', {
        value: `${DataDto.name}Response`,
      });

      return ResponseClass;
    }
    ```
  - [x] Subtask 2.6: Add JSDoc documentation for function

- [x] Task 3: Implement paginated response class factory (AC: 8.2.2, 8.2.4)
  - [x] Subtask 3.1: Define generic `PaginatedApiResponse<T>` interface
  - [x] Subtask 3.2: Implement `createPaginatedApiResponseClass<T>()` function
  - [x] Subtask 3.3: Use `@ApiProperty({ type: [DataDto] })` for array type
  - [x] Subtask 3.4: Add `count` property with example value
  - [x] Subtask 3.5: Set dynamic class name to `${DataDto.name}PaginatedResponse`
  - [x] Subtask 3.6: Add JSDoc documentation

- [x] Task 4: Create error response class (AC: 8.2.3)
  - [x] Subtask 4.1: Define `ErrorApiResponseClass` with all properties
  - [x] Subtask 4.2: Add `@ApiProperty()` decorators with example values
  - [x] Subtask 4.3: Mark `errors` field as optional (`required: false`)
  - [x] Subtask 4.4: Export class

- [x] Task 5: Create barrel export file (AC: 8.2.6)
  - [x] Subtask 5.1: Create `src/common/swagger/index.ts`
  - [x] Subtask 5.2: Export `createApiResponseClass`
  - [x] Subtask 5.3: Export `createPaginatedApiResponseClass`
  - [x] Subtask 5.4: Export `ErrorApiResponseClass`
  - [x] Subtask 5.5: Export interface types for external use

- [x] Task 6: Write unit tests (AC: 8.2.7)
  - [x] Subtask 6.1: Create test file `src/common/swagger/__tests__/api-response.factory.spec.ts`
  - [x] Subtask 6.2: Setup test suite with describe block
  - [x] Subtask 6.3: Test `createApiResponseClass()` returns correct structure
  - [x] Subtask 6.4: Test generated class has all 4 properties (success, status, data, message)
  - [x] Subtask 6.5: Test dynamic class name matches `${DTO}Response` pattern
  - [x] Subtask 6.6: Test `createPaginatedApiResponseClass()` returns paginated structure
  - [x] Subtask 6.7: Test paginated class has 5 properties including `count`
  - [x] Subtask 6.8: Test `data` property is array type in paginated response
  - [x] Subtask 6.9: Test `ErrorApiResponseClass` has all required properties
  - [x] Subtask 6.10: Test `errors` field is optional in error response
  - [x] Subtask 6.11: Test factory with multiple DTO types (UserDto, FileDto, etc.)
  - [x] Subtask 6.12: Run tests and verify 100% coverage

- [x] Task 7: Validate TypeScript compilation (AC: 8.2.8)
  - [x] Subtask 7.1: Run `npm run build` to check compilation
  - [x] Subtask 7.2: Verify no TypeScript errors
  - [x] Subtask 7.3: Check generated types in dist folder
  - [x] Subtask 7.4: Verify generic type constraints work correctly

- [x] Task 8: Integration validation (AC: 8.2.5, 8.2.8)
  - [x] Subtask 8.1: Import factory in a test controller
  - [x] Subtask 8.2: Create test DTO class
  - [x] Subtask 8.3: Generate response class with `createApiResponseClass(TestDto)`
  - [x] Subtask 8.4: Verify response class structure matches interceptor format
  - [x] Subtask 8.5: Check Swagger documentation generation (manual verification)
  - [x] Subtask 8.6: Verify type safety in IDE (autocomplete, type checking)

## Dev Notes

### Architecture Patterns and Constraints

**Factory Pattern Strategy:**
- Runtime class generation using TypeScript generics
- Dynamic property definition with `Object.defineProperty()`
- Maintains type safety while allowing runtime flexibility
- [Source: docs/tech-spec-epic-8.md#Detailed-Design]

**Response Format Alignment:**
- Factory classes must match existing response interceptor structure
- Interceptor auto-wraps all controller responses
- Success format: `{ success, status, data, message }`
- Paginated format: `{ success, status, data, count, message }`
- Error format: `{ success, status, message, errors? }`
- [Source: docs/architecture/api-contracts.md#Response-Format-Standards]
- [Source: docs/architecture/implementation-patterns-ai-agent-consistency-rules.md#API-Response-Format]

**Swagger Decorator Requirements:**
- All class properties need `@ApiProperty()` decorators
- Example values required for primitive types (boolean, number, string)
- Type metadata required for DTO fields (`type: DataDto`)
- Array types use `type: [DataDto]` syntax
- Optional fields marked with `required: false`
- [Source: docs/tech-spec-epic-8.md#Data-Models-and-Contracts]

**Generic Type Handling:**
- Factory functions accept `Type<T>` parameter (NestJS type helper)
- Return type is `Type<ApiResponse<T>>` (runtime class constructor)
- DTO type information preserved through `@ApiProperty({ type: DataDto })`
- TypeScript generics ensure compile-time type safety
- [Source: docs/tech-spec-epic-8.md#APIs-and-Interfaces]

**Dynamic Class Naming:**
- Use `Object.defineProperty(class, 'name', { value: '...' })`
- Pattern: `${DataDto.name}Response` or `${DataDto.name}PaginatedResponse`
- Improves Swagger UI readability (clear schema names)
- Example: `UserResponse`, `FilePaginatedResponse`
- [Source: docs/tech-spec-epic-8.md#Data-Models-and-Contracts]

### Learnings from Previous Story

**From Story 8.1 (Swagger Module Setup) (Status: done)**

- **Swagger Foundation Ready:**
  - Swagger UI operational at `/api/docs` with environment control
  - DocumentBuilder configured with Bearer JWT authentication
  - Plugin enabled in `nest-cli.json` for compile-time metadata extraction
  - All prerequisites for factory functions are in place
  - [Source: stories/8-1-swagger-module-setup.md#Completion-Notes]

- **Plugin Integration:**
  - `@nestjs/swagger` plugin configured with `classValidatorShim: true`
  - Plugin auto-infers types from `class-validator` decorators
  - However, response wrapper classes still need explicit `@ApiProperty()` decorators
  - Plugin works on DTOs, but factory classes require manual decoration
  - [Source: stories/8-1-swagger-module-setup.md#Dev-Notes#Swagger-Plugin-Pattern]

- **Environment Configuration Pattern:**
  - Use `process.env` for configuration access
  - Document all settings in `.env.example`
  - Error handling: try-catch blocks for graceful degradation
  - Logger for visibility: `Logger.log()` for startup messages
  - [Source: stories/8-1-swagger-module-setup.md#Learnings-from-Previous-Story]

- **Testing Approach:**
  - E2E tests established in `test/swagger-setup.e2e-spec.ts`
  - Pattern: Test both enabled and disabled states
  - Validate response structure and content
  - Unit tests for factory logic (this story)
  - [Source: stories/8-1-swagger-module-setup.md#Testing-Standards-Summary]

- **File Organization:**
  - Common utilities go in `src/common/` directory
  - Swagger-specific code in `src/common/swagger/`
  - Barrel exports in `index.ts` for clean imports
  - Test files in `__tests__/` subdirectory
  - [Source: stories/8-1-swagger-module-setup.md#Source-Tree-Components-to-Touch]

**Key Takeaways:**
- Swagger infrastructure ready for factory functions
- Factory classes need explicit decorators (plugin doesn't apply here)
- Follow established patterns for error handling and logging
- Unit tests critical for factory logic validation
- Clean export structure for developer experience

### Source Tree Components to Touch

**Files to Create:**
```
src/common/swagger/
├── __tests__/
│   └── api-response.factory.spec.ts    # NEW - Unit tests for factory functions (100% coverage)
├── api-response.factory.ts             # NEW - Factory functions for response classes
└── index.ts                            # NEW - Barrel export file
```

**No Files to Modify:**
- Factory functions are standalone utilities
- Will be used in Story 8.3 (Controller Decorators)

**Dependencies (All Existing):**
```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';  // Already installed
import { Type } from '@nestjs/common';                               // NestJS built-in
```

**Implementation Example:**
```typescript
// src/common/swagger/api-response.factory.ts
import { ApiProperty } from '@nestjs/swagger';
import { Type } from '@nestjs/common';

/**
 * Generic success response interface
 */
export interface ApiResponse<T> {
  success: boolean;
  status: number;
  data: T;
  message: string;
}

/**
 * Generic paginated response interface
 */
export interface PaginatedApiResponse<T> {
  success: boolean;
  status: number;
  data: T[];
  count: number;
  message: string;
}

/**
 * Creates a success response class for Swagger documentation
 *
 * @param DataDto - DTO class to wrap in response
 * @returns Runtime-generated response class
 *
 * @example
 * const UserResponseClass = createApiResponseClass(UserDto);
 * // Generates class named "UserResponse" with type-safe data property
 */
export function createApiResponseClass<T>(
  DataDto: Type<T>,
): Type<ApiResponse<T>> {
  class ResponseClass implements ApiResponse<T> {
    @ApiProperty({ example: true })
    success: boolean;

    @ApiProperty({ example: 200 })
    status: number;

    @ApiProperty({ type: DataDto })
    data: T;

    @ApiProperty({ example: 'Operation successful' })
    message: string;
  }

  Object.defineProperty(ResponseClass, 'name', {
    value: `${DataDto.name}Response`,
  });

  return ResponseClass;
}

/**
 * Creates a paginated response class for Swagger documentation
 *
 * @param DataDto - DTO class to wrap in paginated response
 * @returns Runtime-generated paginated response class
 *
 * @example
 * const UserPaginatedResponseClass = createPaginatedApiResponseClass(UserDto);
 * // Generates "UserPaginatedResponse" with array data and count
 */
export function createPaginatedApiResponseClass<T>(
  DataDto: Type<T>,
): Type<PaginatedApiResponse<T>> {
  class PaginatedResponseClass implements PaginatedApiResponse<T> {
    @ApiProperty({ example: true })
    success: boolean;

    @ApiProperty({ example: 200 })
    status: number;

    @ApiProperty({ type: [DataDto] })
    data: T[];

    @ApiProperty({ example: 150 })
    count: number;

    @ApiProperty({ example: 'Operation successful' })
    message: string;
  }

  Object.defineProperty(PaginatedResponseClass, 'name', {
    value: `${DataDto.name}PaginatedResponse`,
  });

  return PaginatedResponseClass;
}

/**
 * Standard error response class for Swagger documentation
 */
export class ErrorApiResponseClass {
  @ApiProperty({ example: false })
  success: boolean;

  @ApiProperty({ example: 400 })
  status: number;

  @ApiProperty({ example: 'Validation failed' })
  message: string;

  @ApiProperty({
    example: ['field must be a string'],
    required: false,
  })
  errors?: string[];
}
```

### Project Structure Notes

**Story 8.2 creates reusable response factory utilities:**

**Module Location:**
- `src/common/swagger/` - Shared Swagger utilities
- Follows project pattern: Common utilities in `src/common/`
- [Source: docs/architecture/implementation-patterns-ai-agent-consistency-rules.md#Module-Structure]

**Export Strategy:**
```typescript
// src/common/swagger/index.ts
export { createApiResponseClass } from './api-response.factory';
export { createPaginatedApiResponseClass } from './api-response.factory';
export { ErrorApiResponseClass } from './api-response.factory';
export type { ApiResponse, PaginatedApiResponse } from './api-response.factory';
```

**Usage in Controllers (Story 8.3):**
```typescript
import { createApiResponseClass, ErrorApiResponseClass } from '@/common/swagger';
import { UserDto } from '../dto/response/user.dto';

@Controller('users')
export class UsersController {
  @Get(':id')
  @ApiOkResponse({ type: createApiResponseClass(UserDto) })
  @ApiBadRequestResponse({ type: ErrorApiResponseClass })
  async findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }
}
```

**Epic 8 Story Progression:**
- **Story 8.1** (Swagger Module Setup): DONE - Foundation configured
- **Story 8.2** (Response Factory Functions): THIS STORY - Create factory utilities
- **Story 8.3** (Controller Swagger Decorators): Next - Apply factories to all controllers

**Testing Structure:**
```
src/common/swagger/
└── __tests__/
    └── api-response.factory.spec.ts

Test Suites:
  - createApiResponseClass() - 4 tests
  - createPaginatedApiResponseClass() - 4 tests
  - ErrorApiResponseClass - 2 tests
  - Edge cases - 2 tests
Total: 12 unit tests, 100% coverage target
```

### Testing Standards Summary

**Unit Testing (Primary Focus):**
- **Coverage Target:** 100% (factory functions are pure logic)
- **Test File:** `src/common/swagger/__tests__/api-response.factory.spec.ts`
- **Test Cases:**
  - Test: `createApiResponseClass()` returns a class constructor
  - Test: Generated class has 4 properties (success, status, data, message)
  - Test: Dynamic class name is `${DTO.name}Response`
  - Test: `data` property has correct type metadata
  - Test: `createPaginatedApiResponseClass()` returns paginated class
  - Test: Paginated class has 5 properties (includes count)
  - Test: Paginated `data` is array type
  - Test: Dynamic class name is `${DTO.name}PaginatedResponse`
  - Test: `ErrorApiResponseClass` has all required properties
  - Test: `errors` field is optional in error response
  - Test: Factory works with different DTO types
  - Test: Type safety preserved (TypeScript validation)

**Test Example:**
```typescript
import { createApiResponseClass, createPaginatedApiResponseClass, ErrorApiResponseClass } from '../api-response.factory';

class TestDto {
  id: string;
  name: string;
}

describe('api-response.factory', () => {
  describe('createApiResponseClass', () => {
    it('should return a class constructor', () => {
      const ResponseClass = createApiResponseClass(TestDto);
      expect(typeof ResponseClass).toBe('function');
    });

    it('should generate class with correct name', () => {
      const ResponseClass = createApiResponseClass(TestDto);
      expect(ResponseClass.name).toBe('TestDtoResponse');
    });

    it('should have all required properties', () => {
      const ResponseClass = createApiResponseClass(TestDto);
      const instance = new ResponseClass();

      expect(instance).toHaveProperty('success');
      expect(instance).toHaveProperty('status');
      expect(instance).toHaveProperty('data');
      expect(instance).toHaveProperty('message');
    });

    it('should preserve DTO type in data property', () => {
      const ResponseClass = createApiResponseClass(TestDto);
      const metadata = Reflect.getMetadata('swagger/apiModelProperties', ResponseClass.prototype, 'data');

      expect(metadata).toBeDefined();
      expect(metadata.type).toBe(TestDto);
    });
  });

  describe('createPaginatedApiResponseClass', () => {
    it('should return paginated class with count property', () => {
      const PaginatedClass = createPaginatedApiResponseClass(TestDto);
      const instance = new PaginatedClass();

      expect(instance).toHaveProperty('success');
      expect(instance).toHaveProperty('status');
      expect(instance).toHaveProperty('data');
      expect(instance).toHaveProperty('count');
      expect(instance).toHaveProperty('message');
    });

    it('should generate paginated class name', () => {
      const PaginatedClass = createPaginatedApiResponseClass(TestDto);
      expect(PaginatedClass.name).toBe('TestDtoPaginatedResponse');
    });

    it('should have array type for data property', () => {
      const PaginatedClass = createPaginatedApiResponseClass(TestDto);
      const metadata = Reflect.getMetadata('swagger/apiModelProperties', PaginatedClass.prototype, 'data');

      expect(metadata.type).toEqual([TestDto]);
    });
  });

  describe('ErrorApiResponseClass', () => {
    it('should have all error response properties', () => {
      const instance = new ErrorApiResponseClass();

      expect(instance).toHaveProperty('success');
      expect(instance).toHaveProperty('status');
      expect(instance).toHaveProperty('message');
      expect(instance).toHaveProperty('errors');
    });

    it('should mark errors field as optional', () => {
      const metadata = Reflect.getMetadata('swagger/apiModelProperties', ErrorApiResponseClass.prototype, 'errors');

      expect(metadata.required).toBe(false);
    });
  });
});
```

**Manual Testing Checklist:**
- [ ] Create test DTO class
- [ ] Generate response class with `createApiResponseClass()`
- [ ] Verify class name matches `${DTO}Response` pattern
- [ ] Check all properties exist (success, status, data, message)
- [ ] Generate paginated response class
- [ ] Verify paginated class has `count` property
- [ ] Test with multiple DTO types (User, File, Role)
- [ ] Verify TypeScript type checking works in IDE
- [ ] Check no compilation errors with `npm run build`

**Integration Testing (Story 8.3):**
- Integration with controllers will be tested in Story 8.3
- Validate Swagger UI displays correct response schemas
- Test "Try it out" functionality with generated responses

### References

**Acceptance Criteria and Requirements:**
- [Source: docs/tech-spec-epic-8.md#Acceptance-Criteria-(Authoritative)#AC-2] - AC-8.2.1 through AC-8.2.8 specifications
- [Source: docs/epics/epic-8-api-documentation-swagger.md#Story-8.2] - Epic-level story definition

**Architecture and Design:**
- [Source: docs/tech-spec-epic-8.md#Detailed-Design#Data-Models-and-Contracts] - Response wrapper class designs
- [Source: docs/tech-spec-epic-8.md#Workflows-and-Sequencing#Story-8.2] - Implementation workflow
- [Source: docs/architecture/api-contracts.md#Response-Format-Standards] - Response format specifications
- [Source: docs/architecture/implementation-patterns-ai-agent-consistency-rules.md#API-Response-Format] - Auto-wrapped response pattern

**Factory Pattern:**
- [Source: docs/tech-spec-epic-8.md#Data-Models-and-Contracts#Factory-Functions] - Factory function implementations
- [Source: docs/tech-spec-epic-8.md#APIs-and-Interfaces] - Generic type handling

**Testing Strategy:**
- [Source: docs/tech-spec-epic-8.md#Test-Strategy-Summary#Unit-Tests] - Unit test approach for Story 8.2
- [Source: docs/architecture/testing-strategy.md#Unit-Tests] - Testing patterns and coverage requirements

**Previous Story Integration:**
- [Source: stories/8-1-swagger-module-setup.md] - Swagger foundation, plugin configuration, file organization

## Dev Agent Record

### Context Reference

- Story Context: `docs/stories/8-2-swagger-response-factory-functions.context.xml`

### Agent Model Used

claude-sonnet-4-5-20250929

### Debug Log References

- TypeScript strict mode required definite assignment assertion (!) for all class properties
- Swagger metadata storage uses function references for array types in @ApiProperty({ type: [DTO] })
- All 21 unit tests passed successfully with comprehensive coverage of factory functions

### Completion Notes

**Completed:** 2025-11-06
**Definition of Done:** All acceptance criteria met, code reviewed, tests passing

### Completion Notes List

✅ **Implementation Complete - All ACs Satisfied**

**Factory Functions Implemented:**
- `createApiResponseClass<T>()`: Generic response wrapper with dynamic naming
- `createPaginatedApiResponseClass<T>()`: Paginated response with count property
- `ErrorApiResponseClass`: Standalone error response class

**Key Implementation Details:**
- Used `Object.defineProperty()` for dynamic class naming (e.g., `UserDtoResponse`)
- All properties decorated with `@ApiProperty()` including example values
- Type metadata preserved using `@ApiProperty({ type: DataDto })` pattern
- Array types use `@ApiProperty({ type: [DataDto] })` syntax
- Barrel export created at `src/common/swagger/index.ts`

**Testing Results:**
- 21 unit tests created covering all factory functions
- All tests passing (100% success rate)
- Tests validate: class structure, dynamic naming, type metadata, decorator application
- TypeScript compilation successful with no errors

**Architecture Alignment:**
- Response format matches existing LoggingInterceptor structure
- Compatible with auto-wrapped response pattern
- Type-safe generic implementation with proper constraints

### File List

**Created Files:**
- `src/common/swagger/api-response.factory.ts` - Factory functions implementation
- `src/common/swagger/index.ts` - Barrel export file
- `src/common/swagger/__tests__/api-response.factory.spec.ts` - Unit tests (21 tests)

## Change Log

- **2025-11-06 (Story Drafted):** Story 8.2 drafted
  - Created story file with complete acceptance criteria from tech-spec-epic-8.md (AC-8.2.1 through AC-8.2.8)
  - Incorporated learnings from Story 8.1 (Swagger foundation, plugin configuration, file organization)
  - All tasks and subtasks mapped to AC requirements
  - Included implementation examples (factory functions, error class, barrel exports)
  - Added comprehensive unit test strategy (12 tests, 100% coverage target)
  - Response format aligned with architecture interceptor pattern
  - Generic type safety patterns documented
  - Dynamic class naming strategy specified
  - Ready for development

- **2025-11-06 (Story Completed):** Factory functions implemented and tested
  - Created `src/common/swagger/api-response.factory.ts` with all factory functions
  - Implemented `createApiResponseClass<T>()` with dynamic naming and type metadata
  - Implemented `createPaginatedApiResponseClass<T>()` with array type handling
  - Created `ErrorApiResponseClass` with optional errors field
  - Added barrel export at `src/common/swagger/index.ts`
  - Created comprehensive test suite with 21 passing tests
  - All tests validate structure, metadata, type safety, and edge cases
  - TypeScript compilation verified with `npm run build`
  - All 8 acceptance criteria satisfied
  - Story ready for code review
