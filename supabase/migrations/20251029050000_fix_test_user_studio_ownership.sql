-- Fix test user studio ownership for CSV import testing
-- Assign "asd" studio to djamusic@gmail.com

UPDATE public.studios
SET owner_id = 'd72df930-c114-4de1-9f9d-06aa7d28b2ce'
WHERE id = 'de74304a-c0b3-4a5b-85d3-80c4d4c7073a'
  AND tenant_id = '00000000-0000-0000-0000-000000000001';
