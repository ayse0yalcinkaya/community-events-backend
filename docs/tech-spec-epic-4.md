# Epic Technical Specification: File Management (AWS S3)

Date: 2025-11-05
Author: BMad
Epic ID: 4
Status: Draft

---

## Overview

Epic 4, **File Management (AWS S3)** sistemini implement eder. Bu epic, production-ready file upload, storage ve AWS S3 ile dosya erişim yönetimini içerir. Kullanıcılar single ve multiple file upload yapabilir, pre-signed URL'ler ile güvenli download gerçekleştirebilir ve file management işlemlerini permission-based authorization ile kontrol edebilir.

**Epic Kapsamı:**
- AWS S3 configuration ve wrapper service (S3Service)
- File upload endpoints (single & multiple, max 10 files, max 10MB per file)
- File download via pre-signed URLs (15 dakika geçerlilik)
- File metadata management (File entity with s3Key, s3Bucket, domainID tracking)
- File deletion (soft-delete pattern, S3 cleanup future job)
- File list endpoint (paginated, filtered by mimeType, search by originalName)
- Permission-based access control (FILES.CREATE, FILES.VIEW, FILES.DELETE, FILES.VIEW_ALL)
- Multi-tenancy support (domainID isolation)
- Rate limiting (20 uploads per hour per user)

Bu epic, Epic 1 (Database Infrastructure) ve Epic 3 (User & Permissions Management) üzerine inşa edilir ve boilerplate'in file management capability'sini sağlar.

## Objectives and Scope

### Objectives

1. **Production-Ready File Storage**: AWS S3 entegrasyonu ile secure, scalable file storage
2. **Secure File Access**: Pre-signed URLs ile time-limited, secure download links
3. **File Validation**: Mime-type, file size, extension validation ile güvenlik
4. **Multi-File Support**: Tek request'te 10 file'a kadar upload capability
5. **Permission-Based Access**: FILES.* permissions ile fine-grained access control
6. **Multi-Tenancy**: domainID-based file isolation
7. **Metadata Tracking**: File metadata (filename, size, mimeType, s3Key) database'de tracking

### In Scope

