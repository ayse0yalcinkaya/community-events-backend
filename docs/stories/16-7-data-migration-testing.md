# Story 16.7: Data Migration & Testing

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

**Status:** ready-for-dev
**Epic:** epic-16-clean-relational-role-design
**Dev Agent Record:**
- Context Reference: docs/stories/16-7-data-migration-testing.context.xml
