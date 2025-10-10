-- Add internal_notes column to studios table
-- This field is only visible to Competition Directors
-- Studio Directors cannot see or edit this field

ALTER TABLE studios
ADD COLUMN IF NOT EXISTS internal_notes TEXT NULL;

-- Add comment explaining the column
COMMENT ON COLUMN studios.internal_notes IS 'Internal notes for Competition Directors only. Not visible to Studio Directors.';

-- Add index for searching notes (optional but helpful)
CREATE INDEX IF NOT EXISTS idx_studios_internal_notes
ON studios USING gin(to_tsvector('english', internal_notes));

