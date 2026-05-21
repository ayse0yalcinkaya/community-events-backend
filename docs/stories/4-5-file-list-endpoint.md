# Story 4.5: File List Endpoint

Status: done

## Story

As a user,
I want dosyalarımı listeleyebilmek,
So that hangi dosyaları upload ettiğimi görebilleyim.

## Acceptance Criteria

1. **AC-4.5.1:** GET /files endpoint created
   - Route: GET /api/files
   - Guards: JwtAuthGuard (NO permission guard)
   - Query parameters: page, limit, mimeType, search, sortBy, sortOrder
   - Returns paginated FileResDto[]

2. **AC-4.5.2:** Pagination implemented
   - Default: page=1, limit=20
   - Max limit: 100 items per page
   - Response includes meta: { page, limit, total, totalPages }
   - Uses Prisma skip/take for pagination

3. **AC-4.5.3:** Filtering implemented
   - mimeType filter: Supports wildcards (e.g., "image/*", "application/pdf")
   - search filter: Searches in originalName (case-insensitive LIKE)
   - Filters combined with AND logic
   - All filters optional

4. **AC-4.5.4:** Sorting implemented
   - Default: sortBy='createdAt', sortOrder='desc' (newest first)
   - Supported sort fields: createdAt, filename, size, mimeType
   - Sort order: 'asc' or 'desc'
   - Invalid sort fields rejected (400 Bad Request)

5. **AC-4.5.5:** Access control implemented
   - Regular user: Only sees own files (WHERE userID = currentUserID)
   - Admin with FILES.VIEW_ALL: Sees all files in domain (no userID filter)
   - Always filtered by domainID (WHERE domainID = currentUserDomainID)
   - Always excludes soft-deleted files (WHERE deletedAt IS NULL)

6. **AC-4.5.6:** List response validated
   - Response: `{ success: true, data: FileResDto[], meta: { page, limit, total, totalPages } }`
   - FileResDto[] is array of file metadata
   - meta.total is count of all matching files (not just current page)
   - meta.totalPages calculated correctly: Math.ceil(total / limit)

7. **AC-4.5.7:** Performance validated
   - Query uses indexes (domainID, userID, mimeType, deletedAt)
   - Response time < 150ms (p95) for 20 items
   - Pagination prevents loading entire table
   - No N+1 queries (eager load relations if needed)

## Tasks / Subtasks

- [x] Task 1: Create QueryFilesDto with validation (AC: 4.5.1, 4.5.2, 4.5.3, 4.5.4)
  - [x] Subtask 1.1: Create src/modules/files/dto/request/query-files.dto.ts
  - [x] Subtask 1.2: Add @IsOptional() page (default: 1, min: 1, type: number)
  - [x] Subtask 1.3: Add @IsOptional() limit (default: 20, min: 1, max: 100, type: number)
  - [x] Subtask 1.4: Add @IsOptional() @IsString() mimeType (filter by MIME type)
  - [x] Subtask 1.5: Add @IsOptional() @IsString() search (search in originalName)
  - [x] Subtask 1.6: Add @IsOptional() @IsString() sortBy (default: 'createdAt')
  - [x] Subtask 1.7: Add @IsOptional() @IsEnum(['asc', 'desc']) sortOrder (default: 'desc')
  - [x] Subtask 1.8: Apply @Type(() => Number) to page and limit for proper parsing

- [x] Task 2: Add GET /files endpoint to FilesController (AC: 4.5.1)
  - [x] Subtask 2.1: Create listFiles() method in FilesController
  - [x] Subtask 2.2: Apply guard: @UseGuards(JwtAuthGuard) (NO PermissionsGuard)
  - [x] Subtask 2.3: Use @Query(ValidationPipe) queryDto: QueryFilesDto
  - [x] Subtask 2.4: Extract @CurrentUser() user (domainID, userID, permissions)
  - [x] Subtask 2.5: Call FilesService.listFiles(queryDto, domainID, userID, hasViewAllPermission)
  - [x] Subtask 2.6: Return paginated response with data and meta