- AWS S3 configuration (environment variables: AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, S3_BUCKET)
- S3Service implementation (uploadFile, getPresignedUrl, deleteFile methods)
- File entity (Prisma model with id, domainID, userID, filename, originalName, mimeType, size, s3Key, s3Bucket, createdAt, deletedAt)
- POST /files/upload endpoint (multipart form-data, single & multiple file support)
- GET /files/:id endpoint (file metadata)
- GET /files/:id/download endpoint (pre-signed URL generation)
- DELETE /files/:id endpoint (soft-delete)
- GET /files endpoint (paginated file list with filters)
- File validation: size (max 10MB), mime-type (image/*, application/pdf, application/vnd.openxmlformats-officedocument.*), file count (max 10)
- Permission checks: FILES.CREATE, FILES.VIEW, FILES.DELETE, FILES.VIEW_ALL
- Rate limiting: 20 uploads per hour per user
- Multi-tenancy: domainID filtering on all queries
- Soft-delete pattern: deletedAt field, S3 cleanup deferred to future job

### Out of Scope

- Image thumbnail generation (Epic 4 optional feature, deferred)
- Virus scanning integration (Epic 4 optional feature, deferred)
- File compression/optimization (Future enhancement)
- File versioning (Future enhancement)
- Public file sharing links (Future enhancement)
- S3 cleanup scheduled job (Future Epic 11 - CI/CD automation)
- File metadata custom tags/labels (Future enhancement)
- File preview generation (PDF, images) - Future enhancement

## System Architecture Alignment

Epic 4, boilerplate architecture'ın **modules/files/** bileşenini implement eder ve aşağıdaki architecture kararlarına align olur:

### Architecture Decisions Alignment

| Architecture Decision | Epic 4 Implementation |
|----------------------|----------------------|
| **Controller-Service Pattern** | FilesController → FilesService → S3Service pattern |
| **Multi-Tenancy (Hybrid)** | @DomainID decorator + domainID filtering in queries |
| **Authorization Model (RBAC)** | PermissionsGuard + FILES.* permissions |
| **File Storage** | AWS S3 (SDK v3) with pre-signed URLs |
| **Module Organization** | files/ module with clear boundaries |
| **Response Format** | Global interceptor ile consistent API responses |
| **Error Handling** | Layered exceptions + i18n translated messages |
| **Soft-Delete Pattern** | deletedAt field, S3 cleanup deferred |

### Component Integration

**Dependencies:**
- **Database Module**: PrismaService injection for file metadata operations
- **Auth Module**: JwtAuthGuard for protected routes, @CurrentUser decorator
- **Permissions Module**: PermissionsGuard, FILES.* permissions
- **Common Module**: Guards (JwtAuthGuard, PermissionsGuard), Decorators (@Permission, @CurrentUser, @DomainID), Interceptors (ResponseTransformInterceptor)
- **Config Module**: AWS configuration (aws.config.ts)

**Provided Services:**
- **FilesService**: File upload/download orchestration (used by other modules for file operations)
- **S3Service**: AWS S3 wrapper (internal to files module)

### Module Structure

```
src/modules/
└── files/
    ├── controllers/
    │   └── files.controller.ts          # Upload, download, delete, list endpoints
    ├── services/
    │   ├── files.service.ts             # Business logic, orchestration
    │   └── s3.service.ts                # AWS S3 SDK wrapper
    ├── dto/
    │   ├── request/
    │   │   └── query-files.dto.ts       # Pagination, filters
    │   └── response/
    │       └── file-res.dto.ts          # File metadata response
    ├── entities/
    │   └── file.entity.ts               # Prisma model
    └── files.module.ts
```

### Constraints Applied

- **TypeScript Strict Mode**: Tüm kod strict type checking ile
- **Soft-Delete Pattern**: File entity'sinde deletedAt field
- **DomainID Isolation**: Tüm query'lerde domainID filtering mandatory
- **AWS S3 Best Practices**: Pre-signed URLs, environment-specific buckets, multipart upload ready
- **Permission-Based Access**: Tüm file operations permission-protected
- **Rate Limiting**: 20 uploads per hour per user (brute-force protection)

## Detailed Design

### Services and Modules

Epic 4 iki ana service layer içerir: **FilesService** (orchestration) ve **S3Service** (AWS S3 wrapper). Her service, Controller-Service pattern'ini takip eder.

#### Files Module

| Component | Responsibility | Inputs | Outputs | Owner |
|-----------|---------------|--------|---------|-------|
| **FilesController** | File management endpoints | JWT token, @UploadedFiles, CreateFileDto, QueryFilesDto | FileResDto[], DownloadUrlResDto | Files Module |
| **FilesService** | File business logic, orchestration | File buffers, metadata, domainID, userID | File operations results | Files Module |
| **S3Service** | AWS S3 SDK wrapper | File buffer, s3Key, mimeType | S3 upload results, pre-signed URLs | Files Module |

**Key Operations:**

**FilesService:**
- `uploadFiles(files: Express.Multer.File[], domainID, userID)`: Upload multiple files to S3, save metadata to DB
- `getFileMetadata(fileId, domainID, userID)`: Get file metadata with permission check
- `generateDownloadUrl(fileId, domainID, userID)`: Generate pre-signed URL for download
- `deleteFile(fileId, domainID, userID)`: Soft delete file (metadata only)
- `listFiles(queryDto, domainID, userID, isAdmin)`: Paginated file list with filters
- `validateFile(file: Express.Multer.File)`: Validate file size, mime-type, extension

**S3Service:**
- `uploadFile(buffer: Buffer, key: string, mimeType: string)`: Upload file to S3, return s3Key
- `getPresignedUrl(key: string, expiresIn: number)`: Generate pre-signed download URL (default 15 min)
- `deleteFile(key: string)`: Delete file from S3 (used by cleanup job, future)
- `generateS3Key(domainID, userID, filename)`: Generate unique S3 key: `{domainID}/{userID}/{timestamp}-{filename}`

**Error Handling:**
- S3 exceptions wrapped in custom exceptions (FileUploadException, FileNotFoundException)
- Validation errors return 400 with detailed messages
- Permission errors return 403 with clear messages
- S3 connection errors return 503 with retry suggestion

### Data Models and Contracts

#### Prisma Schema Models

**File Entity**
```prisma
model File {
  id           String    @id @default(uuid())
  domainID     String    // Multi-tenancy
  userID       String    // File owner
  filename     String    // Sanitized filename for display
  originalName String    // Original uploaded filename
  mimeType     String    // MIME type (e.g., image/png, application/pdf)
  size         Int       // File size in bytes
  s3Key        String    // S3 object key
  s3Bucket     String    // S3 bucket name (environment-specific)
  createdAt    DateTime  @default(now())
  deletedAt    DateTime? // Soft delete

  // Relations
  user User @relation(fields: [userID], references: [id], onDelete: Cascade)

  @@index([domainID])
  @@index([userID])
  @@index([mimeType])
  @@index([deletedAt])
  @@index([s3Key])
}
```

**Key Design Decisions:**
- `s3Key`: Unique identifier in S3 (format: `{domainID}/{userID}/{timestamp}-{sanitizedFilename}`)
- `s3Bucket`: Stored for multi-environment support (dev, staging, production buckets)
- `filename`: Sanitized for security (remove special chars, limit length)
- `originalName`: Preserved for user reference
- Soft-delete: `deletedAt` field, S3 cleanup deferred to scheduled job

#### TypeScript DTOs

**Request DTOs**
```typescript
// QueryFilesDto
class QueryFilesDto {
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  mimeType?: string; // Filter: e.g., "image/*", "application/pdf"

  @IsOptional()
  @IsString()
  search?: string; // Search in originalName

  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}
```

**Response DTOs**
```typescript
// FileResDto
class FileResDto {
  @Expose()
  id: string;

  @Expose()
  filename: string;

  @Expose()
  originalName: string;

  @Expose()
  mimeType: string;

  @Expose()
  size: number; // Bytes

  @Expose()
  @Transform(({ obj }) => `${(obj.size / 1024).toFixed(2)} KB`) // Human-readable
  sizeFormatted: string;

  @Expose()
  createdAt: Date;

  // Exclude: s3Key, s3Bucket, domainID, userID, deletedAt
}

// DownloadUrlResDto
class DownloadUrlResDto {
  @Expose()
  downloadUrl: string; // Pre-signed S3 URL

  @Expose()
  expiresAt: string; // ISO 8601 timestamp (15 min from now)

  @Expose()
  expiresIn: number; // Seconds (900 for 15 min)
}
```

#### File Validation Rules

**Supported MIME Types:**
- Images: `image/jpeg`, `image/png`, `image/gif`, `image/webp`, `image/svg+xml`
- Documents: `application/pdf`, `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document` (DOCX)
- Spreadsheets: `application/vnd.ms-excel`, `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` (XLSX)
- Presentations: `application/vnd.ms-powerpoint`, `application/vnd.openxmlformats-officedocument.presentationml.presentation` (PPTX)
- Text: `text/plain`, `text/csv`
- Archives: `application/zip`, `application/x-rar-compressed`

**Validation Constraints:**
```typescript
const FILE_VALIDATION = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_FILES_PER_REQUEST: 10,
  ALLOWED_MIME_TYPES: [
    'image/*', // Wildcard for all images
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.*', // Office docs
    'text/plain',
    'text/csv',
    'application/zip',
  ],
  FILENAME_MAX_LENGTH: 255,
  SANITIZE_FILENAME: true, // Remove special chars, spaces → underscores
};
```

### APIs and Interfaces

#### File Upload Endpoint

**POST /files/upload**
- **Description**: Upload single or multiple files
- **Auth**: Required (JwtAuthGuard)
- **Permission**: FILES.CREATE
- **Rate Limit**: 20 requests per hour per user
- **Content-Type**: multipart/form-data
- **Request**: FormData with 'files' field (single or array, max 10 files)
- **Response**: 201 Created
  ```typescript
  {
    success: true,
    data: FileResDto[] // Array of uploaded file metadata
  }
  ```
- **Errors**:
  - 400 Bad Request: File validation failed (size, type, count)
  - 401 Unauthorized: Missing/invalid JWT
  - 403 Forbidden: No FILES.CREATE permission
  - 413 Payload Too Large: File > 10MB
  - 429 Too Many Requests: Rate limit exceeded
  - 503 Service Unavailable: S3 connection error

**Example Request:**
```bash
curl -X POST https://api.example.com/files/upload \
  -H "Authorization: Bearer <JWT>" \
  -F "files=@document.pdf" \
  -F "files=@image.png"
```

#### File Metadata Endpoint

**GET /files/:id**
- **Description**: Get file metadata by ID
- **Auth**: Required (JwtAuthGuard)
- **Permission**: FILES.VIEW (or file owner)
- **Path Parameters**: id (UUID)
- **Response**: 200 OK
  ```typescript
  {
    success: true,
    data: FileResDto
  }
  ```
- **Errors**: 401 Unauthorized, 403 Forbidden, 404 Not Found

#### File Download Endpoint

**GET /files/:id/download**
- **Description**: Generate pre-signed download URL
- **Auth**: Required (JwtAuthGuard)
- **Permission**: FILES.VIEW (or file owner)
- **Path Parameters**: id (UUID)
- **Response**: 200 OK
  ```typescript
  {
    success: true,
    data: {
      downloadUrl: "https://s3.amazonaws.com/bucket/key?X-Amz-Algorithm=...",
      expiresAt: "2025-11-05T10:45:00Z",
      expiresIn: 900 // 15 minutes
    }
  }
  ```
- **Note**: Client downloads directly from S3 using pre-signed URL (no proxy through backend)
- **Errors**: 401 Unauthorized, 403 Forbidden (no permission or wrong domain), 404 Not Found

#### File Deletion Endpoint

**DELETE /files/:id**
- **Description**: Soft delete file
- **Auth**: Required (JwtAuthGuard)
- **Permission**: FILES.DELETE (or file owner)
- **Path Parameters**: id (UUID)
- **Response**: 200 OK
  ```typescript
  {
    success: true,
    message: "File deleted successfully"
  }
  ```
- **Note**: Sets deletedAt timestamp, S3 deletion deferred to scheduled cleanup job
- **Errors**: 401 Unauthorized, 403 Forbidden, 404 Not Found

#### File List Endpoint

**GET /files**
- **Description**: List files (paginated)
- **Auth**: Required (JwtAuthGuard)
- **Permission**: None (user sees own files), FILES.VIEW_ALL (admin sees all)
- **Query Parameters**: QueryFilesDto
  ```typescript
  {
    page?: number;        // Default: 1
    limit?: number;       // Default: 20, Max: 100
    mimeType?: string;    // Filter: "image/*", "application/pdf"
    search?: string;      // Search in originalName
    sortBy?: string;      // Default: 'createdAt'
    sortOrder?: 'asc' | 'desc'; // Default: 'desc'
  }
  ```
- **Response**: 200 OK
  ```typescript
  {
    success: true,
    data: FileResDto[],
    meta: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    }
  }
  ```
- **Permission Logic**:
  - Regular user: Only sees own files (userID filter)
  - Admin with FILES.VIEW_ALL: Sees all files in domain
- **Errors**: 401 Unauthorized

#### Service Interfaces

**IS3Service**
```typescript
interface IS3Service {
  /**
   * Upload file to S3
   * @param buffer - File buffer
   * @param key - S3 object key
   * @param mimeType - MIME type
   * @returns S3 key
   */
  uploadFile(buffer: Buffer, key: string, mimeType: string): Promise<string>;

  /**
   * Generate pre-signed download URL
   * @param key - S3 object key
   * @param expiresIn - Expiration in seconds (default 900 = 15 min)
   * @returns Pre-signed URL
   */
  getPresignedUrl(key: string, expiresIn?: number): Promise<string>;

  /**
   * Delete file from S3
   * @param key - S3 object key
   */
  deleteFile(key: string): Promise<void>;
}
```

**IFilesService**
```typescript
interface IFilesService {
  uploadFiles(files: Express.Multer.File[], domainID: string, userID: string): Promise<File[]>;
  getFileMetadata(fileId: string, domainID: string, userID: string): Promise<File>;
  generateDownloadUrl(fileId: string, domainID: string, userID: string): Promise<{ downloadUrl: string; expiresAt: string; expiresIn: number }>;
  deleteFile(fileId: string, domainID: string, userID: string): Promise<void>;
  listFiles(queryDto: QueryFilesDto, domainID: string, userID: string, isAdmin: boolean): Promise<{ data: File[], total: number }>;
}
```

### Workflows and Sequencing

#### File Upload Flow (Multiple Files)

```
┌──────────┐
│  Client  │
└─────┬────┘
      │ POST /files/upload (multipart/form-data, files[])
      │ Authorization: Bearer <JWT>
      ▼
┌────────────────┐
│FilesController │
└───────┬────────┘
        │ @UseGuards(JwtAuthGuard, PermissionsGuard)
        │ @Permission('FILES', ActionEnum.CREATE)
        │ @UseInterceptors(FilesInterceptor('files', 10))
        ▼
┌────────────────┐
│PermissionsGuard│
└───────┬────────┘
        │ Check: user has FILES.CREATE permission
        │ ✓ Permission check passed
        ▼
┌────────────────┐
│FilesController │
└───────┬────────┘
        │ Extract: files (Express.Multer.File[])
        │ Extract: currentUser (from JWT)
        ▼
┌────────────────┐
│  FilesService  │
└───────┬────────┘
        │ Validate each file:
        │   - Size ≤ 10MB?
        │   - MIME type allowed?
        │   - File count ≤ 10?
        │ ✓ All validations passed
        │
        │ For each file:
        │   1. Generate S3 key: {domainID}/{userID}/{timestamp}-{filename}
        │   2. Sanitize filename (remove special chars)
        ▼
