# ADR-001: Clean Relational Role Design

## Status

**Accepted** - 2025-11-13

## Context

The application previously used a hybrid approach for role management:
- The `User` model had a `role` string field with enum values ('admin', 'staff', 'manager')
- A `Role` table existed but wasn't fully utilized
- Permission checking used the `User.role` field directly

This approach had several problems:
1. **Data Duplication**: Role information was stored in both the Role table and User table
2. **Limited Flexibility**: Users could only have one role
3. **Inconsistency Risk**: Role data could become inconsistent between tables
4. **Migration Complexity**: Difficult to transition to a full relational model
5. **Multi-tenancy Issues**: Role names weren't domain-scoped

## Decision

We decided to implement a **clean relational design** for role management:

1. Remove the `role` string field from the User model
2. Use the UserRole junction table as the ONLY way to assign roles to users
3. Make role names unique within a domain (not globally)
4. Support multiple roles per user through the junction table
5. Maintain backward compatibility through proper migration

## Rationale

### Benefits of Clean Relational Design

#### 1. Eliminates Data Duplication
```prisma
// BEFORE: Role stored in TWO places
model User {
  role String @default("staff")  ❌ Duplicated data
}

model Role {
  name String
}

// AFTER: Single source of truth
model User {
  userRoles UserRole[]  ✅ Only relational
}

model UserRole {
  userID String
  roleID String
}
```

#### 2. Supports Multiple Roles Per User
Users can now have multiple roles:
```typescript
const user = await prisma.user.findUnique({
  where: { id: userId },
  include: {
    userRoles: {
      include: { role: true }
    }
  }
});

// User can be both admin AND manager
console.log(user.userRoles.map(ur => ur.role.name));
// Output: ['admin', 'manager']
```

#### 3. Domain-Scoped Role Names
```prisma
// BEFORE: Global role names
// Domain A: admin
// Domain B: admin  ❌ Same name, potential conflicts

// AFTER: Domain-scoped
// Domain A: admin (unique within Domain A)
// Domain B: admin (unique within Domain B)
model Role {
  name String
  @@unique([domainID, name])  ✅ Domain-scoped uniqueness
}
```

#### 4. Flexible Permission System
```typescript
// Effective permissions = Role permissions + Direct permissions
const permissions = await authorizationService.getUserPermissions(
  user.id,
  user.domainID
);
// Includes:
// - Permissions from roles (via UserRole → Role → RolePermission → Permission)
// - Direct user permissions (via UserPermission → Permission)
```

#### 5. Better Maintainability
- Single source of truth for role definitions
- Easy to add new roles without schema changes
- Clear separation of concerns
- Database-level referential integrity

## Implementation Details

### Database Changes

1. **User Model** - Remove `role` field
2. **Role Model** - Add unique constraint on `(domainID, name)`
3. **UserRole** - Keep as junction table with composite key

### Application Changes

#### AuthService.register()
```typescript
async register(registerDto: RegisterDto) {
  return this.prisma.$transaction(async (tx) => {
    // 1. Create user (no role field)
    const user = await tx.user.create({ /* ... */ });

    // 2. Assign default 'staff' role via UserRole
    const defaultRole = await tx.role.findFirst({
      where: { name: 'staff', domainID: user.domainID }
    });

    await tx.userRole.create({
      data: {
        userID: user.id,
        roleID: defaultRole.id,
        domainID: user.domainID
      }
    });

    return user;
  });
}
```

#### AuthService.loginAdmin()
```typescript
async loginAdmin(loginDto: LoginAdminDto) {
  const user = await this.prisma.user.findFirst({
    where: { phoneNumber: loginDto.phoneNumber },
    include: {
      userRoles: { include: { role: true } }
    }
  });

  // Check admin role via UserRole junction
  const hasAdminRole = user.userRoles.some(
    (ur) => ur.role.name === 'admin'
  );

  if (!hasAdminRole) {
    throw new ForbiddenException();
  }

  // ... continue login
}
```

### DTO Changes

