# Epic Technical Specification: Authentication & Session Management (Phone-based)

Date: 2025-11-05
Author: BMad
Epic ID: 2
Status: Draft

---

## Overview

Epic 2, Boilerplate projesinin güvenlik katmanını oluşturan phone-based JWT authentication sistemini implement eder. Türkiye pazarına özel telefon numarası tabanlı kimlik doğrulama, iki farklı kullanıcı tipi için farklı authentication flow'ları sunar: **Admin kullanıcılar** telefon numarası + şifre ile giriş yaparken, **Staff ve diğer roller** telefon numarası + OTP (SMS) ile giriş yapar.

Bu epic, **stateless JWT access token** (15-60 dakika ömürlü) ve **database-stored refresh token** (7-30 gün ömürlü) hybrid pattern'ini kullanarak hem performans hem de güvenlik sağlar. Access token'lar her istekte validate edilirken database'e gitmez (JWT verification), refresh token'lar ise database'de saklanarak revoke edilebilir (logout, güvenlik ihlali durumları).

PRD'de tanımlanan "production-ready authentication" hedefine ulaşmak için brute-force protection (rate limiting), OTP-based phone verification, ve FONIVA SMS provider integration (hrsync-backend proven pattern) içerir. Epic 1'de oluşturulan User, RefreshToken ve OTPVerification entity'leri üzerine kurulu bu sistem, Epic 3'te gelecek permission-based authorization için sağlam bir temel oluşturur.

## Objectives and Scope

### In Scope

**✅ JWT Authentication Infrastructure**
- Passport.js + passport-jwt integration
- JWT Strategy implementation (phone-based token validation)
- JwtAuthGuard (route protection)
- @Public() decorator (guard exemption)
- JWT secret configuration ve environment validation

**✅ Phone-Based User Registration**
- POST /auth/register endpoint
- Admin registration: phoneNumber + password (required)
- Staff registration: phoneNumber + optional password
- Phone uniqueness validation
- Password strength validation (min 8 char, 1 letter, 1 number)
- Bcrypt password hashing (10 rounds) - admin only
- Automatic phone verification OTP sending (FONIVA integration)

**✅ Dual Authentication Flows**
- **Admin Login:** POST /auth/login/admin (phoneNumber + password → tokens)
- **Staff Login:**
  - POST /auth/login/otp/request (phoneNumber → SMS OTP)
  - POST /auth/login/otp/verify (phoneNumber + OTP code → tokens)
- Role-based flow selection
- Rate limiting per flow (admin: 5/15min, staff: 3/15min)

**✅ Token Management System**
- Access token generation (JWT, 15-60 min expiry, stateless)
- Refresh token generation (UUID, database-stored, 7-30 day expiry)
- Token refresh endpoint: POST /auth/refresh (refresh token → new tokens)
- Token rotation (refresh token tek kullanımlık)
- Token payload: { sub: userID, phoneNumber, domainID, roles, iat, exp }

**✅ Session & Logout Management**
- POST /auth/logout endpoint
- Refresh token invalidation (database delete)
- Token blacklisting infrastructure (optional, future-ready)
- Graceful session termination

**✅ Phone Verification System (OTP)**
- 6-digit OTP generation (crypto.randomInt)
- OTPVerification entity usage (Epic 1 schema)
- OTP expiry management (5 minutes)
- Attempt tracking (max 3 attempts)
- SMS sending via FONIVA provider (Epic 5.1 integration point)
- Phone verification status update (User.phoneVerified)

**✅ Password Reset Flow (Admin Only)**
- POST /auth/forgot-password (phoneNumber → OTP)
- POST /auth/reset-password (phoneNumber + OTP + new password)
- OTP-based verification (phone ownership proof)
- Rate limiting (3 requests/hour per phone)
- Password policy enforcement

**✅ Security Features**
- Rate limiting (@nestjs/throttler integration)
- Brute-force protection (login attempt limits)
- Password hashing (bcrypt, 10+ rounds)
- Generic error messages (credential leakage prevention)
- Phone verification requirement (unverified users blocked)

### Out of Scope

**❌ Permission-Based Authorization:** Epic 3'te implement edilecek (PermissionGuard, @RequirePermissions decorator)
**❌ RBAC Logic:** Role-permission assignment ve validation Epic 3'te
**❌ SMS Module Implementation:** Epic 5.1'de FONIVA provider module oluşturulacak, bu epic sadece integration yapar
**❌ User Profile Management:** Profil update, self-service operations Epic 3'te (User CRUD stories)
**❌ Email Authentication:** ❌ Removed - phone-based only (PRD decision)
**❌ Email Verification:** ❌ Removed - phone verification via OTP only
**❌ Social Login:** Google, Facebook, Apple ID - not in MVP scope
**❌ Multi-Factor Authentication (MFA):** OTP tek factor, additional factors Phase 2
**❌ Remember Me Feature:** Client-side token storage, not backend concern
**❌ Device Management:** Trusted devices, device fingerprinting - Phase 2
**❌ Login History:** Epic 7'de logging infrastructure ile
**❌ Account Lockout:** Temporary account disable Epic 3'te (User.isActive management)

## System Architecture Alignment

Bu epic, architecture dokümanında tanımlanan **Authentication & Authorization** katmanını implement eder ve aşağıdaki architectural decision'lara align olur:

**Module Structure Extension:**
```
boilerplate/
├── src/
│   ├── modules/
│   │   └── auth/                     # Epic 2
│   │       ├── auth.controller.ts
│   │       ├── auth.service.ts
│   │       ├── auth.module.ts
│   │       ├── dto/
│   │       │   ├── register.dto.ts
│   │       │   ├── login-admin.dto.ts
│   │       │   ├── login-otp-request.dto.ts
│   │       │   ├── login-otp-verify.dto.ts
│   │       │   ├── refresh-token.dto.ts
│   │       │   ├── forgot-password.dto.ts
│   │       │   └── reset-password.dto.ts
│   │       ├── strategies/
│   │       │   └── jwt.strategy.ts
│   │       ├── guards/
│   │       │   └── jwt-auth.guard.ts
│   │       ├── decorators/
│   │       │   ├── public.decorator.ts
│   │       │   └── current-user.decorator.ts
│   │       └── services/
│   │           ├── token.service.ts
│   │           └── otp.service.ts
│   ├── common/                       # Shared guards (Epic 2)
│   │   └── guards/
│   │       └── jwt-auth.guard.ts
│   └── database/                     # Epic 1 (inherited)
│       └── prisma.service.ts
```

**ADR Alignment:**

- **ADR-002: Phone-Based Authentication**
  - Implementation: `phoneNumber` field unique identifier (replaces email)
  - JWT payload contains phoneNumber instead of email
  - All auth endpoints accept phoneNumber as primary input

- **ADR-004: Hybrid Token Architecture**
  - Access Token: JWT (stateless, fast validation, 15-60 min expiry)
  - Refresh Token: UUID stored in database (revokable, 7-30 day expiry)
  - Token rotation on refresh (security best practice)

- **ADR-005: Dual Authentication Flow**
  - Admin users: Phone + Password (bcrypt hashed)
  - Staff users: Phone + OTP (SMS via FONIVA)
  - Role-based flow selection at registration

- **ADR-006: Rate Limiting Strategy**
  - Throttler integration (@nestjs/throttler)
  - Per-endpoint limits (admin login: 5/15min, OTP request: 3/15min)
  - IP-based tracking (MVP), user-based future enhancement

- **ADR-010: Security-First Error Messages**
  - Generic error messages for authentication failures
  - No credential existence disclosure (email/phone enumeration prevention)
  - Detailed errors only in development environment

**Integration Points:**

- **Epic 1 Database Layer:**
  - PrismaService inject edilir (User, RefreshToken, OTPVerification queries)
  - Epic 1'de oluşturulan entity'ler doğrudan kullanılır
  - Multi-tenancy domainID filtering uygulanır

- **Epic 5.1 SMS Module:**
  - SMS gönderimi için SmsService inject edilir (FONIVA provider)
  - OTP SMS template'leri kullanılır (TR/EN)
  - Delivery tracking Epic 5'te handle edilir, auth sadece trigger eder

- **Epic 7 Common Module:**
  - ResponseInterceptor (global response wrapping - hrsync-backend format)
  - ExceptionFilter (error handling ve i18n messages)
  - LoggingInterceptor (request/response logging)

**Dependency Flow:**
```
AuthModule
  └─> PrismaModule (Epic 1 - database access)
       └─> ConfigModule (Epic 1 - JWT secret, expiry times)
            └─> SmsModule (Epic 5.1 - OTP sending, lazy load or stub initially)
                 └─> CommonModule (Epic 7 - guards, interceptors, decorators)
```

