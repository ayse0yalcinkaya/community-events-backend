# Security Architecture

## Authentication Flow (Phone-based)

**Flow 1: Admin Login (Phone + Password)**

```
┌────────────┐
│   Client   │
└─────┬──────┘
      │ 1. POST /auth/login/admin
      │    { phoneNumber, password }
      ▼
┌─────────────────────────────────────┐
│       Auth Controller               │
│  - Rate limit check (5/15min)       │
│  - Validate phone + password        │
│  - Check if phone verified          │
│  - Check if user is admin           │
└─────┬───────────────────────────────┘
      │ 2. Valid credentials
      ▼
┌─────────────────────────────────────┐
│       Token Service                 │
│  - Generate access token (JWT)      │
│  - Generate refresh token (UUID)    │
│  - Store refresh token in DB        │
└─────┬───────────────────────────────┘
      │ 3. Return tokens
      ▼
┌────────────┐
│   Client   │
│  Store:    │
│  - Access Token (memory/storage)    │
│  - Refresh Token (secure storage)   │
└─────┬──────┘
      │ 4. Subsequent requests
      │    Authorization: Bearer <accessToken>
      ▼
┌─────────────────────────────────────┐
│      JWT Auth Guard                 │
│  - Verify token signature           │
│  - Check expiration                 │
│  - Extract user payload             │
└─────┬───────────────────────────────┘
      │ 5. Token valid
      ▼
┌─────────────────────────────────────┐
│    Permissions Guard                │
│  - Load user permissions            │
│  - Check required permission        │
│  - Allow or deny access             │
└─────┬───────────────────────────────┘
      │ 6. Permission granted
      ▼
┌─────────────────────────────────────┐
│      Controller Handler             │
│  - Execute business logic           │
│  - Return response                  │
└─────────────────────────────────────┘
```

**Flow 2: Staff Login (Phone + OTP via FONIVA SMS)**

```
┌────────────┐
│   Client   │
└─────┬──────┘
      │ 1. POST /auth/login/otp/request
      │    { phoneNumber }
      ▼
┌─────────────────────────────────────┐
│       Auth Controller               │
│  - Rate limit check (3/15min)       │
│  - Validate phone number            │
│  - Check if phone verified          │
│  - Generate 6-digit OTP             │
└─────┬───────────────────────────────┘
      │ 2. Save OTP to DB
      ▼
┌─────────────────────────────────────┐
│       OTP Service                   │
│  - Create OTP record (5 min expiry) │
│  - Mark previous OTPs as expired    │
└─────┬───────────────────────────────┘
      │ 3. Send SMS
      ▼
┌─────────────────────────────────────┐
│       SMS Service (FONIVA)          │
│  - Send OTP via FONIVA provider     │
│  - Track SMS in database            │
│  - Return success                   │
└─────┬───────────────────────────────┘
      │ 4. OTP sent
      ▼
┌────────────┐
│   Client   │
│  Receives  │
│  SMS with  │
│  OTP code  │
└─────┬──────┘
      │ 5. POST /auth/login/otp/verify
      │    { phoneNumber, code }
      ▼
┌─────────────────────────────────────┐
│       Auth Controller               │
│  - Rate limit check (3 attempts)    │
│  - Verify OTP code                  │
│  - Check expiration (5 min)         │
│  - Mark OTP as verified             │
└─────┬───────────────────────────────┘
      │ 6. OTP valid
      ▼
┌─────────────────────────────────────┐
│       Token Service                 │
│  - Generate access token (JWT)      │
│  - Generate refresh token (UUID)    │
│  - Store refresh token in DB        │
└─────┬───────────────────────────────┘
      │ 7. Return tokens
      ▼
┌────────────┐
│   Client   │
│  Store:    │
│  - Access Token (memory/storage)    │
│  - Refresh Token (secure storage)   │
└────────────┘
```

**Token Structure:**

```typescript
// Access Token (JWT Payload)
{
  sub: string,        // userID
  phoneNumber: string, // Primary identifier
  domainID: string,
  roles: string[],
  iat: number,        // issued at
  exp: number         // expires at (15-60 min from iat)
}

// Refresh Token (Database Record)
{
  id: string,         // UUID
  userID: string,
  domainID: string,
  token: string,      // Unique UUID
  expiresAt: Date,    // 7-30 days from creation
  createdAt: Date
}

// OTP Record (Database)
{
  id: string,         // UUID
  userID: string,
  domainID: string,
  code: string,       // 6-digit code
  type: string,       // 'SMS'
  expiresAt: Date,    // 5 minutes from creation
  attempts: number,   // Max 3 attempts
  verified: boolean,
  createdAt: Date
}
```

## Authorization Model

**Permission Format:** `MODULE.ACTION`

Examples:
- `USERS.CREATE`
- `USERS.VIEW`
- `USERS.UPDATE`
- `USERS.DELETE`
- `FILES.UPLOAD`
- `ADVANCE_PAYMENT.APPROVE`

**Permission Check Flow:**
```typescript
// 1. Define permission in constants
export const PERMISSIONS = {
  USERS: {
    CREATE: 'USERS.CREATE',
    VIEW: 'USERS.VIEW',
    UPDATE: 'USERS.UPDATE',
    DELETE: 'USERS.DELETE',
  }
} as const;

// 2. Apply decorator to controller
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Permission('USERS', ActionEnum.CREATE)
async create(@Body() dto: CreateUserDto) { }

// 3. Guard checks permission
async canActivate(context: ExecutionContext): Promise<boolean> {
  const user = request.user;  // From JWT
  const required = this.reflector.get('permission', handler);
  const hasPermission = await this.authorizationService.hasPermission(
    user.id,
    user.domainID,
    required
  );
  return hasPermission;
}
```

**Role Hierarchy:**
```
User
 └─> UserRole (many-to-many)
      └─> Role
           └─> RolePermission (many-to-many)
                └─> Permission

Alternate: Direct assignment
User
 └─> UserPermission (many-to-many)
      └─> Permission
```

## Data Security

**Encryption:**
- Passwords: bcrypt (10+ rounds)
- JWT Secret: 32+ characters, environment-specific
- Database: Encryption at rest (provider-level)
- HTTPS: TLS 1.2+ only (production)
- S3: Pre-signed URLs (time-limited, 15 min)

**Multi-Tenancy Isolation:**
```typescript
// Every query includes domainID filter
await prisma.user.findMany({
  where: {
    domainID: currentUserDomainID,
    deletedAt: null
  }
});

// Prisma middleware double-check (safety net)
prisma.$use(async (params, next) => {
  if (params.model && !params.args.where?.domainID) {
    console.warn('Query without domainID filter:', params);
    // Development: warn, Production: block
  }
  return next(params);
});
```

**Input Validation:**
- DTO validation (class-validator)
- Parameterized queries (Prisma - SQL injection prevention)
- File type/size validation (multer + custom validators)
- XSS prevention (output encoding, Content Security Policy)

**Rate Limiting:**
```typescript
// Global: 100 requests / 15 min per IP
@ThrottlerGuard({ ttl: 900, limit: 100 })

// Login: 5 attempts / 15 min per IP
@Throttle(5, 900)
POST /auth/login

// File upload: 20 uploads / hour per user
@Throttle(20, 3600)
POST /files/upload
```

---