```typescript
// BEFORE
class CreateUserDto {
  @IsEnum(['admin', 'staff', 'manager'])
  role!: string;  ❌ Remove this
}

// AFTER
class CreateUserDto {
  // Role automatically assigned
  // No role field in DTO
}
```

## Migration Strategy

### Step 1: Backfill UserRole Records
```typescript
const users = await prisma.user.findMany({
  where: { NOT: { role: null } },
  select: { id: true, domainID: true, role: true }
});

for (const user of users) {
  const role = await prisma.role.findFirst({
    where: { name: user.role, domainID: user.domainID }
  });

  await prisma.userRole.create({
    data: {
      userID: user.id,
      roleID: role.id,
      domainID: user.domainID
    }
  });
}
```

### Step 2: Drop Role Column
```sql
ALTER TABLE users DROP COLUMN role;
```

### Step 3: Validate Migration
- All users have at least one role
- No duplicate UserRole records
- All UserRole records reference valid users and roles

## Testing Strategy

### Unit Tests
- Registration assigns default role
- Login checks roles via UserRole
- Permission calculation includes roles

### Integration Tests
- User registration flow
- Role assignment flow
- Permission checking flow

### E2E Tests
- Complete user journey with roles
- Multi-domain role isolation

## Performance Considerations

### Query Optimization
```typescript
// Use eager loading to avoid N+1 queries
const user = await prisma.user.findUnique({
  where: { id: userId },
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

### Caching
- Consider caching user permissions
- Invalidate cache on role changes
- Use domain-based cache keys

## Alternatives Considered

### Alternative 1: Keep Hybrid Approach
**Rejected because:**
- Maintains data duplication
- Doesn't solve the fundamental issues
- More complex to maintain

### Alternative 2: Full De-normalization
**Rejected because:**
- Loses referential integrity
- Difficult to query
- Harder to maintain consistency

### Alternative 3: Separate Role Table Per Domain
**Rejected because:**
- Schema proliferation
- Complex migrations
- Operational overhead

## Consequences

### Positive
- ✅ Cleaner database schema
- ✅ Better data integrity
- ✅ More flexible permission system
- ✅ Easier to extend with new roles
- ✅ Natural multi-tenant support
- ✅ Better testability

### Negative
- ⚠️ Requires data migration
- ⚠️ Breaking change for API consumers
- ⚠️ Requires code updates throughout codebase
- ⚠️ Learning curve for new developers

### Neutral
- ↔️ Slightly more complex queries (offset by eager loading)
- ↔️ Additional join tables (acceptable trade-off)

## Migration Timeline

| Phase | Duration | Tasks |
|-------|----------|-------|
| Preparation | 1 week | Create migration scripts, test on staging |
| Migration | 1 day | Execute migration, validate data |
| Code Updates | 1 week | Update all code references, run tests |
| Deployment | 1 day | Deploy to production, monitor |
| Validation | 3 days | Monitor metrics, fix any issues |

## Rollback Plan

If critical issues occur:

1. **Re-add role column** to users table
2. **Populate from UserRole** data
3. **Keep UserRole table** for future migration
4. **Update code** to use role field temporarily
5. **Investigate and fix** issues
6. **Re-attempt migration** when ready

## Success Metrics

- [ ] Zero users without roles after migration
- [ ] No increase in permission check latency
- [ ] All tests pass (827 tests)
- [ ] No increase in error rate
- [ ] Login success rate maintained
- [ ] Code maintainability improved (subjective)

## Monitoring

Post-migration monitoring:
- Login success/failure rates
- Permission check latency
- Database query performance
- Error rates in application logs
- User activity metrics

## References

- [Clean Role Design Architecture](clean-role-design.md)
- [Migration Guide](../migrations/clean-relational-migration-guide.md)
- [Permission System Diagram](permission-system-diagram.md)
- Epic 16: Clean Relational Role Design

## Decision Date

**2025-11-13**

## Decision Makers

- Development Team
- Architecture Team
- Product Owner

---

**ADR Status**: Active
**Review Date**: 2026-11-13
