# Data Architecture

## Database Schemas

**Core Entities (PostgreSQL):**

```prisma
// User Management
model User {
  id            String    @id @default(uuid())
  domainID      String    @db.Uuid
  phoneNumber   String    @unique              // Primary identifier
  passwordHash  String?                        // Only for admin users
  firstName     String
  lastName      String
  email         String?                        // Optional, for notifications
  role          String    @default("staff")    // admin, staff, etc.
  isActive      Boolean   @default(true)
  phoneVerified Boolean   @default(false)      // Verified via OTP (SMS)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  deletedAt     DateTime?

  refreshTokens     RefreshToken[]
  otpVerifications  OTPVerification[]
  userPermissions   UserPermission[]
  userRoles         UserRole[]
  files             File[]

  @@index([domainID])
  @@index([phoneNumber])
  @@map("users")
}

// Authentication
model RefreshToken {
  id        String   @id @default(uuid())
  userID    String   @db.Uuid
  domainID  String   @db.Uuid
  token     String   @unique
  expiresAt DateTime
  createdAt DateTime @default(now())

  user User @relation(fields: [userID], references: [id], onDelete: Cascade)

  @@index([userID])
  @@index([token])
  @@map("refresh_tokens")
}

model OTPVerification {
  id        String   @id @default(uuid())
  userID    String   @db.Uuid
  domainID  String   @db.Uuid
  code      String
  type      String   // 'SMS' (phone verification only)
  expiresAt DateTime
  attempts  Int      @default(0)
  verified  Boolean  @default(false)
  createdAt DateTime @default(now())

  user User @relation(fields: [userID], references: [id], onDelete: Cascade)

  @@index([userID, code])
  @@map("otp_verifications")
}

// Permissions (RBAC)
model Permission {
  id          String   @id @default(uuid())
  module      String
  action      String
  description String?
  createdAt   DateTime @default(now())

  userPermissions UserPermission[]
  rolePermissions RolePermission[]

  @@unique([module, action])
  @@map("permissions")
}

model Role {
  id        String   @id @default(uuid())
  domainID  String   @db.Uuid
  name      String
  createdAt DateTime @default(now())

  userRoles       UserRole[]
  rolePermissions RolePermission[]

  @@unique([domainID, name])
  @@map("roles")
}

model UserPermission {
  id           String @id @default(uuid())
  userID       String @db.Uuid
  permissionID String @db.Uuid
  domainID     String @db.Uuid

  user       User       @relation(fields: [userID], references: [id], onDelete: Cascade)
  permission Permission @relation(fields: [permissionID], references: [id], onDelete: Cascade)

  @@unique([userID, permissionID, domainID])
  @@index([userID])
  @@map("user_permissions")
}

model UserRole {
  id       String @id @default(uuid())
  userID   String @db.Uuid
  roleID   String @db.Uuid
  domainID String @db.Uuid

  user User @relation(fields: [userID], references: [id], onDelete: Cascade)
  role Role @relation(fields: [roleID], references: [id], onDelete: Cascade)

  @@unique([userID, roleID, domainID])
  @@index([userID])
  @@map("user_roles")
}

model RolePermission {
  id           String @id @default(uuid())
  roleID       String @db.Uuid
  permissionID String @db.Uuid

  role       Role       @relation(fields: [roleID], references: [id], onDelete: Cascade)
  permission Permission @relation(fields: [permissionID], references: [id], onDelete: Cascade)

  @@unique([roleID, permissionID])
  @@map("role_permissions")
}

// File Management
model File {
  id           String    @id @default(uuid())
  domainID     String    @db.Uuid
  userID       String    @db.Uuid
  filename     String
  originalName String
  mimeType     String
  size         Int
  s3Key        String
  s3Bucket     String
  createdAt    DateTime  @default(now())
  deletedAt    DateTime?

  user User @relation(fields: [userID], references: [id])

  @@index([domainID, userID])
  @@index([s3Key])
  @@map("files")
}

// SMS Communication (hrsync-backend FONIVA pattern)
model SMS {
  id            String    @id @default(uuid())
  domainID      String    @db.Uuid
  phoneNumber   String
  message       String
  type          String    // 'OTP' | 'NOTIFICATION' | 'MARKETING' | 'ALERT'
  status        String    @default("PENDING") // 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED'
  provider      String    @default("FONIVA")
  providerId    String?   // Provider's message ID
  attemptCount  Int       @default(0)
  errorMessage  String?
  sentAt        DateTime?
  deliveredAt   DateTime?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  @@index([domainID])
  @@index([phoneNumber])
  @@index([status])
  @@index([createdAt])
  @@map("sms")
}

// Notifications
model Notification {
  id        String   @id @default(uuid())
  domainID  String   @db.Uuid
  userID    String   @db.Uuid
  type      String
  channel   String   // 'EMAIL' | 'SMS' | 'PUSH'
  title     String?
  message   String
  data      Json?
  sent      Boolean  @default(false)
  sentAt    DateTime?
  createdAt DateTime @default(now())

  @@index([domainID, userID])
  @@map("notifications")
}

model NotificationPreference {
  id        String  @id @default(uuid())
  domainID  String  @db.Uuid
  userID    String  @db.Uuid
  channel   String  // 'EMAIL' | 'SMS' | 'PUSH'
  enabled   Boolean @default(true)

  @@unique([domainID, userID, channel])
  @@map("notification_preferences")
}
```

**Indexes Strategy:**
- Primary Keys: UUID (distributed systems friendly)
- Foreign Keys: Indexed for join performance
- Multi-tenancy: `domainID` indexed on all tables
- Query Filters: Indexed (email, status, createdAt)
- Soft Deletes: `deletedAt` filtered in queries

**MongoDB Schema Differences:**
- No explicit relations (embedded documents or references)
- No migrations (schemaless evolution)
- Same entity structure, different Prisma generators

---