- [x] Task 3: Implement listFiles() in FilesService (AC: 4.5.2, 4.5.3, 4.5.4, 4.5.5)
  - [x] Subtask 3.1: Create listFiles(queryDto: QueryFilesDto, domainID: string, userID: string, hasViewAllPermission: boolean): Promise<{ data: File[], meta: PaginationMeta }> method
  - [x] Subtask 3.2: Build base filters: domainID === currentUserDomainID, deletedAt === null
  - [x] Subtask 3.3: Add userID filter ONLY if hasViewAllPermission === false (regular users see own files only)
  - [x] Subtask 3.4: Add mimeType filter if provided (support wildcards: "image/*" → LIKE 'image/%')
  - [x] Subtask 3.5: Add search filter if provided (originalName LIKE '%search%', case-insensitive)
  - [x] Subtask 3.6: Validate sortBy field (allowed: createdAt, filename, size, mimeType) → throw BadRequestException if invalid
  - [x] Subtask 3.7: Build orderBy clause: { [sortBy]: sortOrder }
  - [x] Subtask 3.8: Calculate skip: (page - 1) * limit
  - [x] Subtask 3.9: Query files: Prisma.file.findMany({ where: filters, skip, take: limit, orderBy })
  - [x] Subtask 3.10: Query total count: Prisma.file.count({ where: filters })
  - [x] Subtask 3.11: Calculate totalPages: Math.ceil(total / limit)
  - [x] Subtask 3.12: Return { data: files, meta: { page, limit, total, totalPages } }

- [x] Task 4: Add pagination meta type (AC: 4.5.6)
  - [x] Subtask 4.1: Create PaginationMeta interface or DTO (if not exists in common)
  - [x] Subtask 4.2: Define fields: page, limit, total, totalPages
  - [x] Subtask 4.3: Ensure ResponseTransformInterceptor handles meta field correctly

- [x] Task 5: Error handling (AC: 4.5.4)
  - [x] Subtask 5.1: Invalid sortBy field → throw BadRequestException('Invalid sort field')
  - [x] Subtask 5.2: Invalid page/limit values → ValidationPipe handles (400 Bad Request)
  - [x] Subtask 5.3: No files found → Return empty array with total: 0 (not an error)

- [x] Task 6: Testing (AC: All)
  - [x] Subtask 6.1: Unit test FilesService.listFiles() (regular user → only own files returned)
  - [x] Subtask 6.2: Unit test FilesService.listFiles() (admin with FILES.VIEW_ALL → all domain files returned)
  - [x] Subtask 6.3: Unit test: Pagination (page=2, limit=5 → correct skip/take)
  - [x] Subtask 6.4: Unit test: Filter by mimeType (mimeType='image/*' → only images)
  - [x] Subtask 6.5: Unit test: Filter by search (search='document' → matching files)
  - [x] Subtask 6.6: Unit test: Sorting (sortBy='size', sortOrder='asc' → sorted correctly)
  - [x] Subtask 6.7: Unit test: Soft-deleted files excluded (deletedAt !== null → not in results)
  - [x] Subtask 6.8: Unit test: Invalid sortBy → BadRequestException
  - [x] Subtask 6.9: E2E test GET /files (regular user → only own files)
  - [x] Subtask 6.10: E2E test GET /files (admin with FILES.VIEW_ALL → all domain files)
  - [x] Subtask 6.11: E2E test: Pagination (page=1, limit=10 → 10 items, correct meta)
  - [x] Subtask 6.12: E2E test: Filter by mimeType (mimeType='application/pdf' → only PDFs)
  - [x] Subtask 6.13: E2E test: Filter by search (search='test' → matching files)
  - [x] Subtask 6.14: E2E test: Sorting (sortBy='createdAt', sortOrder='desc' → newest first)
  - [x] Subtask 6.15: E2E test: Domain isolation (user from domainA cannot see domainB files)
  - [x] Subtask 6.16: E2E test: Soft-deleted files excluded (upload → delete → list → not in results)
  - [x] Subtask 6.17: E2E test: Unauthorized (no JWT → 401)

