-- Phase 1 Data Cleanup: Remove duplicate entry_size_categories
-- Spec: TENANT_SETTINGS_SPEC.md lines 573-602
-- Risk Assessment: TENANT_SETTINGS_RISK_ASSESSMENT.md lines 95-115

-- SAFETY CHECK: Verify duplicates have 0 entries using them
DO $$
DECLARE
  entry_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO entry_count
  FROM competition_entries
  WHERE entry_size_category_id IN (
    SELECT id FROM entry_size_categories
    WHERE tenant_id = '00000000-0000-0000-0000-000000000001'
      AND name IN ('Large Group', 'Duo/Trio')
      AND sort_order IS NULL
  );

  IF entry_count > 0 THEN
    RAISE EXCEPTION 'SAFETY CHECK FAILED: % entries are using duplicate rows. Manual intervention required.', entry_count;
  END IF;

  RAISE NOTICE 'SAFETY CHECK PASSED: 0 entries using duplicate rows';
END $$;

-- Delete duplicate rows with NULL sort_order (keep ones with explicit sort_order)
-- These are confirmed unused duplicates that cause dropdown issues
DELETE FROM entry_size_categories
WHERE tenant_id = '00000000-0000-0000-0000-000000000001'
  AND name IN ('Large Group', 'Duo/Trio')
  AND sort_order IS NULL;

-- Verification: Check for remaining duplicates (should return 0 rows)
DO $$
DECLARE
  duplicate_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO duplicate_count
  FROM (
    SELECT name, COUNT(*) as count
    FROM entry_size_categories
    WHERE tenant_id = '00000000-0000-0000-0000-000000000001'
    GROUP BY name
    HAVING COUNT(*) > 1
  ) duplicates;

  IF duplicate_count > 0 THEN
    RAISE WARNING 'Still have % duplicate entry size categories', duplicate_count;
  ELSE
    RAISE NOTICE 'SUCCESS: No duplicate entry size categories remain';
  END IF;
END $$;
