-- CreateTable
CREATE TABLE "community_gallery" (
    "id" UUID NOT NULL,
    "communityID" UUID NOT NULL,
    "fileID" UUID NOT NULL,
    "caption" VARCHAR(280),
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "community_gallery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "community_gallery_communityID_idx" ON "community_gallery"("communityID");

-- AddForeignKey
ALTER TABLE "community_gallery" ADD CONSTRAINT "community_gallery_communityID_fkey" FOREIGN KEY ("communityID") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_gallery" ADD CONSTRAINT "community_gallery_fileID_fkey" FOREIGN KEY ("fileID") REFERENCES "files"("id") ON DELETE CASCADE ON UPDATE CASCADE;
