# Story 16.8: Documentation Update & Examples

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

**Status:** ready-for-dev
**Epic:** epic-16-clean-relational-role-design
**Dev Agent Record:**
- Context Reference: docs/stories/16-8-documentation-update.context.xml