┌────────────────┐
│   S3Service    │
└───────┬────────┘
        │ For each file:
        │   S3Client.putObject({
        │     Bucket: env.S3_BUCKET,
        │     Key: s3Key,
        │     Body: file.buffer,
        │     ContentType: file.mimetype,
        │     ACL: 'private'
        │   })
        │ Return: s3Key for each file
        ▼
┌────────────────┐
│   Database     │
└───────┬────────┘
        │ Prisma.file.createMany({
        │   data: files.map(f => ({
        │     id: uuid(),
        │     domainID,
        │     userID,
        │     filename: sanitized,
        │     originalName: f.originalname,
        │     mimeType: f.mimetype,
        │     size: f.size,
        │     s3Key: f.s3Key,
        │     s3Bucket: env.S3_BUCKET
        │   }))
        │ })
        │ Return: File[] entities
        ▼
┌────────────────┐
│ResponseTransform│ (Interceptor)
└───────┬────────┘
        │ Transform to FileResDto[]
        │ Wrap in standard response format
        ▼
┌──────────┐
│  Client  │ { success: true, data: FileResDto[] }
└──────────┘

❌ VALIDATION FAILURE:
┌────────────────┐
│  FilesService  │ File size > 10MB
└───────┬────────┘
        │ throw BadRequestException('File size exceeds 10MB limit')
        ▼
┌──────────┐
│  Client  │ 400 Bad Request
└──────────┘
```

#### File Download Flow (Pre-Signed URL)

```
┌──────────┐
│  Client  │
└─────┬────┘
      │ GET /files/{fileId}/download
      │ Authorization: Bearer <JWT>
      ▼
┌────────────────┐
│FilesController │
└───────┬────────┘
        │ @UseGuards(JwtAuthGuard, PermissionsGuard)
        │ @Permission('FILES', ActionEnum.VIEW)
        ▼
┌────────────────┐
│  FilesService  │
└───────┬────────┘
        │ getFileMetadata(fileId, domainID, userID)
        │ Check: file exists && (file.userID === currentUserID || hasPermission(FILES.VIEW))
        │ Check: file.domainID === currentUserDomainID
        │ Check: file.deletedAt === null
        │ ✓ All checks passed
        ▼
┌────────────────┐
│   S3Service    │
└───────┬────────┘
        │ getPresignedUrl(file.s3Key, 900) // 15 min
        │ S3Client.getSignedUrl(GetObjectCommand, {
        │   Bucket: file.s3Bucket,
        │   Key: file.s3Key,
        │   Expires: 900
        │ })
        │ Return: pre-signed URL
        ▼
┌────────────────┐
│ResponseTransform│
└───────┬────────┘
        │ { success: true, data: { downloadUrl, expiresAt, expiresIn } }
        ▼
┌──────────┐
│  Client  │ Receives pre-signed URL
└─────┬────┘
      │ Client downloads directly from S3:
      │ GET https://s3.amazonaws.com/bucket/key?X-Amz-Algorithm=...
      ▼
┌──────────┐
│  AWS S3  │ Returns file binary (no backend proxy)
└─────┬────┘
      ▼