**Note:** Epic 5.1 (SMS Module) Epic 2'den önce implement edilmezse, SmsService stub/mock kullanılır ve Epic 5.1 sonrası gerçek implementation swap edilir.

## Detailed Design

### Services and Modules

| Service/Module | Responsibility | Inputs | Outputs | Owner |
|---------------|---------------|---------|---------|-------|
| **AuthController** | HTTP endpoint handler, request validation, response formatting | HTTP requests (DTOs) | HTTP responses (tokens, user data) | modules/auth/auth.controller.ts |
| **AuthService** | Business logic orchestrator - registration, login, token management | DTOs, user data | Tokens, user entities, validation results | modules/auth/auth.service.ts |
| **TokenService** | Token generation, validation, refresh, storage | User data, refresh token | JWT tokens, refresh token records | modules/auth/services/token.service.ts |
| **OtpService** | OTP generation, validation, expiry management | User ID, phone number | OTP code, validation results | modules/auth/services/otp.service.ts |
| **JwtStrategy** | Passport strategy - JWT token validation | JWT token (from header) | Validated user payload | modules/auth/strategies/jwt.strategy.ts |
| **JwtAuthGuard** | Route protection - guard implementation | HTTP request | Allow/deny decision | modules/auth/guards/jwt-auth.guard.ts |
| **@Public() Decorator** | Metadata marker - exempt routes from auth | - | Metadata flag | modules/auth/decorators/public.decorator.ts |
| **@CurrentUser() Decorator** | Extract user from request | Request object | User payload | modules/auth/decorators/current-user.decorator.ts |
| **PrismaService** | Database access (injected from Epic 1) | Queries | User, RefreshToken, OTPVerification entities | database/prisma.service.ts |
| **SmsService** | SMS sending (injected from Epic 5.1) | Phone, message, template | SMS sent confirmation | (Epic 5.1 - stub for now) |

**Service Dependencies:**
```
AuthController
  └─> AuthService
       ├─> TokenService
       │    └─> PrismaService (RefreshToken CRUD)
       ├─> OtpService
       │    ├─> PrismaService (OTPVerification CRUD)
       │    └─> SmsService (OTP SMS sending - Epic 5.1)
       └─> PrismaService (User CRUD)

JwtStrategy
  └─> PrismaService (User lookup for token validation)

JwtAuthGuard
  └─> JwtStrategy (via Passport)
```

**Module Structure:**
```typescript
@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET'),
        signOptions: { expiresIn: config.get('JWT_ACCESS_EXPIRATION') }
      })
    }),
    ThrottlerModule.forRoot([
      { name: 'admin-login', ttl: 900000, limit: 5 },  // 15 min, 5 attempts
      { name: 'otp-request', ttl: 900000, limit: 3 }   // 15 min, 3 attempts
    ]),
    PrismaModule, // Epic 1
    // SmsModule - Epic 5.1, stub initially
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    TokenService,
    OtpService,
    JwtStrategy,
    JwtAuthGuard
  ],
  exports: [JwtStrategy, JwtAuthGuard, TokenService] // For other modules
})
export class AuthModule {}
```

### Data Models and Contracts

**Request DTOs (class-validator):**

```typescript
// Registration DTO
export class RegisterDto {
  @IsPhoneNumber('TR')
  @IsNotEmpty()
  phoneNumber: string; // E.164 format: +90XXXXXXXXXX

  @IsString()
  @MinLength(2)
  @MaxLength(50)
  firstName: string;

  @IsString()
  @MinLength(2)
  @MaxLength(50)
  lastName: string;

  @IsEnum(['admin', 'staff', 'manager'])
  role: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(50)
  @Matches(/^(?=.*[A-Za-z])(?=.*\d)/, {
    message: 'Password must contain at least 1 letter and 1 number'
  })
  password?: string; // Required if role === 'admin'

  @IsOptional()
  @IsEmail()
  email?: string; // Optional, for notifications only
}

// Admin Login DTO
export class LoginAdminDto {
  @IsPhoneNumber('TR')
  @IsNotEmpty()
  phoneNumber: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}

// OTP Request DTO
export class LoginOtpRequestDto {
  @IsPhoneNumber('TR')
  @IsNotEmpty()
  phoneNumber: string;
}

// OTP Verify DTO
export class LoginOtpVerifyDto {
  @IsPhoneNumber('TR')
  @IsNotEmpty()
  phoneNumber: string;

  @IsString()
  @Length(6, 6)
  @Matches(/^\d{6}$/, { message: 'OTP must be 6 digits' })
  code: string;
}

// Refresh Token DTO
export class RefreshTokenDto {
  @IsUUID()
  @IsNotEmpty()
  refreshToken: string;
}

// Forgot Password DTO
export class ForgotPasswordDto {
  @IsPhoneNumber('TR')
  @IsNotEmpty()
  phoneNumber: string;
}

// Reset Password DTO
export class ResetPasswordDto {
  @IsPhoneNumber('TR')
  @IsNotEmpty()
  phoneNumber: string;

  @IsString()
  @Length(6, 6)
  @Matches(/^\d{6}$/)
  otpCode: string;

  @IsString()
  @MinLength(8)
  @MaxLength(50)
  @Matches(/^(?=.*[A-Za-z])(?=.*\d)/, {
    message: 'Password must contain at least 1 letter and 1 number'
  })
  newPassword: string;
}
```

**Response DTOs:**

```typescript
// User Response DTO (password excluded)
export class UserResDto {
  id: string;
  phoneNumber: string;
  firstName: string;
  lastName: string;
  email?: string;
  role: string;
  isActive: boolean;
  phoneVerified: boolean;
  createdAt: Date;
  updatedAt: Date;

  // Exclude: passwordHash, deletedAt, domainID (internal fields)
}

// Auth Response (login/register success)
export class AuthResponseDto {
  accessToken: string;
  refreshToken: string;
  user: UserResDto;
  expiresIn: number; // seconds
}

// OTP Request Response
export class OtpRequestResponseDto {
  success: boolean;
  message: string; // "OTP sent to your phone"
  expiresIn: number; // 300 seconds (5 minutes)
}

// Generic Success Response
export class SuccessResponseDto {
  success: boolean;
  message: string;
}
```

**JWT Payload Interface:**

```typescript
export interface JwtPayload {
  sub: string;          // User ID
  phoneNumber: string;  // Phone number (unique identifier)
  domainID: string;     // Multi-tenancy
  roles: string[];      // User roles (for quick checks)
  iat: number;          // Issued at (Unix timestamp)
  exp: number;          // Expiration (Unix timestamp)
}
```

**OTP Verification Interface:**

```typescript
export interface OtpValidationResult {
  valid: boolean;
  userID?: string;
  reason?: 'EXPIRED' | 'INVALID_CODE' | 'MAX_ATTEMPTS' | 'NOT_FOUND';
  attemptsRemaining?: number;
}
```

**Entity Usage (from Epic 1 Prisma Schema):**

```prisma
// User entity (Epic 1)
model User {
  id            String    @id @default(uuid())
  domainID      String    @db.Uuid
  phoneNumber   String    @unique           // Primary identifier
  passwordHash  String?                     // Only for admin
  firstName     String
  lastName      String
  email         String?                     // Optional
  role          String    @default("staff") // admin, staff, manager
  isActive      Boolean   @default(true)
  phoneVerified Boolean   @default(false)   // OTP verified
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  deletedAt     DateTime?

  refreshTokens     RefreshToken[]
  otpVerifications  OTPVerification[]
}

// RefreshToken entity (Epic 1)
model RefreshToken {
  id        String   @id @default(uuid())
  userID    String   @db.Uuid
  domainID  String   @db.Uuid
  token     String   @unique  // UUID token
  expiresAt DateTime
  createdAt DateTime @default(now())

  user User @relation(fields: [userID], references: [id], onDelete: Cascade)

  @@index([userID])
  @@index([token])
}

// OTPVerification entity (Epic 1)
model OTPVerification {
  id        String   @id @default(uuid())
  userID    String   @db.Uuid
  domainID  String   @db.Uuid
  code      String   // 6-digit code
  type      String   // 'EMAIL' | 'SMS' (only SMS used in Epic 2)
  expiresAt DateTime // 5 minutes from creation
  attempts  Int      @default(0)  // Max 3 attempts
  verified  Boolean  @default(false)
  createdAt DateTime @default(now())

  user User @relation(fields: [userID], references: [id], onDelete: Cascade)

  @@index([userID, code])
}
```

**Password Hashing Pattern:**

