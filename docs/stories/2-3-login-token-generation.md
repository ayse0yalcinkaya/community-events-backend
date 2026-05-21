# Story 2.3: Admin Login & Token Generation (Phone + Password)

Status: review

## Story

As an admin user,
I want phoneNumber ve password ile login olabilmek,
So that access token ve refresh token alabileyim ve sisteme güvenli bir şekilde erişebileyim.

## Acceptance Criteria

1. **AC-2.3.1:** POST /auth/login/admin endpoint oluşturulmuş ve çalışıyor
2. **AC-2.3.2:** LoginAdminDto validation yapılıyor:
   - phoneNumber (zorunlu, E.164 format)
   - password (zorunlu)
3. **AC-2.3.3:** phoneNumber ile user bulunuyor ve role === 'admin' kontrolü yapılıyor (değilse 403 Forbidden)
4. **AC-2.3.4:** phoneVerified === true kontrolü yapılıyor (false → 403 Forbidden: "Phone not verified")
5. **AC-2.3.5:** password bcrypt.compare() ile validate ediliyor (mismatch → 401 Unauthorized: "Invalid credentials")
6. **AC-2.3.6:** Valid credentials → Access token (JWT) generate ediliyor (15-60 min expiry, payload: sub, phoneNumber, domainID, roles)
7. **AC-2.3.7:** Valid credentials → Refresh token (UUID) database'e kaydediliyor (7-30 day expiry)
8. **AC-2.3.8:** Response döndürülüyor: { accessToken, refreshToken, user: UserResDto, expiresIn }
9. **AC-2.3.9:** Invalid credentials → 401 Unauthorized (generic message: "Invalid credentials" - no phone/password disclosure)
10. **AC-2.3.10:** Rate limiting uygulanıyor: 5 attempts / 15 min per IP (@nestjs/throttler)

## Tasks / Subtasks

- [x] Task 1: LoginAdminDto ve AuthResponseDto oluştur (AC: 2, 8)
  - [x] Subtask 1.1: `src/modules/auth/dto/login-admin.dto.ts` oluştur
  - [x] Subtask 1.2: LoginAdminDto class-validator decorators ekle (@IsPhoneNumber, @IsString, @IsNotEmpty)
  - [x] Subtask 1.3: `src/modules/auth/dto/auth-response.dto.ts` oluştur
  - [x] Subtask 1.4: AuthResponseDto fields tanımla: accessToken, refreshToken, user (UserResDto), expiresIn

- [x] Task 2: TokenService oluştur ve token generation logic implement et (AC: 6, 7)
  - [x] Subtask 2.1: `src/modules/auth/services/token.service.ts` dosyası oluştur
  - [x] Subtask 2.2: JwtService inject et (@nestjs/jwt)
  - [x] Subtask 2.3: PrismaService inject et (refresh token storage için)
  - [x] Subtask 2.4: ConfigService inject et (JWT_ACCESS_EXPIRATION, JWT_REFRESH_EXPIRATION)
  - [x] Subtask 2.5: generateAccessToken(user) method implement et:
    - JWT payload: { sub: user.id, phoneNumber, domainID, roles: [user.role], iat, exp }
    - JwtService.sign() kullan
    - Expiry: config.get('JWT_ACCESS_EXPIRATION') veya default 3600s (60 min)
  - [x] Subtask 2.6: generateRefreshToken(user) method implement et:
    - UUID token generate et (crypto.randomUUID())
    - Database'e kaydet: prisma.refreshToken.create({ userID, domainID, token, expiresAt })
    - expiresAt: config.get('JWT_REFRESH_EXPIRATION') veya default 7 days
  - [x] Subtask 2.7: generateTokens(user) helper method oluştur (access + refresh birlikte)
  - [x] Subtask 2.8: TokenService'i AuthModule providers'a ekle

