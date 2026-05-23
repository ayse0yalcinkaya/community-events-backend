-- CreateTable
CREATE TABLE "event_sponsors" (
    "id" UUID NOT NULL,
    "eventID" UUID NOT NULL,
    "name" VARCHAR(180) NOT NULL,
    "logoFileID" UUID,
    "websiteUrl" VARCHAR(255),
    "tier" VARCHAR(50),
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_sponsors_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "event_sponsors_eventID_idx" ON "event_sponsors"("eventID");

-- AddForeignKey
ALTER TABLE "event_sponsors" ADD CONSTRAINT "event_sponsors_eventID_fkey" FOREIGN KEY ("eventID") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_sponsors" ADD CONSTRAINT "event_sponsors_logoFileID_fkey" FOREIGN KEY ("logoFileID") REFERENCES "files"("id") ON DELETE SET NULL ON UPDATE CASCADE;
