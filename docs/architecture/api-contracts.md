# API Contracts

## Authentication Endpoints (Phone-based)

```yaml
POST /auth/register
  Description: Create new user account (phone-based)
  Body: {
    phoneNumber: string,      # Primary identifier (unique)
    password?: string,        # Required for admin, optional for staff
    firstName: string,
    lastName: string,
    email?: string,           # Optional (for notifications only)
    role: string              # 'admin' | 'staff' | etc.
  }
  Response: { success: true, data: { user: UserResDto }, message: "auth.REGISTER_SUCCESS" }
  Status: 201 Created
  Flow: Registration → SMS OTP sent → verify-phone → Account activated
  Errors: 400 (validation), 409 (phone number exists)
  Note: Admin requires password, staff uses OTP-only login

POST /auth/login/admin
  Description: Admin login with phone + password
  Body: { phoneNumber: string, password: string }
  Response: {
    success: true,
    data: {
      accessToken: string,
      refreshToken: string,
      user: UserResDto
    },
    message: "auth.LOGIN_SUCCESS"
  }
  Status: 200 OK
  Rate Limit: 5 attempts / 15 minutes per IP
  Errors: 401 (invalid credentials), 403 (phone not verified), 429 (rate limit)
  Note: Only for users with 'admin' role

POST /auth/login/otp/request
  Description: Request OTP for staff login (SMS-based)
  Body: { phoneNumber: string }
  Response: { success: true, message: "auth.OTP_SENT", data: { expiresIn: 300 } }
  Status: 200 OK
  Rate Limit: 3 attempts / 15 minutes per phone
  Errors: 400 (invalid phone), 404 (phone not found), 403 (phone not verified), 429 (rate limit)
  Note: OTP valid for 5 minutes, max 3 verification attempts
  SMS: Via FONIVA provider (hrsync-backend pattern)

POST /auth/login/otp/verify
  Description: Verify OTP and complete login (staff only)
  Body: { phoneNumber: string, code: string }
  Response: {
    success: true,
    data: {
      accessToken: string,
      refreshToken: string,
      user: UserResDto
    },
    message: "auth.LOGIN_SUCCESS"
  }
  Status: 200 OK
  Rate Limit: 3 attempts per OTP
  Errors: 400 (invalid code), 410 (expired OTP), 429 (max attempts exceeded)

POST /auth/refresh
  Description: Refresh access token using refresh token
  Body: { refreshToken: string }
  Response: {
    success: true,
    data: { accessToken: string, refreshToken: string },
    message: "auth.TOKEN_REFRESHED"
  }
  Status: 200 OK
  Note: Old refresh token invalidated (rotation)
  Errors: 401 (invalid/expired token)

POST /auth/logout
  Description: Invalidate refresh token
  Headers: { Authorization: Bearer <accessToken> }
  Body: { refreshToken: string }
  Response: { success: true, message: "auth.LOGOUT_SUCCESS" }
  Status: 200 OK

POST /auth/forgot-password
  Description: Request password reset via SMS OTP (admin only)
  Body: { phoneNumber: string }
  Response: { success: true, message: "auth.OTP_SENT" }
  Status: 200 OK
  Rate Limit: 3 attempts / hour per phone
  Note: Returns 200 even if phone not found (security). Only works for admin users.
  SMS: OTP sent via FONIVA provider

POST /auth/reset-password
  Description: Reset password with phone + OTP + new password
  Body: { phoneNumber: string, code: string, newPassword: string }
  Response: { success: true, message: "auth.PASSWORD_RESET_SUCCESS" }
  Status: 200 OK
  Errors: 400 (invalid/expired OTP), 422 (weak password)
  Note: Admin only. Staff users don't have passwords.

POST /auth/verify-phone
  Description: Verify phone number with OTP code
  Body: { phoneNumber: string, code: string }
  Response: { success: true, message: "auth.PHONE_VERIFIED" }
  Status: 200 OK
  Rate Limit: 3 attempts per OTP
  Errors: 400 (invalid code), 410 (expired OTP)
  Note: Required after registration before first login

POST /auth/resend-otp
  Description: Resend OTP code via SMS
  Body: { phoneNumber: string }
  Response: { success: true, message: "auth.OTP_RESENT" }
  Status: 200 OK
  Rate Limit: 3 attempts / 15 minutes
  Errors: 429 (rate limit)
```

## User Management Endpoints

