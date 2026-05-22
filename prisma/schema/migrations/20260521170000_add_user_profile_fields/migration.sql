ALTER TABLE "users"
ADD COLUMN "headline" VARCHAR(120),
ADD COLUMN "bio" TEXT,
ADD COLUMN "city" VARCHAR(120),
ADD COLUMN "website" VARCHAR(255),
ADD COLUMN "instagramUrl" VARCHAR(255),
ADD COLUMN "linkedinUrl" VARCHAR(255);

CREATE INDEX "users_city_idx" ON "users"("city");
