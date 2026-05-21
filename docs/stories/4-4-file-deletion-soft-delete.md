# Story 4.4: File Deletion (Soft Delete)

Status: done

## Story

As a user,
I want dosya silebilmek,
So that gereksiz dosyaları sistemden kaldırabileyim.

## Acceptance Criteria

1. **AC-4.4.1:** DELETE /files/:id endpoint created
   - Route: DELETE /api/files/:id
   - Guards: JwtAuthGuard, PermissionsGuard
   - Permission: FILES.DELETE (or file owner)
   - Path parameter: id (UUID validation)
   - Returns success message on deletion

2. **AC-4.4.2:** Soft delete implemented
   - Sets deletedAt to current timestamp
   - Does NOT delete metadata from database
   - Does NOT delete file from S3 (deferred to cleanup job)
   - File excluded from all queries (WHERE deletedAt IS NULL)

3. **AC-4.4.3:** Deletion access validated
   - Checks: file exists && file.domainID === currentUserDomainID
   - Checks: file.userID === currentUserID OR user has FILES.DELETE permission
   - Returns 403 Forbidden if user not authorized
   - Returns 404 Not Found if file doesn't exist or already deleted

4. **AC-4.4.4:** Deletion response validated
   - Returns 200 OK on success
   - Response: `{ success: true, message: "File deleted successfully" }`
   - Subsequent GET /files/:id returns 404 Not Found
   - Subsequent GET /files/:id/download returns 404 Not Found

5. **AC-4.4.5:** Deletion logged
   - Logs file deletion event (info level)
   - Includes: fileID, s3Key, userID, domainID, timestamp
   - Logs who deleted the file (currentUserID)

6. **AC-4.4.6:** Soft-deleted files excluded from list endpoint
   - GET /files excludes files with deletedAt !== null
   - Admin with FILES.VIEW_ALL also doesn't see soft-deleted files
   - No way to list deleted files via API (future restore feature)

## Tasks / Subtasks

- [x] Task 1: Add DELETE /files/:id endpoint to FilesController (AC: 4.4.1, 4.4.3)
  - [x] Subtask 1.1: Create deleteFile() method in FilesController
  - [x] Subtask 1.2: Apply guards: @UseGuards(JwtAuthGuard, PermissionsGuard)
  - [x] Subtask 1.3: Apply permission decorator: @Permission('FILES', ActionEnum.DELETE)
  - [x] Subtask 1.4: Validate path parameter: @Param('id', ParseUUIDPipe)
  - [x] Subtask 1.5: Extract @CurrentUser() user (domainID, userID)
  - [x] Subtask 1.6: Call FilesService.deleteFile(id, domainID, userID)
  - [x] Subtask 1.7: Return 200 OK with success message

- [x] Task 2: Implement deleteFile() in FilesService (AC: 4.4.2, 4.4.3, 4.4.5)
  - [x] Subtask 2.1: Create deleteFile(fileId: string, domainID: string, userID: string, hasDeletePermission: boolean): Promise<void> method
  - [x] Subtask 2.2: Reuse getFileMetadata() to validate access (domain, ownership, permission check)
  - [x] Subtask 2.3: Check: file.deletedAt === null (if already deleted → throw NotFoundException)
  - [x] Subtask 2.4: Update file: set deletedAt to current timestamp (soft delete)
  - [x] Subtask 2.5: Log deletion event (info level): fileID, s3Key, userID, domainID, currentUserID
  - [x] Subtask 2.6: DO NOT delete from S3 (cleanup deferred to future job)
  - [x] Subtask 2.7: Return void (success)

- [x] Task 3: Update getFileMetadata() to exclude soft-deleted files (AC: 4.4.2, 4.4.4)
  - [x] Subtask 3.1: Add deletedAt === null check in getFileMetadata() query
  - [x] Subtask 3.2: If file.deletedAt !== null → throw NotFoundException (treat as not found)
  - [x] Subtask 3.3: Ensure download endpoint also excludes soft-deleted (uses getFileMetadata())

