-- Add schedule lock fields to competitions table
ALTER TABLE competitions
ADD COLUMN IF NOT EXISTS schedule_published_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS schedule_locked BOOLEAN DEFAULT false;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_competitions_schedule_lock ON competitions(schedule_locked);

-- Add unique constraint for entry numbers (if not exists)
CREATE UNIQUE INDEX IF NOT EXISTS idx_entry_number_per_comp
ON competition_entries(competition_id, entry_number, COALESCE(entry_suffix, ''))
WHERE entry_number IS NOT NULL;

-- Add comment
COMMENT ON COLUMN competitions.schedule_published_at IS 'Timestamp when schedule was published and entry numbers locked';
COMMENT ON COLUMN competitions.schedule_locked IS 'Prevents changes to entry numbers once schedule is published';
