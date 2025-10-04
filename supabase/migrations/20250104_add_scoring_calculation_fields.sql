-- Add scoring calculation fields to competition_entries
ALTER TABLE competition_entries
ADD COLUMN IF NOT EXISTS calculated_score DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS award_level VARCHAR(50),
ADD COLUMN IF NOT EXISTS category_placement INT;

-- Add scoring ranges configuration to competitions
ALTER TABLE competitions
ADD COLUMN IF NOT EXISTS scoring_ranges JSONB DEFAULT '{"platinum": [95, 100], "high_gold": [90, 94.9], "gold": [85, 89.9], "silver": [80, 84.9], "bronze": [70, 79.9]}'::jsonb;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_entries_calculated_score ON competition_entries(calculated_score DESC);
CREATE INDEX IF NOT EXISTS idx_entries_award_level ON competition_entries(award_level);
CREATE INDEX IF NOT EXISTS idx_entries_placement ON competition_entries(category_placement);

-- Comments
COMMENT ON COLUMN competition_entries.calculated_score IS 'Average score across all judges';
COMMENT ON COLUMN competition_entries.award_level IS 'Award tier (Platinum, Gold, Silver, etc.)';
COMMENT ON COLUMN competition_entries.category_placement IS 'Placement within category (1st, 2nd, 3rd)';
COMMENT ON COLUMN competitions.scoring_ranges IS 'Award level score ranges in JSONB format';
