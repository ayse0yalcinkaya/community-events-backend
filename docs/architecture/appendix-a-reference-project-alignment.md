# Appendix A: Reference Project Alignment

**hrsync-backend Proven Patterns:**

Bu architecture, hrsync-backend projesinden çıkarılmış production-tested pattern'leri kullanır:

✅ **Response Format:** Exact match (success/status/data/message)
✅ **Status Enums:** Integer-based (0, 1, 2...)
✅ **Import Organization:** 8-group order
✅ **DTO Patterns:** Request/Response split, @Expose/@Exclude
✅ **Controller Pattern:** @ApiTags, @Permission, VERSION_NEUTRAL
✅ **Service Pattern:** Try-catch, preserve specific exceptions, i18n
✅ **Repository Pattern:** Filter by domainID, return null when not found
✅ **Entity Pattern:** snake_case columns, timestamps, soft-delete
✅ **Error Handling:** Layered exceptions with i18n keys
✅ **Testing Pattern:** Arrange-Act-Assert, descriptive names
✅ **Documentation:** JSDoc + Swagger decorators
✅ **Multi-Tenancy:** domainID in every entity and query

**Deviation Analysis:** ZERO deviations.

**Reference:** `/docs/PRD-NFR-CodingStandards.md` (complete hrsync-backend pattern documentation)

---