- [x] Task 4: Update listFiles() to exclude soft-deleted files (AC: 4.4.6)
  - [x] Subtask 4.1: Add WHERE deletedAt IS NULL filter in listFiles() query (Story 4.5)
  - [x] Subtask 4.2: Note: Story 4.5 will implement listFiles() - ensure filter is included

- [x] Task 5: Error handling (AC: 4.4.3, 4.4.4)
  - [x] Subtask 5.1: File not found → throw NotFoundException('File not found')
  - [x] Subtask 5.2: File in different domain → throw NotFoundException (don't leak file existence)
  - [x] Subtask 5.3: File already deleted (deletedAt !== null) → throw NotFoundException('File not found')
  - [x] Subtask 5.4: User not authorized (not owner, no permission) → throw ForbiddenException('Insufficient permissions')

- [x] Task 6: Testing (AC: All)
  - [x] Subtask 6.1: Unit test FilesService.deleteFile() (file exists, owner → Success)
  - [x] Subtask 6.2: Unit test FilesService.deleteFile() (file exists, user has FILES.DELETE → Success)
  - [x] Subtask 6.3: Unit test FilesService.deleteFile() (file not found → NotFoundException)
  - [x] Subtask 6.4: Unit test FilesService.deleteFile() (wrong domain → NotFoundException)
  - [x] Subtask 6.5: Unit test FilesService.deleteFile() (already deleted → NotFoundException)
  - [x] Subtask 6.6: Unit test FilesService.deleteFile() (not owner, no permission → ForbiddenException)
  - [x] Subtask 6.7: Unit test: Soft-deleted file excluded from getFileMetadata()
  - [x] Subtask 6.8: E2E test DELETE /files/:id (owner can delete)
  - [x] Subtask 6.9: E2E test DELETE /files/:id (invalid UUID → 400)
  - [x] Subtask 6.10: E2E test DELETE /files/:id (non-existent file → 404)
  - [x] Subtask 6.11: E2E test DELETE /files/:id (wrong domain → 404)
  - [x] Subtask 6.12: E2E test DELETE /files/:id (already deleted → 404)
  - [x] Subtask 6.13: E2E test DELETE /files/:id (unauthorized → 401)
  - [x] Subtask 6.14: E2E test: Upload file → Delete → GET /files/:id → 404
  - [x] Subtask 6.15: E2E test: Upload file → Delete → GET /files/:id/download → 404

## Dev Notes

### Architecture Patterns and Constraints

**Soft Delete Pattern:**
- DELETE endpoint sets deletedAt timestamp, does NOT remove database record
- S3 file remains in bucket (cleanup deferred to scheduled job in Epic 11)
- All query operations (GET, LIST) filter: WHERE deletedAt IS NULL
- Soft-deleted files treated as non-existent (404 Not Found)
- Future: Restore feature can set deletedAt = null to undelete
- [Source: docs/tech-spec-epic-4.md#Story-4.4]

**Access Control Strategy:**
- File owner can always delete own files (file.userID === currentUserID)
- Users with FILES.DELETE permission can delete any file in their domain
- Domain isolation: file.domainID must match currentUserDomainID
- Soft-deleted files excluded (file.deletedAt === null)
- Return 404 (not 403) for wrong domain to prevent information leakage
- [Source: docs/tech-spec-epic-4.md#Security]

**Reuse Existing Validation:**
- FilesService.getFileMetadata() already implements access control
- Reuse getFileMetadata() in deleteFile() to avoid duplicating validation logic
- getFileMetadata() checks: file exists, domain match, deletedAt === null, ownership/permission
- Fail-fast approach: Validate before soft delete
- [Source: stories/4-3-file-download-pre-signed-url.md#Dev-Notes]

**Error Handling Strategy:**
- File not found / wrong domain / already deleted → 404 Not Found (consistent response)
- Not authorized (not owner, no permission) → 403 Forbidden
- Log all access control failures for security monitoring
- [Source: docs/tech-spec-epic-4.md#Detailed-Design]

**S3 Cleanup Deferred:**
- Soft delete does NOT trigger S3 deleteFile() operation
- S3 cleanup will be scheduled job (Epic 11: CI/CD & Production)
- Scheduled job: Query files where deletedAt > 7 days → Delete from S3 → Hard delete DB record
- Rationale: Grace period for accidental deletions, potential restore feature
- [Source: docs/tech-spec-epic-4.md#Story-4.4]

### Source Tree Components to Touch

**Files to Modify:**
```
src/modules/files/
├── controllers/
│   └── files.controller.ts                 # MODIFIED - Add DELETE /files/:id endpoint
├── services/
│   ├── files.service.ts                    # MODIFIED - Add deleteFile() method, update getFileMetadata() with deletedAt filter
│   └── files.service.spec.ts               # MODIFIED - Add unit tests for deleteFile()
└── files.module.ts                         # NO CHANGES - Already configured

test/
└── files-upload.e2e-spec.ts                # MODIFIED - Add E2E tests for file deletion
```

**Dependencies from Previous Stories:**
- FilesService.getFileMetadata() (Story 4.3): Reuse for access validation
- File entity with deletedAt field (Story 4.2): Soft delete support
- FILES.DELETE permission (Story 4.2): Permission constant defined
- JwtAuthGuard (Epic 2): Authentication
- @CurrentUser decorator (Epic 2): Extract user from JWT
- PermissionsGuard (Epic 3): Authorization
- FilesController structure (Story 4.2): Add new DELETE endpoint

### Testing Standards Summary

**Unit Testing (FilesService.deleteFile()):**
- Test 1: Owner deletes file → deletedAt set, file not found on subsequent queries
- Test 2: User with FILES.DELETE permission deletes file → Success
- Test 3: File not found → Throws NotFoundException
- Test 4: File in different domain → Throws NotFoundException
- Test 5: File already deleted (deletedAt !== null) → Throws NotFoundException
- Test 6: Not owner, no FILES.DELETE → Throws ForbiddenException
- Test 7: Soft-deleted file → getFileMetadata() throws NotFoundException
- Test 8: Soft-deleted file → generateDownloadUrl() throws NotFoundException

**Integration Testing:**
- Test 1: DELETE /files/:id (owner) → 200 OK
- Test 2: DELETE /files/:id (user with FILES.DELETE) → 200 OK
- Test 3: DELETE /files/:id (user without FILES.DELETE) → 403 Forbidden
- Test 4: DELETE /files/:id (wrong domain) → 404 Not Found
- Test 5: DELETE /files/:id (already deleted) → 404 Not Found
- Test 6: DELETE /files/:id (no JWT) → 401 Unauthorized

**E2E Testing (with MinIO):**
- Test 1: Upload file → Delete → GET /files/:id → 404 Not Found
- Test 2: Upload file → Delete → GET /files/:id/download → 404 Not Found
- Test 3: Upload file → Delete → Verify file still in S3 (soft delete, S3 not affected)
- Test 4: Upload file as userA → Login as userB (same domain, has FILES.DELETE) → Delete → Success
- Test 5: Upload file as userA → Login as userB (different domain) → Delete → 404 Not Found

### Learnings from Previous Story

**From Story 4-3-file-download-pre-signed-url (Status: done)**

- **FilesService.getFileMetadata() Available:**
  - `src/modules/files/services/files.service.ts` already has getFileMetadata() method
  - Implements comprehensive access control: domain isolation + ownership check + permission-based access
  - Already checks file.deletedAt === null (soft-deleted files excluded)
  - **Reuse this method in deleteFile()** to avoid duplicating validation logic
  - [Source: stories/4-3-file-download-pre-signed-url.md#Completion-Notes-List]

- **File Entity Ready with Soft Delete Support:**
  - File entity in `prisma/schema.prisma` includes deletedAt field (nullable DateTime)
  - Indexes on deletedAt already exist (query performance)
  - Soft delete pattern established: Set deletedAt to current timestamp
  - [Source: stories/4-3-file-download-pre-signed-url.md#Project-Structure-Notes]

- **FilesController Structure:**
  - `src/modules/files/controllers/files.controller.ts` ready for new DELETE endpoint
  - Guards pattern established: @UseGuards(JwtAuthGuard, PermissionsGuard)
  - Permission decorator pattern: @Permission('FILES', ActionEnum.DELETE)
  - [Source: stories/4-3-file-download-pre-signed-url.md#Source-Tree-Components-to-Touch]

- **FILES.DELETE Permission Constant:**
  - FILES.DELETE already defined in `src/modules/permissions/constants/permissions.constant.ts` (Story 4.2)
  - Permission sync script already run (permission exists in database)
  - Use for DELETE endpoint authorization
  - [Source: stories/4-2-file-upload-endpoint-single-multiple.md#Completion-Notes-List]

- **Testing Infrastructure:**
  - E2E test suite `test/files-upload.e2e-spec.ts` exists (Story 4.2)
  - MinIO configured for local S3 testing
  - Add deletion tests to existing test suite
  - Test pattern established: Upload → Perform operation → Verify → Cleanup
  - [Source: stories/4-3-file-download-pre-signed-url.md#Dev-Notes]

- **Access Control Pattern:**
  - Multi-layer access control established: domainID + ownership + permission checks
  - Error handling pattern: 404 for not found/wrong domain, 403 for unauthorized
  - Return 404 (not 403) for wrong domain to prevent information leakage (security best practice)
  - [Source: stories/4-3-file-download-pre-signed-url.md#Architecture-Patterns-and-Constraints]

- **S3Service Ready:**
  - `S3Service.deleteFile(s3Key)` method already implemented in Story 4.1
  - **DO NOT use it in Story 4.4** - S3 cleanup deferred to scheduled job (Epic 11)
  - Soft delete only affects database metadata, not S3 storage
  - [Source: stories/4-1-aws-s3-configuration-service.md]

**Key Takeaway:**
- Story 4.4 builds on Story 4.3's access control infrastructure
- Focus on: deleteFile() method implementation, soft delete (set deletedAt), logging
- Reuse: getFileMetadata() for validation (already has all access checks)
- DO NOT delete from S3 - scheduled job will handle cleanup in Epic 11
- Ensure all query operations (GET, LIST, DOWNLOAD) filter deletedAt === null

### Project Structure Notes

Story 4.4 expands the Files module created in Story 4.1-4.3:

```
src/modules/files/
├── services/
│   ├── s3.service.ts                       # EXISTS - Story 4.1 (deleteFile method exists but NOT used in Story 4.4)
│   └── files.service.ts                    # MODIFIED - Add deleteFile() method, update getFileMetadata() with deletedAt filter
├── controllers/
│   └── files.controller.ts                 # MODIFIED - Add DELETE /files/:id endpoint
└── files.module.ts                         # NO CHANGES

prisma/
└── schema.prisma                           # EXISTS - File entity with deletedAt field from Story 4.2

test/
└── files-upload.e2e-spec.ts                # MODIFIED - Add E2E tests for file deletion
```

**File Entity (Prisma) - Already Exists:**
```prisma
model File {
  id           String    @id @default(uuid())
  domainID     String
  userID       String
  filename     String    // Sanitized filename
  originalName String    // Original uploaded filename
  mimeType     String
  size         Int       // Bytes
  s3Key        String    // S3 object key
  s3Bucket     String    // S3 bucket name
  createdAt    DateTime  @default(now())
  deletedAt    DateTime? // Soft delete - USED IN STORY 4.4

  user User @relation(fields: [userID], references: [id], onDelete: Cascade)

  @@index([domainID])
  @@index([userID])
  @@index([mimeType])
  @@index([deletedAt])  // Performance for soft-delete queries
  @@index([s3Key])
}
```

**Epic 4 Story Progression:**
- **Story 4.1** (AWS S3 Configuration): ✅ Done - S3Service.deleteFile() available (not used in 4.4)
- **Story 4.2** (File Upload): ✅ Done - File entity with deletedAt, FilesService, FilesController, FILES.DELETE permission
- **Story 4.3** (File Download): ✅ Done - getFileMetadata() with access control, generateDownloadUrl()
- **Story 4.4** (File Deletion): THIS STORY - deleteFile() method, soft delete, access control
- **Story 4.5** (File List): Depends on 4.4 - Paginated list must exclude deletedAt !== null

**Integration with Epic 3 (Permissions):**
- FILES.DELETE permission → Required for DELETE /files/:id (unless owner)
- FILES.VIEW permission → Used in Story 4.3 (GET endpoints)
- FILES.VIEW_ALL permission → Used in Story 4.5 (admin view all files)

**Access Control Logic:**
- **Owner access:** file.userID === currentUserID → Always allowed
- **Permission-based access:** hasPermission(FILES.DELETE) → Allowed for any file in domain
- **Domain isolation:** file.domainID === currentUserDomainID → Always enforced
- **Soft-delete filtering:** file.deletedAt === null → Always enforced

**Soft Delete vs Hard Delete:**
- **Soft delete (Story 4.4)**: Set deletedAt timestamp, metadata retained in DB, S3 file retained
- **Hard delete (Epic 11 scheduled job)**: Query deletedAt > 7 days → Delete from S3 → Delete DB record
- **Rationale**: Grace period for accidental deletions, potential restore feature, audit trail

**No Conflicts:**
- File deletion extends existing FilesService (no duplication)
- Reuses getFileMetadata() for access validation (consistent logic)
- Permission infrastructure ready (Epic 3 completed)
- S3Service.deleteFile() exists but intentionally NOT used (scheduled job will call it)

### References

**Acceptance Criteria and Requirements:**
- [Source: docs/tech-spec-epic-4.md#Story-4.4] - Complete AC specifications (AC-4.4.1 through AC-4.4.6)
- [Source: docs/epics.md#Story-4.4] - Epic-level story breakdown

**Architecture and Design:**
- [Source: docs/tech-spec-epic-4.md#Services-and-Modules] - FilesService design, IFilesService interface
- [Source: docs/tech-spec-epic-4.md#Data-Models-and-Contracts] - File entity with deletedAt field
- [Source: docs/tech-spec-epic-4.md#APIs-and-Interfaces] - DELETE /files/:id endpoint specification

**Soft Delete Pattern:**
- [Source: docs/tech-spec-epic-4.md#Story-4.4] - Soft delete implementation, S3 cleanup deferred
- [Source: docs/tech-spec-epic-4.md#Detailed-Design] - Soft delete pattern constraints

**Dependencies:**
- [Source: docs/tech-spec-epic-4.md#Dependencies-and-Integrations] - getFileMetadata() from Story 4.3, File entity from Story 4.2
- [Source: stories/4-3-file-download-pre-signed-url.md] - getFileMetadata() implementation, access control pattern

**Testing:**
- [Source: docs/tech-spec-epic-4.md#Test-Strategy-Summary] - Unit, integration, E2E test approach
- [Source: docs/tech-spec-epic-4.md#Traceability-Mapping] - AC-4.4.1 through AC-4.4.6 test coverage requirements

**Previous Story Learnings:**
- [Source: stories/4-3-file-download-pre-signed-url.md] - FilesService structure, getFileMetadata() access control, testing patterns

## Dev Agent Record

### Context Reference

- Story Context: `docs/stories/4-4-file-deletion-soft-delete.context.xml`

### Agent Model Used

claude-sonnet-4-5-20250929

### Debug Log References

**Implementation Plan (2025-11-06):**
1. Added DELETE /files/:id endpoint to FilesController with proper guards and permission checks
2. Implemented FilesService.deleteFile() method using soft delete pattern (sets deletedAt timestamp)
3. Reused getFileMetadata() for access control validation (already includes deletedAt filter)
4. Verified error handling covers all edge cases (404 for not found/deleted, 403 for unauthorized)
5. S3 files intentionally NOT deleted - cleanup deferred to scheduled job (Epic 11)

**Testing Strategy:**
- Unit tests: 7 tests for deleteFile() covering all scenarios (owner, permission, errors)
- E2E tests: 8 tests for DELETE endpoint covering full workflow
- All tests passed: Unit (31/31), E2E (27/27)

### Completion Notes

**Completed:** 2025-11-06
**Definition of Done:** All acceptance criteria met, code reviewed, tests passing

**✅ Implementation Complete:**

1. **DELETE Endpoint (FilesController:220-240):**
   - Route: DELETE /api/files/:id
   - Guards: JwtAuthGuard, PermissionsGuard
   - Permission: FILES.DELETE (or file owner)
   - Path validation: ParseUUIDPipe for UUID format
   - Response: { success: true, message: "File deleted successfully" }

2. **Soft Delete Logic (FilesService:487-519):**
   - Validates access via getFileMetadata() (reuses existing validation)
   - Sets deletedAt to current timestamp using Prisma update
   - Logs deletion event with fileID, s3Key, userID, domainID
   - S3 file NOT deleted (cleanup deferred to Epic 11 scheduled job)
   - Returns void on success

3. **Access Control (FilesService:368-417):**
   - getFileMetadata() already filters deletedAt === null (lines 395-398)
   - Domain isolation enforced (file.domainID === currentUserDomainID)
   - Ownership check (file.userID === currentUserID OR hasDeletePermission)
   - Error handling: 404 for not found/wrong domain/deleted, 403 for unauthorized

4. **Test Coverage:**
   - Unit tests (files.service.spec.ts:463-588): 7 deleteFile() tests
   - E2E tests (files-upload.e2e-spec.ts:523-695): 8 DELETE endpoint tests
   - All tests passing: Unit (31/31), E2E (27/27)

**Key Design Decisions:**
- Reused getFileMetadata() for access validation (DRY principle, consistent logic)
- Soft delete only: deletedAt timestamp set, DB record and S3 file retained
- S3 cleanup deferred to scheduled job (Epic 11) for grace period and potential restore
- Consistent error responses: 404 for all "not found" scenarios (prevents info leakage)

**Acceptance Criteria Validation:**
- AC-4.4.1 ✅: DELETE endpoint created with guards and permission checks
- AC-4.4.2 ✅: Soft delete implemented (deletedAt set, S3 not touched)
- AC-4.4.3 ✅: Access validation (domain, ownership, permission checks)
- AC-4.4.4 ✅: Correct responses (200 OK, 404 after deletion)
- AC-4.4.5 ✅: Deletion logged with all required fields
- AC-4.4.6 ✅: Soft-deleted files excluded from queries (getFileMetadata filter ready for Story 4.5)

### File List

**Modified Files:**
- src/modules/files/controllers/files.controller.ts
- src/modules/files/services/files.service.ts
- src/modules/files/services/files.service.spec.ts
- test/files-upload.e2e-spec.ts

## Change Log

- **2025-11-06 (Story Drafted):** Story 4.4 drafted
  - Created story file with complete acceptance criteria from tech-spec-epic-4.md
  - Incorporated learnings from Story 4.3 (getFileMetadata() with access control ready)
  - Incorporated learnings from Story 4.2 (File entity with deletedAt field ready)
  - All tasks and subtasks mapped to AC requirements (AC-4.4.1 through AC-4.4.6)
  - Soft delete pattern documented (deletedAt timestamp, S3 cleanup deferred to Epic 11)
  - Access control logic documented (owner check, FILES.DELETE permission, domain isolation)
  - Error handling strategy documented (404 for not found/wrong domain/already deleted, 403 for unauthorized)
  - Testing strategy documented (unit tests, E2E tests, soft-delete verification)
  - Ready for development (FilesService.getFileMetadata() from Story 4.3, File entity with deletedAt from Story 4.2 completed)

- **2025-11-06 (Story Completed):** Story 4.4 implementation completed and ready for review
  - **Implementation:** DELETE /files/:id endpoint added to FilesController with proper guards and permission checks
  - **Service Logic:** FilesService.deleteFile() implemented using soft delete pattern (sets deletedAt, does NOT touch S3)
  - **Access Control:** Reused getFileMetadata() for validation (domain, ownership, permission, soft-delete checks)
  - **Error Handling:** All edge cases covered (404 for not found/wrong domain/already deleted, 403 for unauthorized)
  - **Logging:** Deletion events logged with fileID, s3Key, userID, domainID
  - **Testing:** All unit tests (31/31) and E2E tests (27/27) passing
  - **Files Modified:** files.controller.ts, files.service.ts, files.service.spec.ts, files-upload.e2e-spec.ts
  - **Status:** Ready for code review (all acceptance criteria met, tests passing)
