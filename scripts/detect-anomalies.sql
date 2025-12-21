-- Security Anomaly Detection Query
-- Run this daily to catch suspicious user/role configurations
-- Usage: supabase db execute --file scripts/detect-anomalies.sql

-- ANOMALY 1: Studio Directors with NULL studioId
-- This is the pattern that caused the November 2025 breach
SELECT
  '🚨 CRITICAL: SD with no studio' as severity,
  au.id as user_id,
  au.email,
  up.role,
  up.tenant_id as profile_tenant_id,
  s.id as studio_id,
  au.created_at as account_created,
  'SD role without studio ownership link' as issue
FROM auth.users au
JOIN user_profiles up ON au.id = up.id
LEFT JOIN studios s ON s.owner_id = au.id
WHERE up.role = 'studio_director'
  AND s.id IS NULL

UNION ALL

-- ANOMALY 2: Studio Directors with NULL tenant_id
SELECT
  '🚨 CRITICAL: SD with NULL tenant_id' as severity,
  au.id as user_id,
  au.email,
  up.role,
  up.tenant_id as profile_tenant_id,
  s.id as studio_id,
  au.created_at as account_created,
  'NULL tenant_id in user_profiles' as issue
FROM auth.users au
JOIN user_profiles up ON au.id = up.id
LEFT JOIN studios s ON s.owner_id = au.id
WHERE up.role = 'studio_director'
  AND up.tenant_id IS NULL

UNION ALL

-- ANOMALY 3: Tenant mismatch between profile and studio
SELECT
  '⚠️  HIGH: Tenant mismatch' as severity,
  au.id as user_id,
  au.email,
  up.role,
  up.tenant_id as profile_tenant_id,
  s.id as studio_id,
  au.created_at as account_created,
  'Profile tenant (' || COALESCE(up.tenant_id::text, 'NULL') || ') != Studio tenant (' || COALESCE(s.tenant_id::text, 'NULL') || ')' as issue
FROM auth.users au
JOIN user_profiles up ON au.id = up.id
JOIN studios s ON s.owner_id = au.id
WHERE up.role = 'studio_director'
  AND up.tenant_id != s.tenant_id

UNION ALL

-- ANOMALY 4: Users with studio_director role but no claim within 7 days
SELECT
  'ℹ️  MEDIUM: Unclaimed SD account' as severity,
  au.id as user_id,
  au.email,
  up.role,
  up.tenant_id as profile_tenant_id,
  NULL::uuid as studio_id,
  au.created_at as account_created,
  'Studio director role but no studio claimed after ' || EXTRACT(DAY FROM NOW() - au.created_at) || ' days' as issue
FROM auth.users au
JOIN user_profiles up ON au.id = up.id
LEFT JOIN studios s ON s.owner_id = au.id
WHERE up.role = 'studio_director'
  AND s.id IS NULL
  AND au.created_at < NOW() - INTERVAL '7 days'

UNION ALL

-- ANOMALY 5: Studios with owner_id but user has NULL/wrong role
SELECT
  '⚠️  HIGH: Studio owner has wrong role' as severity,
  au.id as user_id,
  au.email,
  up.role,
  up.tenant_id as profile_tenant_id,
  s.id as studio_id,
  au.created_at as account_created,
  'Studio has owner_id but user role is ' || COALESCE(up.role, 'NULL') || ' (should be studio_director)' as issue
FROM auth.users au
JOIN user_profiles up ON au.id = up.id
JOIN studios s ON s.owner_id = au.id
WHERE up.role != 'studio_director'

ORDER BY severity, account_created DESC;

-- Summary Statistics
SELECT
  '📊 Summary Statistics' as report_type,
  COUNT(*) FILTER (WHERE up.role = 'studio_director') as total_studio_directors,
  COUNT(*) FILTER (WHERE up.role = 'studio_director' AND s.id IS NOT NULL) as sds_with_studio,
  COUNT(*) FILTER (WHERE up.role = 'studio_director' AND s.id IS NULL) as sds_without_studio,
  COUNT(*) FILTER (WHERE up.role = 'studio_director' AND up.tenant_id IS NULL) as sds_with_null_tenant,
  COUNT(*) FILTER (WHERE up.role = 'studio_director' AND up.tenant_id != s.tenant_id) as sds_with_tenant_mismatch
FROM auth.users au
JOIN user_profiles up ON au.id = up.id
LEFT JOIN studios s ON s.owner_id = au.id;
