-- Update max age to 80 for all age groups in EMPWR tenant
-- Cosmetic fix: Display shows 5-80 instead of 5-999
-- Does NOT affect logic, only improves UX

UPDATE age_groups
SET max_age = 80
WHERE tenant_id = '00000000-0000-0000-0000-000000000001'
  AND max_age > 80;

-- Verify changes
SELECT id, name, min_age, max_age, tenant_id
FROM age_groups
WHERE tenant_id = '00000000-0000-0000-0000-000000000001'
ORDER BY sort_order;
