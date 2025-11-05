-- Update time limits for entry size categories
-- Standard dance competition time limits

-- EMPWR tenant (00000000-0000-0000-0000-000000000001)
UPDATE entry_size_categories 
SET max_time_minutes = 3, max_time_seconds = 0 
WHERE name = 'Solo' AND tenant_id = '00000000-0000-0000-0000-000000000001';

UPDATE entry_size_categories 
SET max_time_minutes = 3, max_time_seconds = 0 
WHERE name IN ('Duet', 'Trio') AND tenant_id = '00000000-0000-0000-0000-000000000001';

UPDATE entry_size_categories 
SET max_time_minutes = 4, max_time_seconds = 0 
WHERE name = 'Small Group' AND tenant_id = '00000000-0000-0000-0000-000000000001';

UPDATE entry_size_categories 
SET max_time_minutes = 5, max_time_seconds = 0 
WHERE name = 'Large Group' AND tenant_id = '00000000-0000-0000-0000-000000000001';

UPDATE entry_size_categories 
SET max_time_minutes = 5, max_time_seconds = 0 
WHERE name = 'Line' AND tenant_id = '00000000-0000-0000-0000-000000000001';

UPDATE entry_size_categories 
SET max_time_minutes = 6, max_time_seconds = 0 
WHERE name = 'Super Line' AND tenant_id = '00000000-0000-0000-0000-000000000001';

UPDATE entry_size_categories 
SET max_time_minutes = 7, max_time_seconds = 0 
WHERE name = 'Production' AND tenant_id = '00000000-0000-0000-0000-000000000001';

-- Glow tenant (4b9c1713-40ab-460b-8dda-5a8cf6cbc9b5)
UPDATE entry_size_categories 
SET max_time_minutes = 3, max_time_seconds = 0 
WHERE name = 'Solo' AND tenant_id = '4b9c1713-40ab-460b-8dda-5a8cf6cbc9b5';

UPDATE entry_size_categories 
SET max_time_minutes = 3, max_time_seconds = 0 
WHERE name IN ('Duet', 'Trio') AND tenant_id = '4b9c1713-40ab-460b-8dda-5a8cf6cbc9b5';

UPDATE entry_size_categories 
SET max_time_minutes = 4, max_time_seconds = 0 
WHERE name = 'Small Group' AND tenant_id = '4b9c1713-40ab-460b-8dda-5a8cf6cbc9b5';

UPDATE entry_size_categories 
SET max_time_minutes = 5, max_time_seconds = 0 
WHERE name = 'Large Group' AND tenant_id = '4b9c1713-40ab-460b-8dda-5a8cf6cbc9b5';

UPDATE entry_size_categories 
SET max_time_minutes = 5, max_time_seconds = 0 
WHERE name = 'Line' AND tenant_id = '4b9c1713-40ab-460b-8dda-5a8cf6cbc9b5';

UPDATE entry_size_categories 
SET max_time_minutes = 6, max_time_seconds = 0 
WHERE name = 'Super Line' AND tenant_id = '4b9c1713-40ab-460b-8dda-5a8cf6cbc9b5';

UPDATE entry_size_categories 
SET max_time_minutes = 7, max_time_seconds = 0 
WHERE name = 'Production' AND tenant_id = '4b9c1713-40ab-460b-8dda-5a8cf6cbc9b5';

-- Verify
SELECT name, max_time_minutes, max_time_seconds, tenant_id 
FROM entry_size_categories 
ORDER BY tenant_id, min_participants;
