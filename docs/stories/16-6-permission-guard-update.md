# Story 16.6: Permission Guard Update (Multi-Tenant)

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

**Status:** ready-for-dev
**Epic:** epic-16-clean-relational-role-design
**Dev Agent Record:**
- Context Reference: docs/stories/16-6-permission-guard-update.context.xml
