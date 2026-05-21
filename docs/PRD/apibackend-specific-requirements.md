# API/Backend Specific Requirements

Bu boilerplate, NestJS-based REST API'lar için tasarlanmıştır. Aşağıdaki bölümler, boilerplate'ten fork edilen her projenin takip etmesi gereken API tasarım pattern'lerini ve best practice'leri tanımlar.

## API Architecture Pattern

**RESTful API Design** - Resource-based endpoint structure

**Controller-Service Pattern:**
```
Controller Layer → Service Layer → Data Layer (Prisma)
     ↓                 ↓                ↓
  HTTP/REST      Business Logic    Database
```

**Module Organization:**
- Her feature kendi NestJS module'ü içinde izole
- Shared/Common module cross-cutting concerns için
- Clear dependency hierarchy (no circular dependencies)

**Folder Structure Standard:**
```
src/
├── auth/              # Authentication module
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   ├── auth.module.ts
│   ├── dto/           # Request/Response DTOs
│   ├── guards/        # Module-specific guards
│   └── strategies/    # JWT, local strategies
├── users/             # User management module
├── permissions/       # Permission system module
├── common/            # Shared utilities
│   ├── decorators/
│   ├── filters/
│   ├── guards/
│   ├── interceptors/
│   └── pipes/
├── database/          # Prisma configuration
└── config/            # Configuration management
```

## Authentication & Authorization Model

**Phone-Based JWT Authentication** - Turkish market standard phone + OTP/password auth

**Authentication Flow:**

**Admin Users (Phone + Password):**
1. **Login:** Phone number + Password → JWT access token + refresh token
2. **Password Reset:** Phone + OTP verification → New password

**Staff/Other Roles (Phone + OTP):**
1. **Request OTP:** Phone number → OTP sent via SMS
2. **Verify OTP:** Phone + OTP code → JWT access token + refresh token
3. **OTP Validity:** 5 minutes, 3 retry attempts

**Common:**
1. **Protected Routes:** Bearer token in Authorization header
2. **Token Refresh:** Refresh token → New access token
3. **Logout:** Token blacklisting (optional invalidation)

**Token Configuration:**
- **Access Token:** Short-lived (15 minutes - 1 hour)
- **Refresh Token:** Long-lived (7-30 days)
- **Token Storage:** Client-side (localStorage/sessionStorage/cookies)
- **Token Payload:** User ID, phone, roles (minimal data)

**Authorization Levels:**
1. **Public Routes:** No authentication required
2. **Authenticated Routes:** Valid JWT required (`@UseGuards(JwtAuthGuard)`)
3. **Permission-Based Routes:** Specific permissions required (`@RequirePermissions('users.read')`)
4. **Role-Based Routes:** Role check (`@Roles('admin', 'staff')`)

**Security Features:**
- Password hashing (bcrypt, minimum 10 rounds) - Admin only
- Rate limiting on login endpoints (max 5 attempts per 15 minutes)
- OTP-based 2FA for staff (mandatory, via SMS only)
- Phone number verification via OTP
- ❌ Email verification removed (phone-based system)

## API Endpoint Specification

**RESTful Conventions** - Standard HTTP methods and status codes

**Endpoint Naming:**
- Use plural nouns for resources: `/users`, `/permissions`, `/files`
- Use kebab-case for multi-word resources: `/user-preferences`
- Nest related resources: `/users/:id/permissions`
- Action-based endpoints for non-CRUD: `/auth/login`, `/auth/refresh`

**HTTP Methods:**
- `GET` - Retrieve resource(s) (idempotent, cacheable)
- `POST` - Create new resource
- `PUT` - Full update (replace entire resource)
- `PATCH` - Partial update (update specific fields)
- `DELETE` - Remove resource (soft-delete preferred)

**Standard Response Format:**
```typescript
// Success Response
{
  "success": true,
  "data": { ... },
  "message": "Operation successful",
  "timestamp": "2025-11-04T12:00:00Z"
}

// Error Response
{
  "success": false,
  "error": {
    "code": "USER_NOT_FOUND",
    "message": "User with ID 123 not found",
    "details": { ... }
  },
  "timestamp": "2025-11-04T12:00:00Z"
}

// Paginated Response
{
  "success": true,
  "data": [...],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

**Pagination Standard:**
- Query parameters: `?page=1&limit=20`
- Default limit: 20
- Max limit: 100
- Include metadata: total items, total pages, current page

**Filtering & Sorting:**
- Filter: `?status=active&role=admin`
- Sort: `?sort=createdAt:desc,name:asc`
- Search: `?search=john`

**Example Endpoints:**
```
# Authentication
POST   /auth/register          # User registration (phone + password for admin, phone only for staff)
POST   /auth/login/admin       # Admin login (phone + password)
POST   /auth/login/otp/request # Request OTP for staff login (phone)
POST   /auth/login/otp/verify  # Verify OTP and login (phone + OTP code)
POST   /auth/refresh           # Refresh access token
POST   /auth/logout            # Logout (token blacklist)
POST   /auth/forgot-password   # Password reset request (admin only, via OTP)
POST   /auth/reset-password    # Password reset confirmation (phone + OTP + new password)