```yaml
GET /users
  Description: List all users (admin only, paginated)
  Permission: USERS.VIEW
  Query: { page?, limit?, status?, role?, search? }
  Response: {
    success: true,
    data: UserResDto[],
    count: number,
    message: "operation.success"
  }
  Status: 200 OK
  Pagination: Default limit 20, max 100

GET /users/:id
  Description: Get user by ID (admin only)
  Permission: USERS.VIEW
  Response: { success: true, data: UserResDto, message: "operation.success" }
  Status: 200 OK
  Errors: 404 (not found), 403 (different domain)

POST /users
  Description: Create user (admin only)
  Permission: USERS.CREATE
  Body: { email, password, firstName, lastName, phone?, roles? }
  Response: { success: true, data: UserResDto, message: "users.CREATED" }
  Status: 201 Created
  Errors: 400 (validation), 409 (email exists)

PATCH /users/:id
  Description: Update user (admin only)
  Permission: USERS.UPDATE
  Body: { firstName?, lastName?, phone?, isActive?, roles? }
  Response: { success: true, data: UserResDto, message: "users.UPDATED" }
  Status: 200 OK
  Errors: 404 (not found), 400 (validation)

DELETE /users/:id
  Description: Soft delete user (admin only)
  Permission: USERS.DELETE
  Response: { success: true, message: "users.DELETED" }
  Status: 200 OK
  Note: Soft delete (deletedAt set)
  Errors: 404 (not found)

GET /users/me
  Description: Get current user profile (authenticated)
  Headers: { Authorization: Bearer <token> }
  Response: { success: true, data: UserResDto, message: "operation.success" }
  Status: 200 OK

PATCH /users/me
  Description: Update current user profile (authenticated)
  Headers: { Authorization: Bearer <token> }
  Body: { firstName?, lastName?, phone? }
  Response: { success: true, data: UserResDto, message: "users.PROFILE_UPDATED" }
  Status: 200 OK
```

## File Management Endpoints

```yaml
POST /files/upload
  Description: Upload single or multiple files
  Permission: FILES.CREATE
  Body: multipart/form-data { files: File[] }
  Response: {
    success: true,
    data: FileResDto[],
    message: "files.UPLOADED"
  }
  Status: 201 Created
  Max Size: 10MB per file
  Max Files: 10 per request
  Rate Limit: 20 uploads / hour per user
  Errors: 400 (invalid file type/size), 413 (too large)

GET /files/:id
  Description: Get file metadata
  Permission: FILES.VIEW
  Response: { success: true, data: FileResDto, message: "operation.success" }
  Status: 200 OK
  Errors: 404 (not found), 403 (no access)

GET /files/:id/download
  Description: Get pre-signed download URL
  Permission: FILES.VIEW
  Response: {
    success: true,
    data: { downloadUrl: string, expiresAt: string },
    message: "files.DOWNLOAD_URL_GENERATED"
  }
  Status: 200 OK
  URL Validity: 15 minutes
  Errors: 404 (not found), 403 (no access)

DELETE /files/:id
  Description: Soft delete file
  Permission: FILES.DELETE
  Response: { success: true, message: "files.DELETED" }
  Status: 200 OK
  Note: S3 cleanup via scheduled job
  Errors: 404 (not found), 403 (not owner)
```

## Response Format Standards

**Success Response:**
```typescript
{
  success: true,
  status: 200 | 201,
  data: T | T[],
  count?: number,  // Only for paginated responses
  message: string  // i18n key (e.g., "operation.success")
}
```

**Error Response:**
```typescript
{
  success: false,
  status: 400 | 401 | 403 | 404 | 409 | 422 | 429 | 500,
  message: string,  // i18n key (e.g., "users.NOT_FOUND")
  errors?: Array<{
    field: string,
    message: string,
    value?: any
  }>  // Validation errors only
}
```

**HTTP Status Code Usage:**
```
200 OK          - Successful GET, PATCH, POST (non-creation)
201 Created     - Successful POST (resource created)
204 No Content  - Successful DELETE (no response body)
400 Bad Request - Validation error, malformed request
401 Unauthorized - Missing/invalid authentication
403 Forbidden   - Insufficient permissions
404 Not Found   - Resource doesn't exist
409 Conflict    - Duplicate resource (e.g., email exists)
422 Unprocessable Entity - Business logic validation failed
429 Too Many Requests - Rate limit exceeded
500 Internal Server Error - Unexpected error
```

---
