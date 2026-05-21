# Epic Technical Specification: User Management & RBAC Permissions

Date: 2025-11-05
Author: BMad
Epic ID: 3
Status: Draft

---

## Overview

Epic 3, **User Management & RBAC Permissions** sistemini implement eder. Bu epic, kullanıcı yaşam döngüsü yönetimi (CRUD operations), kullanıcı self-service profil işlemleri ve module-based Role-Based Access Control (RBAC) permission sistemini içerir.

**Epic Kapsamı:**
- User profile management (self-service): Kullanıcıların kendi profillerini görüntüleyip güncelleyebilmesi
- Admin user CRUD: Admin kullanıcıların tüm kullanıcıları yönetebilmesi (create, read, update, soft-delete)
- Permission entity ve constants: Module-based permission tanımları (USERS.CREATE, USERS.VIEW, vb.)
- Role ve permission assignment: Kullanıcılara rol ve permission atama
- Authorization service: Centralized permission check servisi
- Permissions guard ve decorator: Route-level authorization (@Permission decorator)
- Permission sync script: Development ortamında code → DB permission sync
- Role & permission management endpoints: Admin için permission yönetim API'leri

Bu epic, hrsync-backend'den kanıtlanmış production pattern'lerini kullanır ve multi-tenancy (domainID) destekli bir yapı sunar.

## Objectives and Scope

### Objectives

1. **User Self-Service**: Kullanıcıların kendi profil bilgilerini görüntüleyip güncelleyebilmesi (GET /users/me, PATCH /users/me)
2. **Admin User Management**: Admin kullanıcıların tüm kullanıcıları yönetebilmesi (list, get, create, update, soft-delete)
3. **Granular Permission System**: Module-based permission tanımları ile fine-grained access control
4. **Role-Based Access Control**: Rol tabanlı ve direkt permission assignment hybrid modeli
5. **Route-Level Authorization**: Decorator-based permission checks ile güvenli endpoint'ler
6. **Development Productivity**: Permission sync script ile code → DB otomatik senkronizasyon

### In Scope

- User entity ve ilgili CRUD operations
- Permission, Role, UserRole, RolePermission, UserPermission entity'leri
- Profile management endpoints (GET /users/me, PATCH /users/me)
- Admin user management endpoints (GET /users, GET /users/:id, POST /users, PATCH /users/:id, DELETE /users/:id)
- Permission constants (PERMISSIONS object with MODULE.ACTION format)
- AuthorizationService (centralized permission check)
- PermissionsGuard ve @Permission decorator
- Permission sync script (development only)
- Role ve permission management endpoints
- Multi-tenancy support (domainID filtering)
- Soft-delete pattern (deletedAt field)
- Pagination, filtering, sorting for list endpoints

### Out of Scope

- Email/password-based authentication (Epic 2 kapsamında)
- User registration endpoints (Epic 2 kapsamında)
- File upload/profile photo (Epic 4 kapsamında)
- Advanced permission features (ABAC, permission inheritance - Future phases)
- Permission caching (Phase 2 - Redis integration)
- Audit logging (Future epic)

## System Architecture Alignment

Epic 3, boilerplate architecture'ın **modules/users/** ve **modules/permissions/** bileşenlerini implement eder ve aşağıdaki architecture kararlarına align olur:

### Architecture Decisions Alignment

| Architecture Decision | Epic 3 Implementation |
|----------------------|----------------------|
| **Controller-Service Pattern** | UsersController → UsersService → UsersRepository pattern |
| **Multi-Tenancy (Hybrid)** | @DomainID decorator + Prisma middleware ile domainID filtering |
| **Authorization Model (RBAC)** | Permission, Role, UserRole, RolePermission, UserPermission entity'leri |
| **Permission System (Hybrid Enum + DB)** | PERMISSIONS constant (enum) + Permission entity (DB) |
| **Module Organization** | Feature modules: users/, permissions/ (clear boundaries) |
| **Response Format** | Global interceptor ile consistent API responses |
| **Error Handling** | Layered exceptions + i18n translated messages |

### Component Integration

**Dependencies:**
- **Database Module**: PrismaService injection for all data operations
- **Auth Module**: JwtAuthGuard for protected routes, @CurrentUser decorator
- **Common Module**: Guards (JwtAuthGuard, PermissionsGuard), Decorators (@Permission, @CurrentUser, @DomainID), Interceptors (ResponseTransformInterceptor)

**Provided Services:**
- **UsersService**: User CRUD operations (used by Auth module)
- **AuthorizationService**: Permission checks (used by PermissionsGuard)
- **PermissionsService**: Permission management (used by admin endpoints)

### Module Structure

```
src/modules/
├── users/
│   ├── controllers/
│   │   ├── users.controller.ts          # Admin CRUD
│   │   └── profile.controller.ts        # Self-service
│   ├── services/
│   │   └── users.service.ts             # Business logic
│   ├── repositories/
│   │   └── users.repository.ts          # Data access
│   ├── dto/
│   │   ├── request/ (create, update, query DTOs)
│   │   └── response/ (user-res.dto.ts)
│   └── users.module.ts
│
└── permissions/
    ├── controllers/
    │   └── permissions.controller.ts    # Permission management
    ├── services/
    │   ├── permissions.service.ts       # CRUD
    │   └── authorization.service.ts     # hasPermission()
    ├── constants/
    │   └── permissions.constant.ts      # PERMISSIONS object
    ├── guards/
    │   └── permissions.guard.ts         # Route protection
    ├── decorators/
    │   └── permissions.decorator.ts     # @Permission()
    ├── entities/ (Permission, Role, UserRole, etc.)
    └── permissions.module.ts
```

### Constraints Applied

- **TypeScript Strict Mode**: Tüm kod strict type checking ile
- **Soft-Delete Pattern**: User ve permission entity'lerinde deletedAt field
- **DomainID Isolation**: Tüm query'lerde domainID filtering mandatory
- **hrsync-backend Patterns**: Response format, error handling, permission structure

## Detailed Design

### Services and Modules

Epic 3 iki ana modül içerir: **users** ve **permissions**. Her modül, Controller-Service-Repository pattern'i takip eder.

#### Users Module

| Component | Responsibility | Inputs | Outputs | Owner |
|-----------|---------------|--------|---------|-------|
| **ProfileController** | User self-service endpoints | JWT token, UpdateProfileDto | UserResDto | Users Module |
| **UsersController** | Admin user management | JWT token, CreateUserDto, UpdateUserDto, QueryUserDto | UserResDto[], PaginatedResponse | Users Module |
| **UsersService** | User business logic, validation | User data, domainID, userID | User operations results | Users Module |
| **UsersRepository** | Data access layer | Prisma queries, filters | User entities | Users Module |

**Key Operations:**
- `findAll(queryDto, domainID)`: Paginated user list with filters
- `findOne(id, domainID)`: Single user by ID with domain check
- `findByEmail(email, domainID)`: User lookup by email
- `findByPhoneNumber(phone, domainID)`: User lookup by phone
- `create(createUserDto, domainID)`: Create new user
- `update(id, updateUserDto, domainID)`: Update user
- `softDelete(id, domainID)`: Soft delete user
- `updateProfile(userId, updateProfileDto)`: Self-service profile update

#### Permissions Module

| Component | Responsibility | Inputs | Outputs | Owner |
|-----------|---------------|--------|---------|-------|
| **PermissionsController** | Permission management API | JWT token, AssignPermissionsDto | PermissionResDto[], RoleResDto[] | Permissions Module |
| **PermissionsService** | Permission CRUD operations | Permission/Role data | Permission/Role entities | Permissions Module |
| **AuthorizationService** | Permission checking | userID, domainID, permission string | boolean (hasPermission) | Permissions Module |
| **PermissionsGuard** | Route-level authorization | ExecutionContext, @Permission metadata | true/false (canActivate) | Common Module |

**Key Operations:**
- `getAllPermissions()`: List all permissions
- `getPermissionModules()`: List unique permission modules
- `getUserPermissions(userId, domainID)`: Get user's effective permissions (role + direct)
- `assignPermissionsToUser(userId, permissionIds, domainID)`: Bulk assign permissions
- `revokePermissionsFromUser(userId, permissionIds, domainID)`: Bulk revoke permissions
- `hasPermission(userId, domainID, permission)`: Check if user has specific permission
- `syncPermissions()`: Sync code permissions to DB (dev only)