# Users
GET    /users                  # List users (paginated)
GET    /users/:id              # Get user by ID
POST   /users                  # Create user (admin only)
PATCH  /users/:id              # Update user
DELETE /users/:id              # Delete user (soft-delete)
GET    /users/me               # Get current user profile
PATCH  /users/me               # Update current user profile

# Permissions
GET    /permissions            # List all permissions
GET    /permissions/modules    # Get permission modules
GET    /users/:id/permissions  # Get user permissions
POST   /users/:id/permissions  # Assign permissions
DELETE /users/:id/permissions  # Revoke permissions

# Files
POST   /files/upload           # Upload file(s)
GET    /files/:id              # Get file metadata
GET    /files/:id/download     # Download file (pre-signed URL)
DELETE /files/:id              # Delete file

# Health & Monitoring
GET    /health                 # Health check
GET    /health/db              # Database health
GET    /metrics                # Application metrics (admin only)
```

## Data Schemas & Validation

**DTO-Based Validation** - class-validator + class-transformer

**Validation Strategy:**
- All request bodies validated via DTOs
- class-validator decorators for rules
- ValidationPipe globally enabled
- Automatic whitelist (strip unknown properties)
- Transform enabled (type coercion)

**Common Validation Patterns:**
```typescript
// Example: CreateUserDto
class CreateUserDto {
  @IsPhoneNumber('TR')  // Turkish phone number validation
  @IsNotEmpty()
  phoneNumber: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(50)
  @Matches(/^(?=.*[A-Za-z])(?=.*\d)/, {
    message: 'Password must contain letters and numbers'
  })
  password?: string;  // Only for admin users

  @IsString()
  @MinLength(2)
  @MaxLength(50)
  firstName: string;

  @IsString()
  @MinLength(2)
  @MaxLength(50)
  lastName: string;

  @IsOptional()
  @IsEmail()
  email?: string;  // Optional, for notifications

  // Note: NO role field in User model or DTO
  // Roles are assigned ONLY via UserRole junction table
  // Registration creates user and assigns default role via UserRole
}
```

**Database Schema (Prisma):**
- Schema-first approach
- Separate schemas for PostgreSQL and MongoDB
- Migration system for schema evolution
- Soft-delete pattern (deletedAt field)
- Timestamp fields (createdAt, updatedAt) on all models

**Example Core Models:**
```prisma
model User {
  id            String    @id @default(uuid()) @db.Uuid
  domainID      String    @db.Uuid              // Multi-tenant support
  email         String?                           // Optional, for notifications
  passwordHash  String?                           // Only for admin users
  firstName     String
  lastName      String
  phoneNumber   String
  phoneVerified Boolean   @default(false)         // Verified via OTP
  isActive      Boolean   @default(true)
  emailVerified Boolean   @default(false)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  deletedAt     DateTime?

  // Relations (NO legacy role string field - clean relational design)
  domain                    Domain    @relation(fields: [domainID], references: [id], onDelete: Cascade)
  userPermissions           UserPermission[]
  userRoles                 UserRole[]              // User roles via junction table ONLY
  files                     File[]

  @@unique([phoneNumber, domainID])
  @@index([domainID])
}

model Role {
  id        String   @id @default(uuid()) @db.Uuid
  domainID  String   @db.Uuid              // Multi-tenant: roles are domain-specific
  name      String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  domain             Domain            @relation(fields: [domainID], references: [id], onDelete: Cascade)
  userRoles          UserRole[]
  rolePermissions    RolePermission[]

  @@unique([domainID, name])
  @@index([domainID])
}

model UserRole {
  id        String   @id @default(uuid()) @db.Uuid
  userID    String   @db.Uuid
  roleID    String   @db.Uuid
  domainID  String   @db.Uuid              // Multi-tenant context
  createdAt DateTime @default(now())

  // Relations
  user   User   @relation(fields: [userID], references: [id], onDelete: Cascade)
  role   Role   @relation(fields: [roleID], references: [id], onDelete: Cascade)
  domain Domain @relation(fields: [domainID], references: [id], onDelete: Cascade)

  @@unique([userID, roleID, domainID])
  @@index([domainID])
  @@index([userID])
  @@index([roleID])
}

