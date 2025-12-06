-- P2-15: Simplified Schedule Versioning (Tentative vs Final)
-- Update schedule_state to use 'tentative' and 'final' instead of complex versioning

-- Set existing 'draft' states to 'tentative'
UPDATE public.competitions
SET schedule_state = 'tentative'
WHERE schedule_state = 'draft' OR schedule_state IS NULL;

-- Add check constraint to ensure only valid values
ALTER TABLE public.competitions
DROP CONSTRAINT IF EXISTS schedule_state_valid_values;

ALTER TABLE public.competitions
ADD CONSTRAINT schedule_state_valid_values
CHECK (schedule_state IN ('tentative', 'final'));

-- Update default value to 'tentative'
ALTER TABLE public.competitions
ALTER COLUMN schedule_state SET DEFAULT 'tentative';
