-- CreateTable
CREATE TABLE "event_speakers" (
    "id" UUID NOT NULL,
    "eventID" UUID NOT NULL,
    "name" VARCHAR(180) NOT NULL,
    "title" VARCHAR(180),
    "bio" TEXT,
    "photoFileID" UUID,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_speakers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "event_speakers_eventID_idx" ON "event_speakers"("eventID");

-- AddForeignKey
ALTER TABLE "event_speakers" ADD CONSTRAINT "event_speakers_eventID_fkey" FOREIGN KEY ("eventID") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_speakers" ADD CONSTRAINT "event_speakers_photoFileID_fkey" FOREIGN KEY ("photoFileID") REFERENCES "files"("id") ON DELETE SET NULL ON UPDATE CASCADE;