model Permission {
  id          String   @id @default(uuid()) @db.Uuid
  module      String
  action      String
  description String?
  createdAt   DateTime @default(now())

  // Relations
  userPermissions UserPermission[]
  rolePermissions RolePermission[]

  @@unique([module, action])
  @@index([module])
}

model RolePermission {
  id           String   @id @default(uuid()) @db.Uuid
  roleID       String   @db.Uuid
  permissionID String   @db.Uuid
  createdAt    DateTime @default(now())

  // Relations
  role       Role       @relation(fields: [roleID], references: [id], onDelete: Cascade)
  permission Permission @relation(fields: [permissionID], references: [id], onDelete: Cascade)

  @@unique([roleID, permissionID])
  @@index([roleID])
  @@index([permissionID])
}

model UserPermission {
  id           String   @id @default(uuid()) @db.Uuid
  userID       String   @db.Uuid
  permissionID String   @db.Uuid
  domainID     String   @db.Uuid              // Multi-tenant context
  createdAt    DateTime @default(now())

  // Relations
  user       User       @relation(fields: [userID], references: [id], onDelete: Cascade)
  permission Permission @relation(fields: [permissionID], references: [id], onDelete: Cascade)
  domain     Domain     @relation(fields: [domainID], references: [id], onDelete: Cascade)

  @@unique([userID, permissionID, domainID])
  @@index([domainID])
  @@index([userID])
  @@index([permissionID])
}

model File {
  id          String    @id @default(uuid())
  filename    String
  originalName String
  mimeType    String
  size        Int
  s3Key       String
  s3Bucket    String
  userId      String
  user        User      @relation(fields: [userId], references: [id])
  createdAt   DateTime  @default(now())
  deletedAt   DateTime?
}
```

## Error Handling & Status Codes

**Standard HTTP Status Codes:**

**Success Codes:**
- `200 OK` - Successful GET, PUT, PATCH
- `201 Created` - Successful POST (resource created)
- `204 No Content` - Successful DELETE

**Client Error Codes:**
- `400 Bad Request` - Validation error, malformed request
- `401 Unauthorized` - Missing or invalid authentication
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource doesn't exist
- `409 Conflict` - Duplicate resource (e.g., email already exists)
- `422 Unprocessable Entity` - Business logic validation failed
- `429 Too Many Requests` - Rate limit exceeded

**Server Error Codes:**
- `500 Internal Server Error` - Unexpected server error
- `503 Service Unavailable` - Service temporarily down

**Error Code System:**

Standardized error codes for client handling:

```typescript
// Error Code Categories
AUTH_xxx      // Authentication errors
VALIDATION_xxx // Validation errors
PERMISSION_xxx // Authorization errors
RESOURCE_xxx   // Resource errors
SYSTEM_xxx     // System errors
```

**Example Error Codes:**
```
AUTH_INVALID_CREDENTIALS    // Invalid email/password
AUTH_TOKEN_EXPIRED          // JWT token expired
AUTH_TOKEN_INVALID          // JWT token malformed
AUTH_EMAIL_NOT_VERIFIED     // Email verification required
AUTH_ACCOUNT_LOCKED         // Too many failed attempts

VALIDATION_FAILED           // General validation error
VALIDATION_EMAIL_INVALID    // Invalid email format
VALIDATION_PASSWORD_WEAK    // Password doesn't meet requirements

PERMISSION_DENIED           // Insufficient permissions
PERMISSION_NOT_FOUND        // Permission doesn't exist

RESOURCE_NOT_FOUND          // Generic resource not found
RESOURCE_USER_NOT_FOUND     // Specific: user not found
RESOURCE_DUPLICATE          // Resource already exists

