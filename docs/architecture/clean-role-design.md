# Clean Relational Role Design

## Overview

This document describes the clean relational design for role-based access control (RBAC) in the application. This design eliminates the legacy `role` string field from the User model and uses a fully relational approach through junction tables.

## Database Schema

### User Model
```prisma
model User {
  id           String     @id @default(uuid()) @db.Uuid
  phoneNumber  String     @unique
  firstName    String
  lastName     String
  email        String?
  passwordHash String?
  phoneVerified Boolean   @default(false)
  isActive     Boolean    @default(true)
  domainID     String     @db.Uuid
  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt

  // NO role string field - ONLY relational
  userRoles      UserRole[]
  userPermissions UserPermission[]

  @@index([domainID])
  @@index([phoneNumber])
}
```

### Role Model
```prisma
model Role {
  id          String    @id @default(uuid()) @db.Uuid
  name        String    // e.g., 'admin', 'staff', 'manager'
  domainID    String    @db.Uuid
  description String?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  // Domain-scoped role names (not globally unique)
  @@unique([domainID, name])
  @@index([domainID])
}
```

### UserRole Junction Table
```prisma
model UserRole {
  id       String @id @default(uuid()) @db.Uuid
  userID   String @db.Uuid
  roleID   String @db.Uuid
  domainID String @db.Uuid
  createdAt DateTime @default(now())

  user User @relation(fields: [userID], references: [id], onDelete: Cascade)
  role Role @relation(fields: [roleID], references: [id], onDelete: Cascade)

  @@id([userID, roleID, domainID])
  @@index([domainID])
  @@index([userID])
  @@index([roleID])
}
```

## Permission System Architecture

```
User (NO role field!)
  ↓
UserRole ←→ Role ←→ RolePermission ←→ Permission
  ↓
UserPermission ←→ Permission (direct override)
```

### Permission Calculation Algorithm

The effective permissions for a user are calculated as:

```typescript
Effective Permissions =
  (User.userRoles → Role.rolePermissions → Permission)
  + (User.userPermissions → Permission)
```

This means a user can have permissions through:
1. **Role-based permissions**: Inherited through roles assigned via UserRole
2. **Direct permissions**: Assigned directly to the user via UserPermission

## Domain Isolation

All role operations are **domain-scoped**:

```typescript
// Roles are unique within a domain, not globally
const role = await prisma.role.findFirst({
  where: {
    name: 'admin',
    domainID: user.domainID  // Domain context required
  }
});

// Users can only have roles from their own domain
const user = await prisma.user.findUnique({
  where: { id: userID },
  include: {
    userRoles: {
      where: { domainID: user.domainID }, // Enforce domain isolation
      include: {
        role: true
      }
    }
  }
});
```

## Role Management Best Practices

### 1. Default Role Assignment

All new users automatically receive the 'staff' role:

```typescript
const user = await prisma.$transaction(async (tx) => {
  // Create user (NO role field!)
  const newUser = await tx.user.create({ /* ... */ });

  // Get default role for domain
  const defaultRole = await tx.role.findFirst({
    where: { name: 'staff', domainID: user.domainID }
  });

  // Assign via UserRole junction
  await tx.userRole.create({
    data: {
      userID: newUser.id,
      roleID: defaultRole.id,
      domainID: newUser.domainID
    }
  });

  return newUser;
});
```

### 2. Checking User Roles

```typescript
// Check if user has admin role
const hasAdminRole = user.userRoles.some(
  (ur) => ur.role.name === 'admin'
);

// Get all user permissions (roles + direct)
const permissions = await authorizationService.getUserPermissions(
  user.id,
  user.domainID
);
```

### 3. Assigning Roles to Users

```typescript
await prisma.userRole.create({
  data: {
    userID: userId,
    roleID: roleId,
    domainID: domainId
  }
});
```

### 4. Removing Roles from Users

```typescript
await prisma.userRole.delete({
  where: {
    userID_roleID_domainID: {
      userID: userId,
      roleID: roleId,
      domainID: domainId
    }
  }
});
```

## API Design

### User Registration
```http
POST /auth/register
Content-Type: application/json

{
  "phoneNumber": "+905551234567",
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com"
  // NO role field - automatically assigned 'staff' role
}
```

### Response (NO role field)
```json
{
  "id": "uuid",
  "phoneNumber": "+905551234567",
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "phoneVerified": false,
  "isActive": true,
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z",
  // NO 'role' field - roles accessed via userRoles relation
}
```

### Get User with Roles
```http
GET /users/:id
Authorization: Bearer {token}
```

Response includes `userRoles` relation with nested `role` data.

## Migration from Legacy Design

### What Changed

**Before (Legacy):**
```prisma
model User {
  role String @default("staff")  ❌ DUPLICATED DATA
}
```

**After (Clean):**
```prisma
model User {
  // NO role field
  userRoles UserRole[]  ✅ CLEAN RELATIONAL
}
```

### Migration Steps

1. **Backfill UserRole records** from existing User.role values
2. **Drop role column** from User table
3. **Update all code** to use UserRole junction
4. **Update DTOs** to remove role field
5. **Update tests** to use new approach

See [Migration Guide](../migrations/clean-relational-migration-guide.md) for detailed steps.

## Authorization Flow

1. User authenticates via JwtAuthGuard
2. User data loaded with domainID
3. PermissionGuard checks required permission
4. AuthorizationService calculates effective permissions
5. Access granted/denied based on permission check

```typescript
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Permission('USERS', ActionEnum.CREATE)
async createUser() {
  // Domain automatically verified by guard
  // Permissions automatically checked
}
```

## Benefits of Clean Design

1. **No Data Duplication**: Role stored once in Role table
2. **Flexible**: Users can have multiple roles
3. **Scalable**: Easy to add new roles without schema changes
4. **Domain-Scoped**: Natural multi-tenant support
5. **Permission Composition**: Roles + direct permissions
6. **Maintainable**: Single source of truth for role definitions

## Common Patterns

### Pattern 1: Check Admin Role
```typescript
const isAdmin = user.userRoles.some(
  (ur) => ur.role.name === 'admin'
);
if (!isAdmin) {
  throw new ForbiddenException('Admin access required');
}
```

### Pattern 2: Get All User Permissions
```typescript
const permissions = await authorizationService.getUserPermissions(
  user.id,
  user.domainID
);
```

### Pattern 3: Assign Multiple Roles
```typescript
await prisma.$transaction([
  prisma.userRole.create({
    data: { userID, roleID: adminRoleId, domainID }
  }),
  prisma.userRole.create({
    data: { userID, roleID: managerRoleId, domainID }
  })
]);
```

## Troubleshooting

See [Troubleshooting Guide](../troubleshooting/clean-design-troubleshooting.md) for common issues and solutions.

## References

- [Architecture Decision Record](adr-001-clean-relational-design.md)
- [Migration Guide](../migrations/clean-relational-migration-guide.md)
- [Permission System Diagram](permission-system-diagram.md)
- [Epic 16: Clean Relational Role Design](../epics/epic-16-clean-relational-role-design.md)