#### Shared Components (Common Module)

| Component | Responsibility | Used By |
|-----------|---------------|---------|
| **@CurrentUser() decorator** | Extract user from JWT payload | All controllers |
| **@Permission(module, action) decorator** | Mark route permission requirement | Protected endpoints |
| **@DomainID() decorator** | Extract domainID from user context | All controllers |
| **PermissionsGuard** | Execute permission checks | Protected routes |
| **ResponseTransformInterceptor** | Wrap responses in standard format | All responses |

### Data Models and Contracts

#### Prisma Schema Models

**User Entity** (extends Epic 1 User model)
```prisma
model User {
  id              String    @id @default(uuid())
  domainID        String    // Multi-tenancy
  phoneNumber     String    // Primary identifier
  passwordHash    String?   // Only for admin users
  firstName       String
  lastName        String
  email           String?   // Optional, for notifications
  role            String    @default("staff") // admin, staff, etc.
  isActive        Boolean   @default(true)
  phoneVerified   Boolean   @default(false)
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  deletedAt       DateTime? // Soft delete

  // Relations
  userRoles       UserRole[]
  userPermissions UserPermission[]
  files           File[]

  @@unique([domainID, phoneNumber])
  @@index([domainID])
  @@index([phoneNumber])
  @@index([deletedAt])
}
```

**Permission Entity**
```prisma
model Permission {
  id          String   @id @default(uuid())
  module      String   // e.g., USERS, FILES, DOCUMENTS
  action      String   // e.g., CREATE, VIEW, UPDATE, DELETE
  description String?
  createdAt   DateTime @default(now())

  // Relations
  rolePermissions RolePermission[]
  userPermissions UserPermission[]

  @@unique([module, action])
  @@index([module])
}
```

**Role Entity**
```prisma
model Role {
  id        String   @id @default(uuid())
  domainID  String   // Multi-tenancy
  name      String   // e.g., Admin, Manager, Viewer
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  userRoles       UserRole[]
  rolePermissions RolePermission[]

  @@unique([domainID, name])
  @@index([domainID])
}
```

**UserRole Entity** (Junction table)
```prisma
model UserRole {
  id        String   @id @default(uuid())
  userID    String
  roleID    String
  domainID  String   // Multi-tenancy
  createdAt DateTime @default(now())

  // Relations
  user User @relation(fields: [userID], references: [id], onDelete: Cascade)
  role Role @relation(fields: [roleID], references: [id], onDelete: Cascade)

  @@unique([userID, roleID, domainID])
  @@index([userID])
  @@index([roleID])
  @@index([domainID])
}
```

**RolePermission Entity** (Junction table)
```prisma
model RolePermission {
  id           String   @id @default(uuid())
  roleID       String
  permissionID String
  createdAt    DateTime @default(now())

  // Relations
  role       Role       @relation(fields: [roleID], references: [id], onDelete: Cascade)
  permission Permission @relation(fields: [permissionID], references: [id], onDelete: Cascade)

  @@unique([roleID, permissionID])
  @@index([roleID])
  @@index([permissionID])
}
```

**UserPermission Entity** (Direct permission assignment)
```prisma
model UserPermission {
  id           String   @id @default(uuid())
  userID       String
  permissionID String
  domainID     String   // Multi-tenancy
  createdAt    DateTime @default(now())

  // Relations
  user       User       @relation(fields: [userID], references: [id], onDelete: Cascade)
  permission Permission @relation(fields: [permissionID], references: [id], onDelete: Cascade)

  @@unique([userID, permissionID, domainID])
  @@index([userID])
  @@index([permissionID])
  @@index([domainID])
}
```

#### TypeScript DTOs

**Request DTOs**
```typescript
// CreateUserDto
class CreateUserDto {
  @IsPhoneNumber('TR')
  @IsNotEmpty()
  phoneNumber: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string; // Required for admin

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
  email?: string;

  @IsEnum(['admin', 'staff', 'manager'])
  role: string;
}

// UpdateUserDto (Partial)
class UpdateUserDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsPhoneNumber('TR')
  phoneNumber?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

// QueryUserDto
class QueryUserDto {
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
  @IsEnum(['active', 'inactive'])
  status?: string;

  @IsOptional()
  @IsEnum(['admin', 'staff', 'manager'])
  role?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}

// AssignPermissionsDto
class AssignPermissionsDto {
  @IsArray()
  @IsUUID('4', { each: true })
  permissionIDs: string[];
}
```

**Response DTOs**
```typescript
// UserResDto
class UserResDto {
  @Expose()
  id: string;

  @Expose()
  phoneNumber: string;

  @Expose()
  firstName: string;

  @Expose()
  lastName: string;

  @Expose()
  email?: string;

  @Expose()
  role: string;

  @Expose()
  isActive: boolean;

  @Expose()
  phoneVerified: boolean;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  // Exclude: passwordHash, domainID, deletedAt
}

// PermissionResDto
class PermissionResDto {
  @Expose()
  id: string;

  @Expose()
  module: string;

  @Expose()
  action: string;

  @Expose()
  description?: string;

  @Expose()
  createdAt: Date;
}

// RoleResDto
class RoleResDto {
  @Expose()
  id: string;

  @Expose()
  name: string;

  @Expose()
  createdAt: Date;

  @Expose()
  permissions?: PermissionResDto[];
}
```

#### Constants

**PERMISSIONS Constant**
```typescript
export const PERMISSIONS = {
  USERS: {
    CREATE: 'USERS.CREATE',
    VIEW: 'USERS.VIEW',
    UPDATE: 'USERS.UPDATE',
    DELETE: 'USERS.DELETE',
  },
  PERMISSIONS: {
    VIEW: 'PERMISSIONS.VIEW',
    ASSIGN: 'PERMISSIONS.ASSIGN',
    REVOKE: 'PERMISSIONS.REVOKE',
  },
  FILES: {
    CREATE: 'FILES.CREATE',
    VIEW: 'FILES.VIEW',
    DELETE: 'FILES.DELETE',
    VIEW_ALL: 'FILES.VIEW_ALL', // Admin
  },
  // ... more modules
} as const;

export enum ActionEnum {
  CREATE = 'CREATE',
  VIEW = 'VIEW',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
}
```

### APIs and Interfaces

#### User Profile Endpoints (Self-Service)

**GET /users/me**
- **Description**: Get current user profile
- **Auth**: Required (JwtAuthGuard)
- **Permission**: None (self-service)
- **Request**: None (user extracted from JWT)
- **Response**: 200 OK
  ```typescript
  {
    success: true,
    data: UserResDto
  }
  ```
- **Errors**: 401 Unauthorized

**PATCH /users/me**
- **Description**: Update current user profile
- **Auth**: Required (JwtAuthGuard)
- **Permission**: None (self-service)
- **Request Body**: UpdateProfileDto
  ```typescript
  {
    firstName?: string;
    lastName?: string;
    phoneNumber?: string; // Requires OTP verification
  }
  ```
- **Response**: 200 OK
  ```typescript
  {
    success: true,
    data: UserResDto
  }
  ```
- **Errors**: 400 Bad Request, 401 Unauthorized, 409 Conflict (phoneNumber exists)

#### Admin User Management Endpoints

**GET /users**
- **Description**: List all users (paginated)
- **Auth**: Required (JwtAuthGuard)
- **Permission**: USERS.VIEW
- **Query Parameters**: QueryUserDto
  ```typescript
  {
    page?: number;        // Default: 1
    limit?: number;       // Default: 20, Max: 100
    status?: 'active' | 'inactive';
    role?: 'admin' | 'staff' | 'manager';
    search?: string;      // Search in firstName, lastName, phoneNumber
    sortBy?: string;      // Default: 'createdAt'
    sortOrder?: 'asc' | 'desc'; // Default: 'desc'
  }
  ```
- **Response**: 200 OK
  ```typescript
  {
    success: true,
    data: UserResDto[],
    meta: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    }
  }
  ```
- **Errors**: 401 Unauthorized, 403 Forbidden

