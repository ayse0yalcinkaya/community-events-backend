-- CreateEnum
CREATE TYPE "CategoryStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "CommunityStatus" AS ENUM ('DRAFT', 'ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "CommunityMemberRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "CommunityMemberStatus" AS ENUM ('PENDING', 'ACTIVE', 'REJECTED', 'LEFT');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "EventFormat" AS ENUM ('PHYSICAL', 'ONLINE', 'HYBRID');

-- CreateEnum
CREATE TYPE "EventVisibility" AS ENUM ('PUBLIC', 'UNLISTED', 'PRIVATE');

-- CreateEnum
CREATE TYPE "EventApprovalMode" AS ENUM ('OPEN', 'APPROVAL_REQUIRED', 'INVITE_ONLY');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'WAITLIST', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AttendanceVisibility" AS ENUM ('PUBLIC', 'ATTENDEES_ONLY', 'PRIVATE');

-- CreateEnum
CREATE TYPE "ConnectionStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'BLOCKED');

-- CreateTable
CREATE TABLE "categories" (
    "id" UUID NOT NULL,
    "parentID" UUID,
    "name" VARCHAR(120) NOT NULL,
    "slug" VARCHAR(140) NOT NULL,
    "description" TEXT,
    "icon" VARCHAR(100),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "status" "CategoryStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interests" (
    "id" UUID NOT NULL,
    "categoryID" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "slug" VARCHAR(140) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "interests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_interests" (
    "userID" UUID NOT NULL,
    "interestID" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_interests_pkey" PRIMARY KEY ("userID","interestID")
);

-- CreateTable
CREATE TABLE "communities" (
    "id" UUID NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "slug" VARCHAR(180) NOT NULL,
    "shortDescription" VARCHAR(280),
    "description" TEXT,
    "city" VARCHAR(120),
    "website" VARCHAR(255),
    "instagramUrl" VARCHAR(255),
    "linkedinUrl" VARCHAR(255),
    "logoFileID" UUID,
    "coverImageFileID" UUID,
    "createdByUserID" UUID NOT NULL,
    "status" "CommunityStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "communities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_members" (
    "communityID" UUID NOT NULL,
    "userID" UUID NOT NULL,
    "role" "CommunityMemberRole" NOT NULL DEFAULT 'MEMBER',
    "status" "CommunityMemberStatus" NOT NULL DEFAULT 'PENDING',
    "joinedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "community_members_pkey" PRIMARY KEY ("communityID","userID")
);

-- CreateTable
CREATE TABLE "events" (
    "id" UUID NOT NULL,
    "title" VARCHAR(180) NOT NULL,
    "slug" VARCHAR(200) NOT NULL,
    "shortDescription" VARCHAR(320),
    "description" TEXT,
    "organizerUserID" UUID,
    "organizerCommunityID" UUID,
    "primaryCategoryID" UUID NOT NULL,
    "format" "EventFormat" NOT NULL DEFAULT 'PHYSICAL',
    "visibility" "EventVisibility" NOT NULL DEFAULT 'PUBLIC',
    "approvalMode" "EventApprovalMode" NOT NULL DEFAULT 'OPEN',
    "language" VARCHAR(10),
    "capacity" INTEGER,
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "externalRegistrationUrl" VARCHAR(255),
    "coverImageFileID" UUID,
    "publishedAt" TIMESTAMP(3),
    "status" "EventStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_sessions" (
    "id" UUID NOT NULL,
    "eventID" UUID NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_locations" (
    "id" UUID NOT NULL,
    "eventID" UUID NOT NULL,
    "venueName" VARCHAR(180),
    "address" VARCHAR(255),
    "city" VARCHAR(120),
    "district" VARCHAR(120),
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "meetingUrl" VARCHAR(255),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_tags" (
    "id" UUID NOT NULL,
    "eventID" UUID NOT NULL,
    "name" VARCHAR(60) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_interests" (
    "eventID" UUID NOT NULL,
    "interestID" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_interests_pkey" PRIMARY KEY ("eventID","interestID")
);

-- CreateTable
CREATE TABLE "event_attendances" (
    "id" UUID NOT NULL,
    "eventID" UUID NOT NULL,
    "userID" UUID NOT NULL,
    "status" "AttendanceStatus" NOT NULL DEFAULT 'PENDING',
    "visibility" "AttendanceVisibility" NOT NULL DEFAULT 'PUBLIC',
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_attendances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_bookmarks" (
    "eventID" UUID NOT NULL,
    "userID" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_bookmarks_pkey" PRIMARY KEY ("eventID","userID")
);

-- CreateTable
CREATE TABLE "user_connections" (
    "id" UUID NOT NULL,
    "requesterUserID" UUID NOT NULL,
    "addresseeUserID" UUID NOT NULL,
    "status" "ConnectionStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_connections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");
CREATE INDEX "categories_parentID_idx" ON "categories"("parentID");
CREATE INDEX "categories_status_sortOrder_idx" ON "categories"("status", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "interests_slug_key" ON "interests"("slug");
CREATE INDEX "interests_categoryID_idx" ON "interests"("categoryID");
CREATE UNIQUE INDEX "interests_categoryID_name_key" ON "interests"("categoryID", "name");
CREATE INDEX "user_interests_interestID_idx" ON "user_interests"("interestID");

-- CreateIndex
CREATE UNIQUE INDEX "communities_slug_key" ON "communities"("slug");
CREATE INDEX "communities_createdByUserID_idx" ON "communities"("createdByUserID");
CREATE INDEX "communities_status_idx" ON "communities"("status");
CREATE INDEX "communities_deletedAt_idx" ON "communities"("deletedAt");
CREATE INDEX "community_members_userID_idx" ON "community_members"("userID");
CREATE INDEX "community_members_status_idx" ON "community_members"("status");

-- CreateIndex
CREATE UNIQUE INDEX "events_slug_key" ON "events"("slug");
CREATE INDEX "events_organizerUserID_idx" ON "events"("organizerUserID");
CREATE INDEX "events_organizerCommunityID_idx" ON "events"("organizerCommunityID");
CREATE INDEX "events_primaryCategoryID_idx" ON "events"("primaryCategoryID");
CREATE INDEX "events_status_visibility_publishedAt_idx" ON "events"("status", "visibility", "publishedAt");
CREATE INDEX "events_deletedAt_idx" ON "events"("deletedAt");
CREATE INDEX "event_sessions_eventID_idx" ON "event_sessions"("eventID");
CREATE INDEX "event_sessions_startAt_idx" ON "event_sessions"("startAt");
CREATE UNIQUE INDEX "event_locations_eventID_key" ON "event_locations"("eventID");
CREATE INDEX "event_locations_city_idx" ON "event_locations"("city");
CREATE INDEX "event_tags_name_idx" ON "event_tags"("name");
CREATE UNIQUE INDEX "event_tags_eventID_name_key" ON "event_tags"("eventID", "name");
CREATE INDEX "event_interests_interestID_idx" ON "event_interests"("interestID");
CREATE INDEX "event_attendances_userID_status_idx" ON "event_attendances"("userID", "status");
CREATE INDEX "event_attendances_eventID_status_idx" ON "event_attendances"("eventID", "status");
CREATE UNIQUE INDEX "event_attendances_eventID_userID_key" ON "event_attendances"("eventID", "userID");
CREATE INDEX "event_bookmarks_userID_idx" ON "event_bookmarks"("userID");
CREATE INDEX "user_connections_addresseeUserID_status_idx" ON "user_connections"("addresseeUserID", "status");
CREATE INDEX "user_connections_requesterUserID_status_idx" ON "user_connections"("requesterUserID", "status");
CREATE UNIQUE INDEX "user_connections_requesterUserID_addresseeUserID_key" ON "user_connections"("requesterUserID", "addresseeUserID");

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_parentID_fkey" FOREIGN KEY ("parentID") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "interests" ADD CONSTRAINT "interests_categoryID_fkey" FOREIGN KEY ("categoryID") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_interests" ADD CONSTRAINT "user_interests_userID_fkey" FOREIGN KEY ("userID") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_interests" ADD CONSTRAINT "user_interests_interestID_fkey" FOREIGN KEY ("interestID") REFERENCES "interests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "communities" ADD CONSTRAINT "communities_createdByUserID_fkey" FOREIGN KEY ("createdByUserID") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "communities" ADD CONSTRAINT "communities_logoFileID_fkey" FOREIGN KEY ("logoFileID") REFERENCES "files"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "communities" ADD CONSTRAINT "communities_coverImageFileID_fkey" FOREIGN KEY ("coverImageFileID") REFERENCES "files"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "community_members" ADD CONSTRAINT "community_members_communityID_fkey" FOREIGN KEY ("communityID") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "community_members" ADD CONSTRAINT "community_members_userID_fkey" FOREIGN KEY ("userID") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "events" ADD CONSTRAINT "events_organizerUserID_fkey" FOREIGN KEY ("organizerUserID") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "events" ADD CONSTRAINT "events_organizerCommunityID_fkey" FOREIGN KEY ("organizerCommunityID") REFERENCES "communities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "events" ADD CONSTRAINT "events_primaryCategoryID_fkey" FOREIGN KEY ("primaryCategoryID") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "events" ADD CONSTRAINT "events_coverImageFileID_fkey" FOREIGN KEY ("coverImageFileID") REFERENCES "files"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "event_sessions" ADD CONSTRAINT "event_sessions_eventID_fkey" FOREIGN KEY ("eventID") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "event_locations" ADD CONSTRAINT "event_locations_eventID_fkey" FOREIGN KEY ("eventID") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "event_tags" ADD CONSTRAINT "event_tags_eventID_fkey" FOREIGN KEY ("eventID") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "event_interests" ADD CONSTRAINT "event_interests_eventID_fkey" FOREIGN KEY ("eventID") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "event_interests" ADD CONSTRAINT "event_interests_interestID_fkey" FOREIGN KEY ("interestID") REFERENCES "interests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "event_attendances" ADD CONSTRAINT "event_attendances_eventID_fkey" FOREIGN KEY ("eventID") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "event_attendances" ADD CONSTRAINT "event_attendances_userID_fkey" FOREIGN KEY ("userID") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "event_bookmarks" ADD CONSTRAINT "event_bookmarks_eventID_fkey" FOREIGN KEY ("eventID") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "event_bookmarks" ADD CONSTRAINT "event_bookmarks_userID_fkey" FOREIGN KEY ("userID") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_connections" ADD CONSTRAINT "user_connections_requesterUserID_fkey" FOREIGN KEY ("requesterUserID") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_connections" ADD CONSTRAINT "user_connections_addresseeUserID_fkey" FOREIGN KEY ("addresseeUserID") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
