# Story 16.1: Update User Prisma Model (Remove Legacy Role Field)

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

**Status:** TODO
**Epic:** epic-16-clean-relational-role-design
**Dev Agent Record:**
- Context Reference: (Will be populated by @story-context)
