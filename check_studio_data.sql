-- All studios with their email and basic info
SELECT 
  s.id,
  s.name,
  s.email,
  s.status,
  s.owner_id,
  t.name as tenant_name,
  t.subdomain,
  CASE 
    WHEN s.email IS NULL THEN 'MISSING EMAIL'
    WHEN s.email LIKE '%,%' THEN 'MULTIPLE EMAILS'
    WHEN s.email LIKE '%;%' THEN 'MULTIPLE EMAILS (semicolon)'
    ELSE 'OK'
  END as email_status
FROM studios s
JOIN tenants t ON s.tenant_id = t.id
ORDER BY t.subdomain, s.name;