**GET /users/:id**
- **Description**: Get user by ID
- **Auth**: Required (JwtAuthGuard)
- **Permission**: USERS.VIEW
- **Path Parameters**: id (UUID)
- **Response**: 200 OK
  ```typescript
  {
    success: true,
    data: UserResDto
  }
  ```
- **Errors**: 401 Unauthorized, 403 Forbidden, 404 Not Found

**POST /users**
- **Description**: Create new user
- **Auth**: Required (JwtAuthGuard)
- **Permission**: USERS.CREATE
- **Request Body**: CreateUserDto
  ```typescript
  {
    phoneNumber: string;
    password?: string;    // Required for admin
    firstName: string;
    lastName: string;
    email?: string;
    role: 'admin' | 'staff' | 'manager';
  }
  ```
- **Response**: 201 Created
  ```typescript
  {
    success: true,
    data: UserResDto
  }
  ```
- **Errors**: 400 Bad Request, 401 Unauthorized, 403 Forbidden, 409 Conflict (phoneNumber exists)

**PATCH /users/:id**
- **Description**: Update user
- **Auth**: Required (JwtAuthGuard)
- **Permission**: USERS.UPDATE
- **Path Parameters**: id (UUID)
- **Request Body**: UpdateUserDto
  ```typescript
  {
    firstName?: string;
    lastName?: string;
    phoneNumber?: string;
    isActive?: boolean;
  }
  ```
- **Response**: 200 OK
  ```typescript
  {
    success: true,
    data: UserResDto
  }
  ```
- **Errors**: 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found

**DELETE /users/:id**
- **Description**: Soft delete user
- **Auth**: Required (JwtAuthGuard)
- **Permission**: USERS.DELETE
- **Path Parameters**: id (UUID)
- **Response**: 200 OK
  ```typescript
  {
    success: true,
    message: "User deleted successfully"
  }
  ```
- **Errors**: 401 Unauthorized, 403 Forbidden, 404 Not Found

#### Permission Management Endpoints

**GET /permissions**
- **Description**: List all permissions
- **Auth**: Required (JwtAuthGuard)
- **Permission**: PERMISSIONS.VIEW
- **Response**: 200 OK
  ```typescript
  {
    success: true,
    data: PermissionResDto[]
  }
  ```
- **Errors**: 401 Unauthorized, 403 Forbidden

**GET /permissions/modules**
- **Description**: Get unique permission modules
- **Auth**: Required (JwtAuthGuard)
- **Permission**: PERMISSIONS.VIEW
- **Response**: 200 OK
  ```typescript
  {
    success: true,
    data: string[] // ['USERS', 'FILES', 'PERMISSIONS', ...]
  }
  ```
- **Errors**: 401 Unauthorized, 403 Forbidden

**GET /users/:id/permissions**
- **Description**: Get user's effective permissions (role + direct)
- **Auth**: Required (JwtAuthGuard)
- **Permission**: PERMISSIONS.VIEW
- **Path Parameters**: id (UUID)
- **Response**: 200 OK
  ```typescript
  {
    success: true,
    data: PermissionResDto[]
  }
  ```
- **Errors**: 401 Unauthorized, 403 Forbidden, 404 Not Found

**POST /users/:id/permissions**
- **Description**: Assign permissions to user
- **Auth**: Required (JwtAuthGuard)
- **Permission**: PERMISSIONS.ASSIGN
- **Path Parameters**: id (UUID)
- **Request Body**: AssignPermissionsDto
  ```typescript
  {
    permissionIDs: string[] // Array of permission UUIDs
  }
  ```
- **Response**: 200 OK
  ```typescript
  {
    success: true,
    message: "Permissions assigned successfully"
  }
  ```
- **Errors**: 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found

**DELETE /users/:id/permissions**
- **Description**: Revoke permissions from user
- **Auth**: Required (JwtAuthGuard)
- **Permission**: PERMISSIONS.REVOKE
- **Path Parameters**: id (UUID)
- **Request Body**: AssignPermissionsDto
  ```typescript
  {
    permissionIDs: string[] // Array of permission UUIDs
  }
  ```
- **Response**: 200 OK
  ```typescript
  {
    success: true,
    message: "Permissions revoked successfully"
  }
  ```
- **Errors**: 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found

#### Service Interfaces

**IAuthorizationService**
```typescript
interface IAuthorizationService {
  /**
   * Check if user has specific permission
   * @param userID - User UUID
   * @param domainID - Domain UUID for multi-tenancy
   * @param permission - Permission string (e.g., 'USERS.CREATE')
   * @returns Promise<boolean>
   */
  hasPermission(userID: string, domainID: string, permission: string): Promise<boolean>;

  /**
   * Get user's effective permissions (role + direct)
   * @param userID - User UUID
   * @param domainID - Domain UUID
   * @returns Promise<Permission[]>
   */
  getUserPermissions(userID: string, domainID: string): Promise<Permission[]>;
}
```

**IUsersService**
```typescript
interface IUsersService {
  findAll(queryDto: QueryUserDto, domainID: string): Promise<{ data: User[], total: number }>;
  findOne(id: string, domainID: string): Promise<User>;
  findByPhoneNumber(phoneNumber: string, domainID: string): Promise<User | null>;
  create(createUserDto: CreateUserDto, domainID: string): Promise<User>;
  update(id: string, updateUserDto: UpdateUserDto, domainID: string): Promise<User>;
  softDelete(id: string, domainID: string): Promise<void>;
  updateProfile(userId: string, updateProfileDto: UpdateProfileDto): Promise<User>;
}
```

### Workflows and Sequencing

#### User Profile Update Flow (Self-Service)

```
┌──────────┐
│  Client  │
└─────┬────┘
      │ PATCH /users/me { firstName, lastName }
      ▼
┌────────────────┐
│ ProfileController│
└───────┬────────┘
        │ @CurrentUser() extract userID
        ▼
┌────────────────┐
│  UsersService  │
└───────┬────────┘
        │ validate input
        │ updateProfile(userID, dto)
        ▼
┌────────────────┐
│UsersRepository │
└───────┬────────┘
        │ Prisma update
        ▼
┌────────────────┐
│   Database     │
└───────┬────────┘
        │ return updated User
        ▼
┌────────────────┐
│ResponseTransform│ (Interceptor)
└───────┬────────┘
        │ wrap in standard format
        ▼
┌──────────┐
│  Client  │ { success: true, data: UserResDto }
└──────────┘
```

#### Admin User List Flow (with Pagination & Filtering)

```
┌──────────┐
│  Client  │ (Admin)
└─────┬────┘
      │ GET /users?page=1&limit=20&role=staff&search=john
      ▼
┌────────────────┐
│UsersController │
└───────┬────────┘
        │ @UseGuards(JwtAuthGuard, PermissionsGuard)
        │ @Permission('USERS', ActionEnum.VIEW)
        ▼
┌────────────────┐
│PermissionsGuard│
└───────┬────────┘
        │ AuthorizationService.hasPermission(userID, domainID, 'USERS.VIEW')
        │ ✓ Permission check passed
        ▼
┌────────────────┐
│  UsersService  │
└───────┬────────┘
        │ findAll(queryDto, currentUserDomainID)
        │ build filters: { domainID, deletedAt: null, role: 'staff', OR: [firstName LIKE, lastName LIKE] }
        ▼
┌────────────────┐
│UsersRepository │
└───────┬────────┘
        │ Prisma.user.findMany({ where, skip, take, orderBy })
        │ Prisma.user.count({ where })
        ▼
┌────────────────┐
│   Database     │
└───────┬────────┘
        │ return { users: User[], total: number }
        ▼
┌────────────────┐
│ResponseTransform│
└───────┬────────┘
        │ { success: true, data: UserResDto[], meta: { page, limit, total, totalPages } }
        ▼
┌──────────┐
│  Client  │
└──────────┘
```

#### Permission Check Flow (Authorization)

