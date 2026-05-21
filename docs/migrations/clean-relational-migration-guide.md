# Clean Relational Design Migration Guide

## Overview

This guide provides step-by-step instructions for migrating from the legacy role-based design (using a `role` string field in the User model) to the clean relational design (using UserRole junction table).

## Pre-Migration Checklist

- [ ] Backup production database
- [ ] Create migration script
- [ ] Test migration on staging environment
- [ ] Schedule maintenance window
- [ ] Notify team of migration
- [ ] Prepare rollback plan

## Migration Steps

### Step 1: Prepare UserRole Backfill

Create a script to migrate existing user roles to UserRole junction table:

```typescript
// migrate-roles.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateUserRoles() {
  console.log('Starting role migration...');

  // Step 1: Get all users with role field
  const users = await prisma.user.findMany({
    where: { NOT: { role: null } },
    select: { id: true, domainID: true, role: true }
  });

  console.log(`Found ${users.length} users with roles`);

  // Step 2: Create UserRole records for each user
  for (const user of users) {
    // Find the role in the domain
    const role = await prisma.role.findFirst({
      where: {
        name: user.role,
        domainID: user.domainID
      }
    });

    if (role) {
      // Check if UserRole already exists
      const existing = await prisma.userRole.findFirst({
        where: {
          userID: user.id,
          roleID: role.id,
          domainID: user.domainID
        }
      });

      if (!existing) {
        await prisma.userRole.create({
          data: {
            userID: user.id,
            roleID: role.id,
            domainID: user.domainID
          }
        });
        console.log(`✓ Migrated user ${user.id} to role ${user.role}`);
      } else {
        console.log(`⚠ UserRole already exists for user ${user.id}`);
      }
    } else {
      console.log(`⚠ Role ${user.role} not found in domain ${user.domainID} for user ${user.id}`);
    }
  }

  console.log('Role migration completed!');
}

// Run migration
migrateUserRoles()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

### Step 2: Run Migration Script

```bash
# Compile and run migration
npx ts-node migrate-roles.ts
```

Expected output:
```
Starting role migration...
Found 150 users with roles
✓ Migrated user 11111111-1111-1111-1111-111111111111 to role admin
✓ Migrated user 22222222-2222-2222-2222-222222222222 to role staff
...
Role migration completed!
```

### Step 3: Validate Migration

Create validation script:

```typescript
// validate-migration.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function validateMigration() {
  console.log('Validating migration...');

  // Check 1: All users should have at least one role
  const usersWithoutRoles = await prisma.user.findMany({
    where: {
      userRoles: {
        none: {}
      }
    }
  });

  if (usersWithoutRoles.length > 0) {
    console.error(`❌ FAIL: ${usersWithoutRoles.length} users without roles`);
    console.table(usersWithoutRoles.map(u => ({ id: u.id, phone: u.phoneNumber })));
    return false;
  } else {
    console.log('✓ All users have at least one role');
  }

  // Check 2: No duplicate UserRole records
  const duplicateUserRoles = await prisma.userRole.groupBy({
    by: ['userID', 'roleID', 'domainID'],
    having: {
      id: {
        _count: {
          gt: 1
        }
      }
    }
  });

  if (duplicateUserRoles.length > 0) {
    console.error(`❌ FAIL: ${duplicateUserRoles.length} duplicate UserRole records found`);
    return false;
  } else {
    console.log('✓ No duplicate UserRole records');
  }

  // Check 3: All UserRoles reference valid users and roles
  const invalidUserRoles = await prisma.userRole.findMany({
    where: {
      OR: [
        { user: null },
        { role: null }
      ]
    }
  });

  if (invalidUserRoles.length > 0) {
    console.error(`❌ FAIL: ${invalidUserRoles.length} invalid UserRole records`);
    return false;
  } else {
    console.log('✓ All UserRole records are valid');
  }

  console.log('✅ Migration validation passed!');
  return true;
}

validateMigration()
  .then(success => {
    if (!success) process.exit(1);
  })
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

Run validation:
```bash
npx ts-node validate-migration.ts
```

Expected output:
```
Validating migration...
✓ All users have at least one role
✓ No duplicate UserRole records
✓ All UserRole records are valid
✅ Migration validation passed!
```

### Step 4: Drop Role Column

Once validation passes, drop the role column:

```sql
-- Drop role column from users table
ALTER TABLE users DROP COLUMN IF EXISTS role;
```

Or using Prisma migration:
```bash
# Create new migration
npx prisma migrate dev --name remove-role-field

# Edit the generated migration to add:
# ALTER TABLE "users" DROP COLUMN "role";
```

### Step 5: Update Application Code

Update all code references to the removed `role` field:

#### AuthService
```typescript
// BEFORE
const user = await prisma.user.create({
  data: {
    // ...
    role: registerDto.role  ❌ Remove this
  }
});

// AFTER
const user = await prisma.$transaction(async (tx) => {
  const newUser = await tx.user.create({
    data: {
      // No role field
      phoneNumber: registerDto.phoneNumber,
      firstName: registerDto.firstName,
      lastName: registerDto.lastName,
      // ...
    }
  });

  // Assign default role via UserRole
  const defaultRole = await tx.role.findFirst({
    where: { name: 'staff', domainID: newUser.domainID }
  });

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

#### DTOs
```typescript
// BEFORE
class CreateUserDto {
  @IsEnum(['admin', 'staff', 'manager'])
  role!: string;  ❌ Remove this
}