- [x] Task 3: AuthService.loginAdmin() method implement et (AC: 3, 4, 5, 6, 7, 8, 9)
  - [x] Subtask 3.1: `src/modules/auth/auth.service.ts` dosyasını düzenle
  - [x] Subtask 3.2: TokenService inject et
  - [x] Subtask 3.3: loginAdmin(loginDto) method oluştur
  - [x] Subtask 3.4: Phone ile user lookup yap (prisma.user.findUnique)
  - [x] Subtask 3.5: User bulunamazsa → UnauthorizedException("Invalid credentials") fırlat
  - [x] Subtask 3.6: role !== 'admin' kontrolü yap → ForbiddenException("Access denied") fırlat
  - [x] Subtask 3.7: phoneVerified !== true kontrolü yap → ForbiddenException("Phone not verified") fırlat
  - [x] Subtask 3.8: bcrypt.compare(password, user.passwordHash) ile password validate et
  - [x] Subtask 3.9: Password mismatch → UnauthorizedException("Invalid credentials") fırlat
  - [x] Subtask 3.10: Valid → TokenService.generateTokens(user) çağır
  - [x] Subtask 3.11: AuthResponseDto döndür: { accessToken, refreshToken, user: UserResDto, expiresIn }

- [x] Task 4: AuthController.loginAdmin() endpoint oluştur (AC: 1, 8, 10)
  - [x] Subtask 4.1: `src/modules/auth/auth.controller.ts` dosyasını düzenle
  - [x] Subtask 4.2: POST /auth/login/admin route tanımla
  - [x] Subtask 4.3: @Body() LoginAdminDto parametre ekle
  - [x] Subtask 4.4: @Public() decorator ekle (JWT guard bypass)
  - [x] Subtask 4.5: @Throttle(5, 900) decorator ekle (5 attempts / 15 min = 900 seconds)
  - [x] Subtask 4.6: AuthService.loginAdmin() çağır
  - [x] Subtask 4.7: Response dön: { success: true, data: AuthResponseDto }
  - [x] Subtask 4.8: Exception handling ekle (UnauthorizedException, ForbiddenException)

- [x] Task 5: Rate limiting yapılandırması (AC: 10)
  - [x] Subtask 5.1: @nestjs/throttler package'ı zaten yüklü mü kontrol et
  - [x] Subtask 5.2: Değilse: npm install @nestjs/throttler
  - [x] Subtask 5.3: AuthModule'e ThrottlerModule import et (global veya feature-specific)
  - [x] Subtask 5.4: Login endpoint'inde @Throttle(5, 900) decorator kullan (5 attempts, 900s = 15 min)
  - [x] Subtask 5.5: Rate limit aşıldığında 429 Too Many Requests dönüldüğünü doğrula

- [x] Task 6: JWT configuration doğrulama (AC: 6)
  - [x] Subtask 6.1: .env dosyasında JWT_SECRET var mı kontrol et (Story 1.7, Epic 1)
  - [x] Subtask 6.2: JWT_ACCESS_EXPIRATION var mı kontrol et (default: 3600)
  - [x] Subtask 6.3: JWT_REFRESH_EXPIRATION var mı kontrol et (default: 604800 = 7 days)
  - [x] Subtask 6.4: ConfigService validation schema'da bu değerleri kontrol et

- [x] Task 7: Unit test yaz (AC: All)
  - [x] Subtask 7.1: `src/modules/auth/services/token.service.spec.ts` oluştur
  - [x] Subtask 7.2: Mock JwtService, PrismaService, ConfigService
  - [x] Subtask 7.3: Test: generateAccessToken() returns valid JWT with correct payload
  - [x] Subtask 7.4: Test: generateRefreshToken() stores token in database
  - [x] Subtask 7.5: Test: generateTokens() returns both access and refresh tokens
  - [x] Subtask 7.6: `src/modules/auth/auth.service.spec.ts` dosyasını genişlet
  - [x] Subtask 7.7: Test: loginAdmin() with valid admin credentials returns tokens
  - [x] Subtask 7.8: Test: loginAdmin() with invalid password throws UnauthorizedException
  - [x] Subtask 7.9: Test: loginAdmin() with non-admin role throws ForbiddenException
  - [x] Subtask 7.10: Test: loginAdmin() with unverified phone throws ForbiddenException
  - [x] Subtask 7.11: Test: loginAdmin() with non-existent phone throws UnauthorizedException
  - [x] Subtask 7.12: Test: Generic error messages (no phone/password disclosure)