```
┌──────────┐
│  Client  │
└─────┬────┘
      │ POST /users { ... } (Create User)
      │ Authorization: Bearer <JWT>
      ▼
┌────────────────┐
│ JwtAuthGuard   │
└───────┬────────┘
        │ validate JWT token
        │ extract user (userID, domainID, roles)
        │ set request.user
        ▼
┌────────────────┐
│PermissionsGuard│
└───────┬────────┘
        │ Reflector.get('permission', handler)
        │ required: 'USERS.CREATE'
        ▼
┌────────────────┐
│AuthorizationSvc│
└───────┬────────┘
        │ hasPermission(userID, domainID, 'USERS.CREATE')
        │ Query: UserRole → RolePermission + UserPermission
        ▼
┌────────────────┐
│   Database     │
└───────┬────────┘
        │ SELECT permissions WHERE (userID via roles) OR (userID direct)
        │ Check: 'USERS.CREATE' in results?
        │ ✓ YES → return true
        ▼
┌────────────────┐
│PermissionsGuard│
└───────┬────────┘
        │ canActivate() returns true
        ▼
┌────────────────┐
│UsersController │
└───────┬────────┘
        │ create() method executes
        ▼
┌──────────┐
│  Client  │ 201 Created
└──────────┘

❌ NO PERMISSION:
┌────────────────┐
│AuthorizationSvc│ 'USERS.CREATE' NOT found
└───────┬────────┘
        │ return false
        ▼
┌────────────────┐
│PermissionsGuard│ canActivate() returns false
└───────┬────────┘
        │ throw ForbiddenException
        ▼
┌──────────┐
│  Client  │ 403 Forbidden
└──────────┘
```

#### Permission Assignment Flow

```
┌──────────┐
│  Client  │ (Admin)
└─────┬────┘
      │ POST /users/{userId}/permissions
      │ { permissionIDs: ['uuid1', 'uuid2'] }
      ▼
┌────────────────────┐
│PermissionsController│
└──────────┬─────────┘
           │ @Permission('PERMISSIONS', ActionEnum.ASSIGN)
           ▼
┌────────────────────┐
│  PermissionsService│
└──────────┬─────────┘
           │ assignPermissionsToUser(userId, permissionIDs, domainID)
           │ validate: user exists, same domain
           │ validate: all permissionIDs exist
           ▼
┌────────────────────┐
│   Database         │
└──────────┬─────────┘
           │ Prisma.userPermission.createMany([
           │   { userID, permissionID: 'uuid1', domainID },
           │   { userID, permissionID: 'uuid2', domainID }
           │ ])
           │ (onConflict: skip duplicates)
           ▼
┌──────────┐
│  Client  │ { success: true, message: "Permissions assigned" }
└──────────┘
```

#### Permission Sync Script Flow (Development)

```
┌──────────────────┐
│ npm run          │
│ permission:sync  │
└─────────┬────────┘
          │
          ▼
┌──────────────────┐
│ sync-permissions │ (scripts/permission-sync.ts)
└─────────┬────────┘
          │ NODE_ENV check → only dev/local
          │ Load PERMISSIONS constant
          ▼
┌──────────────────┐
│ Iterate modules  │
└─────────┬────────┘
          │ PERMISSIONS.USERS.CREATE → { module: 'USERS', action: 'CREATE' }
          │ PERMISSIONS.USERS.VIEW → { module: 'USERS', action: 'VIEW' }
          │ ... (all permissions)
          ▼
┌──────────────────┐
│   Database       │
└─────────┬────────┘
          │ Prisma.permission.upsert({
          │   where: { module_action: { module, action } },
          │   update: {},
          │   create: { module, action, description }
          │ })
          ▼
┌──────────────────┐
│ Console Output   │ "Synced 15 permissions: 12 existing, 3 new"
└──────────────────┘
```

## Non-Functional Requirements

### Performance

**Query Performance Targets:**
- **Simple user lookup** (by ID): < 50ms (p95)
- **User list with pagination** (20 items): < 100ms (p95)
- **User list with complex filters** (search + role + status): < 200ms (p95)
- **Permission check** (hasPermission): < 50ms (p95) - critical path
- **User permissions query** (effective permissions): < 100ms (p95)

**Optimization Strategies:**

1. **Database Indexing:**
   - User: Index on [domainID], [phoneNumber], [deletedAt], [domainID, phoneNumber]
   - Permission: Index on [module], [module, action] unique
   - UserRole: Index on [userID], [roleID], [domainID]
   - UserPermission: Index on [userID], [permissionID], [domainID]
   - RolePermission: Index on [roleID], [permissionID]

2. **Query Optimization:**
   - Use Prisma `include` for eager loading (avoid N+1)
   - Permission queries: Single query with JOIN (UserRole → RolePermission UNION UserPermission)
   - Pagination: Use `skip` and `take` consistently (max 100 items per page)

3. **Permission Check Caching (Phase 2):**
   - Cache user permissions in Redis (TTL: 5 minutes)
   - Cache key: `user:permissions:{domainID}:{userID}`
   - Invalidate on permission assignment/revocation
   - MVP: No caching, direct DB query (acceptable for < 100 concurrent users)

**Concurrent Request Handling:**
- Minimum 50 concurrent users supported
- Stateless design (horizontal scaling ready)
- No blocking operations in permission checks

**Performance Monitoring:**
- Log slow queries (> 500ms)
- Track permission check frequency (consider caching if > 1000/min)

### Security

**Authorization Security:**

1. **Permission-Based Access Control:**
   - All admin endpoints protected with `@Permission` decorator
   - Default deny policy (routes protected unless explicitly public)
   - Permission checks enforced at route level (PermissionsGuard)
   - No frontend-only permission checks (always backend validation)

2. **Multi-Tenancy Isolation:**
   - domainID filtering mandatory on ALL queries
   - Prisma middleware enforces domainID filter (safety net)
   - Cross-domain access attempts logged and blocked
   - Admin cannot access users from different domains

3. **Data Access Security:**
   - Soft-delete pattern (deletedAt field) - no data loss
   - Password hashing: bcrypt with 10 rounds minimum (admin users)
   - No password in responses (UserResDto excludes passwordHash)
   - phoneNumber uniqueness per domain (prevent duplicates)

4. **Input Validation:**
   - All DTOs validated with class-validator
   - phoneNumber validation: @IsPhoneNumber('TR')
   - UUID validation: @IsUUID('4')
   - Enum validation: @IsEnum for role, status fields
   - SQL injection prevention: Prisma parameterized queries

5. **Permission Management Security:**
   - Only users with PERMISSIONS.ASSIGN can assign permissions
   - Only users with PERMISSIONS.REVOKE can revoke permissions
   - Permission sync script: Development only (NODE_ENV check)
   - Bulk operations validated (all permissionIDs exist before insert)

**Security Audit Checklist:**
- [ ] All admin endpoints have @Permission decorator
- [ ] All queries include domainID filter
- [ ] No passwordHash in response DTOs
- [ ] Input validation on all DTOs
- [ ] Permission sync disabled in production

### Reliability/Availability

**Error Handling:**

1. **Layered Exception Handling:**
   - Service layer: Throw domain-specific exceptions (UserNotFoundException, PermissionDeniedException)
   - Controller layer: Catch service exceptions, map to HTTP status codes
   - Global exception filter: Catch unhandled exceptions, log to Sentry, return generic error
   - i18n support: Error messages translated based on Accept-Language header

2. **Graceful Degradation:**
   - Permission check failure → 403 Forbidden (clear message)
   - Database connection failure → 503 Service Unavailable
   - Validation failure → 400 Bad Request (detailed validation errors)
   - User not found → 404 Not Found (no sensitive info leak)

3. **Transaction Support:**
   - User creation + initial permission assignment: Use Prisma transaction
   - Bulk permission assignment: Wrapped in transaction
   - Rollback on failure (all-or-nothing semantics)

**Data Integrity:**

1. **Soft-Delete Pattern:**
   - Users soft-deleted (deletedAt set, not hard delete)
   - Cascade delete: UserRole, UserPermission deleted when user deleted
   - Restore capability: Update deletedAt to null

2. **Database Constraints:**
   - Unique constraints: [domainID, phoneNumber], [domainID, name] (Role), [module, action] (Permission)
   - Foreign key constraints: Cascade delete on UserRole, UserPermission, RolePermission
   - NOT NULL constraints: Essential fields (phoneNumber, firstName, lastName)

3. **Validation at Multiple Layers:**
   - DTO validation (class-validator) - first line of defense
   - Service layer validation (business rules)
   - Database constraints (last line of defense)

**Availability:**
- No single point of failure (stateless design)
- Database connection pooling (5-20 connections)
- Health check endpoint includes user service check
- Horizontal scaling ready (no session state)

