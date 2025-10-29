-- ============================================
-- Data Migration: Fix Dancer Birth Dates
-- Bug #1: Timezone offset causing -1 day error
-- ============================================

-- BEFORE RUNNING: Backup the dancers table!
-- CREATE TABLE dancers_backup AS SELECT * FROM dancers;

-- Preview: Show dates that will be changed
SELECT
  'PREVIEW: Dates to be corrected' as action,
  id,
  first_name,
  last_name,
  date_of_birth as current_date,
  date_of_birth + INTERVAL '1 day' as corrected_date,
  tenant_id
FROM dancers
WHERE date_of_birth IS NOT NULL
ORDER BY tenant_id, last_name;

-- FIX: Add 1 day to all existing birthdates
-- This corrects the timezone shift that caused -1 day offset
UPDATE dancers
SET
  date_of_birth = date_of_birth + INTERVAL '1 day',
  updated_at = NOW()
WHERE date_of_birth IS NOT NULL;

-- Verification: Show updated dates
SELECT
  'AFTER MIGRATION: Corrected dates' as status,
  id,
  first_name,
  last_name,
  date_of_birth,
  tenant_id
FROM dancers
WHERE date_of_birth IS NOT NULL
ORDER BY tenant_id, last_name;

-- Count affected records
SELECT
  'SUMMARY' as report,
  COUNT(*) as total_dancers_corrected,
  COUNT(DISTINCT tenant_id) as tenants_affected
FROM dancers
WHERE date_of_birth IS NOT NULL;
