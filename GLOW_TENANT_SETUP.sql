-- ============================================
-- Glow Tenant Database Setup
-- Run these queries in order
-- ============================================

-- Step 1: Check if Glow tenant exists
SELECT id, name, subdomain, created_at
FROM tenants
WHERE subdomain = 'glow';

-- If no results, create Glow tenant:
INSERT INTO tenants (
  id,
  name,
  subdomain,
  created_at,
  updated_at
) VALUES (
  '4b9c1713-40ab-460b-8dda-5a8cf6cbc9b5',
  'Glow Dance Competition',
  'glow',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Verify tenant created:
SELECT * FROM tenants WHERE subdomain = 'glow';

-- ============================================
-- Step 2: Link Supabase User to Glow Tenant
-- ============================================

-- First, create user in Supabase Auth UI:
-- 1. Go to Supabase Dashboard → Authentication → Users
-- 2. Click "Add User"
-- 3. Email: glowdance@gmail.com
-- 4. Auto-generate password or set: GlowAdmin2025!
-- 5. Copy the user ID from Supabase

-- Then, update the user record to link to Glow tenant:
-- Replace [SUPABASE_USER_ID] with actual ID from Supabase Auth

UPDATE users
SET
  tenant_id = '4b9c1713-40ab-460b-8dda-5a8cf6cbc9b5',
  role = 'competition_director',
  updated_at = NOW()
WHERE email = 'glowdance@gmail.com';

-- Verify user linked correctly:
SELECT
  u.id,
  u.email,
  u.role,
  u.tenant_id,
  t.name as tenant_name,
  t.subdomain
FROM users u
JOIN tenants t ON u.tenant_id = t.id
WHERE u.email = 'glowdance@gmail.com';

-- ============================================
-- Step 3: Check if any competitions exist for Glow
-- ============================================

SELECT
  id,
  name,
  start_date,
  end_date,
  status,
  total_capacity,
  available_reservation_tokens
FROM competitions
WHERE tenant_id = '4b9c1713-40ab-460b-8dda-5a8cf6cbc9b5';

-- If no competitions, create a sample one:
INSERT INTO competitions (
  id,
  tenant_id,
  name,
  start_date,
  end_date,
  location,
  status,
  total_capacity,
  available_reservation_tokens,
  year,
  is_public,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  '4b9c1713-40ab-460b-8dda-5a8cf6cbc9b5',
  'Glow Dance Competition 2025',
  '2025-06-15',
  '2025-06-17',
  'TBD',
  'upcoming',
  1000,
  1000,
  2025,
  true,
  NOW(),
  NOW()
);

-- Verify competition created:
SELECT * FROM competitions
WHERE tenant_id = '4b9c1713-40ab-460b-8dda-5a8cf6cbc9b5';

-- ============================================
-- Step 4: Verify Tenant Isolation (CRITICAL)
-- ============================================

-- Check that no data is shared between tenants:

-- 1. Count records by tenant
SELECT
  'tenants' as table_name,
  COUNT(*) as count,
  NULL as tenant_name
FROM tenants
UNION ALL
SELECT
  'users' as table_name,
  COUNT(*) as count,
  t.name as tenant_name
FROM users u
LEFT JOIN tenants t ON u.tenant_id = t.id
GROUP BY t.name
UNION ALL
SELECT
  'competitions' as table_name,
  COUNT(*) as count,
  t.name as tenant_name
FROM competitions c
JOIN tenants t ON c.tenant_id = t.id
GROUP BY t.name
UNION ALL
SELECT
  'studios' as table_name,
  COUNT(*) as count,
  t.name as tenant_name
FROM studios s
JOIN tenants t ON s.tenant_id = t.id
GROUP BY t.name
UNION ALL
SELECT
  'dancers' as table_name,
  COUNT(*) as count,
  t.name as tenant_name
FROM dancers d
JOIN tenants t ON d.tenant_id = t.id
GROUP BY t.name;

-- 2. Check for cross-tenant data leaks (should return 0 rows):
SELECT
  'LEAK: Entry tenant != Competition tenant' as issue,
  e.id as entry_id,
  e.tenant_id as entry_tenant,
  c.tenant_id as comp_tenant
FROM competition_entries e
JOIN competitions c ON e.competition_id = c.id
WHERE e.tenant_id != c.tenant_id

UNION ALL

SELECT
  'LEAK: Entry tenant != Dancer tenant' as issue,
  e.id as entry_id,
  e.tenant_id as entry_tenant,
  d.tenant_id as dancer_tenant
FROM competition_entries e
JOIN dancers d ON e.dancer_id = d.id
WHERE e.tenant_id != d.tenant_id

UNION ALL

SELECT
  'LEAK: Dancer tenant != Studio tenant' as issue,
  d.id as dancer_id,
  d.tenant_id as dancer_tenant,
  s.tenant_id as studio_tenant
FROM dancers d
JOIN studios s ON d.studio_id = s.id
WHERE d.tenant_id != s.tenant_id

UNION ALL

SELECT
  'LEAK: Reservation tenant != Studio tenant' as issue,
  r.id as reservation_id,
  r.tenant_id as reservation_tenant,
  s.tenant_id as studio_tenant
FROM reservations r
JOIN studios s ON r.studio_id = s.id
WHERE r.tenant_id != s.tenant_id;

-- If any rows returned, STOP and investigate!

-- ============================================
-- Step 5: Optional - Copy EMPWR Settings to Glow
-- ============================================

-- If you want Glow to start with EMPWR's configured settings:
UPDATE tenants
SET
  age_division_settings = (
    SELECT age_division_settings
    FROM tenants
    WHERE id = '00000000-0000-0000-0000-000000000001'
  ),
  dance_category_settings = (
    SELECT dance_category_settings
    FROM tenants
    WHERE id = '00000000-0000-0000-0000-000000000001'
  ),
  entry_size_settings = (
    SELECT entry_size_settings
    FROM tenants
    WHERE id = '00000000-0000-0000-0000-000000000001'
  ),
  entry_fee_settings = (
    SELECT entry_fee_settings
    FROM tenants
    WHERE id = '00000000-0000-0000-0000-000000000001'
  ),
  classification_settings = (
    SELECT classification_settings
    FROM tenants
    WHERE id = '00000000-0000-0000-0000-000000000001'
  ),
  scoring_system_settings = (
    SELECT scoring_system_settings
    FROM tenants
    WHERE id = '00000000-0000-0000-0000-000000000001'
  ),
  award_settings = (
    SELECT award_settings
    FROM tenants
    WHERE id = '00000000-0000-0000-0000-000000000001'
  ),
  updated_at = NOW()
WHERE id = '4b9c1713-40ab-460b-8dda-5a8cf6cbc9b5';

-- Verify settings copied:
SELECT
  name,
  age_division_settings IS NOT NULL as has_age_divisions,
  dance_category_settings IS NOT NULL as has_dance_categories,
  entry_size_settings IS NOT NULL as has_entry_sizes,
  scoring_system_settings IS NOT NULL as has_scoring,
  award_settings IS NOT NULL as has_awards
FROM tenants
WHERE subdomain = 'glow';

-- ============================================
-- Step 6: Final Verification Checklist
-- ============================================

-- Run this query to verify everything is set up:
SELECT
  '1. Tenant exists' as check_item,
  CASE WHEN COUNT(*) > 0 THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM tenants WHERE subdomain = 'glow'

UNION ALL

SELECT
  '2. Admin user exists' as check_item,
  CASE WHEN COUNT(*) > 0 THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM users
WHERE tenant_id = '4b9c1713-40ab-460b-8dda-5a8cf6cbc9b5'
  AND role = 'competition_director'

UNION ALL

SELECT
  '3. Admin user has correct email' as check_item,
  CASE WHEN COUNT(*) > 0 THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM users
WHERE tenant_id = '4b9c1713-40ab-460b-8dda-5a8cf6cbc9b5'
  AND email = 'glowdance@gmail.com'

UNION ALL

SELECT
  '4. At least one competition exists' as check_item,
  CASE WHEN COUNT(*) > 0 THEN '✅ PASS' ELSE '⚠️  OPTIONAL' END as status
FROM competitions
WHERE tenant_id = '4b9c1713-40ab-460b-8dda-5a8cf6cbc9b5'

UNION ALL

SELECT
  '5. Settings configured' as check_item,
  CASE
    WHEN COUNT(*) > 0
      AND age_division_settings IS NOT NULL
    THEN '✅ PASS'
    ELSE '⚠️  OPTIONAL'
  END as status
FROM tenants
WHERE subdomain = 'glow'

UNION ALL

SELECT
  '6. No cross-tenant leaks' as check_item,
  CASE WHEN COUNT(*) = 0 THEN '✅ PASS' ELSE '❌ CRITICAL LEAK' END as status
FROM (
  SELECT e.id
  FROM competition_entries e
  JOIN competitions c ON e.competition_id = c.id
  WHERE e.tenant_id != c.tenant_id
  UNION ALL
  SELECT e.id
  FROM competition_entries e
  JOIN dancers d ON e.dancer_id = d.id
  WHERE e.tenant_id != d.tenant_id
) leaks;

-- ============================================
-- DONE!
-- Next steps:
-- 1. Login at https://glow.compsync.net/login
-- 2. Use: glowdance@gmail.com + password from Supabase
-- 3. Verify you can ONLY see Glow data (not EMPWR)
-- ============================================