### Observability

**Logging:**

1. **Structured Logging (JSON format):**
   ```json
   {
     "timestamp": "2025-11-05T10:30:00Z",
     "level": "info",
     "context": "UsersService",
     "message": "User created successfully",
     "domainID": "domain-uuid",
     "userID": "user-uuid",
     "action": "create_user"
   }
   ```

2. **Key Events to Log:**
   - User CRUD operations (create, update, delete) - info level
   - Permission assignments/revocations - info level
   - Permission check failures - warn level
   - Authorization failures (403) - warn level
   - Service errors - error level
   - Slow queries (> 500ms) - warn level

3. **Sensitive Data Exclusion:**
   - Never log: passwordHash, JWT tokens
   - Redact: phoneNumber in production logs (optional, configurable)
   - Include: domainID, userID, action type

**Monitoring:**

1. **Key Metrics:**
   - User creation rate (users/hour)
   - Permission check frequency (checks/minute)
   - Permission check latency (p50, p95, p99)
   - Failed authorization attempts (403 count)
   - API endpoint response times

2. **Sentry Integration:**
   - Automatic exception capture
   - User context: domainID, userID (no PII)
   - Breadcrumbs: Service method calls leading to error
   - Release tracking: Version info in errors

3. **Health Checks:**
   - GET /health/users → Check UsersService connectivity
   - GET /health/permissions → Check AuthorizationService
   - Database connectivity check via PrismaService

**Debugging Support:**

1. **Request Tracing:**
   - Request ID propagation (X-Request-ID header)
   - Log request ID in all service logs
   - Trace request flow across services

2. **Development Logging:**
   - Log level: debug (in development)
   - Query logging: Enable Prisma query logs
   - Permission check details logged

3. **Audit Trail (Future):**
   - Track who changed what (user CRUD, permission changes)
   - Timestamp all changes (createdAt, updatedAt)
   - Soft-delete preserves history

## Dependencies and Integrations

### Internal Dependencies

**Epic 3 depends on:**

| Dependency | Epic | Reason | Status |
|------------|------|--------|--------|
| **PrismaService** | Epic 1 | Database access for all user/permission queries | Required |
| **Database Schema** | Epic 1 | User, Permission, Role entities must exist | Required |
| **JwtAuthGuard** | Epic 2 | Authentication required for protected routes | Required |
| **JWT Strategy** | Epic 2 | Token validation and user extraction | Required |
| **@CurrentUser decorator** | Epic 2 | Extract user from JWT payload | Required |
| **ResponseTransformInterceptor** | Common | Consistent API response format | Required |
| **Global Exception Filter** | Common | Error handling and i18n | Required |

**Epic 3 provides to:**

| Consumer | What is provided | Purpose |
|----------|------------------|---------|
| **Epic 2 (Auth)** | UsersService.findByPhoneNumber() | User lookup during login |
| **Epic 4 (Files)** | PermissionsGuard, @Permission decorator | File access authorization |
| **Epic 5 (Comms)** | UsersService.findOne() | Get user for notifications |
| **All Future Epics** | PermissionsGuard, AuthorizationService | Authorization for all endpoints |
| **All Future Epics** | PERMISSIONS constant | Permission definitions |

### External Dependencies

**NPM Packages:**

```json
{
  "dependencies": {
    "@nestjs/common": "^11.1.8",
    "@nestjs/core": "^11.1.8",
    "@nestjs/platform-express": "^11.1.8",
    "@nestjs/passport": "^10.0.3",
    "@nestjs/jwt": "^10.2.0",
    "@prisma/client": "^6.16.0",
    "passport": "^0.7.0",
    "passport-jwt": "^4.0.1",
    "bcrypt": "^5.1.1",
    "class-validator": "^0.14.1",
    "class-transformer": "^0.5.1",
    "uuid": "^9.0.1"
  },
  "devDependencies": {
    "prisma": "^6.16.0",
    "@types/passport-jwt": "^4.0.1",
    "@types/bcrypt": "^5.0.2",
    "@types/uuid": "^9.0.8"
  }
}
```

**Key Integrations:**

1. **Prisma ORM:**
   - Database queries via PrismaClient
   - Type-safe models (User, Permission, Role, etc.)
   - Migration system for schema changes

2. **Passport.js:**
   - JWT strategy for authentication
   - Guard integration (@UseGuards)

3. **class-validator:**
   - DTO validation decorators
   - @IsPhoneNumber, @IsEmail, @IsUUID, @IsEnum

4. **class-transformer:**
   - DTO transformation (plainToInstance)
   - @Expose decorator for response DTOs
   - Exclude sensitive fields (passwordHash)

5. **bcrypt:**
   - Password hashing (admin users only)
   - 10 rounds minimum

### Database Schema Dependencies

**Required Tables (from Epic 1):**
- User (with phoneNumber, domainID, passwordHash, role fields)

**New Tables (Epic 3):**
- Permission
- Role
- UserRole (junction table)
- RolePermission (junction table)
- UserPermission (junction table)

**Migration Order:**
1. Epic 1: Create User table
2. Epic 3: Create Permission, Role, UserRole, RolePermission, UserPermission tables
3. Epic 3: Add foreign keys and indexes

### Configuration Dependencies

**Environment Variables Required:**

```bash
# From Epic 1 (inherited)
DATABASE_URL=postgresql://...

# From Epic 2 (inherited)
JWT_SECRET=your-secret-key
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

# Epic 3 specific (none - uses inherited config)
```

**No new environment variables required for Epic 3.**

## Acceptance Criteria (Authoritative)

### Story 3.1: User Profile Endpoints (Self-Service)

**AC-3.1.1:** GET /users/me endpoint returns current user profile
- User authenticated with valid JWT token
- Response contains UserResDto (id, phoneNumber, firstName, lastName, email, role, isActive, phoneVerified, timestamps)
- passwordHash excluded from response
- Returns 401 if token invalid/missing

**AC-3.1.2:** PATCH /users/me endpoint updates current user profile
- User can update firstName, lastName, phoneNumber
- phoneNumber update requires OTP verification (Epic 2.7 integration)
- Validation errors return 400 with detailed messages
- phoneNumber uniqueness enforced (409 Conflict if duplicate)
- Returns updated UserResDto

### Story 3.2: Admin User CRUD

**AC-3.2.1:** GET /users endpoint returns paginated user list
- Admin user with USERS.VIEW permission can access
- Pagination: page, limit query params (default: page=1, limit=20, max: 100)
- Filtering: status (active/inactive), role (admin/staff/manager), search (firstName, lastName, phoneNumber)
- Sorting: sortBy, sortOrder query params (default: createdAt desc)
- domainID isolation enforced (only same domain users visible)
- Response includes meta: { page, limit, total, totalPages }
- Soft-deleted users excluded
- Returns 403 if no USERS.VIEW permission

**AC-3.2.2:** GET /users/:id endpoint returns single user
- Admin user with USERS.VIEW permission can access
- domainID check enforced (403 if different domain)
- Returns 404 if user not found or soft-deleted
- passwordHash excluded from response

**AC-3.2.3:** POST /users endpoint creates new user
- Admin user with USERS.CREATE permission can access
- Request validates: phoneNumber (unique per domain), firstName, lastName, role
- password required if role=admin, optional for staff
- Password hashed with bcrypt (10 rounds) before storage
- User created with phoneVerified=false
- Returns 201 Created with UserResDto
- Returns 409 Conflict if phoneNumber already exists in domain
- Returns 400 if validation fails

**AC-3.2.4:** PATCH /users/:id endpoint updates user
- Admin user with USERS.UPDATE permission can access
- Partial update supported (firstName, lastName, phoneNumber, isActive)
- domainID check enforced
- phoneNumber uniqueness validated
- Returns updated UserResDto
- Returns 404 if user not found, 403 if wrong domain

**AC-3.2.5:** DELETE /users/:id endpoint soft-deletes user
- Admin user with USERS.DELETE permission can access
- Soft delete: set deletedAt timestamp (no hard delete)
- domainID check enforced
- Cascade: UserRole, UserPermission records also soft-deleted
- Returns 200 OK with success message
- Returns 404 if user not found, 403 if wrong domain

### Story 3.3: Permission Entity & Constants