- [x] Task 8: Integration test yaz (AC: 1, 2, 8, 9, 10)
  - [x] Subtask 8.1: `test/auth-login-admin.e2e-spec.ts` dosyası oluştur
  - [x] Subtask 8.2: Test setup: Create test admin user with verified phone
  - [x] Subtask 8.3: Test: POST /auth/login/admin with valid credentials → 200 OK, returns tokens
  - [x] Subtask 8.4: Test: Response includes accessToken, refreshToken, user, expiresIn
  - [x] Subtask 8.5: Test: accessToken is valid JWT (decode and verify payload)
  - [x] Subtask 8.6: Test: refreshToken is stored in database
  - [x] Subtask 8.7: Test: POST /auth/login/admin with invalid password → 401 Unauthorized
  - [x] Subtask 8.8: Test: POST /auth/login/admin with non-admin user → 403 Forbidden
  - [x] Subtask 8.9: Test: POST /auth/login/admin with unverified phone → 403 Forbidden
  - [x] Subtask 8.10: Test: POST /auth/login/admin with non-existent phone → 401 Unauthorized
  - [x] Subtask 8.11: Test: Rate limiting - 6th attempt within 15 min → 429 Too Many Requests
  - [x] Subtask 8.12: Test: Error messages are generic (no credential disclosure)

## Dev Notes

### Technical Implementation Notes

**Admin Login Flow Pattern:**
Story 2.3, Epic 2'nin üçüncü story'si olarak admin kullanıcılar için telefon numarası + şifre tabanlı kimlik doğrulama sistemini implement eder. Bu story, JWT access token (stateless, kısa ömürlü) ve database-stored refresh token (revokable, uzun ömürlü) hybrid pattern'ini oluşturur.

**Token Architecture:**
```typescript
// JWT Access Token (Stateless)
{
  sub: "user-uuid",              // User ID
  phoneNumber: "+905551234567",   // Phone (unique identifier)
  domainID: "domain-uuid",        // Multi-tenancy
  roles: ["admin"],               // User roles array
  iat: 1699564800,                // Issued at (Unix timestamp)
  exp: 1699568400                 // Expiration (Unix timestamp)
}

// Refresh Token (Database-backed)
{
  id: "uuid",
  userID: "user-uuid",
  domainID: "domain-uuid",
  token: "refresh-token-uuid",    // UUID token
  expiresAt: Date,                // 7-30 days from creation
  createdAt: Date
}
```

**TokenService Implementation Pattern:**
```typescript
// src/modules/auth/services/token.service.ts
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '@/database/prisma.service';
import { ConfigService } from '@nestjs/config';
import { User } from '@prisma/client';
import * as crypto from 'crypto';

interface JwtPayload {
  sub: string;
  phoneNumber: string;
  domainID: string;
  roles: string[];
}

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async generateAccessToken(user: User): Promise<string> {
    const payload: JwtPayload = {
      sub: user.id,
      phoneNumber: user.phoneNumber,
      domainID: user.domainID,
      roles: [user.role], // roles array (future-ready for multiple roles)
    };

    const expiresIn = this.config.get<number>('JWT_ACCESS_EXPIRATION') || 3600; // Default 60 min

    return this.jwtService.sign(payload, { expiresIn });
  }

  async generateRefreshToken(user: User): Promise<string> {
    const token = crypto.randomUUID();
    const expiresIn = this.config.get<number>('JWT_REFRESH_EXPIRATION') || 604800; // Default 7 days
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    await this.prisma.refreshToken.create({
      data: {
        userID: user.id,
        domainID: user.domainID,
        token,
        expiresAt,
      },
    });

    return token;
  }

  async generateTokens(user: User): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
    const accessToken = await this.generateAccessToken(user);
    const refreshToken = await this.generateRefreshToken(user);
    const expiresIn = this.config.get<number>('JWT_ACCESS_EXPIRATION') || 3600;

    return { accessToken, refreshToken, expiresIn };
  }
}
```

