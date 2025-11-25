-- Missing Studios from Excel Audit
-- Ready to insert when client confirms
-- Glow tenant: 4b9c1713-40ab-460b-8dda-5a8cf6cbc9b5

-- 1. Body Lines Dance & Fitness
INSERT INTO studios (
  id,
  tenant_id,
  name,
  public_code,
  email,
  owner_id,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  '4b9c1713-40ab-460b-8dda-5a8cf6cbc9b5',
  'Body Lines Dance & Fitness',
  'BDL3F', -- Generated code
  NULL, -- Email unknown - client will provide
  NULL, -- Unclaimed
  NOW(),
  NOW()
);

-- 2. Peak Dance Company
INSERT INTO studios (
  id,
  tenant_id,
  name,
  public_code,
  email,
  owner_id,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  '4b9c1713-40ab-460b-8dda-5a8cf6cbc9b5',
  'Peak Dance Company',
  'PDC8M', -- Generated code
  NULL, -- Email unknown - client will provide
  NULL, -- Unclaimed
  NOW(),
  NOW()
);

-- 3. Rebel Dance Company
-- NOTE: Verify with client if this is different from existing "Rebel" studio
-- Existing "Rebel" has code RBL5E - this would be separate if confirmed
INSERT INTO studios (
  id,
  tenant_id,
  name,
  public_code,
  email,
  owner_id,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  '4b9c1713-40ab-460b-8dda-5a8cf6cbc9b5',
  'Rebel Dance Company',
  'RDC2Y', -- Generated code (different from RBL5E)
  NULL, -- Email unknown - client will provide
  NULL, -- Unclaimed
  NOW(),
  NOW()
);

-- 4. Steppin Up
INSERT INTO studios (
  id,
  tenant_id,
  name,
  public_code,
  email,
  owner_id,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  '4b9c1713-40ab-460b-8dda-5a8cf6cbc9b5',
  'Steppin Up',
  'STP4U', -- Generated code
  NULL, -- Email unknown - client will provide
  NULL, -- Unclaimed
  NOW(),
  NOW()
);

-- VERIFICATION QUERY (run after insert):
-- SELECT id, name, public_code, email, owner_id
-- FROM studios
-- WHERE name IN ('Body Lines Dance & Fitness', 'Peak Dance Company', 'Rebel Dance Company', 'Steppin Up')
-- AND tenant_id = '4b9c1713-40ab-460b-8dda-5a8cf6cbc9b5';