**AC-3.3.1:** Permission entity created in Prisma schema
- Fields: id (UUID), module (string), action (string), description (optional), createdAt
- Unique constraint on [module, action]
- Index on [module]
- Relations: rolePermissions[], userPermissions[]

**AC-3.3.2:** PERMISSIONS constant defined
- Object structure: PERMISSIONS.{MODULE}.{ACTION}
- Format: 'MODULE.ACTION' (e.g., 'USERS.CREATE')
- Modules: USERS, PERMISSIONS, FILES (minimum for Epic 3)
- Actions per module: CREATE, VIEW, UPDATE, DELETE (minimum)
- Type-safe constant (as const)

**AC-3.3.3:** ActionEnum created
- Enum values: CREATE, VIEW, UPDATE, DELETE
- Used in @Permission decorator

### Story 3.4: Role & Permission Assignment Entities

**AC-3.4.1:** Role entity created
- Fields: id, domainID, name, createdAt, updatedAt
- Unique constraint on [domainID, name]
- Index on [domainID]
- Relations: userRoles[], rolePermissions[]

**AC-3.4.2:** UserRole entity created (junction table)
- Fields: id, userID, roleID, domainID, createdAt
- Unique constraint on [userID, roleID, domainID]
- Indexes on [userID], [roleID], [domainID]
- Cascade delete on user/role deletion

**AC-3.4.3:** RolePermission entity created (junction table)
- Fields: id, roleID, permissionID, createdAt
- Unique constraint on [roleID, permissionID]
- Indexes on [roleID], [permissionID]
- Cascade delete on role/permission deletion

**AC-3.4.4:** UserPermission entity created (direct assignment)
- Fields: id, userID, permissionID, domainID, createdAt
- Unique constraint on [userID, permissionID, domainID]
- Indexes on [userID], [permissionID], [domainID]
- Cascade delete on user/permission deletion

### Story 3.5: Authorization Service

**AC-3.5.1:** AuthorizationService.hasPermission() implemented
- Method signature: hasPermission(userID: string, domainID: string, permission: string): Promise<boolean>
- Queries user's role-based permissions (UserRole → RolePermission)
- Queries user's direct permissions (UserPermission)
- Returns true if permission found in either source (UNION)
- Returns false if permission not found
- domainID filtering enforced
- Single optimized query (JOIN, no N+1)

**AC-3.5.2:** AuthorizationService.getUserPermissions() implemented
- Method signature: getUserPermissions(userID: string, domainID: string): Promise<Permission[]>
- Returns combined permissions (role + direct)
- Deduplicates permissions
- domainID filtering enforced

**AC-3.5.3:** Unit tests for AuthorizationService
- Test: User with role-based permission → hasPermission returns true
- Test: User with direct permission → hasPermission returns true
- Test: User with no permission → hasPermission returns false
- Test: User with permission in different domain → hasPermission returns false
- Test: getUserPermissions returns union of role + direct permissions

### Story 3.6: Permissions Guard & Decorator

**AC-3.6.1:** @Permission decorator created
- Decorator signature: @Permission(module: string, action: ActionEnum)
- Sets metadata for PermissionsGuard
- Example usage: @Permission('USERS', ActionEnum.CREATE)

**AC-3.6.2:** PermissionsGuard implemented
- Extends CanActivate interface
- Executes after JwtAuthGuard (user already authenticated)
- Extracts required permission from metadata (Reflector)
- Calls AuthorizationService.hasPermission(userID, domainID, permission)
- Returns true if permission granted → allow request
- Returns false (throws ForbiddenException) if permission denied → 403 response
- Skips check if @Public() decorator present

**AC-3.6.3:** Guard integration with controllers
- Applied via @UseGuards(JwtAuthGuard, PermissionsGuard)
- Works in combination with @Permission decorator
- Example: Admin user create endpoint has @Permission('USERS', ActionEnum.CREATE)

### Story 3.7: Permission Sync Script (Dev Environment)

**AC-3.7.1:** scripts/permission-sync.ts created
- Reads PERMISSIONS constant from code
- Iterates all modules and actions
- For each permission: Upsert to database (insert if new, skip if exists)
- Uses Prisma upsert with [module, action] unique constraint
- Idempotent (can be run multiple times safely)

**AC-3.7.2:** Environment check enforced
- NODE_ENV check: Only runs in 'development' or 'local'
- Throws error if run in 'production' or 'staging'
- Logs warning before sync

**AC-3.7.3:** Console output
- Logs: "Synced X permissions: Y new, Z existing"
- Logs each new permission added
- Completes with success message

**AC-3.7.4:** package.json script added
- Script: "permission:sync": "ts-node scripts/permission-sync.ts"
- Executable via: npm run permission:sync

### Story 3.8: Role & Permission Management Endpoints

**AC-3.8.1:** GET /permissions endpoint
- Admin user with PERMISSIONS.VIEW permission can access
- Returns all permissions (PermissionResDto[])
- No pagination (permissions are finite, < 100 items)
- Returns 403 if no permission

**AC-3.8.2:** GET /permissions/modules endpoint
- Admin user with PERMISSIONS.VIEW permission can access
- Returns unique module names (string[])
- Example: ['USERS', 'FILES', 'PERMISSIONS']
- Returns 403 if no permission

**AC-3.8.3:** GET /users/:id/permissions endpoint
- Admin user with PERMISSIONS.VIEW permission can access
- Returns user's effective permissions (role + direct, deduplicated)
- domainID check enforced
- Returns 404 if user not found
- Returns 403 if no permission or wrong domain

**AC-3.8.4:** POST /users/:id/permissions endpoint (assign)
- Admin user with PERMISSIONS.ASSIGN permission can access
- Request body: { permissionIDs: string[] }
- Validates: all permissionIDs exist in Permission table
- Validates: user exists and in same domain
- Bulk creates UserPermission records
- Skips duplicates (upsert logic)
- Wrapped in transaction (all-or-nothing)
- Returns 200 OK with success message
- Returns 400 if invalid permissionIDs, 404 if user not found, 403 if no permission

**AC-3.8.5:** DELETE /users/:id/permissions endpoint (revoke)
- Admin user with PERMISSIONS.REVOKE permission can access
- Request body: { permissionIDs: string[] }
- Bulk deletes UserPermission records
- domainID check enforced
- Wrapped in transaction
- Returns 200 OK with success message
- Returns 400 if invalid request, 404 if user not found, 403 if no permission

### Cross-Cutting Acceptance Criteria

**AC-3.X.1:** Multi-tenancy enforced
- ALL queries include domainID filter
- Prisma middleware enforces domainID as safety net
- Cross-domain access attempts logged and blocked

**AC-3.X.2:** Soft-delete pattern
- User delete sets deletedAt, doesn't hard delete
- Soft-deleted users excluded from all queries (where: { deletedAt: null })
- Restore possible by setting deletedAt to null

**AC-3.X.3:** Response format
- All responses wrapped in standard format via ResponseTransformInterceptor
- Success: { success: true, data: {...} }
- Error: { success: false, error: { code, message, details } }

**AC-3.X.4:** Error handling
- 400 Bad Request: Validation failures (detailed DTO errors)
- 401 Unauthorized: Missing/invalid JWT token
- 403 Forbidden: Insufficient permissions (with permission name)
- 404 Not Found: User/resource not found
- 409 Conflict: Duplicate phoneNumber
- 500 Internal Server Error: Unhandled exceptions (logged to Sentry)

**AC-3.X.5:** Input validation
- All DTOs validated with class-validator
- phoneNumber: @IsPhoneNumber('TR')
- UUID fields: @IsUUID('4')
- Enums: @IsEnum
- Validation errors return 400 with field-specific messages

## Traceability Mapping

This table maps acceptance criteria to technical components and test coverage, ensuring complete traceability from requirements to implementation.

