# Epic 16: Clean Relational Role Design (PRD Update)

**Goal:** Implement clean relational role design removing legacy role string field and establishing proper RBAC architecture

**Value Proposition:** Modern, scalable permission system with multi-tenant support, clean relational design, and backward compatibility

**Prerequisites:** Epic 3 (User Management & RBAC) - This is an UPDATE to Epic 3

**Why This Epic Exists:**
The existing Epic 3 has a hybrid approach (role string + relational). This epic implements the CLEAN relational design from the updated PRD - NO legacy role string field.

**Key Changes from Current Implementation:**
- Remove `role String @default("staff")` from User model
- Use ONLY UserRole junction table for role assignment
- Implement proper multi-tenant role management
- Update authorization service for clean calculation

---

## Story 16.1: Update User Prisma Model (Remove Legacy Role Field)

**As a** developer,
**I want** to remove the legacy role string field from User model,
**So that** we have a clean relational design without duplication.

**Acceptance Criteria:**
1. Remove `role String @default("staff")` field from User.prisma
2. Keep ONLY `userRoles UserRole[]` relation
3. Ensure User model compiles without errors
4. Prisma generate succeeds
5. Database migration script created
6. Rollback plan documented
7. User data migration path defined

**Technical Notes:**
- This is a BREAKING CHANGE requiring data migration
- Existing users' role field data must be migrated to UserRole junction
- Default role assignment for users without roles
- Prisma migration: alter table drop column role
- Cascade delete properly configured

**Migration Strategy:**
```sql
-- For PostgreSQL:
-- 1. Create junction table if not exists
-- 2. Insert into UserRole from existing User.role values
-- 3. Alter table drop column role
```

**Dependencies:** Epic 3 Story 3.4 (existing role entities)

---

## Story 16.2: Update Role & UserRole Entities (Domain-Scoped)

**As a** developer,
**I want** proper domain-scoped role management,
**So that** roles are unique within domains, not globally.

**Acceptance Criteria:**
1. Role model: `name String` unique per domain (not globally)
2. Unique constraint: @@unique([domainID, name])
3. UserRole junction includes domainID
4. All operations filter by domainID
5. Seed data creates roles per domain
6. Role validation within domain context
7. No global role names allowed

**Technical Notes:**
- Roles are scoped to tenants/domains
- Same role name can exist in different domains
- User can only have roles from their domain
- Foreign key: User.domainID = Role.domainID check
- Prisma @@unique([domainID, name])

**Domain Validation:**
- User registration requires domain context
- All role operations require domain verification
- Cross-domain role assignment forbidden

**Dependencies:** Story 16.1

---

## Story 16.3: Enhanced Authorization Service (Clean Calculation)

**As a** developer,
**I want** authorization service to calculate permissions cleanly,
**So that** permission checking is efficient and accurate.

**Acceptance Criteria:**
1. AuthorizationService updated for clean design
2. Permission calculation formula:
   ```
   Effective Permissions = 
     (User.userRoles → Role.rolePermissions → Permission) 
     + (User.userPermissions → Permission)
   ```
3. Multi-tenant filtering (domainID context)
4. Query optimization (avoid N+1 queries)
5. Caching layer ready (optional)
6. 100% unit test coverage
7. Performance benchmarks

**Technical Notes:**
- Single query with joins for permission check
- Include: userRoles → role → rolePermissions → permission
- Union with userPermissions
- DomainID mandatory in all queries
- Prisma includes and nested where clauses

**Query Example:**
```typescript
const user = await prisma.user.findUnique({
  where: { id: userID },
  include: {
    userRoles: {
      include: {
        role: {
          include: {
            rolePermissions: {
              include: { permission: true }
            }
          }
        }
      }
    },
    userPermissions: {
      include: { permission: true }
    }
  }
});
```

**Dependencies:** Story 16.2

---

## Story 16.4: Registration Flow Update (Role Assignment)

**As a** developer,
**I want** registration to automatically assign default role,
**So that** new users have proper permissions from creation.

**Acceptance Criteria:**
1. Registration flow updated (Epic 2 Story 2.2)
2. Create User → Assign default role via UserRole
3. Domain context required
4. Default role from domain's seed data
5. Role validation before assignment
6. Transaction-based (all or nothing)
7. OTP SMS after role assignment

