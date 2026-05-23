ALTER TABLE "announcements"
ADD COLUMN "communityID" UUID;

CREATE INDEX "announcements_communityID_idx" ON "announcements"("communityID");

ALTER TABLE "announcements"
ADD CONSTRAINT "announcements_communityID_fkey"
FOREIGN KEY ("communityID") REFERENCES "communities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