```typescript
// Registration/Password Update
const passwordHash = await bcrypt.hash(password, 10); // 10 rounds

// Login Verification
const isValid = await bcrypt.compare(password, user.passwordHash);
```

**OTP Generation Pattern:**

```typescript
// Generate 6-digit OTP
import * as crypto from 'crypto';
const otpCode = crypto.randomInt(100000, 999999).toString();

// Store with 5-minute expiry
const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
```

### APIs and Interfaces

**Base Path:** `/api/auth`

**Endpoint Specifications:**

#### 1. POST /auth/register

**Purpose:** User registration (phone-based, dual flow)

**Request:**
```json
{
  "phoneNumber": "+905551234567",
  "firstName": "Ahmet",
  "lastName": "Yılmaz",
  "role": "admin",
  "password": "Admin123!",
  "email": "ahmet@example.com"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "550e8400-e29b-41d4-a716-446655440000",
    "user": {
      "id": "uuid",
      "phoneNumber": "+905551234567",
      "firstName": "Ahmet",
      "lastName": "Yılmaz",
      "role": "admin",
      "phoneVerified": false,
      "isActive": true
    },
    "expiresIn": 3600
  },
  "message": "Registration successful. Please verify your phone."
}
```

**Errors:**
- `409 Conflict`: Phone number already exists
- `400 Bad Request`: Validation failed (invalid phone, weak password)

**Rate Limiting:** None (general global limit applies)

---

#### 2. POST /auth/login/admin

**Purpose:** Admin login (phone + password)

**Request:**
```json
{
  "phoneNumber": "+905551234567",
  "password": "Admin123!"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "550e8400-e29b-41d4-a716-446655440000",
    "user": { /* UserResDto */ },
    "expiresIn": 3600
  }
}
```

**Errors:**
- `401 Unauthorized`: Invalid credentials (generic message)
- `403 Forbidden`: Phone not verified OR user is not admin role
- `429 Too Many Requests`: Rate limit exceeded (5 attempts / 15 min)

**Rate Limiting:** 5 attempts / 15 minutes per IP

---

#### 3. POST /auth/login/otp/request

**Purpose:** Request OTP for staff login

**Request:**
```json
{
  "phoneNumber": "+905551234567"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "message": "OTP sent to your phone",
    "expiresIn": 300
  }
}
```

**Errors:**
- `404 Not Found`: Phone number not registered (generic: "Invalid credentials")
- `403 Forbidden`: Phone not verified OR user not active
- `429 Too Many Requests`: Rate limit exceeded (3 requests / 15 min per phone)

**Rate Limiting:** 3 attempts / 15 minutes per phone number

**Side Effects:**
- Creates OTP record in database
- Invalidates previous OTPs for user
- Sends SMS via FONIVA provider (Epic 5.1)

---

#### 4. POST /auth/login/otp/verify

**Purpose:** Verify OTP and complete staff login

**Request:**
```json
{
  "phoneNumber": "+905551234567",
  "code": "123456"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "550e8400-e29b-41d4-a716-446655440000",
    "user": { /* UserResDto */ },
    "expiresIn": 3600
  }
}
```

**Errors:**
- `401 Unauthorized`: Invalid OTP code
- `400 Bad Request`: OTP expired OR max attempts exceeded
- `404 Not Found`: OTP not found (generic: "Invalid OTP")

**Rate Limiting:** None (OTP attempt limit enforced in database)

**Side Effects:**
- Marks OTP as verified
- Increments OTP attempt count on failure

---

#### 5. POST /auth/refresh

**Purpose:** Refresh access token using refresh token

**Request:**
```json
{
  "refreshToken": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "new-uuid-here",
    "expiresIn": 3600
  }
}
```

**Errors:**
- `401 Unauthorized`: Invalid or expired refresh token
- `404 Not Found`: Refresh token not found in database

**Rate Limiting:** None

**Side Effects:**
- Deletes old refresh token
- Creates new refresh token (rotation)

---

#### 6. POST /auth/logout

**Purpose:** Logout and invalidate refresh token

**Request:**
```json
{
  "refreshToken": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Logout successful"
}
```

**Errors:**
- `404 Not Found`: Refresh token not found (still returns 200 for idempotency)

**Rate Limiting:** None

**Side Effects:**
- Deletes refresh token from database

---

#### 7. POST /auth/forgot-password

**Purpose:** Request OTP for password reset (admin only)

**Request:**
```json
{
  "phoneNumber": "+905551234567"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "message": "OTP sent to your phone",
    "expiresIn": 300
  }
}
```

**Errors:**
- `404 Not Found`: Phone not found (generic: "Request processed")
- `403 Forbidden`: User is not admin role (generic: "Request processed")
- `429 Too Many Requests`: Rate limit exceeded (3 requests / hour per phone)

**Rate Limiting:** 3 requests / 1 hour per phone number

**Side Effects:**
- Creates OTP record
- Sends SMS via FONIVA

---

#### 8. POST /auth/reset-password

**Purpose:** Reset password using OTP

**Request:**
```json
{
  "phoneNumber": "+905551234567",
  "otpCode": "123456",
  "newPassword": "NewAdmin123!"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Password reset successful"
}
```

**Errors:**
- `401 Unauthorized`: Invalid OTP code
- `400 Bad Request`: OTP expired OR max attempts exceeded OR weak password

**Rate Limiting:** None (OTP attempt limit enforced)

**Side Effects:**
- Updates user password hash
- Marks OTP as verified
- Invalidates all existing refresh tokens for user (force re-login)

---

**Protected Route Example:**

```typescript
@Controller('users')
@UseGuards(JwtAuthGuard) // All routes protected by default
export class UsersController {

  @Public() // Exempt specific routes
  @Get('public-info')
  getPublicInfo() {
    return { version: '1.0.0' };
  }

  @Get('profile')
  @ApiBearerAuth()
  getProfile(@CurrentUser() user: JwtPayload) {
    // user.sub, user.phoneNumber, user.domainID available
    return this.usersService.findById(user.sub);
  }
}
```

**Authorization Header:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Workflows and Sequencing

**Story Implementation Sequence:**

```
Story 2.1: JWT Strategy & Auth Guard
  ↓ (JWT infrastructure ready)
Story 2.2: User Registration (Phone-based)
  ↓ (registration endpoint works, stub SMS)
Story 2.3: Admin Login & Token Generation
  ↓ (admin login flow complete)
Story 2.3.1: Staff Login - OTP Request
  ↓ (OTP request works, requires Epic 5.1 SMS)
Story 2.3.2: Staff Login - OTP Verify
  ↓ (staff login complete)
Story 2.4: Token Refresh
  ↓ (refresh mechanism works)
Story 2.5: Logout
  ↓ (logout invalidation works)
Story 2.6: Password Reset Flow (Admin)
  ✓ (complete Epic 2)
```

---

**Flow 1: User Registration (Phone-based)**

```
Client → Controller: POST /auth/register
         { phoneNumber, firstName, lastName, role, password?, email? }
              ↓
Controller → AuthService: register(dto)
              ↓
AuthService: Validate phoneNumber uniqueness
              ├─> Duplicate? → throw ConflictException
              └─> OK ↓
AuthService: Validate password (if role='admin')
              ├─> Weak? → throw BadRequestException
              └─> OK ↓
AuthService: Hash password (bcrypt, 10 rounds) if provided
              ↓
AuthService → PrismaService: user.create({ phoneNumber, passwordHash, ... })
              ↓
AuthService: Generate OTP (6-digit)
              ↓
AuthService → PrismaService: otpVerification.create({ userID, code, expiresAt })
              ↓
AuthService → SmsService: sendOTP(phoneNumber, code) [Epic 5.1]
              ↓
AuthService → TokenService: generateTokens(user)
              ↓
TokenService → PrismaService: refreshToken.create({ userID, token, expiresAt })
              ↓
TokenService: Return { accessToken (JWT), refreshToken (UUID) }
              ↓
Controller → Client: 201 Created
         { accessToken, refreshToken, user, expiresIn }
```

---

**Flow 2: Admin Login (Phone + Password)**

```
Client → Controller: POST /auth/login/admin
         { phoneNumber, password }
              ↓
Controller: Rate limit check (5/15min)
              ├─> Exceeded? → 429 Too Many Requests
              └─> OK ↓
Controller → AuthService: loginAdmin(dto)
              ↓
AuthService → PrismaService: user.findUnique({ phoneNumber })
              ├─> Not found? → throw UnauthorizedException("Invalid credentials")
              └─> Found ↓
AuthService: Check user.role === 'admin'
              ├─> Not admin? → throw ForbiddenException
              └─> OK ↓
AuthService: Check user.phoneVerified === true
              ├─> Not verified? → throw ForbiddenException("Phone not verified")
              └─> OK ↓
AuthService: bcrypt.compare(password, user.passwordHash)
              ├─> Mismatch? → throw UnauthorizedException("Invalid credentials")
              └─> Match ↓
AuthService → TokenService: generateTokens(user)
              ↓
TokenService → PrismaService: refreshToken.create(...)
              ↓
Controller → Client: 200 OK
         { accessToken, refreshToken, user, expiresIn }
```