SYSTEM_DATABASE_ERROR       // Database connection/query error
SYSTEM_EXTERNAL_SERVICE     // External API error (S3, SMS, etc.)
```

**Exception Filter:**
- Centralized exception handling
- Automatic error logging (with Sentry integration)
- Error sanitization (hide sensitive data in production)
- Stack traces only in development

## Rate Limiting Strategy

**Basic Rate Limiting** (MVP) - Protect against abuse

**Implementation:**
- `@nestjs/throttler` package
- In-memory rate limiting (Redis in Phase 2)
- Global default + per-route override

**Default Limits:**
- **Global:** 100 requests per 15 minutes per IP
- **Login endpoint:** 5 attempts per 15 minutes per IP
- **Registration:** 3 registrations per hour per IP
- **Password reset:** 3 requests per hour per email
- **File upload:** 20 uploads per hour per user

**Rate Limit Response:**
```
HTTP 429 Too Many Requests
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again later.",
    "retryAfter": 900  // seconds
  }
}
```

**Headers:**
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Requests remaining
- `X-RateLimit-Reset`: Unix timestamp when limit resets

## API Versioning Approach

**No Versioning in MVP** - Start simple, add when needed

**Future Versioning Strategy (Phase 2):**
- **URI-based versioning:** `/v1/users`, `/v2/users`
- Version in URL path for clarity
- Maintain backwards compatibility for at least 1 major version
- Deprecation warnings in response headers
- Documentation for version differences

## API Documentation (Swagger/OpenAPI)

**Auto-Generated Documentation** - Always up-to-date

**Swagger Configuration:**
- Available at `/api/docs` (development and staging)
- Disabled in production (or behind auth)
- Interactive "Try it out" functionality
- Bearer token authentication in UI

**Documentation Requirements:**
- Every endpoint documented with:
  - Description (what it does)
  - Request DTOs (with validation rules)
  - Response schemas (success and error)
  - Example requests/responses
  - Required permissions/roles
- API categories/tags (Auth, Users, Files, etc.)
- Authentication flow diagram

**Swagger Decorators:**
```typescript
@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @ApiResponse({
    status: 200,
    description: 'User found',
    type: UserResponseDto
  })
  @ApiResponse({
    status: 404,
    description: 'User not found'
  })
  @RequirePermissions('users.read')
  async findOne(@Param('id') id: string) {
    // ...
  }
}
```

## Database Integration Patterns

**Prisma ORM** - Type-safe database access

**Database Options:**
- **PostgreSQL** (recommended for relational data)
- **MongoDB** (optional, for document-based data)
- Selected during project initialization

**Prisma Best Practices:**
```typescript
// Service pattern with Prisma
@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll(page: number, limit: number) {
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        skip: (page - 1) * limit,
        take: limit,
        where: { deletedAt: null }, // Soft-delete filter
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          createdAt: true,
          // Exclude passwordHash
        },
        orderBy: { createdAt: 'desc' }
      }),
      this.prisma.user.count({
        where: { deletedAt: null }
      })
    ]);

    return { users, total };
  }
}
```

**Transaction Support:**
```typescript
// Complex operations with transactions
await this.prisma.$transaction(async (tx) => {
  const user = await tx.user.create({ data: userData });
  await tx.userPermission.createMany({
    data: permissions.map(p => ({ userId: user.id, ...p }))
  });
});
```

**Migration Workflow:**
1. Update `schema.prisma`
2. `npx prisma migrate dev --name description`
3. Prisma generates SQL migration
4. Review migration before applying
5. `npx prisma migrate deploy` in production

## External Service Integration Patterns

**AWS S3 Integration:**
- AWS SDK v3
- Pre-signed URLs for secure downloads
- Multipart upload for large files
- S3 bucket per environment (dev, staging, prod)

**SMS Provider (FONIVA - hrsync-backend pattern):**
- FONIVA API integration (Turkish SMS provider)
- Provider abstraction interface (ISMSProvider)
- Easy provider switching via config
- Template-based messaging (TR/EN)
- Database tracking (SMS entity)
- Delivery status tracking via webhooks
- Retry mechanism for failed SMS
- Statistics and reporting

**Email Provider:**
- SMTP or service provider (SendGrid, SES)
- HTML template engine (Handlebars/Pug)
- Email queue for async sending
- Bounce/complaint handling

**Sentry Integration:**
- Error tracking and reporting
- Performance monitoring
- Release tracking
- User context in error reports

**Firebase (Optional):**
- Push notifications (FCM)
- Device token management
- Notification scheduling

## Configuration Management

**Environment-Based Configuration:**

```
.env.development
.env.staging
.env.production
.env.test
```

**Required Environment Variables:**
```bash
# Application
NODE_ENV=development
PORT=3000
API_PREFIX=api

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/db

# JWT
JWT_SECRET=<random-secret>
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

# AWS S3
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=<key>
AWS_SECRET_ACCESS_KEY=<secret>
S3_BUCKET=<bucket-name>

# SMS Provider (FONIVA)
SMS_PROVIDER=FONIVA
FONIVA_API_URL=<api-url>
FONIVA_USERNAME=<username>
FONIVA_PASSWORD=<password>
FONIVA_API_KEY=<api-key>
FONIVA_SENDER=<sender-name>

# Email
MAIL_HOST=smtp.example.com
MAIL_PORT=587
MAIL_USER=<user>
MAIL_PASSWORD=<password>
MAIL_FROM=noreply@example.com

# Sentry
SENTRY_DSN=<dsn>

# Firebase (Optional)
FIREBASE_PROJECT_ID=<project-id>
FIREBASE_PRIVATE_KEY=<key>
FIREBASE_CLIENT_EMAIL=<email>
```

**Configuration Validation:**
- Validate all required env vars on startup
- Type-safe config module
- Fail fast if configuration invalid

---