// AFTER
class CreateUserDto {
  // Role automatically assigned
  // No role field in DTO
}
```

### Step 6: Update Tests

Update all tests that reference the old `role` field:

```typescript
// BEFORE
const mockUser = {
  role: 'admin'  ❌ Remove this
};

// AFTER
const mockUser = {
  userRoles: [
    {
      role: {
        name: 'admin'
      }
    }
  ]
};
```

### Step 7: Run Test Suite

```bash
npm test
```

Ensure all tests pass:
```
Test Suites: 58 passed
Tests: 827 passed
```

## Rollback Plan

If issues occur after migration:

### Rollback Step 1: Re-add Role Column

```sql
ALTER TABLE users ADD COLUMN role VARCHAR(50) DEFAULT 'staff';
```

### Rollback Step 2: Populate from UserRole

```typescript
// rollback-to-legacy.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function rollbackToLegacy() {
  // Get all UserRoles
  const userRoles = await prisma.userRole.findMany({
    include: {
      user: true,
      role: true
    }
  });

  // For each user, set role to their first role's name
  for (const ur of userRoles) {
    await prisma.user.update({
      where: { id: ur.userID },
      data: { role: ur.role.name }
    });
  }

  console.log('Rolled back to legacy design');
}

rollbackToLegacy()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

### Rollback Step 3: Delete UserRole Records

```sql
-- Optional: Keep UserRole for future migration
-- OR delete if rolling back completely:
-- DROP TABLE "UserRole";
```

## Post-Migration Checklist

- [ ] All tests pass
- [ ] Application starts successfully
- [ ] User registration works
- [ ] User login works
- [ ] Permission checks work
- [ ] Admin functions work
- [ ] No errors in logs
- [ ] Monitor performance metrics
- [ ] Update API documentation

## Common Issues

### Issue 1: Users Without Roles

**Symptom:** Some users have no roles after migration.

**Solution:**
```typescript
// Find users without roles
const usersWithoutRoles = await prisma.user.findMany({
  where: {
    userRoles: {
      none: {}
    }
  }
});

// Assign default 'staff' role
for (const user of usersWithoutRoles) {
  const defaultRole = await prisma.role.findFirst({
    where: { name: 'staff', domainID: user.domainID }
  });

  if (defaultRole) {
    await prisma.userRole.create({
      data: {
        userID: user.id,
        roleID: defaultRole.id,
        domainID: user.domainID
      }
    });
  }
}
```

### Issue 2: Role Not Found in Domain

**Symptom:** Error during migration: "Role not found in domain"

**Solution:**
Create missing roles before migration:
```typescript
// Seed roles for each domain
const domains = await prisma.domain.findMany();

for (const domain of domains) {
  await prisma.role.createMany({
    data: [
      { name: 'admin', domainID: domain.id },
      { name: 'staff', domainID: domain.id },
      { name: 'manager', domainID: domain.id }
    ],
    skipDuplicates: true
  });
}
```

### Issue 3: Login Failures After Migration

**Symptom:** Users can't log in after migration.

**Solution:** Check that role checks use UserRole:

```typescript
// BEFORE (legacy)
if (user.role !== 'admin') {
  throw new ForbiddenException();
}

// AFTER (clean)
const hasAdminRole = user.userRoles.some(
  (ur) => ur.role.name === 'admin'
);
if (!hasAdminRole) {
  throw new ForbiddenException();
}
```

## Validation Queries

Useful SQL queries for validation:

```sql
-- Check users without roles
SELECT u.id, u.phoneNumber
FROM users u
LEFT JOIN userrole ur ON u.id = ur."userID"
WHERE ur."userID" IS NULL;

-- Check duplicate roles (should return 0 rows)
SELECT "userID", "roleID", "domainID", COUNT(*)
FROM userrole
GROUP BY "userID", "roleID", "domainID"
HAVING COUNT(*) > 1;

-- Verify role distribution
SELECT r.name, COUNT(ur."userID") as user_count
FROM role r
LEFT JOIN userrole ur ON r.id = ur."roleID"
GROUP BY r.name, r."domainID"
ORDER BY r.name, r."domainID";
```

## Monitoring

After migration, monitor these metrics:

- **Login success rate** - Should not decrease
- **Permission check latency** - Should remain fast
- **Database query count** - Should not increase significantly
- **Error rate** - Should not increase
- **Active sessions** - Should not be affected

## Support

If you encounter issues during migration:

1. Check this troubleshooting guide
2. Review application logs
3. Run validation scripts
4. Consider rollback if critical issue
5. Contact the development team

## References

- [Clean Role Design Architecture](../architecture/clean-role-design.md)
- [Architecture Decision Record](../architecture/adr-001-clean-relational-design.md)
- [Permission System Diagram](../architecture/permission-system-diagram.md)
