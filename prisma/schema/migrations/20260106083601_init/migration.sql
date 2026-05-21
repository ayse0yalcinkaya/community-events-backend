-- CreateEnum
CREATE TYPE "AuthProvider" AS ENUM ('AD', 'LOGIN');

-- CreateEnum
CREATE TYPE "ChatParticipantType" AS ENUM ('USER', 'STAFF');

-- CreateEnum
CREATE TYPE "ChatMessageStatus" AS ENUM ('PENDING', 'READED', 'SENT_PUSH');

-- CreateEnum
CREATE TYPE "ChatGroupRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "LogLevel" AS ENUM ('DEBUG', 'INFO', 'WARN', 'ERROR');

-- CreateEnum
CREATE TYPE "NotificationSenderType" AS ENUM ('AUTOMATION', 'SYSTEM', 'USER');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('SENT', 'DELIVERED', 'READ');

-- CreateEnum
CREATE TYPE "UserType" AS ENUM ('ADMIN', 'USER');

-- CreateEnum
CREATE TYPE "LegalEntityType" AS ENUM ('INDIVIDUAL', 'CORPORATE');

-- CreateTable
CREATE TABLE "announcements" (
    "id" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "type" INTEGER NOT NULL DEFAULT 1,
    "content" TEXT,
    "imageFileID" UUID,
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "scope" INTEGER NOT NULL DEFAULT 0,
    "createdBy" UUID,
    "status" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "announcements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_providers" (
    "id" UUID NOT NULL,
    "userID" UUID NOT NULL,
    "provider" "AuthProvider" NOT NULL,
    "identifier" TEXT NOT NULL,
    "credentials" TEXT,
    "lastLogin" TIMESTAMP(3),
    "status" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL,
    "userID" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "otp_verifications" (
    "id" UUID NOT NULL,
    "userID" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "purpose" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "otp_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chats" (
    "id" UUID NOT NULL,
    "senderUserId" UUID NOT NULL,
    "receiverUserId" UUID NOT NULL,
    "senderType" "ChatParticipantType" NOT NULL DEFAULT 'USER',
    "receiverType" "ChatParticipantType" NOT NULL DEFAULT 'USER',
    "content" TEXT NOT NULL,
    "attachment" JSONB,
    "metadata" JSONB,
    "status" "ChatMessageStatus" NOT NULL DEFAULT 'PENDING',
    "isEdited" BOOLEAN NOT NULL DEFAULT false,
    "editedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_groups" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "ownerId" UUID NOT NULL,
    "createdBy" UUID NOT NULL,
    "photoFileId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chat_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_group_members" (
    "groupId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "role" "ChatGroupRole" NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),

    CONSTRAINT "chat_group_members_pkey" PRIMARY KEY ("groupId","userId")
);

-- CreateTable
CREATE TABLE "chat_group_messages" (
    "id" UUID NOT NULL,
    "groupId" UUID NOT NULL,
    "senderId" UUID NOT NULL,
    "senderType" "ChatParticipantType" NOT NULL DEFAULT 'USER',
    "content" TEXT NOT NULL,
    "attachment" JSONB,
    "metadata" JSONB,
    "status" "ChatMessageStatus" NOT NULL DEFAULT 'PENDING',
    "isEdited" BOOLEAN NOT NULL DEFAULT false,
    "editedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chat_group_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_deleted_conversations" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "userType" "ChatParticipantType" NOT NULL,
    "counterpartId" UUID NOT NULL,
    "counterpartType" "ChatParticipantType" NOT NULL,
    "deletedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_deleted_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_group_deleted_conversations" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "groupId" UUID NOT NULL,
    "deletedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_group_deleted_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "files" (
    "id" UUID NOT NULL,
    "userID" UUID NOT NULL,
    "filename" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "s3Key" TEXT NOT NULL,
    "s3Bucket" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "module" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "level" "LogLevel" NOT NULL DEFAULT 'INFO',
    "userId" UUID,
    "resourceId" TEXT,
    "context" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "userID" UUID NOT NULL,
    "senderType" "NotificationSenderType" NOT NULL DEFAULT 'SYSTEM',
    "senderID" UUID,
    "subject" TEXT NOT NULL DEFAULT 'Notification',
    "message" TEXT NOT NULL,
    "readed" BOOLEAN NOT NULL DEFAULT false,
    "status" "NotificationStatus" NOT NULL DEFAULT 'SENT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_logs" (
    "id" UUID NOT NULL,
    "userID" UUID NOT NULL,
    "type" INTEGER NOT NULL,
    "channel" INTEGER NOT NULL,
    "title" TEXT,
    "message" TEXT NOT NULL,
    "data" JSONB,
    "sent" BOOLEAN NOT NULL DEFAULT false,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_preferences" (
    "id" UUID NOT NULL,
    "userID" UUID NOT NULL,
    "channel" INTEGER NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "device_tokens" (
    "id" UUID NOT NULL,
    "userID" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "platform" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "device_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sms" (
    "id" UUID NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" INTEGER NOT NULL DEFAULT 0,
    "status" INTEGER NOT NULL DEFAULT 0,
    "provider" TEXT NOT NULL DEFAULT 'FONIVA',
    "providerId" TEXT,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "modules" (
    "id" UUID NOT NULL,
    "nameKey" TEXT NOT NULL,
    "descriptionKey" TEXT NOT NULL,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "defaultAdminActions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "defaultUserActions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "modules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" UUID NOT NULL,
    "moduleID" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "parentType" "UserType",
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "id" UUID NOT NULL,
    "roleID" UUID NOT NULL,
    "permissionID" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "phoneVerified" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "userType" "UserType" NOT NULL DEFAULT 'USER',
    "VKN" VARCHAR(11),
    "legalEntityType" "LegalEntityType" NOT NULL DEFAULT 'INDIVIDUAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "roleID" UUID,
    "profileImageID" UUID,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "announcements_scope_idx" ON "announcements"("scope");

-- CreateIndex
CREATE INDEX "announcements_status_idx" ON "announcements"("status");

-- CreateIndex
CREATE INDEX "announcements_start_date_idx" ON "announcements"("start_date");

-- CreateIndex
CREATE INDEX "announcements_deletedAt_idx" ON "announcements"("deletedAt");

-- CreateIndex
CREATE INDEX "user_providers_userID_idx" ON "user_providers"("userID");

-- CreateIndex
CREATE INDEX "user_providers_provider_idx" ON "user_providers"("provider");

-- CreateIndex
CREATE INDEX "user_providers_status_idx" ON "user_providers"("status");

-- CreateIndex
CREATE UNIQUE INDEX "user_providers_userID_provider_key" ON "user_providers"("userID", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "user_providers_provider_identifier_key" ON "user_providers"("provider", "identifier");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token");

-- CreateIndex
CREATE INDEX "refresh_tokens_userID_idx" ON "refresh_tokens"("userID");

-- CreateIndex
CREATE INDEX "refresh_tokens_token_idx" ON "refresh_tokens"("token");

-- CreateIndex
CREATE INDEX "refresh_tokens_expiresAt_idx" ON "refresh_tokens"("expiresAt");

-- CreateIndex
CREATE INDEX "otp_verifications_userID_idx" ON "otp_verifications"("userID");

-- CreateIndex
CREATE INDEX "otp_verifications_expiresAt_idx" ON "otp_verifications"("expiresAt");

-- CreateIndex
CREATE INDEX "chats_senderUserId_receiverUserId_createdAt_idx" ON "chats"("senderUserId", "receiverUserId", "createdAt");

-- CreateIndex
CREATE INDEX "chats_receiverUserId_status_idx" ON "chats"("receiverUserId", "status");

-- CreateIndex
CREATE INDEX "chat_groups_ownerId_idx" ON "chat_groups"("ownerId");

-- CreateIndex
CREATE INDEX "chat_group_members_userId_idx" ON "chat_group_members"("userId");

-- CreateIndex
CREATE INDEX "chat_group_messages_groupId_createdAt_idx" ON "chat_group_messages"("groupId", "createdAt");

-- CreateIndex
CREATE INDEX "chat_group_messages_senderId_idx" ON "chat_group_messages"("senderId");

-- CreateIndex
CREATE INDEX "chat_deleted_conversations_userId_idx" ON "chat_deleted_conversations"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "chat_deleted_conversations_userId_userType_counterpartId_co_key" ON "chat_deleted_conversations"("userId", "userType", "counterpartId", "counterpartType");

-- CreateIndex
CREATE INDEX "chat_group_deleted_conversations_userId_idx" ON "chat_group_deleted_conversations"("userId");

-- CreateIndex
CREATE INDEX "chat_group_deleted_conversations_groupId_idx" ON "chat_group_deleted_conversations"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "chat_group_deleted_conversations_userId_groupId_key" ON "chat_group_deleted_conversations"("userId", "groupId");

-- CreateIndex
CREATE INDEX "files_userID_idx" ON "files"("userID");

-- CreateIndex
CREATE INDEX "files_s3Key_idx" ON "files"("s3Key");

-- CreateIndex
CREATE INDEX "files_deletedAt_idx" ON "files"("deletedAt");

-- CreateIndex
CREATE INDEX "audit_logs_module_idx" ON "audit_logs"("module");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_level_idx" ON "audit_logs"("level");

-- CreateIndex
CREATE INDEX "audit_logs_resourceId_idx" ON "audit_logs"("resourceId");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "notifications_userID_idx" ON "notifications"("userID");

-- CreateIndex
CREATE INDEX "notifications_senderType_idx" ON "notifications"("senderType");

-- CreateIndex
CREATE INDEX "notifications_status_idx" ON "notifications"("status");

-- CreateIndex
CREATE INDEX "notifications_readed_idx" ON "notifications"("readed");

-- CreateIndex
CREATE INDEX "notification_logs_userID_idx" ON "notification_logs"("userID");

-- CreateIndex
CREATE INDEX "notification_logs_type_idx" ON "notification_logs"("type");

-- CreateIndex
CREATE INDEX "notification_logs_sent_idx" ON "notification_logs"("sent");

-- CreateIndex
CREATE INDEX "notification_preferences_userID_idx" ON "notification_preferences"("userID");

-- CreateIndex
CREATE UNIQUE INDEX "notification_preferences_userID_channel_key" ON "notification_preferences"("userID", "channel");

-- CreateIndex
CREATE UNIQUE INDEX "device_tokens_token_key" ON "device_tokens"("token");

-- CreateIndex
CREATE INDEX "device_tokens_userID_idx" ON "device_tokens"("userID");

-- CreateIndex
CREATE INDEX "device_tokens_token_idx" ON "device_tokens"("token");

-- CreateIndex
CREATE INDEX "sms_phoneNumber_idx" ON "sms"("phoneNumber");

-- CreateIndex
CREATE INDEX "sms_status_idx" ON "sms"("status");

-- CreateIndex
CREATE INDEX "sms_createdAt_idx" ON "sms"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "modules_nameKey_key" ON "modules"("nameKey");

-- CreateIndex
CREATE INDEX "permissions_moduleID_idx" ON "permissions"("moduleID");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_moduleID_action_key" ON "permissions"("moduleID", "action");

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE INDEX "roles_parentType_idx" ON "roles"("parentType");

-- CreateIndex
CREATE INDEX "role_permissions_roleID_idx" ON "role_permissions"("roleID");

-- CreateIndex
CREATE INDEX "role_permissions_permissionID_idx" ON "role_permissions"("permissionID");

-- CreateIndex
CREATE UNIQUE INDEX "role_permissions_roleID_permissionID_key" ON "role_permissions"("roleID", "permissionID");

-- CreateIndex
CREATE UNIQUE INDEX "users_phoneNumber_key" ON "users"("phoneNumber");

-- CreateIndex
CREATE UNIQUE INDEX "users_VKN_key" ON "users"("VKN");

-- CreateIndex
CREATE UNIQUE INDEX "users_profileImageID_key" ON "users"("profileImageID");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_deletedAt_idx" ON "users"("deletedAt");

-- CreateIndex
CREATE INDEX "users_userType_idx" ON "users"("userType");

-- CreateIndex
CREATE INDEX "users_VKN_idx" ON "users"("VKN");

-- AddForeignKey
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_imageFileID_fkey" FOREIGN KEY ("imageFileID") REFERENCES "files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_providers" ADD CONSTRAINT "user_providers_userID_fkey" FOREIGN KEY ("userID") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userID_fkey" FOREIGN KEY ("userID") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "otp_verifications" ADD CONSTRAINT "otp_verifications_userID_fkey" FOREIGN KEY ("userID") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chats" ADD CONSTRAINT "chats_senderUserId_fkey" FOREIGN KEY ("senderUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chats" ADD CONSTRAINT "chats_receiverUserId_fkey" FOREIGN KEY ("receiverUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_groups" ADD CONSTRAINT "chat_groups_photoFileId_fkey" FOREIGN KEY ("photoFileId") REFERENCES "files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_group_members" ADD CONSTRAINT "chat_group_members_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "chat_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_group_members" ADD CONSTRAINT "chat_group_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_group_messages" ADD CONSTRAINT "chat_group_messages_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "chat_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_group_messages" ADD CONSTRAINT "chat_group_messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_deleted_conversations" ADD CONSTRAINT "chat_deleted_conversations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_group_deleted_conversations" ADD CONSTRAINT "chat_group_deleted_conversations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_group_deleted_conversations" ADD CONSTRAINT "chat_group_deleted_conversations_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "chat_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "files" ADD CONSTRAINT "files_userID_fkey" FOREIGN KEY ("userID") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userID_fkey" FOREIGN KEY ("userID") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_senderID_fkey" FOREIGN KEY ("senderID") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_userID_fkey" FOREIGN KEY ("userID") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_userID_fkey" FOREIGN KEY ("userID") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_tokens" ADD CONSTRAINT "device_tokens_userID_fkey" FOREIGN KEY ("userID") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permissions" ADD CONSTRAINT "permissions_moduleID_fkey" FOREIGN KEY ("moduleID") REFERENCES "modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_roleID_fkey" FOREIGN KEY ("roleID") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permissionID_fkey" FOREIGN KEY ("permissionID") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_roleID_fkey" FOREIGN KEY ("roleID") REFERENCES "roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_profileImageID_fkey" FOREIGN KEY ("profileImageID") REFERENCES "files"("id") ON DELETE SET NULL ON UPDATE CASCADE;