**AuthService.loginAdmin() Implementation Pattern:**
```typescript
// src/modules/auth/auth.service.ts
import { Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import * as bcrypt from 'bcrypt';
import { LoginAdminDto } from './dto/login-admin.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { UserResDto } from './dto/user-res.dto';
import { TokenService } from './services/token.service';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenService: TokenService,
  ) {}

  async loginAdmin(loginDto: LoginAdminDto): Promise<AuthResponseDto> {
    // 1. Find user by phone
    const user = await this.prisma.user.findUnique({
      where: { phoneNumber: loginDto.phoneNumber },
    });

    // 2. User not found → generic error (prevent phone enumeration)
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // 3. Check role (admin only)
    if (user.role !== 'admin') {
      throw new ForbiddenException('Access denied');
    }

    // 4. Check phone verified
    if (!user.phoneVerified) {
      throw new ForbiddenException('Phone not verified');
    }

    // 5. Validate password
    const isPasswordValid = await bcrypt.compare(loginDto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // 6. Generate tokens
    const tokens = await this.tokenService.generateTokens(user);

    // 7. Return response
    const userResponse = plainToInstance(UserResDto, user, { excludeExtraneousValues: false });
    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: userResponse,
      expiresIn: tokens.expiresIn,
    };
  }
}
```

**LoginAdminDto Structure:**
```typescript
// src/modules/auth/dto/login-admin.dto.ts
import { IsPhoneNumber, IsString, IsNotEmpty } from 'class-validator';

export class LoginAdminDto {
  @IsPhoneNumber('TR')
  @IsNotEmpty()
  phoneNumber: string; // E.164 format: +90XXXXXXXXXX

  @IsString()
  @IsNotEmpty()
  password: string;
}
```

**AuthResponseDto Structure:**
```typescript
// src/modules/auth/dto/auth-response.dto.ts
import { UserResDto } from './user-res.dto';

export class AuthResponseDto {
  accessToken: string;
  refreshToken: string;
  user: UserResDto;
  expiresIn: number; // seconds
}
```

**AuthController.loginAdmin() Implementation Pattern:**
```typescript
// src/modules/auth/auth.controller.ts
import { Controller, Post, Body } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginAdminDto } from './dto/login-admin.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { Public } from './decorators/public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public() // No JWT guard
  @Throttle(5, 900) // 5 attempts per 15 minutes (900 seconds)
  @Post('login/admin')
  async loginAdmin(@Body() loginDto: LoginAdminDto): Promise<{ success: boolean; data: AuthResponseDto }> {
    const result = await this.authService.loginAdmin(loginDto);
    return {
      success: true,
      data: result,
    };
  }
}
```

**Rate Limiting Configuration:**
```typescript
// src/modules/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [
    ThrottlerModule.forRoot([{
      ttl: 900000, // 15 minutes in milliseconds
      limit: 5,     // 5 attempts
    }]),
    // ... other imports
  ],
  // ... providers, controllers, exports
})
export class AuthModule {}
```

**Security Considerations:**

**Generic Error Messages:**
- Invalid phone: "Invalid credentials" (not "Phone not found")
- Invalid password: "Invalid credentials" (not "Wrong password")
- Prevents phone number enumeration attacks

**Rate Limiting:**
- 5 attempts per 15 minutes per IP
- Prevents brute-force password attacks
- 429 Too Many Requests after limit exceeded

**Phone Verification Enforcement:**
- Unverified users (phoneVerified=false) cannot login
- 403 Forbidden error with explicit message
- Forces OTP verification before first login

**Password Security:**
- bcrypt.compare() for password validation
- No plain-text password storage or logging
- Timing-safe comparison (bcrypt handles this)

**Token Security:**
- JWT access token: Signed, stateless, short-lived (15-60 min)
- Refresh token: UUID, database-backed, long-lived (7-30 days), revokable
- Token payload contains minimal data (no sensitive fields)

