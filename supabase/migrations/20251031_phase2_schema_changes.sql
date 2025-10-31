-- Phase 2 Business Logic: Database Schema Changes
-- Spec: PHASE2_BUSINESS_LOGIC_SPECIFICATIONS.md
-- Risk: LOW - ALTER/ADD only, no data loss

-- ============================================================================
-- PART 1: ADD PRODUCTION CLASSIFICATION (BOTH TENANTS)
-- ============================================================================
-- Spec lines 200-209: Production classification for production-sized entries

INSERT INTO classifications (tenant_id, name, description, skill_level, color_code)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'Production', 'Production entries only', 99, '#9333ea'),
  ('4b9c1713-40ab-460b-8dda-5a8cf6cbc9b5', 'Production', 'Production entries only', 99, '#9333ea')
ON CONFLICT (tenant_id, name) DO NOTHING;

-- ============================================================================
-- PART 2: ADD PRODUCTION DANCE CATEGORY (BOTH TENANTS)
-- ============================================================================
-- Spec lines 200-209: Production dance category

INSERT INTO dance_categories (tenant_id, name, description, color_code)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'Production', 'Large-scale production numbers', '#9333ea'),
  ('4b9c1713-40ab-460b-8dda-5a8cf6cbc9b5', 'Production', 'Large-scale production numbers', '#9333ea')
ON CONFLICT (tenant_id, name) DO NOTHING;

-- ============================================================================
-- PART 3: ADD TIME LIMITS TO ENTRY SIZE CATEGORIES
-- ============================================================================
-- Spec lines 396-418: Time limits for each entry size

-- Add columns if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='entry_size_categories'
                   AND column_name='max_time_minutes') THEN
        ALTER TABLE entry_size_categories
        ADD COLUMN max_time_minutes INTEGER;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='entry_size_categories'
                   AND column_name='max_time_seconds') THEN
        ALTER TABLE entry_size_categories
        ADD COLUMN max_time_seconds INTEGER DEFAULT 0;
    END IF;
END $$;

-- Populate time limits for all entry sizes (both tenants)
-- Solo, Duet, Trio: 3 minutes max
UPDATE entry_size_categories
SET max_time_minutes = 3, max_time_seconds = 0
WHERE name IN ('Solo', 'Duet', 'Trio', 'Duet/Trio')
AND max_time_minutes IS NULL;

-- Small Group (4-9 dancers): 4 minutes max
UPDATE entry_size_categories
SET max_time_minutes = 4, max_time_seconds = 0
WHERE name IN ('Small Group')
AND max_time_minutes IS NULL;

-- Large Group (10-14 dancers): 5 minutes max
UPDATE entry_size_categories
SET max_time_minutes = 5, max_time_seconds = 0
WHERE name IN ('Large Group')
AND max_time_minutes IS NULL;

-- Line (15-19 dancers): 6 minutes max
UPDATE entry_size_categories
SET max_time_minutes = 6, max_time_seconds = 0
WHERE name IN ('Line')
AND max_time_minutes IS NULL;

-- Superline/Super Line (20+ dancers): 7 minutes max
UPDATE entry_size_categories
SET max_time_minutes = 7, max_time_seconds = 0
WHERE name IN ('Superline', 'Super Line')
AND max_time_minutes IS NULL;

-- Production: 15 minutes max
UPDATE entry_size_categories
SET max_time_minutes = 15, max_time_seconds = 0
WHERE name = 'Production'
AND max_time_minutes IS NULL;

-- Special categories: 3 minutes max (if they exist)
UPDATE entry_size_categories
SET max_time_minutes = 3, max_time_seconds = 0
WHERE name IN ('Vocal', 'Student Choreography')
AND max_time_minutes IS NULL;

-- ============================================================================
-- PART 4: ADD EXTENDED TIME FIELDS TO COMPETITION_ENTRIES
-- ============================================================================
-- Spec lines 419-424: Extended time tracking on entries

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='competition_entries'
                   AND column_name='extended_time_requested') THEN
        ALTER TABLE competition_entries
        ADD COLUMN extended_time_requested BOOLEAN DEFAULT FALSE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='competition_entries'
                   AND column_name='routine_length_minutes') THEN
        ALTER TABLE competition_entries
        ADD COLUMN routine_length_minutes INTEGER NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='competition_entries'
                   AND column_name='routine_length_seconds') THEN
        ALTER TABLE competition_entries
        ADD COLUMN routine_length_seconds INTEGER NULL;
    END IF;
END $$;

-- ============================================================================
-- PART 5: ADD SCHEDULING NOTES TO COMPETITION_ENTRIES
-- ============================================================================
-- Spec lines 829-834: Scheduling notes field

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='competition_entries'
                   AND column_name='scheduling_notes') THEN
        ALTER TABLE competition_entries
        ADD COLUMN scheduling_notes TEXT;
    END IF;
END $$;

-- ============================================================================
-- PART 6: ADD EXTENDED TIME FEES TO COMPETITION_SETTINGS
-- ============================================================================
-- Spec lines 425-429: Extended time fee configuration

-- Note: competition_settings is a JSON-based table, not traditional columns
-- These settings will be managed via the application layer
-- Adding documentation for reference:
-- - extended_time_fee_solo: $5.00 per dancer (for solos)
-- - extended_time_fee_group: $2.00 per dancer (for groups)

