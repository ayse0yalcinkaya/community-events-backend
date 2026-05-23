-- CreateTable
CREATE TABLE "event_gallery" (
    "id" UUID NOT NULL,
    "eventID" UUID NOT NULL,
    "fileID" UUID NOT NULL,
    "caption" VARCHAR(280),
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_gallery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "event_gallery_eventID_idx" ON "event_gallery"("eventID");

-- AddForeignKey
ALTER TABLE "event_gallery" ADD CONSTRAINT "event_gallery_eventID_fkey" FOREIGN KEY ("eventID") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_gallery" ADD CONSTRAINT "event_gallery_fileID_fkey" FOREIGN KEY ("fileID") REFERENCES "files"("id") ON DELETE CASCADE ON UPDATE CASCADE;
