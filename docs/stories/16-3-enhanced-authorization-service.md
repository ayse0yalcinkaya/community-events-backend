# Story 16.3: Enhanced Authorization Service (Clean Calculation)

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

**Status:** TODO
**Epic:** epic-16-clean-relational-role-design
**Dev Agent Record:**
- Context Reference: (Will be populated by @story-context)
