-- Comprehensive studio data analysis

-- 1. All studios with emails categorized
SELECT 
  t.subdomain as tenant,
  s.name as studio_name,
  s.email,
  s.status,
  CASE WHEN s.owner_id IS NULL THEN 'UNCLAIMED' ELSE 'CLAIMED' END as claim_status,
  CASE 
    WHEN s.email IS NULL THEN '🔴 MISSING'
    WHEN s.email LIKE '%,%' THEN '🟡 MULTIPLE (comma)'
    WHEN s.email LIKE '%;%' THEN '🟡 MULTIPLE (semicolon)'
    WHEN s.email LIKE '% %' THEN '🟡 MULTIPLE (space)'
    ELSE '✅ OK'
  END as email_check
FROM studios s
JOIN tenants t ON s.tenant_id = t.id
ORDER BY t.subdomain, s.name;

-- 2. Studios with similar names (potential duplicates)
SELECT 
  t.subdomain,
  s1.name as studio1,
  s1.email as email1,
  s2.name as studio2, 
  s2.email as email2
FROM studios s1
JOIN studios s2 ON s1.tenant_id = s2.tenant_id 
  AND s1.id < s2.id
  AND (
    LOWER(s1.name) = LOWER(s2.name)
    OR LOWER(REPLACE(s1.name, ' ', '')) = LOWER(REPLACE(s2.name, ' ', ''))
  )
JOIN tenants t ON s1.tenant_id = t.id
ORDER BY t.subdomain, s1.name;

-- 3. Summary counts
SELECT 
  t.subdomain,
  COUNT(*) as total_studios,
  COUNT(s.email) as with_email,
  COUNT(*) - COUNT(s.email) as missing_email,
  COUNT(CASE WHEN s.owner_id IS NULL THEN 1 END) as unclaimed,
  COUNT(CASE WHEN s.owner_id IS NOT NULL THEN 1 END) as claimed
FROM studios s
JOIN tenants t ON s.tenant_id = t.id
GROUP BY t.subdomain
ORDER BY t.subdomain;
