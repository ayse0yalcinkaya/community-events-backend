# Epic 3: User Management & RBAC Permissions

**Goal:** User lifecycle management, profile operations, ve module-based RBAC permission system (hrsync-backend proven pattern)

**Value Proposition:** Production-ready user management + granular permission control. Admin CRUD, user self-service, role-based authorization.

**Prerequisites:** Epic 2 (Authentication)

**Technical Stack:**
- NestJS Guards (PermissionsGuard)
- Custom decorators (@Permission, @CurrentUser)
- Multi-tenancy (domainID filtering)

---

## Story 3.1: User Profile Endpoints (Self-Service)

**As a** user,
**I want** kendi profilimi görüntüleyip güncelleyebilmek,
**So that** bilgilerimi yönetebilleyim.

**Acceptance Criteria:**
1. GET /users/me endpoint (protected)
   - Current user bilgilerini döndürüyor (UserResDto)
   - @CurrentUser() decorator ile user extract
   - Password exclude
2. PATCH /users/me endpoint (protected)
   - Request DTO: firstName, lastName, phone (partial update)
   - Sadece kendi bilgilerini update edebiliyor
   - Response: Updated UserResDto
   - Validation errors → 400 Bad Request

**Technical Notes:**
- @CurrentUser() decorator: ExecutionContext'ten user extract
- plainToInstance(UserResDto, user, { excludeExtraneousValues: true })
- Email değiştirme yok (email immutable, security)

**Dependencies:** Story 2.8

---

## Story 3.2: Admin User CRUD

**As an** admin,
**I want** tüm kullanıcıları görüntüleyip yönetebilmek,
**So that** user lifecycle'ı kontrol edebilleyim.

**Acceptance Criteria:**
1. GET /users endpoint (admin only, paginated)
   - Query params: page, limit, status, role, search
   - Pagination: default 20, max 100
   - Filtering: status (active/inactive), role
   - Sorting: createdAt, email, lastName
   - DomainID isolation (only same domain users)
   - Response: { data: UserResDto[], count: number }
2. GET /users/:id endpoint (admin only)
   - User detail döndürüyor
   - DomainID check (403 if different domain)
   - 404 if not found or soft-deleted
3. POST /users endpoint (admin only)
   - Request DTO: email, password, firstName, lastName, phone, roles
   - Email uniqueness check
   - Password hash
   - Response: 201 Created, UserResDto
4. PATCH /users/:id endpoint (admin only)
   - Request DTO: firstName, lastName, phone, isActive, roles (partial)
   - DomainID check
   - Response: UserResDto
5. DELETE /users/:id endpoint (admin only)
   - Soft delete (deletedAt set)
   - DomainID check
   - Response: 200 OK

**Technical Notes:**
- Permission checks: USERS.VIEW, USERS.CREATE, USERS.UPDATE, USERS.DELETE
- DomainID filtering: where: { domainID: currentUserDomainID }
- Soft delete: update deletedAt, don't hard delete

**Dependencies:** Story 3.1

---

## Story 3.3: Permission Entity & Constants

**As a** developer,
**I want** permission tanımları ve database entity'si,
**So that** granular access control yapabileyim.

**Acceptance Criteria:**
1. Permission entity oluşturulmuş (id, module, action, description, createdAt)
2. Unique constraint: [module, action]
3. `src/modules/permissions/constants/permissions.constant.ts` oluşturulmuş
4. PERMISSIONS constant object:
   ```typescript
   export const PERMISSIONS = {
     USERS: {
       CREATE: 'USERS.CREATE',
       VIEW: 'USERS.VIEW',
       UPDATE: 'USERS.UPDATE',
       DELETE: 'USERS.DELETE',
     },
     FILES: { ... },
     // etc
   } as const;
   ```
5. Permission format: `MODULE.ACTION` (e.g., USERS.CREATE)
6. ActionEnum oluşturulmuş: CREATE, VIEW, UPDATE, DELETE

**Technical Notes:**
- Module: String (e.g., USERS, FILES, DOCUMENTS)
- Action: String (e.g., CREATE, VIEW, UPDATE, DELETE)
- hrsync-backend exact pattern

**Dependencies:** Story 3.2

---

## Story 3.4: Role & Permission Assignment Entities

**As a** developer,
**I want** role ve permission assignment entity'leri,
**So that** user-permission mapping yapabileyim.

**Acceptance Criteria:**
1. Role entity oluşturulmuş (id, domainID, name, createdAt)
2. UserRole entity (id, userID, roleID, domainID) - many-to-many
3. RolePermission entity (id, roleID, permissionID) - many-to-many
4. UserPermission entity (id, userID, permissionID, domainID) - direct assignment
5. Unique constraints:
   - Role: [domainID, name]
   - UserRole: [userID, roleID, domainID]
   - UserPermission: [userID, permissionID, domainID]
   - RolePermission: [roleID, permissionID]
