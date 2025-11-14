-- Create Tester Tenant for tester.compsync.net
-- SAFE: Only creates if not exists, does NOT affect EMPWR or Glow tenants

-- Verify EMPWR and Glow exist and are untouched
SELECT id, subdomain, name FROM tenants
WHERE subdomain IN ('empwr', 'glow')
ORDER BY subdomain;

-- Check if tester tenant already exists
SELECT id, subdomain, name FROM tenants
WHERE id = '00000000-0000-0000-0000-000000000003'
   OR subdomain = 'tester';

-- Create tester tenant ONLY if it doesn't exist
INSERT INTO tenants (
  id,
  subdomain,
  slug,
  name,
  branding,
  email_settings,
  created_at,
  updated_at
)
SELECT
  '00000000-0000-0000-0000-000000000003'::uuid,
  'tester',
  'test',
  'Test Environment',
  '{}'::jsonb,
  '{}'::jsonb,
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM tenants
  WHERE id = '00000000-0000-0000-0000-000000000003'
);

-- Verify creation
SELECT id, subdomain, slug, name, created_at
FROM tenants
WHERE subdomain = 'tester';

-- Verify test competition exists and has correct tenant_id
SELECT id, name, tenant_id
FROM competitions
WHERE id = '1b786221-8f8e-413f-b532-06fa20a2ff63';

-- Count routines by tenant (should show EMPWR, Glow, and Test separately)
SELECT
  t.subdomain,
  COUNT(ce.id) as routine_count
FROM tenants t
LEFT JOIN competitions c ON c.tenant_id = t.id
LEFT JOIN competition_entries ce ON ce.competition_id = c.id
GROUP BY t.id, t.subdomain
ORDER BY t.subdomain;
