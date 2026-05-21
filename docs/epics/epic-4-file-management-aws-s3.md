# Epic 4: File Management (AWS S3)

**Goal:** Production-ready file upload, storage, ve access management with AWS S3 integration

**Value Proposition:** Secure file handling, pre-signed URLs, validation, multi-file support, permission-based access

**Prerequisites:** Epic 3 (User & Permissions)

**Technical Stack:**
- AWS SDK v3 (@aws-sdk/client-s3)
- Multer (multipart form-data)
- Pre-signed URLs (15 min expiry)

---

## Story 4.1: AWS S3 Configuration & Service

**As a** developer,
**I want** AWS S3 configuration ve wrapper service,
**So that** S3 operations yapabileyim.

**Acceptance Criteria:**
1. `src/config/aws.config.ts` oluşturulmuş
   - Environment vars: AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, S3_BUCKET
   - Validation: All required
2. `src/modules/files/services/s3.service.ts` oluşturulmuş
3. S3Service methods:
   - `uploadFile(file: Buffer, key: string, mimeType: string): Promise<string>` → S3 key
   - `getPresignedUrl(key: string, expiresIn: number): Promise<string>` → Download URL
   - `deleteFile(key: string): Promise<void>`
4. S3Client configured with credentials
5. Bucket per environment (e.g., boilerplate-dev, boilerplate-prod)
6. Error handling: S3 exceptions wrapped (throw BadRequestException)

**Technical Notes:**
- @aws-sdk/client-s3 (v3) kullan
- PutObjectCommand for upload
- GetObjectCommand + getSignedUrl for download
- DeleteObjectCommand for delete

**Dependencies:** Story 3.8

---

## Story 4.2: File Upload Endpoint (Single & Multiple)

**As a** user,
**I want** file upload edebilmek,
**So that** dosyalarımı sisteme yükleyebilleyim.

**Acceptance Criteria:**
1. POST /files/upload endpoint (protected, FILES.CREATE permission)
2. Multipart form-data support (multer)
3. Single file upload support
4. Multiple file upload support (max 10 files)
5. Validation:
   - File size: Max 10MB per file
   - File types: image/*, application/pdf, application/vnd.openxmlformats-officedocument.*, etc.
   - Mime-type check
6. S3'e upload (key: `{domainID}/{userID}/{timestamp}-{originalName}`)
7. File metadata database'e kaydet (File entity: id, domainID, userID, filename, originalName, mimeType, size, s3Key, s3Bucket)
8. Response: FileResDto[] (id, filename, size, mimeType, uploadedAt)
9. Rate limit: 20 uploads / hour per user
10. Errors: 413 file too large, 400 invalid type

**Technical Notes:**
- Multer interceptor: @UseInterceptors(FilesInterceptor('files', 10))
- Stream upload to S3 (don't store in memory fully)
- File entity soft-delete pattern

**Dependencies:** Story 4.1

---

## Story 4.3: File Download (Pre-Signed URL)

**As a** user,
**I want** file download edebilmek,
**So that** yüklediğim dosyalara erişebilleyim.

**Acceptance Criteria:**
1. GET /files/:id endpoint (protected, FILES.VIEW permission)
   - File metadata döndürüyor (FileResDto)
   - Permission check: Owner or has FILES.VIEW
2. GET /files/:id/download endpoint (protected)
   - Pre-signed S3 URL generate (15 min expiry)
   - Permission check: Owner or has FILES.VIEW
   - Response: { downloadUrl: string, expiresAt: string }
   - Client bu URL ile directly S3'ten download eder (backend proxy yok)
3. File not found → 404
4. No permission → 403

**Technical Notes:**
- Pre-signed URL: S3Service.getPresignedUrl(s3Key, 900) // 15 min
- Permission check: file.userID === currentUserID || hasPermission(FILES.VIEW)
- DomainID check mandatory

**Dependencies:** Story 4.2

---

## Story 4.4: File Deletion (Soft Delete)

**As a** user,
**I want** file silebilmek,
**So that** gereksiz dosyaları kaldırabileyim.

**Acceptance Criteria:**
1. DELETE /files/:id endpoint (protected, FILES.DELETE permission)
2. Permission check: Owner or has FILES.DELETE
3. File metadata soft-delete (deletedAt set)
4. S3'ten hemen silinmiyor (cleanup job future - Epic 11)
5. Response: 200 OK
6. File not found or already deleted → 404
7. No permission → 403

**Technical Notes:**
- Soft delete: update deletedAt
- S3 cleanup: Scheduled job (future) - deletedAt > 7 days → S3 delete
- DomainID check

**Dependencies:** Story 4.3

---

## Story 4.5: File List Endpoint

**As a** user,
**I want** file'larımı listeleyebilmek,
**So that** hangi dosyaları upload ettiğimi görebilleyim.

**Acceptance Criteria:**
1. GET /files endpoint (protected, paginated)
2. Query params: page, limit, mimeType, search
3. User kendi file'larını görüyor (userID filter)
4. Admin tüm file'ları görebiliyor (FILES.VIEW_ALL permission)
5. Response: { data: FileResDto[], count: number }
6. DomainID isolation

**Technical Notes:**
- Pagination: default 20, max 100
- Filter: mimeType (e.g., image/*, application/pdf)
- Search: originalName LIKE %query%
- DomainID + userID (or admin bypass)

**Dependencies:** Story 4.4

---
