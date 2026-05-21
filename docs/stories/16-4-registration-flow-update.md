# Story 16.4: Registration Flow Update (Role Assignment)

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

**Status:** ready-for-dev
**Epic:** epic-16-clean-relational-role-design
**Dev Agent Record:**
- Context Reference: docs/stories/16-4-registration-flow-update.context.xml
