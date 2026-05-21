# Epic 2: Authentication & Session Management (Phone-based)

**Goal:** Production-ready phone-based JWT authentication sistemi - Admin (phone+password) ve Staff (phone+OTP) login, register, token management, SMS-based verification

**Value Proposition:** Phone-based authentication for Turkish market. Güvenli, stateless authentication hybrid refresh token pattern ile. Admin için password, staff için OTP-only. FONIVA SMS integration (hrsync-backend pattern). Rate limiting, phone verification.

**Prerequisites:** Epic 1 (Database & User entity), Epic 5 Story 5.1 (SMS Module - FONIVA)

**Technical Stack:**
- Passport.js + passport-jwt
- bcrypt (password hashing - admin only)
- JWT (jsonwebtoken)
- Rate limiting (@nestjs/throttler)
- SMS OTP (FONIVA provider - hrsync-backend pattern)

---

## Story 2.1: JWT Strategy & Auth Guard (Phone-based)

**As a** developer,
**I want** Phone-based JWT authentication strategy ve guard,
**So that** protected routes için kullanıcı kimliğini doğrulayabileyim.

**Acceptance Criteria:**
1. `src/modules/auth/strategies/jwt.strategy.ts` oluşturulmuş
2. JwtStrategy, Passport ile integrate (JWT token validation)
3. `src/common/guards/jwt-auth.guard.ts` oluşturulmuş
4. Guard, JWT token'ı header'dan extract edip validate ediyor
5. Valid token → request.user set ediliyor (userID, phoneNumber, domainID, roles)
6. Invalid/expired token → 401 Unauthorized
7. @Public() decorator ile route'lar guard'dan exempt edilebiliyor

**Technical Notes:**
- JWT secret environment variable'dan
- Token payload: { sub: userID, phoneNumber, domainID, roles, iat, exp }
- PassportStrategy(Strategy, 'jwt') extend
- phoneNumber replaces email in payload

**Dependencies:** Story 1.7

---

## Story 2.2: User Registration (Phone-based)

**As a** user,
**I want** phoneNumber ile kayıt olabilmek (admin için password required, staff için optional),
**So that** sisteme giriş yapabileyim.

**Acceptance Criteria:**
1. POST /auth/register endpoint oluşturulmuş
2. Request DTO:
   - phoneNumber (required, unique)
   - firstName, lastName (required)
   - role: 'admin' | 'staff' (required)
   - password (required if role='admin', optional for staff)
   - email (optional, for notifications only)
3. phoneNumber uniqueness check yapılıyor
4. Password validation (if provided): min 8 char, en az 1 harf ve 1 rakam
5. Password (if provided) bcrypt ile hash'lenip saklanıyor (10 rounds)
6. User database'e kaydediliyor (phoneVerified: false)
7. SMS OTP gönderiliyor (phone verification için - FONIVA via Epic 5.1)
8. Response: User bilgileri (password exclude)
9. Duplicate phoneNumber → 409 Conflict

**Technical Notes:**
- CreateUserDto with class-validator (@IsPhoneNumber() for phoneNumber)
- bcrypt.hash() for password (only if role = admin)
- Auto-generate UUID for user
- Return UserResDto (plainToInstance, exclude passwordHash)
- SMS sending Epic 5.1 (FONIVA) integration

**Dependencies:** Story 2.1, Story 5.1 (SMS Module)

---

## Story 2.3: Admin Login & Token Generation (Phone + Password)

**As an** admin user,
**I want** phoneNumber ve password ile login olabilmek,
**So that** access token ve refresh token alabileyim.