| AC ID | PRD Requirement | Spec Component | Test Type | Priority |
|-------|----------------|----------------|-----------|----------|
| **AC-3.1.1** | FR-1.2: User Profile Management | ProfileController.getProfile()<br>UsersService.findOne() | Unit, E2E | P0 |
| **AC-3.1.2** | FR-1.2: User Profile Management | ProfileController.updateProfile()<br>UsersService.updateProfile() | Unit, Integration, E2E | P0 |
| **AC-3.2.1** | FR-1.3: User CRUD (Admin) | UsersController.findAll()<br>UsersService.findAll()<br>UsersRepository | Unit, Integration, E2E | P0 |
| **AC-3.2.2** | FR-1.3: User CRUD (Admin) | UsersController.findOne()<br>UsersService.findOne() | Unit, Integration | P0 |
| **AC-3.2.3** | FR-1.1: User Registration<br>FR-1.3: User CRUD (Admin) | UsersController.create()<br>UsersService.create()<br>bcrypt.hash() | Unit, Integration, E2E | P0 |
| **AC-3.2.4** | FR-1.3: User CRUD (Admin) | UsersController.update()<br>UsersService.update() | Unit, Integration | P0 |
| **AC-3.2.5** | FR-1.3: User CRUD (Admin) | UsersController.softDelete()<br>UsersService.softDelete() | Unit, Integration | P0 |
| **AC-3.3.1** | FR-3.1: Permission Model | Permission entity (Prisma schema)<br>Migration script | Integration | P0 |
| **AC-3.3.2** | FR-3.1: Permission Model | PERMISSIONS constant<br>permissions.constant.ts | Unit | P0 |
| **AC-3.3.3** | FR-3.1: Permission Model | ActionEnum<br>common/enums/action.enum.ts | Unit | P0 |
| **AC-3.4.1** | FR-3.2: Role-Based Access Control | Role entity (Prisma schema) | Integration | P0 |
| **AC-3.4.2** | FR-3.2: Role-Based Access Control | UserRole entity (Prisma schema) | Integration | P0 |
| **AC-3.4.3** | FR-3.2: Role-Based Access Control | RolePermission entity (Prisma schema) | Integration | P0 |
| **AC-3.4.4** | FR-3.3: Permission Assignment | UserPermission entity (Prisma schema) | Integration | P0 |
| **AC-3.5.1** | FR-3.4: Authorization Guards | AuthorizationService.hasPermission()<br>Prisma queries | Unit, Integration | P0 |
| **AC-3.5.2** | FR-3.4: Authorization Guards | AuthorizationService.getUserPermissions() | Unit, Integration | P1 |
| **AC-3.5.3** | FR-3.4: Authorization Guards | AuthorizationService unit tests | Unit | P0 |
| **AC-3.6.1** | FR-3.4: Authorization Guards | @Permission decorator<br>permissions.decorator.ts | Unit | P0 |
| **AC-3.6.2** | FR-3.4: Authorization Guards | PermissionsGuard<br>permissions.guard.ts | Unit, Integration | P0 |
| **AC-3.6.3** | FR-3.4: Authorization Guards | Guard + decorator integration | Integration, E2E | P0 |
| **AC-3.7.1** | FR-3.5: Dev Permission Sync | scripts/permission-sync.ts<br>Prisma upsert | Integration | P1 |
| **AC-3.7.2** | FR-3.5: Dev Permission Sync | NODE_ENV check logic | Unit | P1 |
| **AC-3.7.3** | FR-3.5: Dev Permission Sync | Console logging | Manual | P2 |
| **AC-3.7.4** | FR-3.5: Dev Permission Sync | package.json script | Manual | P2 |
| **AC-3.8.1** | FR-3.3: Permission Assignment | PermissionsController.getAllPermissions()<br>PermissionsService | Unit, Integration | P1 |
| **AC-3.8.2** | FR-3.3: Permission Assignment | PermissionsController.getModules() | Unit, Integration | P2 |
| **AC-3.8.3** | FR-3.3: Permission Assignment | PermissionsController.getUserPermissions() | Unit, Integration | P1 |
| **AC-3.8.4** | FR-3.3: Permission Assignment | PermissionsController.assignPermissions()<br>PermissionsService.assignPermissionsToUser() | Unit, Integration, E2E | P0 |
| **AC-3.8.5** | FR-3.3: Permission Assignment | PermissionsController.revokePermissions()<br>PermissionsService.revokePermissionsFromUser() | Unit, Integration, E2E | P0 |
| **AC-3.X.1** | NFR-2.2: Authorization Security | Prisma middleware<br>@DomainID decorator | Integration | P0 |
| **AC-3.X.2** | NFR-3.2: Database Scalability | Soft-delete queries<br>deletedAt filtering | Integration | P0 |
| **AC-3.X.3** | API Response Format (Architecture) | ResponseTransformInterceptor | Integration, E2E | P0 |
| **AC-3.X.4** | NFR Error Handling | All exception filters<br>HTTP status codes | Integration, E2E | P0 |
| **AC-3.X.5** | NFR-2.3: Data Security | class-validator decorators<br>ValidationPipe | Unit, Integration | P0 |

### Priority Legend
- **P0:** Critical path, must be implemented and tested for MVP
- **P1:** Important, should be implemented for production readiness
- **P2:** Nice to have, can be deferred to post-MVP

### Test Coverage Requirements

**Minimum Coverage Targets:**
- **Unit Tests:** 80% coverage for services, guards, decorators
- **Integration Tests:** All API endpoints tested (happy path + error cases)
- **E2E Tests:** Critical user journeys (admin user CRUD, permission assignment, profile update)

**Key Test Scenarios:**

1. **Permission Check Flow:** User with permission → access granted
2. **Permission Check Flow:** User without permission → 403 Forbidden
3. **Multi-tenancy:** User cannot access other domain's data → 403
4. **Soft Delete:** Deleted user not in list results → 404 on get
5. **Pagination:** User list respects page/limit parameters
6. **Bulk Permission Assignment:** Transaction rollback on validation failure

## Risks, Assumptions, Open Questions

### Risks

**Risk-1: Permission Check Performance Bottleneck**
- **Severity:** Medium
- **Description:** Every protected endpoint checks permissions via database query. High traffic could cause performance issues.
- **Impact:** Permission checks > 100ms → user-facing latency
- **Mitigation:**
  - MVP: Optimize queries (JOIN instead of N+1, proper indexes)
  - Phase 2: Implement Redis caching (5-minute TTL)
  - Monitor permission check frequency (alert if > 1000/min)
- **Contingency:** If performance issue occurs in production, add caching immediately (hotfix)

**Risk-2: Multi-tenancy Data Leak**
- **Severity:** High
- **Description:** Missing domainID filter in a query could expose data across domains
- **Impact:** Security breach, GDPR violation
- **Mitigation:**
  - Prisma middleware enforces domainID filter (safety net)
  - Code review checklist: Verify domainID in all queries
  - Integration tests for cross-domain access attempts
  - Audit log for authorization failures
- **Contingency:** Incident response plan for data exposure

**Risk-3: Permission Sync Script Run in Production**
- **Severity:** Low-Medium
- **Description:** Accidentally running permission sync in production could add unwanted permissions
- **Impact:** Security policy violation, audit issues
- **Mitigation:**
  - NODE_ENV check (fail-fast if production)
  - Package.json script warning comment
  - Documentation: Clear "development only" note
- **Contingency:** Database backup before sync, rollback procedure

**Risk-4: Circular Dependency (Auth ↔ Users)**
- **Severity:** Low
- **Description:** Epic 2 (Auth) needs UsersService, Epic 3 (Users) needs JwtAuthGuard - potential circular dependency
- **Impact:** Module import issues, compilation failure
- **Mitigation:**
  - Clear module boundaries: Auth provides guards, Users provides services
  - Use forwardRef() if circular import necessary
  - Test module imports in isolation
- **Contingency:** Refactor to shared module if circular dependency occurs

### Assumptions

**Assumption-1: Epic 1 and Epic 2 Complete**
- **Description:** Epic 3 assumes PrismaService, JWT authentication, and User entity exist
- **Validation:** Epic 1 and Epic 2 must be completed before Epic 3 starts
- **Impact if false:** Cannot implement Epic 3 without dependencies

**Assumption-2: domainID Available in JWT Token**
- **Description:** JWT token payload includes domainID for multi-tenancy filtering
- **Validation:** Epic 2 JWT implementation includes domainID in payload
- **Impact if false:** Cannot filter by domain, Epic 3 blocked

**Assumption-3: phoneNumber-based System (not email)**
- **Description:** PRD specifies phone-based authentication, Epic 3 uses phoneNumber as primary identifier
- **Validation:** Confirmed in PRD FR-2 (Phone-based JWT Authentication)
- **Impact if false:** Redesign user entities and DTOs