┌──────────┐
│  Client  │ File downloaded
└──────────┘
```

#### File List Flow (Admin View All)

```
┌──────────┐
│  Client  │ (Admin)
└─────┬────┘
      │ GET /files?page=1&limit=20&mimeType=image/*
      │ Authorization: Bearer <JWT>
      ▼
┌────────────────┐
│FilesController │
└───────┬────────┘
        │ @UseGuards(JwtAuthGuard) // No permission guard
        │ Extract: currentUser
        ▼
┌────────────────┐
│  FilesService  │
└───────┬────────┘
        │ Check: user has FILES.VIEW_ALL permission?
        │   YES → isAdmin = true (can see all domain files)
        │   NO → isAdmin = false (only own files)
        │
        │ Build filters:
        │   - domainID = currentUserDomainID (always)
        │   - deletedAt = null (exclude soft-deleted)
        │   - userID = currentUserID (if NOT admin)
        │   - mimeType LIKE 'image/%' (if filter provided)
        │   - originalName LIKE '%query%' (if search provided)
        ▼
┌────────────────┐
│   Database     │
└───────┬────────┘
        │ Prisma.file.findMany({
        │   where: filters,
        │   skip: (page - 1) * limit,
        │   take: limit,
        │   orderBy: { [sortBy]: sortOrder }
        │ })
        │ Prisma.file.count({ where: filters })
        │ Return: { files: File[], total: number }
        ▼
┌────────────────┐
│ResponseTransform│
└───────┬────────┘
        │ { success: true, data: FileResDto[], meta: { page, limit, total, totalPages } }
        ▼
┌──────────┐
│  Client  │
└──────────┘
```

## Non-Functional Requirements

### Performance

**API Response Time Targets:**
- **File upload** (single file, 1MB): < 2s (p95)
- **File upload** (multiple files, 10 files × 1MB): < 5s (p95)
- **File metadata retrieval** (GET /files/:id): < 100ms (p95)
- **Pre-signed URL generation** (GET /files/:id/download): < 200ms (p95)
- **File list** (paginated, 20 items): < 150ms (p95)
- **File deletion** (soft delete): < 100ms (p95)

**S3 Upload Performance:**
- Single file upload: Directly stream to S3 (no memory buffering for large files)
- Multiple file upload: Sequential upload (avoid memory overflow)
- Multipart upload: For files > 5MB (future enhancement, MVP uses simple upload)
- Timeout: 30 seconds per file upload operation

**Database Query Performance:**
- File metadata queries: < 50ms (indexed by domainID, userID, mimeType, deletedAt)
- File list queries: Use pagination (skip/take), max 100 items per page
- Avoid N+1 queries: Eager load user relation when needed

**Optimization Strategies:**

1. **Database Indexing:**
   - File: Index on [domainID], [userID], [mimeType], [deletedAt], [s3Key]
   - Compound index on [domainID, userID, deletedAt] for user file list queries

2. **S3 Upload Optimization:**
   - Stream files directly to S3 (don't load entire file in memory)
   - Use AWS SDK v3 for better performance
   - Parallel upload for multiple files (max 5 concurrent uploads)

3. **Pre-Signed URL Caching (Future):**
   - Cache pre-signed URLs in Redis (TTL: 14 min, less than S3 expiry)
   - Cache key: `presigned-url:{fileId}`
   - Invalidate on file deletion
   - MVP: No caching, generate on each request

**Concurrent Request Handling:**
- Minimum 50 concurrent file upload requests supported
- Rate limiting prevents abuse (20 uploads per hour per user)
- S3 connection pooling (AWS SDK manages internally)

**Performance Monitoring:**
- Log slow uploads (> 5s for single file)
- Track S3 upload success/failure rates
- Monitor file size distribution (detect large file uploads)

### Security

**File Upload Security:**

1. **File Validation:**
   - **MIME type check**: Validate against whitelist (prevent executable upload)
   - **File extension check**: Cross-validate with MIME type (prevent bypass)
   - **Magic number validation**: Check file header bytes (future enhancement)
   - **File size limit**: Max 10MB (prevent DoS via large files)
   - **Filename sanitization**: Remove special chars, prevent path traversal (.., /)

2. **S3 Security:**
   - **Private ACL**: All files uploaded with ACL='private' (no public access)
   - **Pre-signed URLs**: Time-limited access (15 min expiry)
   - **Bucket policy**: Deny public access, enforce HTTPS
   - **Server-side encryption**: S3 encryption at rest (AES-256, future)
   - **Environment-specific buckets**: Separate dev/staging/production buckets

3. **Access Control:**
   - **Permission-based**: FILES.CREATE, FILES.VIEW, FILES.DELETE permissions
   - **Ownership check**: Users can only delete/view own files (unless admin with FILES.VIEW_ALL)
   - **Domain isolation**: domainID filtering on all queries (prevent cross-tenant access)
   - **Soft-delete protection**: Deleted files excluded from queries (deletedAt IS NULL)

4. **Input Validation:**
   - All DTOs validated with class-validator
   - UUID validation for file IDs (@IsUUID('4'))
   - File count limit (max 10 files per request)
   - MIME type validation (string format check)

5. **Rate Limiting:**
   - 20 upload requests per hour per user (prevent abuse)
   - Implemented via @nestjs/throttler
   - 429 Too Many Requests on limit exceed

**Security Audit Checklist:**
- [ ] All file endpoints have JwtAuthGuard
- [ ] Upload endpoint has FILES.CREATE permission check
- [ ] All queries include domainID filter
- [ ] S3 keys never exposed in responses (s3Key excluded from FileResDto)
- [ ] Pre-signed URLs expire after 15 minutes
- [ ] File validation prevents malicious uploads
- [ ] Filename sanitization prevents path traversal

### Reliability/Availability

**Error Handling:**

1. **S3 Upload Failures:**
   - Retry logic: 3 attempts with exponential backoff (1s, 2s, 4s)
   - On final failure: Return 503 Service Unavailable with clear message
   - Partial success: If 3/10 files fail, return success for uploaded files + error details for failed ones
   - Transaction safety: Database insert only after successful S3 upload

2. **Database Failures:**
   - Prisma connection pooling: 5-20 connections
   - Database unavailable: Return 503 Service Unavailable
   - Transaction support: Wrap multi-file metadata insert in transaction

3. **Graceful Degradation:**
   - S3 connection error: Return 503 with "File storage temporarily unavailable" message
   - Database error: Return 503 with "Service temporarily unavailable" message
   - Validation error: Return 400 with detailed validation errors
   - Permission error: Return 403 with clear permission requirement

**Data Integrity:**

1. **Upload Transaction Flow:**
   ```
   1. Validate files (all must pass before upload)
   2. Upload to S3 (all files)
   3. Insert metadata to DB (transaction)
   4. On DB insert failure → Cleanup S3 files (compensating transaction)
   ```

2. **Soft-Delete Pattern:**
   - File deletion sets deletedAt (doesn't delete metadata)
   - S3 cleanup deferred to scheduled job (Epic 11)
   - Restore capability: Update deletedAt to null
   - Orphaned files: S3 cleanup job cross-references DB (future)

3. **Database Constraints:**
   - Foreign key: File.userID → User.id (cascade delete on user deletion)
   - Index constraints: Prevent duplicate s3Keys
   - NOT NULL: Essential fields (domainID, userID, filename, s3Key, s3Bucket)

**Availability:**
- No single point of failure (stateless design)
- S3 availability: 99.99% (AWS SLA)
- Horizontal scaling ready (no local file storage)
- Health check endpoint: GET /health/files (checks S3 connectivity)

**Retry Strategies:**
- S3 upload: 3 retries with exponential backoff
- Pre-signed URL generation: No retry (fast operation, < 100ms)
- Database operations: Prisma handles connection retries internally

### Observability

**Logging:**

1. **Structured Logging (JSON format):**
   ```json
   {
     "timestamp": "2025-11-05T10:30:00Z",
     "level": "info",
     "context": "FilesService",
     "message": "File uploaded successfully",
     "domainID": "domain-uuid",
     "userID": "user-uuid",
     "fileID": "file-uuid",
     "filename": "document.pdf",
     "size": 2048576,
     "mimeType": "application/pdf",
     "s3Key": "domain/user/1730800200000-document.pdf",
     "uploadDuration": 1234
   }
   ```

2. **Key Events to Log:**
   - File upload (success): info level (filename, size, mimeType, duration)
   - File upload (failure): error level (reason, S3 error details)
   - File download (pre-signed URL generated): info level
   - File deletion: info level (fileID, s3Key)
   - S3 upload retry: warn level (attempt count, error)
   - Rate limit exceeded: warn level (userID, endpoint)
   - Validation failures: warn level (validation details)

3. **Sensitive Data Exclusion:**
   - Never log: File content, pre-signed URLs (contain credentials)
   - Redact: s3Key in production logs (optional, configurable)
   - Include: domainID, userID, fileID, filename (sanitized), size, mimeType

**Monitoring:**

1. **Key Metrics:**
   - File upload rate (uploads/hour)
   - File upload success rate (%)
   - File upload latency (p50, p95, p99)
   - S3 upload failures (count, error types)
   - Storage usage per domain (total bytes)
   - Pre-signed URL generation rate
   - Rate limit hits (429 responses)

2. **S3 Integration Monitoring:**
   - S3 API call count (PutObject, GetObject, DeleteObject)
   - S3 error rate (4xx, 5xx responses)
   - S3 connection timeouts
   - Bucket storage size (via CloudWatch)

3. **Sentry Integration:**
   - Automatic exception capture (S3 errors, upload failures)
   - User context: domainID, userID, fileID
   - Breadcrumbs: Upload start → validation → S3 upload → DB insert
   - Custom tags: mimeType, fileSize, uploadDuration

4. **Health Checks:**
   - GET /health/files → Check FilesService availability
   - GET /health/s3 → Test S3 connectivity (list bucket operation)
   - Database connectivity via PrismaService health check

**Debugging Support:**

1. **Request Tracing:**
   - Request ID propagation (X-Request-ID header)
   - Trace file upload flow: Controller → Service → S3 → Database
   - Log all steps with request ID for correlation

2. **Development Logging:**
   - Log level: debug (in development)
   - S3 request/response logging (AWS SDK debug mode)
   - File validation details logged
   - Pre-signed URL generation details

3. **Audit Trail:**
   - Track who uploaded what (File.userID, File.createdAt)
   - Soft-delete preserves history (deletedAt timestamp)
   - File access logs (future enhancement): Track download events

## Dependencies and Integrations

### Internal Dependencies

**Epic 4 depends on:**

| Dependency | Epic | Reason | Status |
|------------|------|--------|--------|
| **PrismaService** | Epic 1 | Database access for file metadata operations | Required |
| **Database Schema** | Epic 1 | File entity must be added to Prisma schema | Required |
| **User Entity** | Epic 1 | Foreign key relationship (File.userID → User.id) | Required |
| **JwtAuthGuard** | Epic 2 | Authentication required for all file endpoints | Required |
| **JWT Strategy** | Epic 2 | Token validation and user extraction | Required |
| **@CurrentUser decorator** | Epic 2 | Extract user from JWT payload | Required |
| **PermissionsGuard** | Epic 3 | Authorization for file operations | Required |
| **FILES.* Permissions** | Epic 3 | Permission constants (FILES.CREATE, FILES.VIEW, FILES.DELETE, FILES.VIEW_ALL) | Required |
| **AuthorizationService** | Epic 3 | Permission checking (hasPermission method) | Required |
| **ResponseTransformInterceptor** | Common | Consistent API response format | Required |
| **Global Exception Filter** | Common | Error handling and i18n | Required |

**Epic 4 provides to:**

| Consumer | What is provided | Purpose |
|----------|------------------|---------|
| **Epic 5 (Communications)** | FilesService (potential attachment support) | Attach files to emails |
| **Epic 6 (Document Generator)** | FilesService.uploadFiles() | Save generated documents to S3 |
| **All Future Epics** | FilesService | File management capability |
| **User Module** | File entity relationship | Track user's uploaded files |

### External Dependencies

**NPM Packages:**

```json
{
  "dependencies": {
    "@nestjs/common": "^11.0.1",
    "@nestjs/core": "^11.0.1",
    "@nestjs/platform-express": "^11.0.1",
    "@nestjs/passport": "^11.0.5",
    "@nestjs/jwt": "^11.0.1",
    "@nestjs/throttler": "^6.4.0",
    "@prisma/client": "^6.18.0",
    "passport-jwt": "^4.0.1",
    "class-validator": "^0.14.2",
    "class-transformer": "^0.5.1",
    "uuid": "^13.0.0",

    // Epic 4 specific packages
    "@aws-sdk/client-s3": "^3.600.0",          // AWS S3 SDK v3
    "@aws-sdk/s3-request-presigner": "^3.600.0", // Pre-signed URL generation
    "multer": "^1.4.5-lts.1"                   // Multipart form-data handling
  },
  "devDependencies": {
    "prisma": "^6.18.0",
    "@types/multer": "^1.4.11",
    "@types/uuid": "^10.0.0"
  }
}
```

**Key Integrations:**

1. **AWS S3 (SDK v3):**
   - Package: `@aws-sdk/client-s3`
   - Version: ^3.600.0 (latest stable)
   - Purpose: File upload, download, deletion
   - Key classes: `S3Client`, `PutObjectCommand`, `GetObjectCommand`, `DeleteObjectCommand`
   - Pre-signed URL: `@aws-sdk/s3-request-presigner` package, `getSignedUrl` function

2. **Multer:**
   - Package: `multer`
   - Version: ^1.4.5-lts.1
   - Purpose: Multipart form-data parsing (file uploads)
   - Integration: NestJS `FilesInterceptor` wraps multer
   - Usage: `@UseInterceptors(FilesInterceptor('files', 10))`

3. **Prisma ORM:**
   - Package: `@prisma/client`
   - Version: ^6.18.0
   - Purpose: File metadata CRUD operations
   - Entity: File model with relations to User

4. **class-validator:**
   - Package: `class-validator`
   - Version: ^0.14.2
   - Purpose: DTO validation (QueryFilesDto)
   - Decorators: `@IsOptional`, `@IsString`, `@IsEnum`, `@Min`, `@Max`

5. **class-transformer:**
   - Package: `class-transformer`
   - Version: ^0.5.1
   - Purpose: DTO transformation (FileResDto, exclude sensitive fields)
   - Decorators: `@Expose`, `@Transform`

6. **@nestjs/throttler:**
   - Package: `@nestjs/throttler`
   - Version: ^6.4.0
   - Purpose: Rate limiting (20 uploads per hour per user)
   - Usage: `@Throttle({ default: { limit: 20, ttl: 3600000 } })`

### Database Schema Dependencies

**Required Tables (from Epic 1):**
- User (foreign key relationship)

**New Tables (Epic 4):**
- File (new entity created in this epic)

**Migration:**
```prisma
// Migration: Create File table
model File {
  id           String    @id @default(uuid())
  domainID     String
  userID       String
  filename     String
  originalName String
  mimeType     String
  size         Int
  s3Key        String
  s3Bucket     String
  createdAt    DateTime  @default(now())
  deletedAt    DateTime?

  user User @relation(fields: [userID], references: [id], onDelete: Cascade)

  @@index([domainID])
  @@index([userID])
  @@index([mimeType])
  @@index([deletedAt])
  @@index([s3Key])
}
```

**User Entity Update:**
```prisma
model User {
  // ... existing fields
  files File[] // Add relation
}
```

### Configuration Dependencies

**Environment Variables Required:**

```bash
# From Epic 1 (inherited)
DATABASE_URL=postgresql://...

# From Epic 2 (inherited)
JWT_SECRET=your-secret-key
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

# Epic 4 specific (NEW)
AWS_REGION=us-east-1                    # S3 bucket region
AWS_ACCESS_KEY_ID=your-access-key       # AWS IAM credentials
AWS_SECRET_ACCESS_KEY=your-secret-key   # AWS IAM credentials
S3_BUCKET=boilerplate-dev               # S3 bucket name (environment-specific)

# Optional: S3 advanced config
S3_ENDPOINT=http://localhost:9000       # For local S3 (MinIO, optional)
S3_FORCE_PATH_STYLE=true                # For local S3 (MinIO, optional)
```

**AWS Configuration File:**
```typescript
// src/config/aws.config.ts
import { registerAs } from '@nestjs/config';

export default registerAs('aws', () => ({
  region: process.env.AWS_REGION || 'us-east-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  s3: {
    bucket: process.env.S3_BUCKET,
    endpoint: process.env.S3_ENDPOINT, // For local dev (MinIO)
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true', // For local dev
  },
}));
```

**Configuration Validation:**
```typescript
// src/config/validation.schema.ts (add to existing schema)
AWS_REGION: Joi.string().required(),
AWS_ACCESS_KEY_ID: Joi.string().required(),
AWS_SECRET_ACCESS_KEY: Joi.string().required(),
S3_BUCKET: Joi.string().required(),
S3_ENDPOINT: Joi.string().optional(), // Local dev only
S3_FORCE_PATH_STYLE: Joi.boolean().optional(), // Local dev only
```

### AWS S3 Setup Requirements

**AWS IAM Policy (Minimum Permissions):**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::boilerplate-dev/*",
        "arn:aws:s3:::boilerplate-dev"
      ]
    }
  ]
}
```

**S3 Bucket Configuration:**
- **Bucket Name:** Environment-specific (e.g., `boilerplate-dev`, `boilerplate-staging`, `boilerplate-prod`)
- **Region:** Same as application deployment region (reduce latency)
- **Public Access:** Blocked (all files private by default)
- **Versioning:** Enabled (recommended for production)
- **Encryption:** AES-256 (optional, recommended for production)
- **Lifecycle Policy:** Delete soft-deleted files after 30 days (future, Epic 11)

**Local Development Alternative (MinIO):**
```bash
# Docker Compose (add to docker-compose.yml)
minio:
  image: minio/minio:latest
  ports:
    - "9000:9000"
    - "9001:9001"
  environment:
    MINIO_ROOT_USER: minioadmin
    MINIO_ROOT_PASSWORD: minioadmin
  command: server /data --console-address ":9001"
  volumes:
    - minio_data:/data

# .env.development
S3_ENDPOINT=http://localhost:9000
S3_FORCE_PATH_STYLE=true
AWS_ACCESS_KEY_ID=minioadmin
AWS_SECRET_ACCESS_KEY=minioadmin
S3_BUCKET=boilerplate-dev
```

### Integration Points

**Epic 3 (Permissions) Integration:**
- FILES.* permission constants added to PERMISSIONS object
- Permission sync script includes FILES permissions
- PermissionsGuard used on all file endpoints
- AuthorizationService.hasPermission() called for access control

**Epic 1 (Database) Integration:**
- File entity added to Prisma schema
- Migration created and applied
- PrismaService injected into FilesService
- Foreign key relationship to User entity

**Epic 2 (Auth) Integration:**
- JwtAuthGuard protects all file endpoints
- @CurrentUser decorator extracts userID from JWT
- User context (domainID, userID) used for file operations

**Common Module Integration:**
- ResponseTransformInterceptor wraps all file responses
- Global Exception Filter handles file-related errors
- Custom decorators: @Permission, @CurrentUser, @DomainID

### Third-Party Service Dependencies

**AWS S3:**
- **Provider:** Amazon Web Services
- **Service:** Simple Storage Service (S3)
- **Pricing:** Pay-as-you-go (storage + requests)
- **Free Tier:** 5 GB storage, 20,000 GET requests, 2,000 PUT requests per month (first 12 months)
- **Dependency Type:** Critical (file storage is core feature)
- **Fallback:** Local file storage (not recommended for production)
- **Monitoring:** CloudWatch metrics for bucket storage, request count

**No Other External Services Required:**
- No CDN (future enhancement)
- No image processing service (future enhancement)
- No virus scanning service (future enhancement)

## Acceptance Criteria (Authoritative)

### Story 4.1: AWS S3 Configuration & Setup

**Acceptance Criteria:**

✅ **AC 4.1.1**: AWS S3 SDK v3 packages installed and configured
- [ ] `@aws-sdk/client-s3` ^3.600.0 installed
- [ ] `@aws-sdk/s3-request-presigner` ^3.600.0 installed
- [ ] `multer` ^1.4.5-lts.1 and `@types/multer` installed
- [ ] No dependency conflicts, `npm install` succeeds

✅ **AC 4.1.2**: AWS configuration file created with environment variable support
- [ ] `src/config/aws.config.ts` created with `registerAs('aws', ...)` pattern
- [ ] Reads: AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, S3_BUCKET
- [ ] Optional config: S3_ENDPOINT, S3_FORCE_PATH_STYLE (for MinIO local dev)
- [ ] Configuration registered in AppModule imports

✅ **AC 4.1.3**: Environment variable validation added
- [ ] Joi validation schema includes AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, S3_BUCKET (all required)
- [ ] Application fails to start if required AWS env vars missing
- [ ] Clear error messages for missing configuration

✅ **AC 4.1.4**: S3Service created and implements IS3Service interface
- [ ] `src/modules/files/services/s3.service.ts` created
- [ ] Methods: `uploadFile()`, `getPresignedUrl()`, `deleteFile()`
- [ ] S3Client initialized with credentials from aws.config.ts
- [ ] Injectable service, registered in FilesModule providers

✅ **AC 4.1.5**: S3 connection validated on application start
- [ ] Health check endpoint: GET /health/s3
- [ ] Tests S3 connectivity (listBucket or headBucket operation)
- [ ] Returns 200 OK if S3 reachable, 503 Service Unavailable if not
- [ ] Logged at application startup (info level)

✅ **AC 4.1.6**: Local development MinIO setup documented
- [ ] Docker Compose configuration provided for MinIO
- [ ] .env.development.example includes MinIO config
- [ ] README section explains local S3 setup
- [ ] Works without AWS account for local development

**Definition of Done:**
- S3Service can connect to AWS S3 (or MinIO locally)
- Environment variables validated on startup
- Health check confirms S3 connectivity
- No hardcoded credentials in code
- All configuration externalized to .env files

---

### Story 4.2: File Upload Endpoint (Single & Multiple)

**Acceptance Criteria:**

✅ **AC 4.2.1**: File entity created in Prisma schema
- [ ] File model added with fields: id, domainID, userID, filename, originalName, mimeType, size, s3Key, s3Bucket, createdAt, deletedAt
- [ ] Indexes on: domainID, userID, mimeType, deletedAt, s3Key
- [ ] Foreign key: userID → User.id (onDelete: Cascade)
- [ ] User entity includes `files File[]` relation
- [ ] Migration generated and applied successfully

✅ **AC 4.2.2**: POST /files/upload endpoint created
- [ ] Route: POST /api/files/upload (multipart/form-data)
- [ ] Guards: JwtAuthGuard, PermissionsGuard
- [ ] Permission: FILES.CREATE
- [ ] Rate limit: 20 requests per hour per user (@Throttle decorator)
- [ ] Accepts 'files' field (single or multiple, max 10 files)

✅ **AC 4.2.3**: File validation implemented
- [ ] Max file size: 10MB per file
- [ ] Max files per request: 10
- [ ] MIME type whitelist: image/*, application/pdf, office documents, text/*, archives
- [ ] File extension cross-validated with MIME type
- [ ] Returns 400 Bad Request with detailed error if validation fails

✅ **AC 4.2.4**: Filename sanitization implemented
- [ ] Special characters removed/replaced with underscores
- [ ] Path traversal prevented (no ../, ./)
- [ ] Max filename length: 255 characters
- [ ] originalName preserved for user reference
- [ ] filename sanitized for storage

✅ **AC 4.2.5**: S3 upload logic implemented
- [ ] Generates unique S3 key: `{domainID}/{userID}/{timestamp}-{filename}`
- [ ] Uploads to S3 with ACL='private'
- [ ] ContentType set to file's MIME type
- [ ] Retry logic: 3 attempts with exponential backoff
- [ ] Returns 503 Service Unavailable on final S3 failure

✅ **AC 4.2.6**: File metadata saved to database
- [ ] Transaction: All file metadata inserted atomically
- [ ] On S3 upload success → Insert DB records
- [ ] On DB insert failure → Cleanup S3 files (compensating transaction)
- [ ] Returns FileResDto[] with uploaded file metadata

✅ **AC 4.2.7**: Multiple file upload supported
- [ ] Endpoint accepts 1-10 files in single request
- [ ] Uploads processed sequentially (avoid memory overflow)
- [ ] Partial success handling: Returns success for uploaded files + errors for failed ones
- [ ] Response includes array of FileResDto (one per file)

✅ **AC 4.2.8**: Upload response format validated
- [ ] Returns 201 Created on success
- [ ] Response: `{ success: true, data: FileResDto[] }`
- [ ] FileResDto excludes: s3Key, s3Bucket, domainID, userID, deletedAt
- [ ] FileResDto includes: id, filename, originalName, mimeType, size, sizeFormatted, createdAt

**Definition of Done:**
- Single file upload works end-to-end (upload → S3 → DB → response)
- Multiple file upload (up to 10) works
- File validation prevents invalid uploads (size, type, count)
- Filename sanitization prevents path traversal
- Rate limiting prevents abuse
- S3 upload failures handled gracefully
- All tests pass (unit + integration)

---

### Story 4.3: File Download via Pre-Signed URLs

**Acceptance Criteria:**

✅ **AC 4.3.1**: GET /files/:id endpoint created
- [ ] Route: GET /api/files/:id
- [ ] Guards: JwtAuthGuard, PermissionsGuard
- [ ] Permission: FILES.VIEW (or file owner)
- [ ] Path parameter: id (UUID validation)
- [ ] Returns FileResDto with file metadata

✅ **AC 4.3.2**: File metadata endpoint validates access
- [ ] Checks: file exists && file.domainID === currentUserDomainID
- [ ] Checks: file.deletedAt === null (exclude soft-deleted)
- [ ] Checks: file.userID === currentUserID OR user has FILES.VIEW permission
- [ ] Returns 403 Forbidden if user not authorized
- [ ] Returns 404 Not Found if file doesn't exist or wrong domain

✅ **AC 4.3.3**: GET /files/:id/download endpoint created
- [ ] Route: GET /api/files/:id/download
- [ ] Guards: JwtAuthGuard, PermissionsGuard
- [ ] Permission: FILES.VIEW (or file owner)
- [ ] Generates pre-signed S3 URL (15 minute expiry)
- [ ] Returns DownloadUrlResDto

✅ **AC 4.3.4**: Pre-signed URL generation implemented
- [ ] Uses @aws-sdk/s3-request-presigner
- [ ] Expiration: 900 seconds (15 minutes)
- [ ] Validates file access before generating URL (same checks as AC 4.3.2)
- [ ] Returns URL, expiresAt (ISO 8601), expiresIn (seconds)

✅ **AC 4.3.5**: Download endpoint response validated
- [ ] Response: `{ success: true, data: { downloadUrl, expiresAt, expiresIn } }`
- [ ] downloadUrl is valid S3 pre-signed URL
- [ ] expiresAt is current time + 15 minutes
- [ ] expiresIn is 900

✅ **AC 4.3.6**: Client can download file from pre-signed URL
- [ ] Pre-signed URL accessible via GET request (no auth headers)
- [ ] Returns file binary with correct Content-Type header
- [ ] Works in browser and curl
- [ ] URL expires after 15 minutes (returns 403 Forbidden after expiry)

✅ **AC 4.3.7**: Download access logged
- [ ] Logs file download event (info level)
- [ ] Includes: fileID, userID, domainID, timestamp
- [ ] Does NOT log pre-signed URL (contains credentials)

**Definition of Done:**
- File metadata endpoint returns correct data
- Pre-signed URL generated successfully
- Client can download file using pre-signed URL
- Access control validated (domain isolation, ownership, permissions)
- Soft-deleted files not downloadable
- URL expiry works (403 after 15 minutes)
- All tests pass

---

### Story 4.4: File Deletion (Soft Delete)

**Acceptance Criteria:**

✅ **AC 4.4.1**: DELETE /files/:id endpoint created
- [ ] Route: DELETE /api/files/:id
- [ ] Guards: JwtAuthGuard, PermissionsGuard
- [ ] Permission: FILES.DELETE (or file owner)
- [ ] Path parameter: id (UUID validation)
- [ ] Returns success message on deletion

✅ **AC 4.4.2**: Soft delete implemented
- [ ] Sets deletedAt to current timestamp
- [ ] Does NOT delete metadata from database
- [ ] Does NOT delete file from S3 (deferred to cleanup job)
- [ ] File excluded from all queries (WHERE deletedAt IS NULL)

✅ **AC 4.4.3**: Deletion access validated
- [ ] Checks: file exists && file.domainID === currentUserDomainID
- [ ] Checks: file.userID === currentUserID OR user has FILES.DELETE permission
- [ ] Returns 403 Forbidden if user not authorized
- [ ] Returns 404 Not Found if file doesn't exist or already deleted

✅ **AC 4.4.4**: Deletion response validated
- [ ] Returns 200 OK on success
- [ ] Response: `{ success: true, message: "File deleted successfully" }`
- [ ] Subsequent GET /files/:id returns 404 Not Found
- [ ] Subsequent GET /files/:id/download returns 404 Not Found

✅ **AC 4.4.5**: Deletion logged
- [ ] Logs file deletion event (info level)
- [ ] Includes: fileID, s3Key, userID, domainID, timestamp
- [ ] Logs who deleted the file (currentUserID)

✅ **AC 4.4.6**: Soft-deleted files excluded from list endpoint
- [ ] GET /files excludes files with deletedAt !== null
- [ ] Admin with FILES.VIEW_ALL also doesn't see soft-deleted files
- [ ] No way to list deleted files via API (future restore feature)

**Definition of Done:**
- File deletion sets deletedAt timestamp
- Soft-deleted files excluded from all queries
- Access control validated (domain isolation, ownership, permissions)
- S3 file NOT deleted (cleanup deferred to future job)
- Deletion logged for audit trail
- All tests pass

---

### Story 4.5: File List Endpoint (Paginated)

**Acceptance Criteria:**

✅ **AC 4.5.1**: GET /files endpoint created
- [ ] Route: GET /api/files
- [ ] Guards: JwtAuthGuard (NO permission guard)
- [ ] Query parameters: page, limit, mimeType, search, sortBy, sortOrder
- [ ] Returns paginated FileResDto[]

✅ **AC 4.5.2**: Pagination implemented
- [ ] Default: page=1, limit=20
- [ ] Max limit: 100 items per page
- [ ] Response includes meta: { page, limit, total, totalPages }
- [ ] Uses Prisma skip/take for pagination

✅ **AC 4.5.3**: Filtering implemented
- [ ] mimeType filter: Supports wildcards (e.g., "image/*", "application/pdf")
- [ ] search filter: Searches in originalName (case-insensitive LIKE)
- [ ] Filters combined with AND logic
- [ ] All filters optional

✅ **AC 4.5.4**: Sorting implemented
- [ ] Default: sortBy='createdAt', sortOrder='desc' (newest first)
- [ ] Supported sort fields: createdAt, filename, size, mimeType
- [ ] Sort order: 'asc' or 'desc'
- [ ] Invalid sort fields rejected (400 Bad Request)

✅ **AC 4.5.5**: Access control implemented
- [ ] Regular user: Only sees own files (WHERE userID = currentUserID)
- [ ] Admin with FILES.VIEW_ALL: Sees all files in domain (no userID filter)
- [ ] Always filtered by domainID (WHERE domainID = currentUserDomainID)
- [ ] Always excludes soft-deleted files (WHERE deletedAt IS NULL)

✅ **AC 4.5.6**: List response validated
- [ ] Response: `{ success: true, data: FileResDto[], meta: { page, limit, total, totalPages } }`
- [ ] FileResDto[] is array of file metadata
- [ ] meta.total is count of all matching files (not just current page)
- [ ] meta.totalPages calculated correctly: Math.ceil(total / limit)

✅ **AC 4.5.7**: Performance validated
- [ ] Query uses indexes (domainID, userID, mimeType, deletedAt)
- [ ] Response time < 150ms (p95) for 20 items
- [ ] Pagination prevents loading entire table
- [ ] No N+1 queries (eager load relations if needed)

**Definition of Done:**
- File list endpoint returns paginated results
- Pagination, filtering, sorting work correctly
- Regular users see only own files
- Admins with FILES.VIEW_ALL see all domain files
- Domain isolation enforced (domainID filter)
- Soft-deleted files excluded
- Performance targets met
- All tests pass

---

## Traceability Mapping

### PRD Requirements → Epic 4 Stories

| PRD Requirement | Epic 4 Story | Acceptance Criteria | Notes |
|-----------------|--------------|---------------------|-------|
| **FR-4.1**: File upload capability | Story 4.2 | AC 4.2.1 - 4.2.8 | Single & multiple file upload |
| **FR-4.2**: File storage in AWS S3 | Story 4.1, 4.2 | AC 4.1.1 - 4.1.6, AC 4.2.5 | S3 configuration + upload logic |
| **FR-4.3**: File download via pre-signed URLs | Story 4.3 | AC 4.3.1 - 4.3.7 | Secure time-limited access |
| **FR-4.4**: File metadata tracking | Story 4.2, 4.3, 4.5 | AC 4.2.1, 4.3.1, 4.5.1 | Database entity with metadata |
| **FR-4.5**: File deletion (soft delete) | Story 4.4 | AC 4.4.1 - 4.4.6 | Soft delete pattern, S3 cleanup deferred |
| **FR-4.6**: File list with pagination | Story 4.5 | AC 4.5.1 - 4.5.7 | Paginated, filtered, sorted |
| **FR-4.7**: File validation (size, type) | Story 4.2 | AC 4.2.3 | Max 10MB, MIME type whitelist |
| **FR-4.8**: Permission-based access | All stories | AC 4.2.2, 4.3.2, 4.4.3, 4.5.5 | FILES.* permissions |
| **FR-4.9**: Multi-tenancy (domainID isolation) | All stories | AC 4.2.1, 4.3.2, 4.4.3, 4.5.5 | All queries filtered by domainID |
| **FR-4.10**: Rate limiting (20 uploads/hour) | Story 4.2 | AC 4.2.2 | @Throttle decorator |

### Architecture Decisions → Epic 4 Implementation

| Architecture Decision | Implementation | Location |
|-----------------------|----------------|----------|
| **Controller-Service Pattern** | FilesController → FilesService → S3Service | src/modules/files/ |
| **Multi-Tenancy (Hybrid)** | domainID filtering on all queries | FilesService |
| **Authorization Model (RBAC)** | PermissionsGuard + FILES.* permissions | FilesController decorators |
| **File Storage (AWS S3)** | S3Service with SDK v3 | src/modules/files/services/s3.service.ts |
| **Soft-Delete Pattern** | deletedAt field, S3 cleanup deferred | File entity, FilesService.deleteFile() |
| **Response Format** | ResponseTransformInterceptor | Global interceptor (inherited) |
| **Error Handling** | Layered exceptions + i18n | Global exception filter (inherited) |

### Epic 4 Stories → Database Schema

| Story | Schema Changes | Migration |
|-------|----------------|-----------|
| **Story 4.1** | None | N/A |
| **Story 4.2** | File entity + User.files relation | create_file_table.sql |
| **Story 4.3** | None (uses File entity from 4.2) | N/A |
| **Story 4.4** | None (uses deletedAt field) | N/A |
| **Story 4.5** | Indexes on File entity | Already in create_file_table.sql |

### Epic 4 Stories → API Endpoints

| Story | Endpoints | Methods | Auth | Permissions |
|-------|-----------|---------|------|-------------|
| **Story 4.1** | /health/s3 | GET | No | Public |
| **Story 4.2** | /files/upload | POST | Yes | FILES.CREATE |
| **Story 4.3** | /files/:id | GET | Yes | FILES.VIEW (or owner) |
| **Story 4.3** | /files/:id/download | GET | Yes | FILES.VIEW (or owner) |
| **Story 4.4** | /files/:id | DELETE | Yes | FILES.DELETE (or owner) |
| **Story 4.5** | /files | GET | Yes | None (FILES.VIEW_ALL for admin) |

### Epic 4 Stories → NPM Packages

| Story | New Packages | Purpose |
|-------|--------------|---------|
| **Story 4.1** | @aws-sdk/client-s3, @aws-sdk/s3-request-presigner | AWS S3 integration |
| **Story 4.2** | multer, @types/multer | Multipart form-data handling |
| **Story 4.3** | None (uses packages from 4.1) | N/A |
| **Story 4.4** | None | N/A |
| **Story 4.5** | None | N/A |

---

## Risks, Assumptions, Open Questions

### Risks

**HIGH RISK:**

1. **AWS Credentials Exposure**
   - **Risk**: AWS credentials leaked in code, logs, or version control
   - **Impact**: Unauthorized S3 access, potential data breach, AWS bill spike
   - **Mitigation**:
     - Never commit .env files
     - Use AWS IAM roles for production (avoid hardcoded credentials)
     - Implement credential rotation
     - Monitor AWS CloudTrail for unauthorized access
   - **Status**: Mitigated by environment variables, IAM best practices documented

2. **S3 Upload Failures**
   - **Risk**: S3 service unavailable, network issues, quota limits exceeded
   - **Impact**: File upload failures, poor user experience
   - **Mitigation**:
     - Retry logic with exponential backoff (3 attempts)
     - Clear error messages to user (503 Service Unavailable)
     - Health check endpoint for proactive monitoring
     - Alerting on S3 failure rate spike
   - **Status**: Mitigated by retry logic, health checks, monitoring

3. **File Size DoS Attack**
   - **Risk**: Malicious user uploads many large files to exhaust storage/bandwidth
   - **Impact**: S3 cost spike, storage quota exhausted, service degradation
   - **Mitigation**:
     - File size limit: 10MB per file
     - Rate limiting: 20 uploads per hour per user
     - Monitor storage usage per domain
     - S3 lifecycle policy (delete old files)
   - **Status**: Mitigated by validation, rate limiting, monitoring

**MEDIUM RISK:**

4. **Orphaned Files in S3**
   - **Risk**: Database insert fails after S3 upload, leaving orphaned files
   - **Impact**: Storage cost for unused files, S3 clutter
   - **Mitigation**:
     - Compensating transaction: Delete S3 files if DB insert fails
     - Scheduled cleanup job: Cross-reference S3 with DB (Epic 11)
   - **Status**: Mitigated by compensating transaction, cleanup job planned

5. **Pre-Signed URL Expiry Too Short**
   - **Risk**: User opens download link after 15 minutes, URL expired
   - **Impact**: Poor UX, user must re-request download link
   - **Mitigation**:
     - Clear expiry warning in UI
     - Easy to regenerate link (just call endpoint again)
     - Consider longer expiry for specific use cases (configurable)
   - **Status**: Accepted risk, 15 min expiry is security best practice

6. **MIME Type Bypass**
   - **Risk**: Malicious user uploads executable disguised as image/pdf
   - **Impact**: Potential XSS or code execution if file served without proper headers
   - **Mitigation**:
     - Cross-validate MIME type with file extension
     - Magic number validation (future enhancement)
     - S3 files served with `Content-Disposition: attachment` (force download)
     - Private S3 ACL (no direct public access)
   - **Status**: Mitigated by validation, future magic number check planned

**LOW RISK:**

7. **S3 Region Latency**
   - **Risk**: High latency if S3 bucket in different region than application
   - **Impact**: Slow upload/download times
   - **Mitigation**:
     - Deploy S3 bucket in same region as application
     - Document region selection in deployment guide
   - **Status**: Mitigated by documentation, region configuration

### Assumptions

1. **AWS Account Availability**
   - Assumption: Users have AWS account or can use MinIO for local dev
   - Validation: MinIO Docker Compose setup provided for local development
   - Status: ✅ Validated

2. **S3 Bucket Pre-Created**
   - Assumption: S3 bucket created manually before first file upload
   - Validation: Deployment guide includes bucket creation steps
   - Status: ✅ Documented

3. **Single S3 Bucket Per Environment**
   - Assumption: One bucket per environment (dev/staging/prod), not one per domain
   - Validation: domainID folder structure for isolation: `{domainID}/{userID}/file`
   - Status: ✅ Documented in architecture

4. **File Size Sufficient (10MB)**
   - Assumption: 10MB max file size sufficient for MVP use cases
   - Validation: Can increase limit in future if needed (requires multipart upload)
   - Status: ✅ Configurable, future enhancement planned

5. **No CDN Required (MVP)**
   - Assumption: Direct S3 download sufficient for MVP, no CDN needed
   - Validation: Pre-signed URLs provide direct S3 access
   - Status: ✅ Future enhancement (CloudFront integration)

6. **Soft Delete Acceptable**
   - Assumption: Soft delete sufficient, hard delete via scheduled job acceptable
   - Validation: Epic 11 (CI/CD) includes S3 cleanup job
   - Status: ✅ Planned in Epic 11

### Open Questions

**RESOLVED:**

1. ✅ **Q**: Should we support multipart upload for large files (>10MB)?
   - **A**: No for MVP. Simple upload sufficient for 10MB limit. Future enhancement if limit increased.

2. ✅ **Q**: How long should pre-signed URLs be valid?
   - **A**: 15 minutes. Balance between security and UX. Easily regenerable.

3. ✅ **Q**: Should we cache pre-signed URLs?
   - **A**: No for MVP. Generate on-demand. Future enhancement with Redis caching (Epic 7).

4. ✅ **Q**: Should deleted files be restorable?
   - **A**: Not in MVP. Soft delete preserves metadata, but no restore endpoint. Future enhancement.

5. ✅ **Q**: How to handle file uploads during high traffic?
   - **A**: Rate limiting (20/hour), horizontal scaling (stateless design), S3 handles load.

**OPEN:**

6. ❓ **Q**: Should we implement virus scanning for uploaded files?
   - **Impact**: Security (prevent malware upload)
   - **Options**:
     - ClamAV integration (open source)
     - AWS S3 Object Lambda + antivirus service
     - No scanning for MVP (out of scope)
   - **Decision Needed By**: Epic 4 implementation
   - **Recommendation**: Defer to future enhancement, document as optional feature

7. ❓ **Q**: Should we generate image thumbnails on upload?
   - **Impact**: Performance (faster image preview), storage (additional files)
   - **Options**:
     - Sharp library for thumbnail generation
     - AWS Lambda + S3 event trigger
     - No thumbnails for MVP
   - **Decision Needed By**: Epic 4 implementation
   - **Recommendation**: Defer to future enhancement, document as optional feature

8. ❓ **Q**: Should we track file download events (audit log)?
   - **Impact**: Compliance (GDPR, audit trail), storage (additional table)
   - **Options**:
     - FileAccessLog table (fileID, userID, accessedAt, action)
     - Log downloads in application logs only
     - No tracking for MVP
   - **Decision Needed By**: Before production deployment
   - **Recommendation**: Log downloads in application logs (info level) for MVP, database audit log if compliance required

---

## Test Strategy Summary

### Unit Tests

**Files to Test:**

1. **S3Service** (`s3.service.spec.ts`)
   - `uploadFile()`: Mock S3Client.send(), verify PutObjectCommand called with correct params
   - `getPresignedUrl()`: Mock getSignedUrl(), verify expiration and URL format
   - `deleteFile()`: Mock DeleteObjectCommand, verify S3 key passed correctly
   - `generateS3Key()`: Verify key format: `{domainID}/{userID}/{timestamp}-{filename}`
   - Error scenarios: S3 connection error, invalid credentials, bucket not found

2. **FilesService** (`files.service.spec.ts`)
   - `uploadFiles()`: Mock S3Service.uploadFile(), PrismaService.file.createMany()
   - File validation: size, MIME type, count, filename sanitization
   - Error scenarios: Validation failure, S3 upload failure, DB insert failure, compensating transaction
   - `getFileMetadata()`: Mock Prisma query, verify access control (domain, ownership, permission)
   - `generateDownloadUrl()`: Mock getFileMetadata(), S3Service.getPresignedUrl()
   - `deleteFile()`: Mock Prisma update, verify soft delete (deletedAt set)
   - `listFiles()`: Mock Prisma findMany/count, verify pagination, filtering, sorting, access control

3. **FilesController** (`files.controller.spec.ts`)
   - All endpoints: Mock FilesService methods
   - DTO validation: QueryFilesDto (page, limit, mimeType, search, sortBy, sortOrder)
   - Guard behavior: JwtAuthGuard, PermissionsGuard
   - Response transformation: Verify FileResDto format

**Coverage Target:** 90%+ for services, 80%+ for controllers

### Integration Tests

**Test Scenarios:**

1. **File Upload Flow** (E2E)
   - POST /files/upload with valid JWT and FILES.CREATE permission
   - Single file upload: Verify S3 upload + DB insert
   - Multiple file upload: Verify 10 files uploaded
   - File validation: Size > 10MB → 400 Bad Request
   - File validation: Invalid MIME type → 400 Bad Request
   - File validation: > 10 files → 400 Bad Request
   - Rate limiting: 21st upload in 1 hour → 429 Too Many Requests
   - No permission: User without FILES.CREATE → 403 Forbidden
   - No auth: No JWT → 401 Unauthorized

2. **File Download Flow** (E2E)
   - Upload file → GET /files/:id/download → Verify pre-signed URL
   - Download file from pre-signed URL → Verify file content
   - Access control: User can download own file
   - Access control: User with FILES.VIEW can download other's file
   - Access control: User without FILES.VIEW cannot download other's file
   - Domain isolation: User cannot download file from different domain
   - Soft-deleted file: GET /files/:id/download → 404 Not Found

3. **File Deletion Flow** (E2E)
   - Upload file → DELETE /files/:id → Verify deletedAt set
   - Subsequent GET /files/:id → 404 Not Found
   - Access control: User can delete own file
   - Access control: User with FILES.DELETE can delete other's file
   - Access control: User without FILES.DELETE cannot delete other's file

4. **File List Flow** (E2E)
   - Upload multiple files → GET /files → Verify paginated list
   - Pagination: page=2, limit=5 → Verify correct page
   - Filter: mimeType=image/* → Only images returned
   - Filter: search=document → Files matching "document" in originalName
   - Sorting: sortBy=size, sortOrder=asc → Files sorted by size
   - Access control: Regular user sees only own files
   - Access control: Admin with FILES.VIEW_ALL sees all domain files
   - Domain isolation: User only sees files from own domain

**Tools:** Supertest, Jest, in-memory Prisma (or test database)

### E2E Tests

**Test Cases:**

1. **Happy Path: Upload → Download → Delete**
   - User logs in → Uploads file → Gets file metadata → Downloads file → Deletes file
   - Verify each step succeeds, file content correct

2. **Permission-Based Access**
   - Admin uploads file → Regular user (no FILES.VIEW) cannot download
   - Admin uploads file → User with FILES.VIEW can download
   - User uploads file → Admin with FILES.VIEW_ALL can see in list

3. **Multi-Tenancy Isolation**
   - User from domainA uploads file
   - User from domainB cannot see/download/delete file from domainA
   - Each domain's files completely isolated

4. **Rate Limiting**
   - User uploads 20 files in 1 hour → Success
   - User uploads 21st file → 429 Too Many Requests
   - Wait 1 hour → User can upload again

5. **File Validation**
   - Upload 11MB file → 400 Bad Request (size limit)
   - Upload executable (.exe) → 400 Bad Request (MIME type)
   - Upload 11 files → 400 Bad Request (count limit)
   - Upload file with path traversal name (../../etc/passwd) → Filename sanitized

**Environment:** Staging environment with real S3 (or MinIO), test database

### Performance Tests

**Metrics to Measure:**

1. **File Upload Latency**
   - Single file (1MB): < 2s (p95)
   - Multiple files (10 × 1MB): < 5s (p95)
   - Measure: Upload time from request start to response

2. **File Download Latency**
   - Pre-signed URL generation: < 200ms (p95)
   - Actual download from S3: Not measured (client → S3 direct)

3. **File List Latency**
   - 20 files, no filters: < 150ms (p95)
   - 100 files, with filters: < 200ms (p95)

4. **Concurrent Upload Capacity**
   - 50 concurrent uploads: All succeed, no errors
   - Measure: Throughput (uploads/second), error rate

**Tools:** Artillery, k6, or custom load testing script

### Security Tests

**Test Cases:**

1. **Authentication Bypass Attempts**
   - Call all endpoints without JWT → 401 Unauthorized
   - Call with expired JWT → 401 Unauthorized
   - Call with invalid JWT → 401 Unauthorized

2. **Authorization Bypass Attempts**
   - User without FILES.CREATE tries to upload → 403 Forbidden
   - User tries to download file from different domain → 404 Not Found (not 403, info leak)
   - User tries to delete other's file without permission → 403 Forbidden

3. **File Upload Security**
   - Upload malicious filename (../../../etc/passwd) → Sanitized
   - Upload executable (.exe) disguised as image → Rejected (MIME type mismatch)
   - Upload very large file (100MB) → Rejected (size limit)
   - Upload 100 files rapidly → Rate limited (429)

4. **S3 Security**
   - Pre-signed URL accessible without auth → ✅ Expected
   - Pre-signed URL expires after 15 min → ✅ Expected
   - S3 files not publicly accessible (no pre-signed URL) → ✅ Expected

**Tools:** OWASP ZAP, Burp Suite, manual testing

### Test Data Setup

**Required Test Data:**

1. **Users:**
   - Admin user with FILES.* permissions
   - Regular user with no FILES permissions
   - User from domainA
   - User from domainB

2. **Permissions:**
   - FILES.CREATE, FILES.VIEW, FILES.DELETE, FILES.VIEW_ALL

3. **Files:**
   - Test files of various types: image (PNG, JPG), PDF, DOCX, TXT
   - Files of various sizes: 1KB, 100KB, 1MB, 5MB, 10MB
   - Files with special characters in filename

**Setup Script:**
```bash
npm run test:e2e:setup  # Create test users, permissions, upload test files
npm run test:e2e        # Run E2E tests
npm run test:e2e:teardown  # Cleanup test data, delete S3 files
```

---

**End of Epic 4 Technical Specification**