---

**Flow 3: Staff Login (Phone + OTP) - 2-Step Process**

**Step 1: OTP Request**
```
Client → Controller: POST /auth/login/otp/request
         { phoneNumber }
              ↓
Controller: Rate limit check (3/15min per phone)
              ├─> Exceeded? → 429 Too Many Requests
              └─> OK ↓
Controller → AuthService: requestLoginOtp(phoneNumber)
              ↓
AuthService → PrismaService: user.findUnique({ phoneNumber })
              ├─> Not found? → throw UnauthorizedException("Invalid credentials")
              └─> Found ↓
AuthService: Check user.phoneVerified === true
              ├─> Not verified? → throw ForbiddenException
              └─> OK ↓
AuthService: Check user.isActive === true
              ├─> Inactive? → throw ForbiddenException
              └─> OK ↓
AuthService → OtpService: generateOtp(userID)
              ↓
OtpService: Invalidate previous OTPs (update verified=false)
              ↓
OtpService: Generate 6-digit code (crypto.randomInt)
              ↓
OtpService → PrismaService: otpVerification.create({
                userID, code, type:'SMS', expiresAt: +5min
             })
              ↓
OtpService → SmsService: sendOTP(phoneNumber, code, template='LOGIN_OTP')
              ↓
Controller → Client: 200 OK
         { success: true, message: "OTP sent", expiresIn: 300 }
```

**Step 2: OTP Verify**
```
Client → Controller: POST /auth/login/otp/verify
         { phoneNumber, code }
              ↓
Controller → AuthService: verifyLoginOtp(phoneNumber, code)
              ↓
AuthService → PrismaService: user.findUnique({ phoneNumber })
              ├─> Not found? → throw UnauthorizedException
              └─> Found ↓
AuthService → OtpService: validateOtp(userID, code)
              ↓
OtpService → PrismaService: otpVerification.findFirst({
                userID, code, type:'SMS', verified:false
             })
              ├─> Not found? → return { valid:false, reason:'NOT_FOUND' }
              └─> Found ↓
OtpService: Check expiresAt > now
              ├─> Expired? → return { valid:false, reason:'EXPIRED' }
              └─> OK ↓
OtpService: Check attempts < 3
              ├─> Max reached? → return { valid:false, reason:'MAX_ATTEMPTS' }
              └─> OK ↓
OtpService: Code matches?
              ├─> No → Increment attempts, return { valid:false, reason:'INVALID_CODE' }
              └─> Yes ↓
OtpService → PrismaService: otpVerification.update({ verified:true })
              ↓
AuthService → TokenService: generateTokens(user)
              ↓
Controller → Client: 200 OK
         { accessToken, refreshToken, user, expiresIn }
```

---

**Flow 4: Token Refresh**

```
Client → Controller: POST /auth/refresh
         { refreshToken }
              ↓
Controller → TokenService: refreshTokens(refreshToken)
              ↓
TokenService → PrismaService: refreshToken.findUnique({ token })
              ├─> Not found? → throw UnauthorizedException
              └─> Found ↓
TokenService: Check expiresAt > now
              ├─> Expired? → throw UnauthorizedException
              └─> OK ↓
TokenService → PrismaService: user.findUnique({ id: token.userID })
              ├─> Not found? → throw UnauthorizedException
              └─> Found ↓
TokenService: Generate new access token (JWT)
              ↓
TokenService: Generate new refresh token (UUID)
              ↓
TokenService → PrismaService: refreshToken.delete({ id: oldToken.id })
              ↓
TokenService → PrismaService: refreshToken.create({ new token })
              ↓
Controller → Client: 200 OK
         { accessToken, refreshToken (new), expiresIn }
```

---

**Flow 5: Password Reset (Admin Only)**

**Step 1: Forgot Password**
```
Client → Controller: POST /auth/forgot-password
         { phoneNumber }
              ↓
Controller: Rate limit check (3/hour per phone)
              ├─> Exceeded? → 429 Too Many Requests
              └─> OK ↓
Controller → AuthService: forgotPassword(phoneNumber)
              ↓
AuthService → PrismaService: user.findUnique({ phoneNumber })
              ├─> Not found OR not admin? → return success (no disclosure)
              └─> Found & admin ↓
AuthService → OtpService: generateOtp(userID, type:'PASSWORD_RESET')
              ↓
OtpService → SmsService: sendOTP(phoneNumber, code, template='RESET_PASSWORD')
              ↓
Controller → Client: 200 OK
         { success: true, message: "OTP sent", expiresIn: 300 }
```

**Step 2: Reset Password**
```
Client → Controller: POST /auth/reset-password
         { phoneNumber, otpCode, newPassword }
              ↓
Controller → AuthService: resetPassword(dto)
              ↓
AuthService → PrismaService: user.findUnique({ phoneNumber })
              ├─> Not found? → throw UnauthorizedException
              └─> Found ↓
AuthService → OtpService: validateOtp(userID, otpCode)
              ├─> Invalid? → throw UnauthorizedException
              └─> Valid ↓
AuthService: Validate newPassword strength
              ├─> Weak? → throw BadRequestException
              └─> OK ↓
AuthService: Hash newPassword (bcrypt, 10 rounds)
              ↓
AuthService → PrismaService: user.update({ passwordHash })
              ↓
AuthService → PrismaService: refreshToken.deleteMany({ userID })
              ↓ (force re-login on all devices)
AuthService → PrismaService: otpVerification.update({ verified:true })
              ↓
Controller → Client: 200 OK
         { success: true, message: "Password reset successful" }
```

---

**JWT Token Validation Flow (Protected Routes):**

```
Client → Controller: GET /api/some-protected-route
         Header: Authorization: Bearer <JWT>
              ↓
JwtAuthGuard: Extract JWT from header
              ├─> Missing? → 401 Unauthorized
              └─> Present ↓
JwtAuthGuard → JwtStrategy: validate(payload)
              ↓
JwtStrategy: Verify JWT signature (JWT_SECRET)
              ├─> Invalid? → 401 Unauthorized
              └─> Valid ↓
JwtStrategy: Check exp (expiration)
              ├─> Expired? → 401 Unauthorized
              └─> OK ↓
JwtStrategy → PrismaService: user.findUnique({ id: payload.sub })
              ├─> Not found or deleted? → 401 Unauthorized
              └─> Found ↓
JwtStrategy: Attach user to request (req.user = payload)
              ↓
Controller: Access req.user via @CurrentUser() decorator
              ↓
Controller → Client: 200 OK (protected data)
```

## Non-Functional Requirements

### Performance

**Authentication Response Times:**

- **Registration (POST /auth/register):** < 500ms (p95)
  - Includes: Phone validation, password hashing (bcrypt 10 rounds ~100ms), database insert, OTP generation, SMS trigger
  - Target: 400-500ms including SMS service call

- **Admin Login (POST /auth/login/admin):** < 300ms (p95)
  - Includes: Database user lookup (indexed phoneNumber), bcrypt.compare (~100ms), JWT generation, refresh token creation
  - Target: 250-300ms for successful login

- **OTP Request (POST /auth/login/otp/request):** < 400ms (p95)
  - Includes: User lookup, OTP generation, database insert, SMS trigger
  - Target: 300-400ms including SMS service call

- **OTP Verify (POST /auth/login/otp/verify):** < 200ms (p95)
  - Includes: OTP validation (database lookup), JWT generation, refresh token creation
  - Target: 150-200ms (no bcrypt cost)

- **Token Refresh (POST /auth/refresh):** < 150ms (p95)
  - Includes: Refresh token lookup, JWT generation, token rotation (delete+insert)
  - Target: 100-150ms (fastest operation)

- **Logout (POST /auth/logout):** < 100ms (p95)
  - Includes: Single database delete operation
  - Target: 50-100ms

**JWT Validation Performance:**

- **JwtAuthGuard validation:** < 10ms per request
  - JWT signature verification: ~2-5ms (crypto operation)
  - Database user lookup (cached strategy possible in Phase 2): ~5ms
  - Target: Minimal overhead on protected routes

**Database Query Optimization:**

- **Indexed fields:**
  - User.phoneNumber (unique index) - O(log n) lookup
  - RefreshToken.token (unique index) - O(log n) lookup
  - OTPVerification.userID + code (composite index) - O(log n) lookup