**Performance Considerations:**
- Phone lookup: Single indexed query (~5ms)
- Password comparison: bcrypt.compare (~100-150ms)
- Token generation: JWT sign + UUID + DB insert (~50ms)
- Total login time: ~200-300ms (p95 target: < 300ms)

### Project Structure Notes

**Alignment with Unified Project Structure:**

**New Files Created by This Story:**
```
src/
├── modules/
│   └── auth/
│       ├── dto/
│       │   ├── login-admin.dto.ts       # Admin login request DTO
│       │   └── auth-response.dto.ts     # Login success response DTO
│       └── services/
│           └── token.service.ts         # Token generation service (JWT + Refresh)
```

**Files Modified by This Story:**
- `src/modules/auth/auth.service.ts` - Add loginAdmin() method
- `src/modules/auth/auth.controller.ts` - Add POST /auth/login/admin endpoint
- `src/modules/auth/auth.module.ts` - Add TokenService to providers, import ThrottlerModule
- `package.json` - Add @nestjs/throttler dependency (if not present)

**Dependencies Established:**
- @nestjs/jwt: JWT token generation (already installed in Story 2.1)
- @nestjs/throttler: Rate limiting (new dependency for this story)
- bcrypt: Password comparison (already installed in Epic 1 or Story 2.2)
- Epic 1 PrismaService: User lookup, RefreshToken storage
- Epic 1 ConfigService: JWT_SECRET, JWT_ACCESS_EXPIRATION, JWT_REFRESH_EXPIRATION

**Detected Conflicts or Variances:**
- None - Structure fully aligns with NestJS best practices
- TokenService in `modules/auth/services/` (service layer organization)
- DTOs in `modules/auth/dto/` (feature-specific)
- Controller in `modules/auth/` (HTTP layer)

### Learnings from Previous Story

**From Story 2-2-user-registration (Status: done)**

- **AuthService Ready for Extension**:
  - AuthService exists at `src/modules/auth/auth.service.ts` with register() method
  - PrismaService and ConfigService already injected
  - Pattern established: Use plainToInstance for UserResDto response sanitization
  - bcrypt already imported and used for password hashing (Story 2.2)

- **UserResDto Available**:
  - Located at `src/modules/auth/dto/user-res.dto.ts`
  - Already excludes passwordHash, deletedAt, domainID via @Exclude decorator
  - Can be reused directly in AuthResponseDto

- **Authentication DTOs Pattern Established**:
  - RegisterDto uses class-validator decorators (@IsPhoneNumber, @IsString, @Matches)
  - Validation happens automatically via global ValidationPipe (main.ts)
  - Follow same pattern for LoginAdminDto

- **Database Schema Supports Login**:
  - User entity updated in Story 2.2 migration (20251105122316)
  - phoneNumber unique field available for lookup
  - passwordHash field available for bcrypt.compare
  - phoneVerified field available for verification check
  - role field available for admin check

- **PrismaService Integration Pattern**:
  - Use `prisma.user.findUnique({ where: { phoneNumber } })` for user lookup
  - User entity has all required fields: id, phoneNumber, passwordHash, role, phoneVerified, domainID
  - RefreshToken entity ready: userID, domainID, token, expiresAt (Epic 1 schema)

- **bcrypt Already Available**:
  - bcrypt package installed and imported in Story 2.2
  - Pattern: `await bcrypt.hash(password, 10)` for hashing
  - For this story: Use `await bcrypt.compare(plainPassword, hashedPassword)` for validation

- **OtpService Stub Exists**:
  - Located at `src/modules/auth/services/otp.service.ts`
  - Epic 5.1 integration point (FONIVA SMS)
  - Not needed for admin login (only for staff OTP flow in later stories)

- **@Public() Decorator Available**:
  - Located at `src/modules/auth/decorators/public.decorator.ts`
  - Use this decorator for /auth/login/admin endpoint (no JWT guard required for login)

- **JWT Infrastructure Ready**:
  - JwtModule configured in AuthModule (Story 2.1)
  - JwtService available for injection in TokenService
  - JWT_SECRET and JWT_ACCESS_EXPIRATION validated in ConfigService (Story 1.7)
  - JwtPayload interface defined at `src/modules/auth/interfaces/jwt-payload.interface.ts`

