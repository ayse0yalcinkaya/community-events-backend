ALTER TABLE "event_sessions"
ADD COLUMN "title" VARCHAR(180),
ADD COLUMN "description" TEXT,
ADD COLUMN "speakerID" UUID;

CREATE INDEX "event_sessions_speakerID_idx" ON "event_sessions"("speakerID");

ALTER TABLE "event_sessions"
ADD CONSTRAINT "event_sessions_speakerID_fkey"
FOREIGN KEY ("speakerID") REFERENCES "event_speakers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
