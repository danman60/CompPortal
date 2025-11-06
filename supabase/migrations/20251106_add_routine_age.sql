-- Add routine_age field to competition_entries
-- This stores the final selected age for the routine (calculated or calculated+1)
-- Used for scheduling, awards, display, and filtering

ALTER TABLE competition_entries
ADD COLUMN routine_age INTEGER;

COMMENT ON COLUMN competition_entries.routine_age IS 'Final selected age for this routine (calculated average or +1 bump). Used for scheduling and age-based grouping.';
