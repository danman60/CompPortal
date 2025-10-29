-- Phase 1 Data Cleanup: Create scoring_tiers table and migrate data
-- Spec: TENANT_SETTINGS_SPEC.md lines 230-261
-- Replaces orphaned competition_settings.scoring_rubric with tenant-scoped table

-- Create scoring_tiers table
CREATE TABLE IF NOT EXISTS scoring_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  name VARCHAR(255) NOT NULL,
  min_score DECIMAL(5,2) NOT NULL,
  max_score DECIMAL(5,2) NOT NULL,
  color VARCHAR(7),
  sort_order INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Constraints
  UNIQUE(tenant_id, name),
  CHECK (min_score >= 0 AND max_score <= 300), -- Glow uses 300-point scale
  CHECK (min_score < max_score)
);

-- Add RLS (tenant isolation)
ALTER TABLE scoring_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view scoring tiers for their tenant"
  ON scoring_tiers FOR SELECT
  USING (tenant_id = (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Competition directors can manage scoring tiers"
  ON scoring_tiers FOR ALL
  USING (
    tenant_id = (SELECT tenant_id FROM user_profiles WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('competition_director', 'super_admin')
    )
  );

-- Migrate EMPWR scoring rubric from competition_settings
-- EMPWR uses 100-point scale: Platinum (95-100), Diamond (90-95), Gold (85-90), Silver (80-85), Bronze (0-80)
INSERT INTO scoring_tiers (tenant_id, name, min_score, max_score, color, sort_order)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'Platinum', 95.00, 100.00, '#E5E4E2', 1),
  ('00000000-0000-0000-0000-000000000001', 'Diamond', 90.00, 94.99, '#B9F2FF', 2),
  ('00000000-0000-0000-0000-000000000001', 'Gold', 85.00, 89.99, '#FFD700', 3),
  ('00000000-0000-0000-0000-000000000001', 'Silver', 80.00, 84.99, '#C0C0C0', 4),
  ('00000000-0000-0000-0000-000000000001', 'Bronze', 0.00, 79.99, '#CD7F32', 5)
ON CONFLICT (tenant_id, name) DO NOTHING;

-- Seed Glow scoring rubric
-- Glow uses 300-point scale (5 judges × 60 points each)
INSERT INTO scoring_tiers (tenant_id, name, min_score, max_score, color, sort_order)
VALUES
  ('4b9c1713-40ab-460b-8dda-5a8cf6cbc9b5', 'Afterglow', 291.00, 300.00, '#FFD700', 1),
  ('4b9c1713-40ab-460b-8dda-5a8cf6cbc9b5', 'Platinum Plus', 276.00, 290.99, '#E5E4E2', 2),
  ('4b9c1713-40ab-460b-8dda-5a8cf6cbc9b5', 'Platinum', 261.00, 275.99, '#C0C0C0', 3),
  ('4b9c1713-40ab-460b-8dda-5a8cf6cbc9b5', 'Gold Plus', 246.00, 260.99, '#FFD700', 4),
  ('4b9c1713-40ab-460b-8dda-5a8cf6cbc9b5', 'Gold', 231.00, 245.99, '#FFA500', 5),
  ('4b9c1713-40ab-460b-8dda-5a8cf6cbc9b5', 'Bronze', 216.00, 230.99, '#CD7F32', 6)
ON CONFLICT (tenant_id, name) DO NOTHING;

-- Mark competition_settings as deprecated (don't delete yet per user request)
ALTER TABLE competition_settings ADD COLUMN IF NOT EXISTS deprecated BOOLEAN DEFAULT false;
UPDATE competition_settings SET deprecated = true;
COMMENT ON TABLE competition_settings IS 'DEPRECATED 2025-10-29: Scoring data migrated to scoring_tiers table. Age/dance/size data managed via tenant-scoped lookup tables. Monitor for 2 weeks, then delete if unused.';

-- Verification
DO $$
DECLARE
  empwr_count INTEGER;
  glow_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO empwr_count FROM scoring_tiers WHERE tenant_id = '00000000-0000-0000-0000-000000000001';
  SELECT COUNT(*) INTO glow_count FROM scoring_tiers WHERE tenant_id = '4b9c1713-40ab-460b-8dda-5a8cf6cbc9b5';

  RAISE NOTICE 'EMPWR scoring tiers: %', empwr_count;
  RAISE NOTICE 'Glow scoring tiers: %', glow_count;

  IF empwr_count < 5 OR glow_count < 6 THEN
    RAISE WARNING 'Expected 5 EMPWR tiers and 6 Glow tiers, got % and %', empwr_count, glow_count;
  ELSE
    RAISE NOTICE 'SUCCESS: Scoring tiers seeded for both tenants';
  END IF;
END $$;