**Acceptance Criteria:**
1. POST /auth/login/admin endpoint oluşturulmuş
2. Request DTO: phoneNumber, password
3. phoneNumber ile user bulunuyor
4. User role check: role === 'admin' olmalı (değilse 403 Forbidden)
5. password bcrypt.compare() ile validate ediliyor
6. Valid credentials → Access token (JWT, 15-60 min expiry) generate
7. Valid credentials → Refresh token (UUID, database'e kaydediliyor, 7-30 day expiry)
8. Response: { accessToken, refreshToken, user: UserResDto }
9. Invalid credentials → 401 Unauthorized (generic message: "Invalid credentials")
10. Phone not verified → 403 Forbidden (message: "Phone not verified")
11. Rate limiting: 5 attempts / 15 min per IP (@Throttle decorator)

**Technical Notes:**
- TokenService.generateAccessToken() - JWT sign with phoneNumber
- TokenService.generateRefreshToken() - UUID + DB insert
- Store refresh token in RefreshToken entity (userID, token, expiresAt, domainID)
- Only for users with role = 'admin'

**Dependencies:** Story 2.2

---

## Story 2.3.1: Staff Login - OTP Request (Phone + SMS OTP)

**As a** staff user,
**I want** phoneNumber ile OTP request edebilmek,
**So that** SMS ile OTP alıp login olabileyim.

**Acceptance Criteria:**
1. POST /auth/login/otp/request endpoint oluşturulmuş
2. Request DTO: phoneNumber
3. phoneNumber ile user bulunuyor
4. Phone not verified → 403 Forbidden (must verify phone first)
5. User not active → 403 Forbidden
6. 6-digit OTP generate (random)
7. OTP database'e kaydediliyor (expiresAt: 5 min, attempts: 0, type: 'SMS')
8. Previous OTPs invalidated (for same user)
9. SMS gönderiliyor FONIVA provider ile (Epic 5.1 integration)
10. Response: { success: true, message: "OTP sent", expiresIn: 300 }
11. Rate limiting: 3 attempts / 15 min per phoneNumber (@Throttle decorator)

**Technical Notes:**
- OTPVerification entity: { userID, code, type: 'SMS', expiresAt, attempts, verified }
- OTP: crypto.randomInt(100000, 999999) - 6 digits
- Expiry: 5 minutes
- SMS template: "Your login code is: {code}. Valid for 5 minutes."
- FONIVA SMS integration (Epic 5.1)

**Dependencies:** Story 2.2, Story 5.1 (SMS Module)

---

## Story 2.3.2: Staff Login - OTP Verify (Complete Login)

**As a** staff user,
**I want** aldığım OTP'yi verify edip login olabilmek,
**So that** access token ve refresh token alabileyim.

**Acceptance Criteria:**
1. POST /auth/login/otp/verify endpoint oluşturulmuş
2. Request DTO: phoneNumber, code (6-digit)
3. phoneNumber ile user bulunuyor
4. OTP validate:
   - OTP exists for user
   - OTP not expired (< 5 min)
   - Code matches
   - attempts < 3
5. Valid OTP → OTP.verified = true, OTP.attempts unchanged
6. Invalid OTP → OTP.attempts++
7. Max attempts (3) exceeded → 429 Too Many Requests
8. Valid OTP → Access token (JWT, 15-60 min expiry) generate
9. Valid OTP → Refresh token (UUID, database'e kaydediliyor, 7-30 day expiry)
10. Response: { accessToken, refreshToken, user: UserResDto }
11. Verified OTP database'den siliniyor (cleanup)
12. Invalid code → 400 Bad Request
13. Expired OTP → 410 Gone
14. Rate limiting: 3 attempts per OTP (built into OTP.attempts)

**Technical Notes:**
- TokenService.generateAccessToken() - JWT sign with phoneNumber
- TokenService.generateRefreshToken() - UUID + DB insert
- OTP cleanup after successful verification
- Generic error messages (security)

**Dependencies:** Story 2.3.1

---

## Story 2.4: Token Refresh

**As a** user,
**I want** refresh token ile yeni access token alabilmek,
**So that** oturum sürekli açık kalabilsin.

**Acceptance Criteria:**
1. POST /auth/refresh endpoint oluşturulmuş
2. Request DTO: refreshToken (string)
3. Refresh token database'de validate ediliyor (exists, not expired)
4. Valid refresh token → Yeni access token generate
5. Valid refresh token → Yeni refresh token generate (rotation)
6. Eski refresh token invalidate ediliyor (deleted)
7. Response: { accessToken, refreshToken }
8. Invalid/expired refresh token → 401 Unauthorized

**Technical Notes:**
- Refresh token rotation security best practice
- Database lookup: RefreshToken.findOne({ token, expiresAt > now })
- Delete old, insert new refresh token

**Dependencies:** Story 2.3

---

## Story 2.5: Logout

**As a** user,
**I want** logout olabilmek,
**So that** refresh token'ım invalidate olsun.

**Acceptance Criteria:**
1. POST /auth/logout endpoint oluşturulmuş (protected, JWT required)
2. Request body: refreshToken (string)
3. Refresh token database'den siliniyor
4. Response: { success: true, message: "Logged out successfully" }
5. Logout sonrası eski refresh token kullanılamıyor
6. Access token hala geçerli (expiry'e kadar) - client-side discard

**Technical Notes:**
- JWT access token'ları stateless (blacklist MVP'de yok)
- Sadece refresh token invalidate
- MVP: Token blacklist yok, Phase 2'de Redis blacklist

**Dependencies:** Story 2.4

---

## Story 2.6: Password Reset Flow (Phone + SMS OTP - Admin Only)

**As an** admin user,
**I want** unuttuğum şifremi phone + SMS OTP ile reset edebilmek,
**So that** hesabıma tekrar erişebileyim.

**Acceptance Criteria:**
1. POST /auth/forgot-password endpoint (public)
   - Request DTO: phoneNumber
   - phoneNumber ile user bulunuyor
   - User role check: Sadece admin users (staff'ın passwordı yok)
   - 6-digit OTP generate
   - OTP database'e kaydediliyor (expiresAt: 5 min, type: 'SMS', purpose: 'password-reset')
   - SMS gönderiliyor FONIVA ile (password reset OTP template)
   - Response: Always 200 (security - phone exists olup olmadığını reveal etme)
   - Rate limit: 3 attempts / hour per phoneNumber
2. POST /auth/reset-password endpoint (public)
   - Request DTO: phoneNumber, code (OTP), newPassword
   - OTP validate (code match, not expired, attempts < 3)
   - Password validation (min 8 char, letter+number)
   - User password update (bcrypt hash)
   - OTP delete (cleanup)
   - Response: 200 success
   - Invalid/expired OTP → 400 Bad Request

**Technical Notes:**
- OTP-based reset (no JWT tokens)
- OTP purpose field: 'password-reset' (to differentiate from login OTP)
- SMS template: "Your password reset code is: {code}. Valid for 5 minutes."
- Only works for admin users (staff users don't have passwords)
- FONIVA SMS integration (Epic 5.1)

**Dependencies:** Story 2.5, Story 5.1 (SMS Module)

---

## Story 2.7: Phone Verification (SMS OTP)

**As a** user,
**I want** phone numara verify edebilmek,
**So that** hesabımı aktif hale getirip login olabileyim.

**Acceptance Criteria:**
1. POST /auth/verify-phone endpoint (public)
   - Request DTO: phoneNumber, code (OTP)
   - OTP validate (code match, not expired, attempts < 3)
   - User.phoneVerified = true update
   - OTP delete (cleanup)
   - Response: 200 success
   - Invalid/expired OTP → 400 Bad Request
   - Max attempts exceeded → 429 Too Many Requests
2. POST /auth/resend-otp endpoint (public)
   - Request DTO: phoneNumber
   - New OTP generate ve gönderiliyor
   - Previous OTPs invalidated
   - Response: Always 200 (security)
   - Rate limit: 3 attempts / 15 min per phoneNumber

**Technical Notes:**
- OTP-based verification (no JWT tokens)
- OTP purpose field: 'phone-verification'
- SMS template: "Your verification code is: {code}. Valid for 5 minutes."
- Login'de phoneVerified check (2.3'te implement edildi)
- FONIVA SMS integration (Epic 5.1)
- Registration sonrası ilk OTP Story 2.2'de gönderiliyor

**Dependencies:** Story 2.6, Story 5.1 (SMS Module)

---

## Story 2.8: OTP Service (Shared Utility)

**As a** developer,
**I want** re-usable OTP generation ve verification service,
**So that** multiple flows (login, verification, password reset) OTP kullanabilsin.

**Acceptance Criteria:**
1. OTPVerification entity oluşturulmuş (userID, code, type: 'SMS', expiresAt, attempts, verified, purpose, domainID)
2. OTPService oluşturulmuş:
   - `generateOTP(userID, purpose: 'login' | 'phone-verification' | 'password-reset')`
     - 6-digit OTP generate (crypto.randomInt)
     - Previous OTPs for same user+purpose invalidate
     - OTP database'e kaydet (expiresAt: 5 min, attempts: 0)
     - Return OTP code
   - `validateOTP(userID, code, purpose)`
     - OTP exists check
     - OTP not expired check (< 5 min)
     - Code match check
     - attempts < 3 check
     - Valid → Return success
     - Invalid → attempts++, return error
   - `cleanupOTP(userID, purpose)`
     - Verified/used OTP delete
3. OTP purpose types: 'login', 'phone-verification', 'password-reset'
4. SMS sending integration (FONIVA via Epic 5.1)

**Technical Notes:**
- OTP: crypto.randomInt(100000, 999999) - 6 digits
- Expiry: 5 minutes
- Max attempts: 3 per OTP
- Purpose field for isolation (different OTPs for different flows)
- Database index on [userID, purpose, verified]
- OTP cleanup after successful verification
- FONIVA SMS integration (Epic 5.1)

**Dependencies:** Story 2.7, Story 5.1 (SMS Module)

---
