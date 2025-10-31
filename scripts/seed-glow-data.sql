-- Seed Glow Tenant Reservations
-- Source: 3 Excel files from Selena (Glow CD)
-- Date: October 31, 2025
-- Status: Ready for production deployment

-- Competition IDs (from Glow tenant):
-- St. Catharines Spring: 6c433126-d10b-4198-9eee-2f00187a011d
-- Blue Mountain Spring: 5607b8e5-06dd-4d14-99f6-dfa335df82d3
-- Blue Mountain Summer: 59d8567b-018f-409b-8e51-3940406197a4

-- Glow Tenant ID
-- 4b9c1713-40ab-460b-8dda-5a8cf6cbc9b5

BEGIN;

-- File 1: april 9-12 st catharines.xlsx (8 studios)
-- Competition: GLOW St. Catharines Spring 2026

INSERT INTO studios (tenant_id, name, code, public_code, contact_email, status, created_at)
VALUES
  ('4b9c1713-40ab-460b-8dda-5a8cf6cbc9b5', 'NJADS', 'NJADS', 'NJD5A', 'hello@njads.ca', 'approved', NOW()),
  ('4b9c1713-40ab-460b-8dda-5a8cf6cbc9b5', 'Northern Lights', 'NLIGHTS', 'NL8GH', 'christineeagle@ymail.com', 'approved', NOW()),
  ('4b9c1713-40ab-460b-8dda-5a8cf6cbc9b5', 'Taylors Dance', 'TAYLORS', 'TYL3R', 'taylorsdance2018@outlook.com', 'approved', NOW()),
  ('4b9c1713-40ab-460b-8dda-5a8cf6cbc9b5', 'Dancecore', 'DCORE', 'DCR7E', 'dancecorecompany@gmail.com', 'approved', NOW()),
  ('4b9c1713-40ab-460b-8dda-5a8cf6cbc9b5', 'The Dance Extension', 'DEXT', 'DXT9K', 'thedanceextensioninc@gmail.com', 'approved', NOW()),
  ('4b9c1713-40ab-460b-8dda-5a8cf6cbc9b5', 'Expressions Dance', 'EXPRESS', 'EXP4S', 'expressionsdanceperformingarts@gmail.com', 'approved', NOW()),
  ('4b9c1713-40ab-460b-8dda-5a8cf6cbc9b5', 'Impact Dance Complex', 'IMPACT', 'IMP2C', 'impactdanceinfo@gmail.com', 'approved', NOW()),
  ('4b9c1713-40ab-460b-8dda-5a8cf6cbc9b5', 'Studio 519', 'S519', 'S5196', 'studio519dance@gmail.com', 'approved', NOW())
ON CONFLICT (name, tenant_id) DO NOTHING;

-- File 2: april 23-26th blue mountain.xlsx (10 studios)
-- Competition: GLOW Blue Mountain Spring 2026

INSERT INTO studios (tenant_id, name, code, public_code, contact_email, status, created_at)
VALUES
  ('4b9c1713-40ab-460b-8dda-5a8cf6cbc9b5', 'Poise Dance Academy', 'POISE', 'POS8D', 'comp@poisedance.ca', 'approved', NOW()),
  ('4b9c1713-40ab-460b-8dda-5a8cf6cbc9b5', 'Danceology', 'DOLOGY', 'DLG4Y', 'dmkdanceology@gmail.com', 'approved', NOW()),
  ('4b9c1713-40ab-460b-8dda-5a8cf6cbc9b5', 'Dancetastic', 'DTASTIC', 'DTS3C', 'liz@dancetasticcanada.com', 'approved', NOW()),
  ('4b9c1713-40ab-460b-8dda-5a8cf6cbc9b5', 'Cassiahs Dance Company', 'CASSIAH', 'CSH7A', 'cassiahs.comp@gmail.com', 'approved', NOW()),
  ('4b9c1713-40ab-460b-8dda-5a8cf6cbc9b5', 'Dancesations', 'DSATIONS', 'DST9N', 'nikki@danicasations.com', 'approved', NOW()),
  ('4b9c1713-40ab-460b-8dda-5a8cf6cbc9b5', 'Uxbridge', 'UXBRIDGE', 'UXB5E', 'uxbridgedanceacademy@gmail.com', 'approved', NOW()),
  ('4b9c1713-40ab-460b-8dda-5a8cf6cbc9b5', 'Fever', 'FEVER', 'FVR2E', 'feverdanceacademy@gmail.com', 'approved', NOW()),
  ('4b9c1713-40ab-460b-8dda-5a8cf6cbc9b5', 'Dancing Angels', 'DANGELS', 'DNG6L', 'sharonelliot123@gmail.com', 'approved', NOW()),
  ('4b9c1713-40ab-460b-8dda-5a8cf6cbc9b5', 'CDA', 'CDA', 'CDA4K', 'caprioldanceacademycomp@gmail.com', 'approved', NOW()),
  ('4b9c1713-40ab-460b-8dda-5a8cf6cbc9b5', 'Dancepirations', 'DPIRATE', 'DPR7T', 'dancepirations@gmail.com', 'approved', NOW())
ON CONFLICT (name, tenant_id) DO NOTHING;

-- File 3: june 4-7 blue mountain.xlsx (7 studios)
-- Competition: GLOW Blue Mountain Summer 2026

INSERT INTO studios (tenant_id, name, code, public_code, contact_email, status, created_at)
VALUES
  ('4b9c1713-40ab-460b-8dda-5a8cf6cbc9b5', 'Kingston Dance Force', 'KDF', 'KDF3F', 'sarrah@danceforce.ca', 'approved', NOW()),
  ('4b9c1713-40ab-460b-8dda-5a8cf6cbc9b5', 'Dancemakers', 'DMAKERS', 'DMK8R', 'mijkahooper@yahoo.ca', 'approved', NOW()),
  ('4b9c1713-40ab-460b-8dda-5a8cf6cbc9b5', 'Rebel', 'REBEL', 'RBL5E', 'rebeldancecompany@gmail.com', 'approved', NOW()),
  ('4b9c1713-40ab-460b-8dda-5a8cf6cbc9b5', 'Prodigy Dance', 'PRODIGY', 'PRD9Y', 'prodigydance2021@gmail.com', 'approved', NOW()),
  ('4b9c1713-40ab-460b-8dda-5a8cf6cbc9b5', 'Legacy Acro', 'LEGACY', 'LGC6A', 'legacyacro@gmail.com', 'approved', NOW()),
  ('4b9c1713-40ab-460b-8dda-5a8cf6cbc9b5', 'Mariposa', 'MARIPOSA', 'MRP2S', 'mariposa.dance@gmail.com', 'approved', NOW()),
  ('4b9c1713-40ab-460b-8dda-5a8cf6cbc9b5', 'Goddards', 'GODDARD', 'GDD4R', 'goddardsdanceacademy@gmail.com', 'approved', NOW())
ON CONFLICT (name, tenant_id) DO NOTHING;

COMMIT;
