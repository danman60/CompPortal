-- Quick Glow Tenant Status Check
-- Run this in Supabase SQL Editor

-- ============================================
-- 1. Check if Glow tenant exists
-- ============================================
SELECT
  'GLOW TENANT' as check_type,
  id,
  name,
  subdomain,
  created_at,
  -- Check if settings are configured
  CASE WHEN age_division_settings IS NOT NULL THEN '✅' ELSE '❌' END as age_divisions,
  CASE WHEN dance_category_settings IS NOT NULL THEN '✅' ELSE '❌' END as dance_categories,
  CASE WHEN entry_size_settings IS NOT NULL THEN '✅' ELSE '❌' END as entry_sizes,
  CASE WHEN scoring_system_settings IS NOT NULL THEN '✅' ELSE '❌' END as scoring_system,
  CASE WHEN award_settings IS NOT NULL THEN '✅' ELSE '❌' END as awards
FROM tenants
WHERE subdomain = 'glow';

-- ============================================
-- 2. Check users associated with Glow
-- ============================================
SELECT
  'GLOW USERS' as check_type,
  u.id,
  u.email,
  u.role,
  u.created_at
FROM users u
WHERE u.tenant_id = '4b9c1713-40ab-460b-8dda-5a8cf6cbc9b5';

-- ============================================
-- 3. Check competitions for Glow
-- ============================================
SELECT
  'GLOW COMPETITIONS' as check_type,
  c.id,
  c.name,
  c.start_date,
  c.end_date,
  c.status,
  c.total_capacity,
  c.available_reservation_tokens,
  c.created_at
FROM competitions c
WHERE c.tenant_id = '4b9c1713-40ab-460b-8dda-5a8cf6cbc9b5';

-- ============================================
-- 4. Check studios for Glow
-- ============================================
SELECT
  'GLOW STUDIOS' as check_type,
  s.id,
  s.name,
  s.director_name,
  s.director_email,
  s.created_at
FROM studios s
WHERE s.tenant_id = '4b9c1713-40ab-460b-8dda-5a8cf6cbc9b5';

-- ============================================
-- 5. Check dancers for Glow
-- ============================================
SELECT
  'GLOW DANCERS' as check_type,
  COUNT(*) as total_dancers
FROM dancers d
WHERE d.tenant_id = '4b9c1713-40ab-460b-8dda-5a8cf6cbc9b5';

-- ============================================
-- 6. Summary: What exists vs what's missing
-- ============================================
SELECT
  'TENANT RECORD' as item,
  CASE WHEN COUNT(*) > 0 THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
FROM tenants WHERE subdomain = 'glow'

UNION ALL

SELECT
  'SETTINGS CONFIGURED' as item,
  CASE WHEN COUNT(*) > 0 AND age_division_settings IS NOT NULL
    THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status
FROM tenants WHERE subdomain = 'glow'

UNION ALL

SELECT
  'ADMIN USER' as item,
  CASE WHEN COUNT(*) > 0 THEN '✅ EXISTS (' || string_agg(email, ', ') || ')'
    ELSE '❌ MISSING'
  END as status
FROM users
WHERE tenant_id = '4b9c1713-40ab-460b-8dda-5a8cf6cbc9b5'
  AND role = 'competition_director'

UNION ALL

SELECT
  'COMPETITIONS' as item,
  CASE WHEN COUNT(*) > 0 THEN '✅ ' || COUNT(*) || ' competition(s)'
    ELSE '⚠️  0 competitions'
  END as status
FROM competitions
WHERE tenant_id = '4b9c1713-40ab-460b-8dda-5a8cf6cbc9b5'

UNION ALL

SELECT
  'STUDIOS' as item,
  CASE WHEN COUNT(*) > 0 THEN '✅ ' || COUNT(*) || ' studio(s)'
    ELSE '⚠️  0 studios'
  END as status
FROM studios
WHERE tenant_id = '4b9c1713-40ab-460b-8dda-5a8cf6cbc9b5'

UNION ALL

SELECT
  'DANCERS' as item,
  CASE WHEN COUNT(*) > 0 THEN '✅ ' || COUNT(*) || ' dancer(s)'
    ELSE '⚠️  0 dancers'
  END as status
FROM dancers
WHERE tenant_id = '4b9c1713-40ab-460b-8dda-5a8cf6cbc9b5';

-- ============================================
-- 7. Show actual settings content if they exist
-- ============================================
SELECT
  'GLOW SETTINGS DETAIL' as section,
  age_division_settings,
  dance_category_settings,
  entry_size_settings,
  scoring_system_settings,
  award_settings
FROM tenants
WHERE subdomain = 'glow';