**Assumption-4: bcrypt for Password Hashing (admin only)**
- **Description:** Admin users have passwords, staff uses OTP-only
- **Validation:** Confirmed in PRD (Admin: phone+password, Staff: phone+OTP)
- **Impact if false:** Change hashing strategy

**Assumption-5: Soft-Delete Standard**
- **Description:** All entity deletes are soft-deletes (deletedAt field)
- **Validation:** Architecture document specifies soft-delete pattern
- **Impact if false:** Cannot restore deleted users, audit trail lost

### Open Questions

**Question-1: Role Management UI/API?**
- **Description:** Epic 3 has role entity but no role CRUD endpoints (GET /roles, POST /roles, etc.)
- **Decision needed:** Should Epic 3 include role management endpoints, or defer to future epic?
- **Options:**
  - A) Include basic role CRUD in Epic 3 (adds 1 story)
  - B) Defer to Epic 3.5 or future epic
- **Recommendation:** Defer (Option B) - Permission assignment is sufficient for MVP, role management can be added later

**Question-2: Permission Caching Strategy?**
- **Description:** MVP has no caching, Phase 2 plans Redis caching
- **Decision needed:** What caching invalidation strategy?
- **Options:**
  - A) TTL-only (5 min)
  - B) TTL + manual invalidation on permission change
- **Recommendation:** Option B - TTL for safety, invalidate on assignment/revocation

**Question-3: Audit Trail for Permission Changes?**
- **Description:** Who assigned/revoked permissions? No audit entity in Epic 3
- **Decision needed:** Should Epic 3 include audit logging?
- **Options:**
  - A) Include audit entity in Epic 3
  - B) Defer to future audit epic
- **Recommendation:** Defer (Option B) - timestamps on UserPermission sufficient for MVP

**Question-4: Bulk User Operations?**
- **Description:** Admin may need to bulk update users (e.g., deactivate multiple users)
- **Decision needed:** Include bulk operations in Epic 3?
- **Options:**
  - A) Add bulk update/delete endpoints
  - B) Single operations only (MVP)
- **Recommendation:** Defer (Option B) - UI can call single operations in loop

**Question-5: Password Strength Policy Configuration?**
- **Description:** Current validation: min 8 chars, 1 letter + 1 number (hardcoded)
- **Decision needed:** Should password policy be configurable?
- **Options:**
  - A) Hardcoded (MVP)
  - B) Environment variable config
- **Recommendation:** Option A (MVP) - Hardcoded sufficient, can add config later if needed

## Test Strategy Summary

### Testing Approach

Epic 3 follows a **3-layer testing pyramid**: Unit tests (base), Integration tests (middle), E2E tests (top). Target: 80% overall coverage, 100% for critical paths (authorization).

### Unit Tests

**Scope:** Service logic, guards, decorators, utilities

**Key Test Suites:**

1. **UsersService:**
   - `findAll()`: Pagination logic, filtering, sorting
   - `findOne()`: Single user lookup, domainID check
   - `create()`: User creation, password hashing, validation
   - `update()`: Partial update, uniqueness check
   - `softDelete()`: Soft-delete logic, cascade behavior
   - **Mocks:** PrismaService (mock queries)

2. **AuthorizationService:**
   - `hasPermission()`: Role-based permission check
   - `hasPermission()`: Direct permission check
   - `hasPermission()`: No permission → false
   - `hasPermission()`: Cross-domain permission → false
   - `getUserPermissions()`: Combined permissions (role + direct)
   - **Mocks:** PrismaService

3. **PermissionsGuard:**
   - `canActivate()`: Permission granted → true
   - `canActivate()`: Permission denied → ForbiddenException
   - `canActivate()`: No @Permission decorator → allow (public)
   - **Mocks:** Reflector, AuthorizationService, ExecutionContext

4. **PermissionsService:**
   - `assignPermissionsToUser()`: Bulk insert, validation
   - `revokePermissionsFromUser()`: Bulk delete, domainID check
   - **Mocks:** PrismaService

**Tools:**
- Jest test framework
- Mock factories for User, Permission entities
- @nestjs/testing utilities (Test.createTestingModule)

**Coverage Target:** 85%

### Integration Tests

**Scope:** API endpoints (controller + service + database), database queries

**Key Test Scenarios:**

1. **User Profile Endpoints:**
   - GET /users/me → Returns current user (with valid JWT)
   - PATCH /users/me → Updates profile (firstName, lastName)
   - PATCH /users/me → 409 Conflict (phoneNumber duplicate)

2. **Admin User CRUD:**
   - GET /users → Paginated list (with filters: role, status, search)
   - GET /users/:id → Single user (with domainID check)
   - POST /users → Create user (password hashing validated)
   - PATCH /users/:id → Update user
   - DELETE /users/:id → Soft delete (deletedAt set, not hard delete)
   - GET /users → Deleted user not in results

3. **Permission Management:**
   - GET /permissions → List all permissions
   - GET /permissions/modules → Unique module names
   - POST /users/:id/permissions → Assign permissions (bulk)
   - DELETE /users/:id/permissions → Revoke permissions (bulk)
   - GET /users/:id/permissions → Effective permissions (role + direct)

4. **Authorization:**
   - POST /users (with USERS.CREATE permission) → 201 Created
   - POST /users (without permission) → 403 Forbidden
   - GET /users/:id (different domainID) → 403 Forbidden

**Setup:**
- Test database (separate from dev)
- Database seeding before each test suite
- Transaction rollback after each test

**Tools:**
- Supertest for HTTP requests
- Test database (PostgreSQL or MongoDB)
- Prisma test instance

**Coverage Target:** All endpoints (happy path + error cases)

### E2E Tests

**Scope:** Complete user journeys, end-to-end flows

**Critical Journeys:**

1. **Admin User Management Flow:**
   - Login as admin → Create user → List users → Update user → Delete user
   - Verify: User in list after create, not in list after delete
   - Verify: Permission checks at each step

2. **Permission Assignment Flow:**
   - Login as admin → Assign permissions to user → Verify user has permissions
   - Login as user → Access protected endpoint → Success (permission granted)
   - Revoke permissions → Access protected endpoint → 403 Forbidden

3. **User Profile Update Flow:**
   - Login as user → Get profile → Update profile → Verify changes
   - Attempt to update phoneNumber → Requires OTP verification (Epic 2 integration)

4. **Multi-tenancy Isolation:**
   - Login as Domain A admin → Create user in Domain A
   - Login as Domain B admin → Attempt to access Domain A user → 403 Forbidden

**Setup:**
- Fresh database per test suite
- Seed data: multiple domains, users, permissions
- JWT token generation for test users

**Tools:**
- Jest + Supertest
- Full application bootstrap (AppModule)
- Test database cleanup

**Coverage Target:** 3-5 critical journeys (60% of user value)

### Test Data & Fixtures

**Mock Data:**
- Sample users: Admin, Staff, Manager
- Sample permissions: USERS.*, PERMISSIONS.*, FILES.*
- Sample roles: Admin role (all permissions), Viewer role (read-only)
- Sample domains: 2 domains for multi-tenancy tests

**Factories:**
- `createMockUser(overrides?)` - Generate test user
- `createMockPermission(overrides?)` - Generate permission
- `createJwtToken(user)` - Generate valid JWT for tests

### CI/CD Integration

**Pre-commit:**
- Run unit tests (fast feedback)

**Pull Request:**
- Run all tests (unit + integration + E2E)
- Enforce coverage threshold (80%)
- Fail PR if tests fail

**Test Execution Time Target:**
- Unit tests: < 30 seconds
- Integration tests: < 2 minutes
- E2E tests: < 3 minutes
- **Total:** < 5.5 minutes

### Test Maintenance

**Best Practices:**
- Test isolation: Each test independent, no shared state
- Descriptive test names: `should return 403 when user lacks USERS.VIEW permission`
- Arrange-Act-Assert pattern
- Mock external dependencies (only database real in integration tests)
- Clean up test data after each test

**Continuous Improvement:**
- Monitor flaky tests (retry mechanism)
- Update tests when AC changes
- Refactor tests when duplication detected