- **Testing Patterns Established**:
  - Unit tests: Mock PrismaService, ConfigService in `auth.service.spec.ts`
  - E2E tests: Use `test/jest-e2e-setup.ts` for test database setup
  - E2E pattern: Create test user, call endpoint, verify response
  - Example: `test/auth-registration.e2e-spec.ts` (12 tests, all passing)

- **Error Handling Patterns**:
  - Use ConflictException for duplicates (409 status)
  - Use BadRequestException for validation failures (400 status)
  - Use UnauthorizedException for auth failures (401 status) - needed for this story
  - Use ForbiddenException for access denied (403 status) - needed for this story

- **Configuration Available**:
  - ConfigService globally available (Epic 1, Story 1.7)
  - JWT_SECRET, JWT_ACCESS_EXPIRATION already validated
  - Need to add JWT_REFRESH_EXPIRATION to .env and validation schema

- **Technical Debt to Address**:
  - JWT_REFRESH_EXPIRATION not yet in config validation (add in this story)
  - TokenService needs to be created (core service for this story)
  - @nestjs/throttler not yet installed (install in this story)

- **Ready for Story 2.3**:
  - All authentication infrastructure ready (JWT, Passport, PrismaService)
  - User schema supports admin login (phoneNumber, passwordHash, role, phoneVerified)
  - DTOs and response sanitization patterns established
  - Testing infrastructure ready (unit + E2E)
  - Only missing: TokenService (create in this story), Rate limiting (add in this story)