- **Connection pooling:** Reuse from Epic 1 (min: 5, max: 20 connections)

**Bcrypt Performance Considerations:**

- **Hashing cost:** 10 rounds = ~100ms (acceptable for registration/password change, not frequent)
- **Comparison cost:** ~100ms (acceptable for login, rate limited)
- **Trade-off:** Security > Performance (cannot reduce rounds below 10)

**Rate Limiting Performance:**

- **Throttler in-memory storage:** < 1ms overhead per request
- **Future optimization (Phase 2):** Redis-based distributed rate limiting

**Acceptance Criteria:**
- Load testing validates p95 targets under 100 concurrent users
- JWT validation overhead < 10ms measured via performance interceptor
- No N+1 queries in authentication flows

### Security

**Password Security:**

- **Hashing Algorithm:** bcrypt with 10+ rounds (salt automatically generated)
  - Implementation: `bcrypt.hash(password, 10)`
  - Cost factor 10 = 2^10 = 1024 iterations (~100ms, resistant to brute-force)
  - Rainbow table resistant (unique salt per password)

- **Password Policy:**
  - Minimum 8 characters
  - At least 1 letter (uppercase or lowercase)
  - At least 1 number
  - Regex validation: `/^(?=.*[A-Za-z])(?=.*\d)/`
  - Maximum 50 characters (prevent DOS)

- **Password Storage:**
  - Never stored in plain text
  - Never logged or exposed in responses
  - Only admin users have passwordHash field (staff users: null)

**JWT Token Security:**

- **Signing Algorithm:** HS256 (HMAC with SHA-256) or RS256 (RSA - Phase 2)
- **Secret Management:**
  - JWT_SECRET from environment variable (minimum 32 characters)
  - Different secrets per environment (dev, staging, production)
  - Secret rotation strategy documented (Phase 2)

- **Token Payload:**
  - Minimal data: userID, phoneNumber, domainID, roles
  - No sensitive data (no passwordHash, no personal details)
  - Standard claims: sub (userID), iat (issued at), exp (expiration)

- **Token Expiration:**
  - Access token: 15-60 minutes (configurable, default 60 min)
  - Refresh token: 7-30 days (configurable, default 7 days)
  - Expired tokens rejected with 401 Unauthorized

**Refresh Token Security:**

- **Storage:** Database-backed (revokable, not just JWT)
- **Token Format:** UUID v4 (cryptographically random)
- **Rotation:** Single-use tokens (old token deleted on refresh)
- **Expiration:** Checked on every refresh attempt
- **Revocation:** Deleted on logout or password reset (force re-authentication)

**OTP Security:**

- **Generation:** `crypto.randomInt(100000, 999999)` - cryptographically secure
- **Length:** 6 digits (1 million combinations, sufficient for 5-minute expiry)
- **Expiry:** 5 minutes (300 seconds)
- **Attempt Limit:** Maximum 3 attempts per OTP
- **Invalidation:** Previous OTPs invalidated when new OTP requested
- **Verification:** OTP marked as verified=true after successful use (prevent reuse)
- **Storage:** Hashed? No (short-lived, attempt-limited, acceptable risk)

**Rate Limiting (Brute-Force Protection):**

- **Admin Login:** 5 attempts / 15 minutes per IP
  - Prevents password brute-forcing
  - Lockout duration: 15 minutes

- **OTP Request:** 3 attempts / 15 minutes per phone number
  - Prevents SMS spam and DOS
  - Lockout duration: 15 minutes

- **Password Reset:** 3 attempts / 1 hour per phone number
  - Prevents account enumeration and abuse
  - Lockout duration: 1 hour

- **Implementation:** @nestjs/throttler (in-memory MVP, Redis Phase 2)

**Generic Error Messages (Anti-Enumeration):**

- **Login failures:** Always return "Invalid credentials" (never "Phone not found" or "Wrong password")
- **Forgot password:** Always return "Request processed" (never "Phone not registered")
- **Registration:** Only explicit error on duplicate phone (409 Conflict - acceptable)
- **Rationale:** Prevents phone number enumeration attacks

**Phone Verification Requirement:**

- **Enforcement:** Unverified users (phoneVerified=false) cannot login
- **Verification:** OTP sent on registration, user must verify within reasonable time
- **Bypass:** Development environment may skip verification (config flag)

**Multi-Tenancy Security:**

- **Domain Isolation:** All queries filter by domainID (from JWT payload)
- **Token Binding:** JWT contains domainID, validated on every request
- **Cross-Domain Prevention:** User from domain A cannot access domain B resources

**HTTPS Enforcement:**

- **Production:** Require HTTPS (TLS 1.2+)
- **Cookie Flags:** If using cookies (Phase 2), set Secure, HttpOnly, SameSite flags
- **Development:** HTTP acceptable (localhost)

**Sensitive Data Handling:**

- **Request Logging:** Exclude password and token fields from logs
- **Response Sanitization:** Never return passwordHash, always use DTOs
- **Error Messages:** No stack traces in production (only in development)

**Dependency Security:**

- **Known Vulnerabilities:** npm audit clean for all dependencies
  - @nestjs/jwt, @nestjs/passport, bcrypt, passport-jwt - all latest stable versions
- **Supply Chain:** Lock file (package-lock.json) committed
- **Update Strategy:** Regular security updates (monthly audit)

**OWASP Top 10 Compliance:**

- ✅ **A01: Broken Access Control:** JWT validation enforces access control
- ✅ **A02: Cryptographic Failures:** bcrypt for passwords, JWT for tokens
- ✅ **A03: Injection:** Prisma ORM prevents SQL injection (parameterized queries)
- ✅ **A04: Insecure Design:** Rate limiting, OTP expiry, token rotation
- ✅ **A05: Security Misconfiguration:** Environment-based secrets, no defaults
- ✅ **A06: Vulnerable Components:** npm audit, dependency updates
- ✅ **A07: Authentication Failures:** Password policy, brute-force protection, phone verification
- ✅ **A08: Data Integrity Failures:** JWT signature verification
- ✅ **A09: Logging Failures:** Epic 7 (structured logging with sensitive data exclusion)
- ✅ **A10: SSRF:** Not applicable (no external URL fetching in auth module)

**Acceptance Criteria:**
- Password policy enforced (validation tests)
- Generic error messages verified (no credential disclosure)
- Rate limiting functional (load testing)
- JWT tokens cannot be forged (signature verification tests)
- Refresh tokens revoked on logout (integration tests)
- OTP cannot be reused after verification (unit tests)
- npm audit shows zero high/critical vulnerabilities

### Reliability/Availability

**Token Rotation Reliability:**

- **Refresh Token Rotation:** Atomic operation (delete old + create new in transaction)
- **Failure Handling:** If rotation fails, old token remains valid (retry allowed)
- **Concurrent Refresh:** Race condition handled (first wins, second gets 401)

**OTP Expiry Management:**

- **Automatic Expiry:** Database queries filter by `expiresAt > NOW()`
- **Cleanup Job:** Background job (Phase 2) deletes expired OTPs periodically
- **MVP:** No cleanup (acceptable, OTP table size manageable)

**Database Connection Resilience:**

- **Connection Pooling:** Reuse from Epic 1 (Prisma auto-reconnect)
- **Query Timeout:** Default 10 seconds (Prisma configuration)
- **Retry Strategy:** Prisma automatically retries transient failures (3 attempts)

**SMS Delivery Failures:**

