-- ============================================
-- COMPREHENSIVE GLOW TENANT STATUS CHECK
-- Copy/paste into Supabase SQL Editor
-- ============================================

-- 1. CHECK: Glow Tenant Record
SELECT
  '1️⃣ TENANT RECORD' as check,
  CASE WHEN COUNT(*) > 0 THEN '✅ EXISTS' ELSE '❌ MISSING - RUN SETUP' END as status,
  json_build_object(
    'id', MAX(id),
    'name', MAX(name),
    'subdomain', MAX(subdomain),
    'has_age_divisions', bool_or(age_division_settings IS NOT NULL),
    'has_dance_categories', bool_or(dance_category_settings IS NOT NULL),
    'has_entry_sizes', bool_or(entry_size_settings IS NOT NULL),
    'has_scoring', bool_or(scoring_system_settings IS NOT NULL),
    'has_awards', bool_or(award_settings IS NOT NULL)
  ) as details
FROM tenants
WHERE subdomain = 'glow'

UNION ALL

-- 2. CHECK: Glow Admin User
SELECT
  '2️⃣ ADMIN USER' as check,
  CASE
    WHEN COUNT(*) > 0 THEN '✅ EXISTS: ' || string_agg(email, ', ')
    ELSE '❌ MISSING - CREATE IN SUPABASE AUTH'
  END as status,
  json_build_object(
    'user_ids', json_agg(id),
    'emails', json_agg(email),
    'roles', json_agg(role)
  ) as details
FROM users
WHERE tenant_id = '4b9c1713-40ab-460b-8dda-5a8cf6cbc9b5'

UNION ALL

-- 3. CHECK: Competitions
SELECT
  '3️⃣ COMPETITIONS' as check,
  CASE
    WHEN COUNT(*) > 0 THEN '✅ ' || COUNT(*) || ' competition(s)'
    ELSE '⚠️  NONE - CREATE VIA UI AFTER LOGIN'
  END as status,
  json_build_object(
    'count', COUNT(*),
    'competitions', json_agg(
      json_build_object('name', name, 'status', status, 'start_date', start_date)
    )
  ) as details
FROM competitions
WHERE tenant_id = '4b9c1713-40ab-460b-8dda-5a8cf6cbc9b5'

UNION ALL

-- 4. CHECK: Studios
SELECT
  '4️⃣ STUDIOS' as check,
  CASE
    WHEN COUNT(*) > 0 THEN '✅ ' || COUNT(*) || ' studio(s)'
    ELSE '⚠️  NONE - WILL BE CREATED BY STUDIO DIRECTORS'
  END as status,
  json_build_object('count', COUNT(*)) as details
FROM studios
WHERE tenant_id = '4b9c1713-40ab-460b-8dda-5a8cf6cbc9b5'

UNION ALL

-- 5. CHECK: Dancers
SELECT
  '5️⃣ DANCERS' as check,
  CASE
    WHEN COUNT(*) > 0 THEN '✅ ' || COUNT(*) || ' dancer(s)'
    ELSE '⚠️  NONE - OK FOR NEW TENANT'
  END as status,
  json_build_object('count', COUNT(*)) as details
FROM dancers
WHERE tenant_id = '4b9c1713-40ab-460b-8dda-5a8cf6cbc9b5';

-- ============================================
-- DETAILED BREAKDOWN (IF YOU WANT MORE INFO)
-- ============================================

-- Show full tenant settings if configured:
SELECT
  'GLOW TENANT SETTINGS' as section,
  age_division_settings,
  dance_category_settings,
  entry_size_settings,
  entry_fee_settings,
  scoring_system_settings,
  award_settings
FROM tenants
WHERE subdomain = 'glow';

-- Show all users linked to Glow:
SELECT
  'GLOW USERS' as section,
  id,
  email,
  role,
  created_at
FROM users
WHERE tenant_id = '4b9c1713-40ab-460b-8dda-5a8cf6cbc9b5';

-- ============================================
-- WHAT YOU NEED TO DO BASED ON RESULTS:
-- ============================================

/*
IF "1️⃣ TENANT RECORD" shows ❌ MISSING:
  → Run: INSERT INTO tenants (id, name, subdomain, created_at, updated_at)
         VALUES ('4b9c1713-40ab-460b-8dda-5a8cf6cbc9b5', 'Glow Dance Competition', 'glow', NOW(), NOW());

IF "2️⃣ ADMIN USER" shows ❌ MISSING:
  → Step 1: Go to Supabase Dashboard → Authentication → Users → Add User
  → Step 2: Email: glowdance@gmail.com, Password: [auto-generate]
  → Step 3: Run: UPDATE users SET tenant_id = '4b9c1713-40ab-460b-8dda-5a8cf6cbc9b5',
                                  role = 'competition_director'
                 WHERE email = 'glowdance@gmail.com';

IF "3️⃣ COMPETITIONS" shows ⚠️ NONE:
  → OK! Create via UI after logging in to glow.compsync.net

IF settings show NULL:
  → Copy EMPWR settings: See GLOW_TENANT_SETUP.sql Step 5
*/