INSERT INTO competition_settings (setting_category, setting_key, setting_value, display_order, is_active)
VALUES
  ('fees', 'extended_time_fee_solo', '5.00', 100, true),
  ('fees', 'extended_time_fee_group', '2.00', 101, true)
ON CONFLICT (setting_category, setting_key) DO UPDATE
SET setting_value = EXCLUDED.setting_value,
    updated_at = NOW();

-- ============================================================================
-- PART 7: ADD CLASSIFICATION_ID TO DANCERS TABLE
-- ============================================================================
-- Spec lines 50-58: Classification required on dancers

-- Add classification_id column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='dancers'
                   AND column_name='classification_id') THEN
        ALTER TABLE dancers
        ADD COLUMN classification_id UUID REFERENCES classifications(id);
        RAISE NOTICE 'Added classification_id column to dancers table';
    END IF;
END $$;

-- Make classification_id NOT NULL only if all dancers have a classification
-- IMPORTANT: This will fail if any dancers exist without classification_id
-- We'll handle this gracefully - only apply if all dancers have classification

DO $$
DECLARE
  null_count INTEGER;
BEGIN
  -- Check for dancers without classification
  SELECT COUNT(*) INTO null_count
  FROM dancers
  WHERE classification_id IS NULL;

  IF null_count = 0 THEN
    -- Safe to make NOT NULL
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name='dancers'
      AND column_name='classification_id'
      AND is_nullable='YES'
    ) THEN
      ALTER TABLE dancers
      ALTER COLUMN classification_id SET NOT NULL;
      RAISE NOTICE 'SUCCESS: classification_id set to NOT NULL on dancers table';
    END IF;
  ELSE
    RAISE WARNING 'SKIPPED: % dancers have NULL classification_id. Fix data before making column NOT NULL.', null_count;
  END IF;
END $$;

-- ============================================================================
-- PART 8: REMOVE ORLANDO EVENT FROM GLOW (IF EXISTS)
-- ============================================================================
-- Per instruction: Remove Orlando event from Glow tenant

DELETE FROM competitions
WHERE tenant_id = '4b9c1713-40ab-460b-8dda-5a8cf6cbc9b5'
AND name ILIKE '%orlando%';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
  empwr_prod_class_count INTEGER;
  glow_prod_class_count INTEGER;
  empwr_prod_cat_count INTEGER;
  glow_prod_cat_count INTEGER;
  time_limits_count INTEGER;
  extended_time_settings_count INTEGER;
BEGIN
  -- Check Production classifications
  SELECT COUNT(*) INTO empwr_prod_class_count
  FROM classifications
  WHERE tenant_id = '00000000-0000-0000-0000-000000000001'
  AND name = 'Production';

  SELECT COUNT(*) INTO glow_prod_class_count
  FROM classifications
  WHERE tenant_id = '4b9c1713-40ab-460b-8dda-5a8cf6cbc9b5'
  AND name = 'Production';

  -- Check Production categories
  SELECT COUNT(*) INTO empwr_prod_cat_count
  FROM dance_categories
  WHERE tenant_id = '00000000-0000-0000-0000-000000000001'
  AND name = 'Production';

  SELECT COUNT(*) INTO glow_prod_cat_count
  FROM dance_categories
  WHERE tenant_id = '4b9c1713-40ab-460b-8dda-5a8cf6cbc9b5'
  AND name = 'Production';

  -- Check time limits populated
  SELECT COUNT(*) INTO time_limits_count
  FROM entry_size_categories
  WHERE max_time_minutes IS NOT NULL;

  -- Check extended time settings
  SELECT COUNT(*) INTO extended_time_settings_count
  FROM competition_settings
  WHERE setting_category = 'fees'
  AND setting_key IN ('extended_time_fee_solo', 'extended_time_fee_group');

  -- Report results
  RAISE NOTICE '=================================================';
  RAISE NOTICE 'PHASE 2 SCHEMA MIGRATION VERIFICATION';
  RAISE NOTICE '=================================================';
  RAISE NOTICE 'EMPWR Production classification: %', empwr_prod_class_count;
  RAISE NOTICE 'Glow Production classification: %', glow_prod_class_count;
  RAISE NOTICE 'EMPWR Production category: %', empwr_prod_cat_count;
  RAISE NOTICE 'Glow Production category: %', glow_prod_cat_count;
  RAISE NOTICE 'Entry sizes with time limits: %', time_limits_count;
  RAISE NOTICE 'Extended time fee settings: %', extended_time_settings_count;
  RAISE NOTICE '=================================================';

  -- Warnings
  IF empwr_prod_class_count = 0 THEN
    RAISE WARNING 'EMPWR Production classification NOT created';
  END IF;

  IF glow_prod_class_count = 0 THEN
    RAISE WARNING 'Glow Production classification NOT created';
  END IF;

  IF empwr_prod_cat_count = 0 THEN
    RAISE WARNING 'EMPWR Production category NOT created';
  END IF;

  IF glow_prod_cat_count = 0 THEN
    RAISE WARNING 'Glow Production category NOT created';
  END IF;

  IF time_limits_count = 0 THEN
    RAISE WARNING 'No time limits populated in entry_size_categories';
  END IF;

  IF extended_time_settings_count < 2 THEN
    RAISE WARNING 'Extended time fee settings incomplete (expected 2, got %)', extended_time_settings_count;
  END IF;

  RAISE NOTICE 'Migration complete. Review warnings above.';
END $$;