- **Non-Blocking:** SMS send failure does not block registration/OTP request
- **Logging:** SMS failures logged for monitoring (Epic 7)
- **User Feedback:** Generic success message even if SMS fails (prevent enumeration)
- **Retry:** Epic 5.1 handles SMS retry mechanism (not auth module's concern)

**Graceful Degradation:**

- **SMS Service Down:** Registration/OTP request returns success, user cannot verify (acceptable temporary state)
- **Database Down:** All endpoints fail with 503 Service Unavailable (expected)
- **JWT Secret Missing:** Application fails to start (fail-fast, Epic 1 config validation)

**Token Revocation Consistency:**

- **Logout:** Idempotent (deleting non-existent token returns success)
- **Password Reset:** Deletes all user refresh tokens (force re-login on all devices)
- **Concurrent Logout:** Multiple logout requests safe (database UNIQUE constraint)

**OTP Attempt Limiting:**

- **Database-Enforced:** Attempt count incremented atomically
- **Max Attempts:** 3 (after 3 failures, OTP unusable even if code is correct)
- **Lockout:** No automatic unlock (user must request new OTP)

**Rate Limiting Availability:**

- **In-Memory Storage:** Fast, but lost on restart (acceptable for MVP)
- **Distributed Deployment:** Phase 2 (Redis for shared rate limit state)
- **Failure Mode:** If throttler fails, requests allowed (fail-open for availability)

**Idempotency:**

- **Registration:** Duplicate phone returns 409 (not 500), safe to retry
- **Logout:** Multiple logout calls succeed (idempotent delete)
- **Token Refresh:** Old token deleted, retrying with same token fails (expected)

**Error Recovery:**

- **Transaction Rollback:** Database transactions rollback on failure (Prisma automatic)
- **Partial State:** No partial user creation (transaction ensures atomicity)
- **Orphaned Tokens:** Cascade delete (User delete → all RefreshTokens deleted)

**Acceptance Criteria:**
- Concurrent token refresh handled correctly (integration test)
- SMS failure does not block registration (mock failure test)
- Logout is idempotent (call twice, both succeed)
- OTP attempt limit enforced (4th attempt always fails)
- Database connection loss recovers automatically (reconnection test)

### Observability

**Logging Requirements:**

- **Authentication Events (INFO level):**
  - User registered: `{ event: 'USER_REGISTERED', userID, phoneNumber, role, timestamp }`
  - Admin login success: `{ event: 'ADMIN_LOGIN_SUCCESS', userID, phoneNumber, ip, timestamp }`
  - Staff login success: `{ event: 'STAFF_LOGIN_SUCCESS', userID, phoneNumber, ip, timestamp }`
  - Login failure: `{ event: 'LOGIN_FAILURE', phoneNumber, reason: 'INVALID_CREDENTIALS', ip, timestamp }`
  - Token refresh: `{ event: 'TOKEN_REFRESH', userID, timestamp }`
  - Logout: `{ event: 'LOGOUT', userID, timestamp }`

- **OTP Events (INFO level):**
  - OTP requested: `{ event: 'OTP_REQUESTED', userID, phoneNumber, type: 'LOGIN'|'PASSWORD_RESET', timestamp }`
  - OTP verified: `{ event: 'OTP_VERIFIED', userID, phoneNumber, attempts, timestamp }`
  - OTP failed: `{ event: 'OTP_FAILED', userID, reason: 'EXPIRED'|'INVALID_CODE'|'MAX_ATTEMPTS', attemptsRemaining, timestamp }`

- **Security Events (WARN level):**
  - Rate limit exceeded: `{ event: 'RATE_LIMIT_EXCEEDED', phoneNumber, endpoint, ip, timestamp }`
  - Phone not verified: `{ event: 'PHONE_NOT_VERIFIED', phoneNumber, action: 'LOGIN_ATTEMPT', timestamp }`
  - Invalid refresh token: `{ event: 'INVALID_REFRESH_TOKEN', token: 'REDACTED', timestamp }`

- **Error Events (ERROR level):**
  - SMS send failure: `{ event: 'SMS_SEND_FAILED', phoneNumber, error, timestamp }`
  - Database error: `{ event: 'DATABASE_ERROR', operation, error, timestamp }`
  - JWT generation error: `{ event: 'JWT_GENERATION_ERROR', error, timestamp }`

**Sensitive Data Exclusion:**

- **Never log:** passwordHash, password (plain text), full JWT tokens, OTP codes
- **Redact:** Phone numbers can be partially masked in production (last 4 digits visible)
- **Safe to log:** userID, phoneNumber (hashed in production), event type, timestamp

**Metrics Collection:**

- **Request Metrics:**
  - Registration count (per role: admin, staff)
  - Login attempts (success vs failure rate)
  - OTP requests (per type: login, password reset)
  - OTP verification (success rate, average attempts)
  - Token refresh count
  - Rate limit hits (per endpoint)

- **Performance Metrics:**
  - Authentication endpoint response times (p50, p95, p99)
  - Bcrypt operations duration
  - JWT validation duration
  - Database query duration (per operation)

- **Security Metrics:**
  - Failed login attempts (potential brute-force indicator)
  - Rate limit violations (per IP)
  - Expired token usage attempts
  - Phone enumeration attempts (failed registration on duplicate)

**Monitoring Integration (Epic 7):**

- **Sentry:** Error tracking for authentication failures
- **Winston Logger:** Structured JSON logs for aggregation
- **Health Check:** `/health` endpoint includes auth module status (Phase 2)

**Audit Trail:**

- **User Actions:** All authentication events logged for compliance
- **Retention:** Logs retained for 30+ days (configurable)
- **Compliance:** GDPR-friendly (phoneNumber can be anonymized on user deletion)

**Debugging Support:**

- **Request ID:** Include in all logs (correlation across services)
- **Stack Traces:** Only in development environment (Epic 1 config)
- **Log Levels:** DEBUG for development, INFO for production

**Acceptance Criteria:**
- All authentication events logged with correct structure
- Sensitive data (passwords, tokens) excluded from logs
- Login success/failure metrics trackable
- Error logs include actionable context (userID, operation, error message)
- Rate limit violations logged with IP and endpoint

## Dependencies and Integrations

### External Dependencies

**NPM Packages (New for Epic 2):**

```json
{
  "dependencies": {
    "@nestjs/jwt": "^10.2.0",           // JWT token generation & validation
    "@nestjs/passport": "^10.0.3",      // Passport.js integration for NestJS
    "@nestjs/throttler": "^5.1.1",      // Rate limiting middleware
    "passport": "^0.7.0",                // Authentication middleware
    "passport-jwt": "^4.0.1",            // JWT strategy for Passport
    "bcrypt": "^5.1.1",                  // Password hashing (already in Epic 1)
    "class-validator": "^0.14.1",        // DTO validation (already in Epic 1)
    "class-transformer": "^0.5.1"        // DTO transformation (already in Epic 1)
  },
  "devDependencies": {
    "@types/passport-jwt": "^4.0.1",    // TypeScript types for passport-jwt
    "@types/bcrypt": "^5.0.2"            // TypeScript types for bcrypt (already in Epic 1)
  }
}
```

**Version Constraints:**
- All packages use caret (`^`) for minor/patch updates
- Major version locked (e.g., `^10.x.x` stays on v10)
- Security patches automatically applied
- No known vulnerabilities as of 2025-11-05

### Integration Points

**Epic 1 (Database Infrastructure) - REQUIRED:**

- **PrismaService:**
  - Import: `import { PrismaService } from '@/database/prisma.service'`
  - Usage: User, RefreshToken, OTPVerification CRUD operations
  - Dependency: All auth operations require database access

- **ConfigModule:**
  - Import: `@nestjs/config`
  - Usage: JWT_SECRET, JWT_ACCESS_EXPIRATION, JWT_REFRESH_EXPIRATION
  - Validation: Joi schema ensures all auth config present

- **Entities:**
  - User entity (phoneNumber unique identifier, passwordHash, phoneVerified)
  - RefreshToken entity (token UUID storage, expiration tracking)
  - OTPVerification entity (code, attempts, expiry management)

**Epic 5.1 (SMS Module - FONIVA) - DEFERRED:**

- **SmsService:**
  - Import: `import { SmsService } from '@/modules/sms/sms.service'`
  - Usage: Send OTP codes via SMS (registration, login, password reset)
  - **MVP Strategy:** Mock/stub SmsService initially
    - `sendOTP()` method returns success without actual SMS
    - Console.log OTP codes in development
    - Epic 5.1 swaps mock with real FONIVA implementation

- **Integration Pattern:**
  ```typescript
  // auth.module.ts
  @Module({
    imports: [
      // SmsModule, // Uncommented when Epic 5.1 complete
    ],
    providers: [
      // {
      //   provide: SmsService,
      //   useClass: MockSmsService // MVP stub
      // }
    ]
  })
  ```

**Epic 7 (Common Module) - PARALLEL/LATER:**

- **LoggingInterceptor:** Request/response logging (Epic 7 will add)
- **ResponseInterceptor:** Global response wrapping (hrsync-backend format)
- **ExceptionFilter:** Consistent error formatting with i18n
- **Note:** Epic 2 can proceed without Epic 7, logging minimal initially

### Dependency Manifest Analysis

**package.json additions for Epic 2:**

```bash
# Authentication core
@nestjs/jwt: ^10.2.0          # JWT generation (JwtModule.register)
@nestjs/passport: ^10.0.3     # Passport integration with NestJS DI
passport: ^0.7.0               # Base passport framework
passport-jwt: ^4.0.1           # JWT strategy implementation

# Rate limiting
@nestjs/throttler: ^5.1.1     # Rate limiting guard & decorator

# Already present from Epic 1 (reused)
bcrypt: ^5.1.1                 # Password hashing (10 rounds)
class-validator: ^0.14.1       # DTO validation (@IsPhoneNumber, @IsEnum)
class-transformer: ^0.5.1      # DTO transformation (plainToClass)
@prisma/client: ^6.16.0        # Database access
```

**Peer Dependencies:**
- reflect-metadata (already installed)
- rxjs (already installed)

**No Conflicting Dependencies:** All packages compatible with NestJS 11.1.8

### Integration Sequence

```
Epic 1 Complete
  ↓
Epic 2 Story 2.1 (JWT Infrastructure)
  - Install: @nestjs/jwt, @nestjs/passport, passport-jwt
  - Configure: JwtModule with ConfigService
  - No Epic 5.1 needed yet
  ↓
Epic 2 Story 2.2 (Registration)
  - Install: @nestjs/throttler
  - Use: PrismaService (Epic 1)
  - SMS: Stub/mock (Epic 5.1 not ready)
  ↓
Epic 2 Stories 2.3-2.6
  - Continue with stub SMS
  ↓
Epic 5.1 (SMS Module)
  - Implement real FONIVA integration
  - Swap mock SmsService with real implementation
  - No auth code changes (dependency injection swap)
  ↓
Epic 7 (Common Module)
  - Add logging, response wrapping, exception filters
  - Auth module automatically benefits (global interceptors)
```

### External Service Dependencies

**SMS Provider (FONIVA) - Epic 5.1:**
- **Integration:** HTTP API calls to FONIVA endpoints
- **Fallback:** None (SMS critical for OTP flows)
- **Failure Mode:** User cannot verify phone (graceful degradation)
- **Monitoring:** Track SMS send failures (Epic 7 logging)

**None for Epic 2 MVP:** Authentication self-contained except SMS

### Database Schema Dependencies (Epic 1)

**Tables Used:**
- `users` - Phone number lookup, password validation, user data
- `refresh_tokens` - Token storage, expiry tracking, rotation
- `otp_verifications` - OTP code storage, attempt tracking, expiry

**Indexes Required (Epic 1):**
- `users.phoneNumber` (unique) - Fast login lookups
- `refresh_tokens.token` (unique) - Fast refresh lookups
- `otp_verifications.[userID, code]` (composite) - Fast OTP validation

**Foreign Keys:**
- RefreshToken.userID → User.id (CASCADE delete)
- OTPVerification.userID → User.id (CASCADE delete)

## Acceptance Criteria (Authoritative)

### Story 2.1: JWT Strategy & Auth Guard

✅ **AC-2.1.1:** `jwt.strategy.ts` implements PassportStrategy with phone-based JWT validation
✅ **AC-2.1.2:** JwtAuthGuard extract & validate JWT from Authorization header
✅ **AC-2.1.3:** Valid token → `request.user` populated with { sub, phoneNumber, domainID, roles }
✅ **AC-2.1.4:** Invalid/expired token → 401 Unauthorized
✅ **AC-2.1.5:** `@Public()` decorator bypasses JwtAuthGuard
✅ **AC-2.1.6:** `@CurrentUser()` decorator extracts user payload from request

### Story 2.2: User Registration (Phone-based)

✅ **AC-2.2.1:** POST /auth/register endpoint with RegisterDto validation
✅ **AC-2.2.2:** phoneNumber uniqueness enforced (409 Conflict on duplicate)
✅ **AC-2.2.3:** Password validation (min 8 char, 1 letter, 1 number) for admin role
✅ **AC-2.2.4:** Password hashed with bcrypt (10 rounds) if provided
✅ **AC-2.2.5:** User created with phoneVerified=false
✅ **AC-2.2.6:** OTP generated and SMS sent (stub for MVP, Epic 5.1 for real)
✅ **AC-2.2.7:** Response returns { accessToken, refreshToken, user } (password excluded)

### Story 2.3: Admin Login & Token Generation

✅ **AC-2.3.1:** POST /auth/login/admin endpoint with LoginAdminDto
✅ **AC-2.3.2:** Phone lookup + role check (admin only, else 403)
✅ **AC-2.3.3:** phoneVerified check (false → 403 Forbidden)
✅ **AC-2.3.4:** bcrypt.compare validates password (mismatch → 401)
✅ **AC-2.3.5:** Access token (JWT) generated with 15-60 min expiry
✅ **AC-2.3.6:** Refresh token (UUID) stored in database with 7-30 day expiry
✅ **AC-2.3.7:** Generic error message on failure ("Invalid credentials")
✅ **AC-2.3.8:** Rate limiting: 5 attempts / 15 min per IP (Throttler)

### Story 2.3.1: Staff Login - OTP Request

✅ **AC-2.3.1.1:** POST /auth/login/otp/request endpoint
✅ **AC-2.3.1.2:** Phone lookup + phoneVerified check (false → 403)
✅ **AC-2.3.1.3:** 6-digit OTP generated (crypto.randomInt)
✅ **AC-2.3.1.4:** OTP stored with expiresAt (+5 min), attempts=0
✅ **AC-2.3.1.5:** Previous OTPs invalidated for same user
✅ **AC-2.3.1.6:** SMS sent via FONIVA (stub MVP, Epic 5.1 real)
✅ **AC-2.3.1.7:** Response: { message: "OTP sent", expiresIn: 300 }
✅ **AC-2.3.1.8:** Rate limiting: 3 attempts / 15 min per phone

### Story 2.3.2: Staff Login - OTP Verify

✅ **AC-2.3.2.1:** POST /auth/login/otp/verify endpoint
✅ **AC-2.3.2.2:** OTP validation (exists, not expired, code match, attempts < 3)
✅ **AC-2.3.2.3:** Valid OTP → marked verified=true
✅ **AC-2.3.2.4:** Invalid OTP → attempts incremented
✅ **AC-2.3.2.5:** Max attempts (3) → 400 Bad Request
✅ **AC-2.3.2.6:** Valid OTP → Access + Refresh tokens generated
✅ **AC-2.3.2.7:** Response: { accessToken, refreshToken, user }

### Story 2.4: Token Refresh

✅ **AC-2.4.1:** POST /auth/refresh endpoint
✅ **AC-2.4.2:** Refresh token validated (exists, not expired)
✅ **AC-2.4.3:** New access token generated
✅ **AC-2.4.4:** New refresh token generated (rotation)
✅ **AC-2.4.5:** Old refresh token deleted from database
✅ **AC-2.4.6:** Response: { accessToken, refreshToken (new) }
✅ **AC-2.4.7:** Invalid/expired token → 401 Unauthorized

### Story 2.5: Logout

✅ **AC-2.5.1:** POST /auth/logout endpoint (requires JWT)
✅ **AC-2.5.2:** Refresh token deleted from database
✅ **AC-2.5.3:** Response: { success: true, message: "Logged out" }
✅ **AC-2.5.4:** Idempotent (deleting non-existent token returns success)
✅ **AC-2.5.5:** Access token not blacklisted (client-side discard, expires naturally)

### Story 2.6: Password Reset Flow (Admin)

✅ **AC-2.6.1:** POST /auth/forgot-password endpoint (public)
✅ **AC-2.6.2:** Phone lookup + role check (admin only, silent fail for non-admin)
✅ **AC-2.6.3:** OTP generated and SMS sent (password reset template)
✅ **AC-2.6.4:** Response always 200 (no phone existence disclosure)
✅ **AC-2.6.5:** Rate limiting: 3 attempts / hour per phone
✅ **AC-2.6.6:** POST /auth/reset-password endpoint (public)
✅ **AC-2.6.7:** OTP validated (exists, not expired, code match, attempts < 3)
✅ **AC-2.6.8:** New password validated (policy enforcement)
✅ **AC-2.6.9:** Password hash updated in database
✅ **AC-2.6.10:** All user refresh tokens deleted (force re-login)
✅ **AC-2.6.11:** Response: { success: true, message: "Password reset successful" }

## Traceability Mapping

| Acceptance Criteria | Spec Section | Component/API | Test Strategy |
|---------------------|--------------|---------------|---------------|
| AC-2.1.1 - JWT Strategy | Detailed Design → Services | jwt.strategy.ts | Unit: PassportStrategy extend, payload validation |
| AC-2.1.2 - JWT Guard | Detailed Design → Services | jwt-auth.guard.ts | Integration: Protected route access test |
| AC-2.1.5 - @Public decorator | APIs and Interfaces | public.decorator.ts | Integration: Public route accessible without token |
| AC-2.2.1 - Registration endpoint | APIs → POST /auth/register | auth.controller.ts | E2E: Registration flow with valid/invalid data |
| AC-2.2.2 - Phone uniqueness | Data Models → User entity | Prisma User model | Integration: Duplicate phone returns 409 |
| AC-2.2.4 - Password hashing | NFR → Security | bcrypt.hash() | Unit: Hash verification, 10 rounds check |
| AC-2.3.1 - Admin login endpoint | APIs → POST /auth/login/admin | auth.controller.ts | E2E: Admin login success/failure scenarios |
| AC-2.3.8 - Rate limiting | NFR → Security → Rate Limiting | @Throttle decorator | Integration: Exceed limit, verify 429 response |
| AC-2.3.1.3 - OTP generation | Data Models → OTP Pattern | OtpService | Unit: Crypto randomness, 6-digit format |
| AC-2.3.2.2 - OTP validation | Workflows → Staff Login | OtpService.validateOtp() | Unit: All failure modes (expired, invalid, max attempts) |
| AC-2.4.4 - Token rotation | Workflows → Token Refresh | TokenService | Integration: Old token invalid after refresh |
| AC-2.5.4 - Logout idempotency | NFR → Reliability | auth.service.logout() | Integration: Call logout twice, both succeed |
| AC-2.6.10 - Force re-login | Workflows → Password Reset | refreshToken.deleteMany() | Integration: Password reset invalidates all sessions |

## Risks, Assumptions, Open Questions

### Risks

🔴 **Risk-1: Epic 5.1 (SMS Module) Dependency**
- **Description:** Epic 2 OTP flows require SMS sending, but Epic 5.1 may not be ready
- **Impact:** Registration and staff login cannot send real OTPs
- **Mitigation:** Mock SmsService stub for MVP, console.log OTPs in development, swap with real implementation when Epic 5.1 complete
- **Severity:** Medium (mitigated by stub strategy)

🟡 **Risk-2: Rate Limiting In-Memory State Loss**
- **Description:** @nestjs/throttler uses in-memory storage, lost on server restart
- **Impact:** Rate limits reset on deploy, potential abuse window
- **Mitigation:** Phase 2 Redis-based distributed rate limiting, MVP acceptable risk
- **Severity:** Low (MVP scope, documented limitation)

🟡 **Risk-3: JWT Secret Compromise**
- **Description:** If JWT_SECRET leaked, all tokens can be forged
- **Impact:** Complete authentication bypass
- **Mitigation:** Environment-specific secrets, secret rotation strategy (Phase 2), never commit secrets to git
- **Severity:** High (standard security practice, well-documented)

🟢 **Risk-4: OTP SMS Delivery Failures**
- **Description:** FONIVA or network issues prevent SMS delivery
- **Impact:** Users cannot login via OTP
- **Mitigation:** Epic 5.1 implements retry mechanism, logging tracks failures, graceful degradation (success response prevents enumeration)
- **Severity:** Low (Epic 5.1 responsibility)

### Assumptions

✅ **Assumption-1:** Phone numbers are unique per domain (multi-tenancy support)
- **Validation:** User.phoneNumber unique constraint enforced by database
- **Impact:** Registration fails on duplicate phone (409 Conflict)

✅ **Assumption-2:** Admin users always have passwords, staff users never do
- **Validation:** Role-based password requirement enforced in DTO validation
- **Impact:** Dual authentication flow design

✅ **Assumption-3:** OTP 5-minute expiry sufficient for user to receive and enter code
- **Validation:** Industry standard (most services use 5-10 minutes)
- **Impact:** Expired OTP requires new request

✅ **Assumption-4:** 6-digit OTP (1 million combinations) secure enough with 3-attempt limit
- **Validation:** Brute-force impossible (3 attempts × 1M combinations = 3M tries blocked)
- **Impact:** Acceptable security trade-off

✅ **Assumption-5:** JWT access token expiry 15-60 minutes acceptable for UX
- **Validation:** Configurable via environment variable
- **Impact:** Balance between security (short expiry) and UX (fewer refreshes)

### Open Questions

❓ **Question-1:** Should phone verification be enforced immediately or allow grace period?
- **Current Decision:** Enforce immediately (phoneVerified=false blocks login)
- **Rationale:** Security-first approach, prevents unverified phone abuse
- **Future Review:** Phase 2 may add grace period config

❓ **Question-2:** Should staff users have optional password support (dual flow)?
- **Current Decision:** Staff users phone + OTP only (no password)
- **Rationale:** Simplifies UX, phone + OTP sufficient security
- **Future Review:** PRD may change if business requirements evolve

❓ **Question-3:** Token blacklisting for logout - MVP or Phase 2?
- **Current Decision:** Phase 2 (Redis-based blacklist)
- **Rationale:** MVP uses database refresh token deletion (sufficient), access token expires naturally
- **Trade-off:** Access token valid until expiry even after logout (acceptable for MVP)

❓ **Question-4:** OTP SMS template language selection (TR/EN)?
- **Current Decision:** Epic 5.1 handles template selection based on user preference or default
- **Dependency:** i18n module (Epic 7) provides language context
- **Future Review:** Epic 5.1 will define template strategy

## Test Strategy Summary

### Unit Tests (Story 2.1, 2.2, 2.4, 2.5, 2.6)

**JwtStrategy:**
- Token payload extraction and validation
- User lookup from database (mock PrismaService)
- Invalid token scenarios (expired, malformed, missing)

**TokenService:**
- JWT generation with correct payload structure
- Refresh token generation (UUID format)
- Token rotation (delete old + create new)
- Expiration calculation

**OtpService:**
- OTP generation (6-digit, crypto randomness)
- OTP validation (all failure modes: expired, invalid code, max attempts)
- Previous OTP invalidation
- Attempt increment logic

**AuthService:**
- Password hashing (bcrypt with 10 rounds)
- Password comparison (valid/invalid)
- User creation with correct fields
- Duplicate phone detection

### Integration Tests (Story 2.2, 2.3, 2.3.1, 2.3.2, 2.4, 2.5, 2.6)

**Registration Flow:**
- Valid registration (admin with password, staff without)
- Duplicate phone returns 409
- Password policy enforcement (weak password rejected)
- OTP created in database
- SMS service called (mock verification)

**Admin Login Flow:**
- Valid credentials → tokens returned
- Invalid password → 401
- Phone not verified → 403
- Non-admin role → 403
- Rate limiting → 429 after 5 attempts

**Staff OTP Flow:**
- OTP request creates database record, sends SMS
- OTP verify with valid code → tokens
- OTP verify with invalid code → attempts incremented
- Max attempts → 400 error
- Expired OTP → 400 error

**Token Refresh Flow:**
- Valid refresh token → new tokens
- Old refresh token deleted
- Concurrent refresh (race condition test)
- Expired refresh token → 401

**Logout Flow:**
- Logout deletes refresh token
- Idempotency (logout twice succeeds)
- Invalid refresh token → still 200 (no disclosure)

**Password Reset Flow:**
- Forgot password sends OTP (admin only)
- Reset password with valid OTP updates hash
- All refresh tokens deleted (force re-login)
- Invalid OTP scenarios

### E2E Tests (All Stories)

**Complete Registration to Login:**
1. Register admin user → verify phone → login → access protected route
2. Register staff user → verify phone → request OTP → verify OTP → login → access protected route

**Token Lifecycle:**
1. Login → use access token → token expires → refresh → use new access token → logout → tokens invalid

**Security Scenarios:**
1. Forge JWT → 401
2. Use expired token → 401
3. Exceed rate limit → 429
4. Access protected route without token → 401
5. Use revoked refresh token → 401

**Error Handling:**
1. Invalid phone format → 400
2. Weak password → 400
3. Phone enumeration attempt (duplicate registration) → 409
4. Generic login error message (no credential disclosure)

### Manual Testing Checklist

- [ ] Register admin with phone + password, receive OTP SMS
- [ ] Verify phone with OTP, login with password
- [ ] Register staff with phone only, receive OTP SMS
- [ ] Login with OTP (request → verify flow)
- [ ] Refresh token before expiry
- [ ] Logout and verify refresh token invalid
- [ ] Password reset flow (forgot → OTP → reset → force re-login)
- [ ] Exceed rate limits (5 admin login attempts, 3 OTP requests)
- [ ] Invalid JWT scenarios (expired, malformed, missing)
- [ ] Protected route access (with/without token)

### Performance Testing

- Load test: 100 concurrent logins (target < 300ms p95)
- Bcrypt performance: Measure hashing time (expect ~100ms)
- JWT validation: Measure guard overhead (expect < 10ms)
- Database query performance: Indexed lookups (expect < 5ms)

---

✅ **Epic 2 Tech Spec Complete**
📋 **Status:** Ready for Implementation
🚀 **Next Step:** Run `/bmad:bmm:workflows:create-story` to draft Story 2.1