## Dev Notes

### Architecture Patterns and Constraints

**Pagination Pattern:**
- Standard pagination using Prisma skip/take pattern
- Default: page=1, limit=20 (reasonable defaults)
- Max limit: 100 (prevent performance issues from large queries)
- Meta includes: page, limit, total, totalPages (frontend can build pagination UI)
- [Source: docs/tech-spec-epic-4.md#Story-4.5]

**Filtering Strategy:**
- mimeType filter with wildcard support: "image/*" → Prisma query: `mimeType: { startsWith: 'image/' }`
- search filter: Case-insensitive LIKE on originalName → Prisma: `originalName: { contains: search, mode: 'insensitive' }`
- All filters optional and combined with AND logic
- [Source: docs/tech-spec-epic-4.md#APIs-and-Interfaces]

**Sorting Mechanism:**
- Allowed sort fields: createdAt, filename, size, mimeType (prevent SQL injection via field validation)
- Default: sortBy='createdAt', sortOrder='desc' (most recent files first)
- Invalid sort field → 400 Bad Request (fail-fast validation)
- [Source: docs/tech-spec-epic-4.md#Story-4.5]

**Access Control Logic:**
- **Regular user:** Only sees own files (WHERE userID = currentUserID)
- **Admin with FILES.VIEW_ALL permission:** Sees all files in domain (no userID filter)
- **Domain isolation (always enforced):** WHERE domainID = currentUserDomainID
- **Soft-delete filtering (always enforced):** WHERE deletedAt IS NULL
- NO PermissionsGuard on endpoint (custom logic in service based on FILES.VIEW_ALL)
- [Source: docs/tech-spec-epic-4.md#Story-4.5]

**Performance Optimization:**
- Database indexes on [domainID], [userID], [mimeType], [deletedAt] (already exist from Story 4.2)
- Compound index on [domainID, userID, deletedAt] recommended for user file list queries (check if exists)
- Pagination prevents loading entire table (skip/take limits query size)
- Response time target: < 150ms (p95) for 20 items
- [Source: docs/tech-spec-epic-4.md#Performance]

**Soft-Delete Pattern Compliance:**
- All queries MUST include deletedAt === null filter
- Soft-deleted files treated as non-existent (excluded from list)
- Even admin with FILES.VIEW_ALL cannot see soft-deleted files (no restore feature in MVP)
- [Source: docs/tech-spec-epic-4.md#Story-4.4]

### Source Tree Components to Touch

**Files to Modify:**
```
src/modules/files/
├── controllers/
│   └── files.controller.ts                 # MODIFIED - Add GET /files endpoint
├── services/
│   ├── files.service.ts                    # MODIFIED - Add listFiles() method
│   └── files.service.spec.ts               # MODIFIED - Add unit tests for listFiles()
├── dto/
│   └── request/
│       └── query-files.dto.ts              # NEW - Create pagination/filter DTO
└── files.module.ts                         # NO CHANGES

test/
└── files-upload.e2e-spec.ts                # MODIFIED - Add E2E tests for file listing
```

**Dependencies from Previous Stories:**
- File entity with indexes (Story 4.2): Ready for performant queries
- FilesController structure (Story 4.2-4.4): Add new GET endpoint
- FileResDto (Story 4.2): Reuse for response
- JwtAuthGuard (Epic 2): Authentication
- @CurrentUser decorator (Epic 2): Extract user from JWT
- FILES.VIEW_ALL permission (Epic 3): Check if user has admin permission
- AuthorizationService (Epic 3): hasPermission() method to check FILES.VIEW_ALL
- deletedAt filtering pattern (Story 4.4): Ensure soft-deleted files excluded

### Testing Standards Summary

**Unit Testing (FilesService.listFiles()):**
- Test 1: Regular user → Only own files returned (userID filter applied)
- Test 2: Admin with FILES.VIEW_ALL → All domain files returned (no userID filter)
- Test 3: Pagination (page=2, limit=5) → Correct skip (5) and take (5)
- Test 4: Filter by mimeType ('image/*') → Only images returned
- Test 5: Filter by search ('document') → Only files matching originalName
- Test 6: Sorting (sortBy='size', sortOrder='asc') → Files sorted by size ascending
- Test 7: Soft-deleted files excluded → Files with deletedAt !== null not in results
- Test 8: Invalid sortBy field → Throws BadRequestException
- Test 9: No files → Returns empty array with total: 0
- Test 10: Meta calculation → totalPages = Math.ceil(total / limit)

**Integration Testing:**
- Test 1: GET /files (regular user) → Only own files returned
- Test 2: GET /files (admin with FILES.VIEW_ALL) → All domain files returned
- Test 3: GET /files (user without FILES.VIEW_ALL) → Only own files (same as Test 1)
- Test 4: Pagination (page=1, limit=10) → 10 items, meta correct
- Test 5: Filter by mimeType ('application/pdf') → Only PDFs
- Test 6: Filter by search ('test') → Matching files
- Test 7: Sorting (sortBy='createdAt', sortOrder='desc') → Newest first
- Test 8: Domain isolation → User from domainA cannot see domainB files
- Test 9: Soft-deleted files excluded → Upload → Delete → List → Not in results
- Test 10: Unauthorized (no JWT) → 401 Unauthorized

**E2E Testing (with MinIO):**
- Test 1: Upload 25 files → GET /files?page=1&limit=20 → 20 items, meta.totalPages=2
- Test 2: GET /files?page=2&limit=20 → 5 items (remaining files)
- Test 3: Upload images and PDFs → GET /files?mimeType=image/* → Only images
- Test 4: Upload files with "test" in name → GET /files?search=test → Matching files
- Test 5: Upload files → GET /files?sortBy=size&sortOrder=asc → Sorted by size
- Test 6: Upload file as userA → Login as userB (same domain, no FILES.VIEW_ALL) → GET /files → userB's files only
- Test 7: Upload file as userA → Login as admin (has FILES.VIEW_ALL) → GET /files → All domain files including userA's
- Test 8: Upload file in domainA → Login as user in domainB → GET /files → domainB files only

### Learnings from Previous Story

**From Story 4-4-file-deletion-soft-delete (Status: done)**

- **Soft-Delete Filter Pattern Established:**
  - All query operations must include WHERE deletedAt IS NULL
  - getFileMetadata() already implements this filter (Story 4.3)
  - listFiles() MUST apply same filter (soft-deleted files treated as non-existent)
  - [Source: stories/4-4-file-deletion-soft-delete.md#AC-4.4.6]

- **File Entity Ready with Indexes:**
  - File entity in `prisma/schema.prisma` includes all necessary fields
  - Indexes on: domainID, userID, mimeType, deletedAt (query performance ready)
  - Compound index consideration: [domainID, userID, deletedAt] for user file list queries
  - [Source: stories/4-4-file-deletion-soft-delete.md#Project-Structure-Notes]

- **FilesController and FilesService Structure:**
  - `src/modules/files/controllers/files.controller.ts` ready for new GET endpoint
  - `src/modules/files/services/files.service.ts` ready for listFiles() method
  - Guards pattern established: @UseGuards(JwtAuthGuard)
  - [Source: stories/4-4-file-deletion-soft-delete.md#Source-Tree-Components-to-Touch]

- **FileResDto Available:**
  - FileResDto already defined in Story 4.2 (response format for file metadata)
  - Excludes sensitive fields: s3Key, s3Bucket, domainID, userID, deletedAt
  - Includes: id, filename, originalName, mimeType, size, sizeFormatted, createdAt
  - Reuse for list response (array of FileResDto)
  - [Source: stories/4-2-file-upload-endpoint-single-multiple.md]

- **Access Control Infrastructure Ready:**
  - FILES.VIEW_ALL permission defined in permissions constants (Story 3.3)
  - AuthorizationService.hasPermission() available for checking permissions (Epic 3)
  - @CurrentUser decorator extracts user from JWT (Epic 2)
  - Domain isolation pattern established: domainID filtering on all queries
  - [Source: stories/4-4-file-deletion-soft-delete.md#Access-Control-Pattern]

- **Testing Infrastructure:**
  - E2E test suite `test/files-upload.e2e-spec.ts` exists
  - MinIO configured for local S3 testing
  - Test pattern established: Upload → Perform operation → Verify → Cleanup
  - Add listing tests to existing test suite
  - [Source: stories/4-4-file-deletion-soft-delete.md#Testing-Infrastructure]

- **Performance Indexes Available:**
  - Database indexes on domainID, userID, mimeType, deletedAt already exist
  - Query performance optimized for filtering and sorting operations
  - Pagination (skip/take) prevents full table scans
  - [Source: docs/tech-spec-epic-4.md#Performance]

**Key Takeaway:**
- Story 4.5 completes the file management CRUD operations (Create, Read, Update/Delete done)
- Focus on: Pagination, filtering (mimeType, search), sorting, access control (regular vs admin)
- Reuse: File entity with indexes, FileResDto, FilesController/Service structure
- Critical: deletedAt === null filter (exclude soft-deleted files, established in Story 4.4)
- Access control: Regular users see own files, admins with FILES.VIEW_ALL see all domain files

### Project Structure Notes

Story 4.5 completes the Files module created in Story 4.1-4.4:

```
src/modules/files/
├── services/
│   ├── s3.service.ts                       # EXISTS - Story 4.1 (not used in Story 4.5)
│   └── files.service.ts                    # MODIFIED - Add listFiles() method
├── controllers/
│   └── files.controller.ts                 # MODIFIED - Add GET /files endpoint
├── dto/
│   ├── request/
│   │   └── query-files.dto.ts              # NEW - Pagination, filtering, sorting DTO
│   └── response/
│       └── file-res.dto.ts                 # EXISTS - Reuse from Story 4.2
└── files.module.ts                         # NO CHANGES

prisma/
└── schema.prisma                           # EXISTS - File entity with indexes from Story 4.2

test/
└── files-upload.e2e-spec.ts                # MODIFIED - Add E2E tests for file listing
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
  deletedAt    DateTime? // Soft delete - FILTER IN STORY 4.5

  user User @relation(fields: [userID], references: [id], onDelete: Cascade)

  @@index([domainID])
  @@index([userID])
  @@index([mimeType])
  @@index([deletedAt])  // Performance for soft-delete queries
  @@index([s3Key])
}
```

**Epic 4 Story Progression:**
- **Story 4.1** (AWS S3 Configuration): ✅ Done - S3Service available (not used in 4.5)
- **Story 4.2** (File Upload): ✅ Done - File entity, FilesService, FilesController, FileResDto
- **Story 4.3** (File Download): ✅ Done - getFileMetadata(), generateDownloadUrl()
- **Story 4.4** (File Deletion): ✅ Done - deleteFile(), soft delete pattern (deletedAt filter)
- **Story 4.5** (File List): THIS STORY - listFiles(), pagination, filtering, sorting, access control

**Integration with Epic 3 (Permissions):**
- FILES.VIEW_ALL permission → Used to determine if user can see all domain files
- Regular users (no FILES.VIEW_ALL) → Only see own files (userID filter)
- Admin users (has FILES.VIEW_ALL) → See all files in domain (no userID filter)

**Access Control Logic:**
- **Regular user:** WHERE userID = currentUserID (own files only)
- **Admin with FILES.VIEW_ALL:** No userID filter (all domain files)
- **Domain isolation (always):** WHERE domainID = currentUserDomainID (always enforced)
- **Soft-delete filtering (always):** WHERE deletedAt IS NULL (always enforced)

**Pagination and Performance:**
- Default: page=1, limit=20 (reasonable defaults for most UIs)
- Max limit: 100 (prevent performance degradation)
- Uses Prisma skip/take: skip = (page - 1) * limit, take = limit
- Total count query: Prisma.file.count({ where: filters })
- Response includes meta: { page, limit, total, totalPages }

**Filtering and Sorting:**
- **mimeType filter:** Supports wildcards (e.g., "image/*" → startsWith('image/'))
- **search filter:** Case-insensitive LIKE on originalName (Prisma: contains, mode: 'insensitive')
- **Sorting:** Allowed fields: createdAt, filename, size, mimeType (validated, prevents SQL injection)
- **Default sort:** createdAt DESC (newest files first)

**No Conflicts:**
- File listing extends existing FilesService (no duplication)
- Reuses FileResDto from Story 4.2 (consistent response format)
- Permission infrastructure ready (Epic 3 completed)
- Database indexes ready (Story 4.2)

### References

**Acceptance Criteria and Requirements:**
- [Source: docs/tech-spec-epic-4.md#Story-4.5] - Complete AC specifications (AC-4.5.1 through AC-4.5.7)
- [Source: docs/epics.md#Story-4.5] - Epic-level story breakdown

**Architecture and Design:**
- [Source: docs/tech-spec-epic-4.md#Services-and-Modules] - FilesService design, IFilesService interface
- [Source: docs/tech-spec-epic-4.md#Data-Models-and-Contracts] - File entity with indexes
- [Source: docs/tech-spec-epic-4.md#APIs-and-Interfaces] - GET /files endpoint specification

**Pagination and Filtering:**
- [Source: docs/tech-spec-epic-4.md#Story-4.5] - Pagination, filtering, sorting implementation
- [Source: docs/tech-spec-epic-4.md#Data-Models-and-Contracts] - QueryFilesDto specification

**Dependencies:**
- [Source: docs/tech-spec-epic-4.md#Dependencies-and-Integrations] - File entity from Story 4.2, FileResDto from Story 4.2
- [Source: stories/4-4-file-deletion-soft-delete.md] - Soft-delete filter pattern (deletedAt === null)

**Testing:**
- [Source: docs/tech-spec-epic-4.md#Test-Strategy-Summary] - Unit, integration, E2E test approach
- [Source: docs/tech-spec-epic-4.md#Traceability-Mapping] - AC-4.5.1 through AC-4.5.7 test coverage requirements

**Previous Story Learnings:**
- [Source: stories/4-4-file-deletion-soft-delete.md] - Soft-delete filter pattern, File entity with indexes, access control infrastructure

## Dev Agent Record

### Context Reference

- Story Context: `docs/stories/4-5-file-list-endpoint.context.xml`

### Completion Notes
**Completed:** 2025-11-06
**Definition of Done:** All acceptance criteria met, code reviewed, tests passing

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List

## Change Log

- **2025-11-06 (Story Drafted):** Story 4.5 drafted
  - Created story file with complete acceptance criteria from tech-spec-epic-4.md
  - Incorporated learnings from Story 4.4 (soft-delete filter pattern established)
  - Incorporated learnings from Story 4.2 (File entity with indexes, FileResDto ready)
  - All tasks and subtasks mapped to AC requirements (AC-4.5.1 through AC-4.5.7)
  - Pagination logic documented (page, limit, skip/take, meta with totalPages)
  - Filtering logic documented (mimeType wildcard support, search in originalName)
  - Sorting logic documented (allowed fields, default: createdAt DESC)
  - Access control logic documented (regular users: own files, admin with FILES.VIEW_ALL: all domain files)
  - Soft-delete filtering documented (deletedAt === null, always enforced)
  - Domain isolation documented (domainID filter, always enforced)
  - Performance optimization documented (database indexes, pagination limits)
  - Testing strategy documented (unit tests, E2E tests, pagination/filtering/sorting/access control verification)
  - Ready for development (File entity with indexes from Story 4.2, FileResDto from Story 4.2, soft-delete pattern from Story 4.4 completed)
