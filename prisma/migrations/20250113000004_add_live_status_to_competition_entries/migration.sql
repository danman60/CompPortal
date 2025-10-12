-- Add live_status column to track routine state during live competition
-- Possible values: 'queued', 'current', 'completed', 'skipped'

ALTER TABLE "public"."competition_entries"
ADD COLUMN IF NOT EXISTS "live_status" VARCHAR(20) DEFAULT 'queued';

-- Add index for filtering by live status
CREATE INDEX IF NOT EXISTS "idx_competition_entries_live_status"
ON "public"."competition_entries" ("live_status");

-- Add composite index for competition + live_status queries
CREATE INDEX IF NOT EXISTS "idx_competition_entries_comp_live_status"
ON "public"."competition_entries" ("competition_id", "live_status");

-- Update existing entries to 'queued' status
UPDATE "public"."competition_entries"
SET "live_status" = 'queued'
WHERE "live_status" IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN "public"."competition_entries"."live_status" IS 'Tracks routine state during live competition: queued, current, completed, skipped';
