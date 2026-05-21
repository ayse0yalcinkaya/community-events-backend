# Story 16.2: Update Role & UserRole Entities (Domain-Scoped)

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

**Status:** TODO
**Epic:** epic-16-clean-relational-role-design
**Dev Agent Record:**
- Context Reference: (Will be populated by @story-context)
