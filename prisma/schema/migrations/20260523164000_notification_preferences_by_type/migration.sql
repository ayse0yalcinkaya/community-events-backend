ALTER TABLE "notification_preferences"
ADD COLUMN "type" INTEGER NOT NULL DEFAULT 3;

DROP INDEX IF EXISTS "notification_preferences_userID_channel_key";

CREATE INDEX "notification_preferences_userID_type_idx" ON "notification_preferences"("userID", "type");

CREATE UNIQUE INDEX "notification_preferences_userID_type_channel_key"
ON "notification_preferences"("userID", "type", "channel");
