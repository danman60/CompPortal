-- Create reservations for Glow tenant studios
-- Data source: 3 Excel files provided by Selena (Glow CD)
-- All reservations are pre-approved with deposits, credits, and discounts

-- Competition IDs:
-- St. Catharines Spring: 6c433126-d10b-4198-9eee-2f00187a011d
-- Blue Mountain Spring: 5607b8e5-06dd-4d14-99f6-dfa335df82d3
-- Blue Mountain Summer: 59d8567b-018f-409b-8e51-3940406197a4

-- File 1: St. Catharines Spring (april 9-12)
INSERT INTO reservations (
  tenant_id, studio_id, competition_id,
  requested_entry_count, approved_entry_count,
  deposit_amount, credits_applied, discount_percentage,
  status, created_at, approved_at
)
SELECT
  '4b9c1713-40ab-460b-8dda-5a8cf6cbc9b5',
  s.id,
  '6c433126-d10b-4198-9eee-2f00187a011d',
  entries, entries,
  deposit, credits, discount,
  'approved', NOW(), NOW()
FROM (VALUES
  ('NJD5A', 100, 500, 800, 10),
  ('NL8GH', 55, 500, 475, 10),
  ('TYL3R', 60, 500, 500, 10),
  ('DCR7E', 60, 500, 0, 10),
  ('DXT9K', 40, 500, 0, 10),
  ('EXP4S', 30, 500, 0, 10),
  ('IMP2C', 40, 500, 625, 10),
  ('S5196', 50, 500, 0, 10)
) AS data(public_code, entries, deposit, credits, discount)
JOIN studios s ON s.public_code = data.public_code AND s.tenant_id = '4b9c1713-40ab-460b-8dda-5a8cf6cbc9b5';

-- File 2: Blue Mountain Spring (april 23-26)
INSERT INTO reservations (
  tenant_id, studio_id, competition_id,
  requested_entry_count, approved_entry_count,
  deposit_amount, credits_applied, discount_percentage,
  status, created_at, approved_at
)
SELECT
  '4b9c1713-40ab-460b-8dda-5a8cf6cbc9b5',
  s.id,
  '5607b8e5-06dd-4d14-99f6-dfa335df82d3',
  entries, entries,
  deposit, credits, discount,
  'approved', NOW(), NOW()
FROM (VALUES
  ('POS8D', 70, 500, 900, 10),
  ('DLG4Y', 80, 500, 675, 10),
  ('DTS3C', 100, 500, 1000, 10),
  ('CSH7A', 70, 500, 875, 10),
  ('DST9N', 50, 500, 625, 10),
  ('UXB5E', 50, 500, 100, 10),
  ('FVR2E', 50, 500, 0, 10),
  ('DNG6L', 30, 500, 0, 10),
  ('CDA4K', 40, 500, 0, 10),
  ('DPR7T', 70, 500, 0, 10)
) AS data(public_code, entries, deposit, credits, discount)
JOIN studios s ON s.public_code = data.public_code AND s.tenant_id = '4b9c1713-40ab-460b-8dda-5a8cf6cbc9b5';

-- File 3: Blue Mountain Summer (june 4-7)
INSERT INTO reservations (
  tenant_id, studio_id, competition_id,
  requested_entry_count, approved_entry_count,
  deposit_amount, credits_applied, discount_percentage,
  status, created_at, approved_at
)
SELECT
  '4b9c1713-40ab-460b-8dda-5a8cf6cbc9b5',
  s.id,
  '59d8567b-018f-409b-8e51-3940406197a4',
  entries, entries,
  deposit, credits, discount,
  'approved', NOW(), NOW()
FROM (VALUES
  ('KDF3F', 80, 500, 100, 10),
  ('DMK8R', 50, 500, 225, 10),
  ('RBL5E', 50, 500, 0, 10),
  ('PRD9Y', 60, 500, 150, 10),
  ('LGC6A', 40, 500, 0, 10),
  ('MRP2S', 60, 500, 0, 10),
  ('GDD4R', 40, 500, 0, 10)
) AS data(public_code, entries, deposit, credits, discount)
JOIN studios s ON s.public_code = data.public_code AND s.tenant_id = '4b9c1713-40ab-460b-8dda-5a8cf6cbc9b5';
