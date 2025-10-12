-- Add duration_seconds field to make duration accessible from TypeScript
-- Converts PostgreSQL interval to integer seconds

ALTER TABLE "public"."competition_entries"
ADD COLUMN IF NOT EXISTS "duration_seconds" INT;

-- Populate duration_seconds from existing duration intervals
-- EXTRACT(EPOCH FROM interval) returns total seconds as decimal
UPDATE "public"."competition_entries"
SET "duration_seconds" = EXTRACT(EPOCH FROM duration)::INT
WHERE duration IS NOT NULL;

-- Add index for duration-based queries
CREATE INDEX IF NOT EXISTS "idx_competition_entries_duration"
ON "public"."competition_entries" ("duration_seconds");

-- Add comment for documentation
COMMENT ON COLUMN "public"."competition_entries"."duration_seconds" IS 'Routine duration in seconds, extracted from duration interval for TypeScript access';