6. Cascade deletes configured

**Technical Notes:**
- Hybrid approach: Role-based + Direct assignment
- User → UserRole → Role → RolePermission → Permission
- User → UserPermission → Permission (direct)
- All permission tables include domainID (multi-tenancy)

**Dependencies:** Story 3.3

---

## Story 3.5: Authorization Service

**As a** developer,
**I want** centralized authorization service,
**So that** user permission check'leri consistent olsun.

**Acceptance Criteria:**
1. `AuthorizationService` oluşturulmuş
2. `hasPermission(userID: string, domainID: string, permission: string): Promise<boolean>`
   - User'ın role'lerinden gelen permission'ları check
   - User'ın direct assignment permission'larını check
   - Union of both sources
   - Cache edilebilir (Phase 2, şimdilik her check DB query)
3. Service test edilmiş (unit tests)
4. Performance: Query optimize (eager loading, joins)

**Technical Notes:**
- Prisma query: User include roles → rolePermissions + userPermissions
- Check: permissions.some(p => p.module === module && p.action === action)
- Multi-tenancy: domainID filter mandatory

**Dependencies:** Story 3.4

---

## Story 3.6: Permissions Guard & Decorator

**As a** developer,
**I want** @Permission decorator ve guard,
**So that** route-level authorization yapabileyim.

**Acceptance Criteria:**
1. `@Permission(module: string, action: ActionEnum)` decorator oluşturulmuş
2. `PermissionsGuard` oluşturulmuş
   - JwtAuthGuard'dan sonra çalışıyor (chain)
   - Reflector ile required permission extract
   - AuthorizationService.hasPermission() call
   - Permission var → allow
   - Permission yok → 403 Forbidden
3. Guard, controller method'lara apply edilebiliyor:
   ```typescript
   @UseGuards(JwtAuthGuard, PermissionsGuard)
   @Permission('USERS', ActionEnum.CREATE)
   async create() { }
   ```
4. Public routes için @Public() decorator çalışmaya devam ediyor (guard skip)

**Technical Notes:**
- Reflector.get('permission', handler) ile metadata okuma
- Guard canActivate(): true/false döndürüyor
- 403 response: Insufficient permissions

**Dependencies:** Story 3.5

---

## Story 3.7: Permission Sync Script (Dev Environment)

**As a** developer,
**I want** code'daki permission'ları database'e sync edebilmek,
**So that** yeni permission eklediğimde manuel DB insert yapmayayım.

**Acceptance Criteria:**
1. `scripts/permission-sync.ts` oluşturulmuş
2. Script, PERMISSIONS constant'ını iterate ediyor
3. Her permission için:
   - Database'de var mı check (module, action unique)
   - Yoksa insert
   - Varsa skip
4. Script idempotent (tekrar çalıştırılabilir)
5. `package.json`: `"permission:sync": "ts-node scripts/permission-sync.ts"`
6. Console output: "Synced X permissions, Y new, Z existing"
7. Production'da disable (NODE_ENV check)

**Technical Notes:**
- Development only feature
- Prisma upsert kullan
- Object.keys() + Object.values() ile iterate PERMISSIONS

**Dependencies:** Story 3.6

---

## Story 3.8: Role & Permission Management Endpoints

**As an** admin,
**I want** role ve permission management endpoint'leri,
**So that** permission assignment yapabileyim.

**Acceptance Criteria:**
1. GET /permissions endpoint (list all permissions)
   - Response: PermissionResDto[]
   - Permission: PERMISSIONS.VIEW
2. GET /permissions/modules endpoint (list permission modules)
   - Response: string[] (unique module names)
3. POST /users/:id/permissions endpoint (assign permissions to user)
   - Request DTO: permissionIDs (string[])
   - Bulk insert UserPermission
   - DomainID isolation
   - Permission: PERMISSIONS.ASSIGN
4. DELETE /users/:id/permissions endpoint (revoke permissions)
   - Request DTO: permissionIDs
   - Bulk delete UserPermission
   - Permission: PERMISSIONS.REVOKE
5. GET /users/:id/permissions endpoint (get user permissions)
   - Response: PermissionResDto[] (union of role + direct)
   - Permission: PERMISSIONS.VIEW

**Technical Notes:**
- Bulk operations for performance
- DomainID filtering mandatory
- Return combined permissions (role-based + direct)

**Dependencies:** Story 3.7

---