[Source: stories/2-2-user-registration.md#Dev-Agent-Record]

### References

**Technical Details:**
- [Source: docs/tech-spec-epic-2.md#Acceptance-Criteria-Story-2.3] - AC-2.3.1 through AC-2.3.8
- [Source: docs/tech-spec-epic-2.md#Services-and-Modules] - TokenService specification
- [Source: docs/tech-spec-epic-2.md#Data-Models-and-Contracts] - LoginAdminDto and AuthResponseDto structure
- [Source: docs/tech-spec-epic-2.md#APIs-and-Interfaces] - POST /auth/login/admin endpoint specification
- [Source: docs/epics.md#Story-2.3] - User story definition and acceptance criteria

**Architecture Constraints:**
- [Source: docs/tech-spec-epic-2.md#System-Architecture-Alignment] - Auth module structure
- [Source: docs/tech-spec-epic-2.md#ADR-004] - Hybrid Token Architecture (JWT + UUID refresh token)
- [Source: docs/tech-spec-epic-2.md#ADR-006] - Rate Limiting Strategy (5 attempts / 15 min)
- [Source: docs/tech-spec-epic-2.md#ADR-010] - Security-First Error Messages (generic messages)

**Implementation Patterns:**
- [Source: docs/tech-spec-epic-2.md#Workflows-and-Sequencing] - Admin Login Flow (Flow 2)
- [Source: docs/tech-spec-epic-2.md#JWT-Payload-Interface] - JWT payload structure
- [Source: docs/tech-spec-epic-2.md#Password-Hashing-Pattern] - bcrypt.compare usage
- [Source: docs/tech-spec-epic-2.md#NFR-Security] - Password security, JWT token security, rate limiting

**Previous Story Integration:**
- [Source: stories/2-2-user-registration.md#Completion-Notes] - AuthService, PrismaService, bcrypt ready
- [Source: stories/2-2-user-registration.md#File-List] - UserResDto, RegisterDto patterns established
- [Source: stories/2-1-jwt-strategy-auth-guard.md#Completion-Notes] - JwtModule, @Public() decorator ready
- [Source: stories/1-7-environment-configuration-validation.md] - ConfigModule ready with validation
- [Source: stories/1-4-prisma-service-module.md] - PrismaService available for User and RefreshToken queries

**NestJS Best Practices:**
- Dependency injection pattern (JwtService, PrismaService, ConfigService)
- Service layer separation (TokenService for token operations)
- DTO validation (class-validator decorators)
- Exception handling (UnauthorizedException, ForbiddenException)
- Rate limiting (@nestjs/throttler integration)
- Security best practices (generic error messages, bcrypt timing-safe comparison)

## Dev Agent Record

### Context Reference

- docs/stories/2-3-login-token-generation.context.xml

### Agent Model Used

Claude Sonnet 4.5 (claude-sonnet-4-5-20250929)

### Debug Log References

N/A - Implementation completed successfully without major issues.

### Completion Notes List

**Story 2.3 Implementation Completed:**

All acceptance criteria (AC-2.3.1 through AC-2.3.10) have been successfully implemented and tested:

1. **Token Architecture Implemented**:
   - TokenService created with JWT access token generation (stateless, configurable expiry via JWT_ACCESS_EXPIRATION)
   - Refresh token generation with UUID, database storage, and configurable expiry (JWT_REFRESH_EXPIRATION)
   - parseExpiration() helper method added to handle string formats like '15m', '7d'

2. **Admin Login Flow Complete**:
   - AuthService.loginAdmin() implements all security checks: phone lookup, admin role verification, phone verification enforcement, bcrypt password validation
   - Generic error messages prevent phone enumeration attacks ("Invalid credentials" for both invalid phone and wrong password)
   - ForbiddenException for non-admin users and unverified phones

3. **Controller & Rate Limiting**:
   - POST /auth/login/admin endpoint created with @Public() and @Throttle decorators
   - @nestjs/throttler installed and configured (5 attempts / 15 min = 900000ms TTL)
   - ThrottlerModule integrated into AuthModule

4. **DTOs Created**:
   - LoginAdminDto with @IsPhoneNumber('TR') and @IsNotEmpty validators
   - AuthResponseDto returning accessToken, refreshToken, user (UserResDto), expiresIn

5. **Testing Coverage**:
   - **Unit Tests**: TokenService (8 tests) and AuthService.loginAdmin() (7 tests) - ALL PASSING
   - **E2E Tests**: 11 comprehensive integration tests covering all ACs - ALL PASSING
   - Tests validate: successful login, JWT payload structure, refresh token storage, error scenarios, generic messages, rate limiting

6. **Security Best Practices**:
   - bcrypt.compare() for timing-safe password validation
   - Phone verification enforcement before login
   - Role-based access control (admin only)
   - Rate limiting to prevent brute-force attacks
   - Sensitive fields excluded from responses (passwordHash, domainID, deletedAt)

**Key Implementation Details:**
- JWT expiration parsing supports both string formats ('15m', '7d') and numeric values (seconds)
- Refresh tokens stored in database with proper expiresAt calculation
- Response format: `{ success: true, data: AuthResponseDto }`
- All validation, authentication, and token generation flow works end-to-end

**Dependencies Added:**
- @nestjs/throttler@latest (rate limiting)

**Performance:**
- All tests execute within acceptable timeframes
- Token generation and validation performant

### File List

**New Files Created:**
- `src/modules/auth/dto/login-admin.dto.ts` - Admin login request DTO
- `src/modules/auth/dto/auth-response.dto.ts` - Login success response DTO
- `src/modules/auth/services/token.service.ts` - Token generation service (JWT + Refresh)
- `src/modules/auth/services/token.service.spec.ts` - TokenService unit tests (8 tests)
- `test/auth-login-admin.e2e-spec.ts` - E2E integration tests (11 tests)

**Files Modified:**
- `src/modules/auth/auth.service.ts` - Added loginAdmin() method with security checks
- `src/modules/auth/auth.service.spec.ts` - Added 7 loginAdmin() unit tests
- `src/modules/auth/auth.controller.ts` - Added POST /auth/login/admin endpoint
- `src/modules/auth/auth.module.ts` - Added TokenService provider, ThrottlerModule import
- `package.json` - Added @nestjs/throttler dependency
- `package-lock.json` - Updated with @nestjs/throttler
- `docs/stories/2-3-login-token-generation.md` - Marked all tasks complete, status → review
- `docs/sprint-status.yaml` - Updated story status: ready-for-dev → in-progress → review
