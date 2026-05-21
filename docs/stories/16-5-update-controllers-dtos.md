# Story 16.5: Update Controllers & DTOs (Remove Role Field)

**As a** developer,
**I want** controllers and DTOs updated to reflect clean design,
**So that** the API is consistent with new model.

**Acceptance Criteria:**
1. CreateUserDto: Remove @IsEnum(['admin', 'staff']) role validation
2. UpdateUserDto: Remove role field
3. UserController: Update all endpoints
4. Admin user management: Use UserRole for role operations
5. Swagger documentation updated
6. API responses: No role string field
7. Request/Response DTOs clean

**DTO Updates:**
```typescript
// Before (OLD)
class CreateUserDto {
  @IsEnum(['admin', 'staff', 'manager'])
  role: string;  ❌ REMOVE THIS
}

// After (NEW)
class CreateUserDto {
  // Note: Role is automatically assigned during registration
  // No role field in DTO
}
```

**Controller Updates:**
- POST /users: Creates user, then assigns role via UserRole
- PATCH /users/:id: Updates user, manages roles separately
- GET /users/:id: Returns user with roles (via joins)

**Dependencies:** Story 16.4

---

**Status:** ready-for-dev
**Epic:** epic-16-clean-relational-role-design
**Dev Agent Record:**
- Context Reference: docs/stories/16-5-update-controllers-dtos.context.xml