**Technical Notes:**
- Use prisma.$transaction for atomic operations
- Default role lookup: WHERE domainID = user.domainID AND name = 'staff'
- Insert into UserRole junction table
- Error handling: rollback on failure
- Logging: who assigned what role when

**Registration Flow:**
```
1. Validate domain exists
2. Validate user data
3. Create User (NO role field!)
4. Get default role for domain
5. Insert UserRole (userID, roleID, domainID)
6. Send OTP SMS
7. Commit transaction
```

**Dependencies:** Story 16.3

---

## Story 16.5: Update Controllers & DTOs (Remove Role Field)

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

## Story 16.6: Permission Guard Update (Multi-Tenant)

**As a** developer,
**I want** permission guard to work with clean design,
**So that** authorization is domain-aware and efficient.

**Acceptance Criteria:**
1. PermissionsGuard updated (Epic 3 Story 3.6)
2. Domain context verification
3. Efficient permission checking (no extra queries)
4. Guard chains properly: JwtAuthGuard → PermissionsGuard
5. 403 Forbidden for insufficient permissions
6. 403 Forbidden for cross-domain access
7. Public routes bypass guard

**Technical Notes:**
- Get user with domainID from JWT
- Verify resource domainID matches user domainID
- Use AuthorizationService from Story 16.3
- No additional database queries in guard
- Fast-fail on domain mismatch

**Example:**
```typescript
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Permission('USERS', ActionEnum.CREATE)
async createUser() {
  // Domain automatically verified by guard
}
```

**Dependencies:** Story 16.5

---

## Story 16.7: Data Migration & Testing

**As a** developer,
**I want** data migration script and comprehensive tests,
**So that** existing users transition cleanly to new design.

**Acceptance Criteria:**
1. Migration script for existing users
2. Migrate User.role → UserRole junction
3. Backfill default roles for users without roles
4. Data validation after migration
5. Unit tests for all new/changed functionality
6. Integration tests for registration flow
7. E2E tests for permission checking

**Migration Script:**
```typescript
// Step 1: Get all users with role field
const users = await prisma.user.findMany({
  where: { NOT: { role: null } },
  select: { id: true, domainID: true, role: true }
});

// Step 2: Create UserRole records
for (const user of users) {
  await prisma.userRole.create({
    data: {
      userID: user.id,
      domainID: user.domainID,
      role: { connect: { name_domainID: { name: user.role, domainID: user.domainID } } }
    }
  });
}

// Step 3: Alter table drop column role
await prisma.$executeRawUnsafe('ALTER TABLE users DROP COLUMN role');
```

**Test Coverage:**
- User creation with default role
- Permission calculation (roles + direct)
- Domain isolation
- Registration flow
- Authorization guard
- Migration rollback plan

**Dependencies:** Story 16.6

---

## Story 16.8: Documentation Update & Examples

**As a** developer,
**I want** documentation updated for clean design,
**So that** team understands the new architecture.

**Acceptance Criteria:**
1. Updated API documentation (Swagger)
2. Migration guide (old → new)
3. Developer onboarding docs
4. Permission system diagram
5. Code examples in README
6. Troubleshooting guide
7. Architecture Decision Record (ADR)

**Documentation Sections:**
- Database schema (clean relational design)
- Permission calculation algorithm
- Domain isolation explanation
- Role management best practices
- Migration from legacy approach
- Common patterns and examples

**Diagram:**
```
User (NO role field!)
  ↓
UserRole ←→ Role ←→ RolePermission ←→ Permission
  ↓
UserPermission ←→ Permission (direct override)
```

**Dependencies:** Story 16.7

---

## Summary of Changes

**Before (Legacy):**
```prisma
model User {
  role String @default("staff")  ❌ Duplicate data
  userRoles UserRole[]
}
```

**After (Clean):**
```prisma
model User {
  // NO role string field!
  userRoles UserRole[]  ✅ ONLY relational
}
```

**Benefits:**
1. ✅ Single source of truth (no duplication)
2. ✅ Multi-tenant architecture
3. ✅ Clean permission calculation
4. ✅ Scalable role management
5. ✅ Proper database normalization

**Risk Mitigation:**
- Transaction-based operations
- Comprehensive testing
- Migration rollback plan
- Backward compatibility during transition

