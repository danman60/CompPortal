-- Multi-Routine Test Data - 30 Competition Entries with Participants
-- Reservation: f3defc45-6736-4f2e-a2c5-a0ca277ad574
-- 20 dancers, each in 13-15 routines
-- Design: D:\ClaudeCode\CompPortal\MULTI_ROUTINE_TEST_DATA_DESIGN.md

-- PART 1: Insert 30 competition entries
INSERT INTO competition_entries (
  tenant_id, competition_id, reservation_id, studio_id, age_group_id,
  title, category_id, classification_id, entry_size_category_id,
  is_title_upgrade, extended_time_requested,
  entry_fee, total_fee, status
)
VALUES
  -- Production Numbers (3 entries, 20 dancers each)
  ('00000000-0000-0000-0000-000000000001', '79cef00c-e163-449c-9f3c-d021fbb4d672', 'f3defc45-6736-4f2e-a2c5-a0ca277ad574', '2a811127-7b5e-4447-affa-046c76ded8da', '443b2620-8afe-4ee2-b0ac-ff75951eac89',
   'Opening Number', '6fa0dce5-a15e-4ac6-a915-8ca2f0dee86e', '93998eb8-5925-4c39-b370-bd799c6988eb', 'f6d579db-4e2f-4129-804c-cba38103aa03',
   true, true, 115.00, 150.00, 'registered'),

  ('00000000-0000-0000-0000-000000000001', '79cef00c-e163-449c-9f3c-d021fbb4d672', 'f3defc45-6736-4f2e-a2c5-a0ca277ad574', '2a811127-7b5e-4447-affa-046c76ded8da', '443b2620-8afe-4ee2-b0ac-ff75951eac89',
   'Grand Finale', '890c7630-ba83-4f1d-947f-59173a5d869f', '93998eb8-5925-4c39-b370-bd799c6988eb', 'f6d579db-4e2f-4129-804c-cba38103aa03',
   true, false, 115.00, 125.00, 'registered'),

  ('00000000-0000-0000-0000-000000000001', '79cef00c-e163-449c-9f3c-d021fbb4d672', 'f3defc45-6736-4f2e-a2c5-a0ca277ad574', '2a811127-7b5e-4447-affa-046c76ded8da', '443b2620-8afe-4ee2-b0ac-ff75951eac89',
   'Unity', '01048636-14a4-4f11-9edc-c1d699e7b6ab', '93998eb8-5925-4c39-b370-bd799c6988eb', 'f6d579db-4e2f-4129-804c-cba38103aa03',
   false, true, 115.00, 140.00, 'registered'),

  -- Large Group Routines (4 entries, 12-15 dancers each)
  ('00000000-0000-0000-0000-000000000001', '79cef00c-e163-449c-9f3c-d021fbb4d672', 'f3defc45-6736-4f2e-a2c5-a0ca277ad574', '2a811127-7b5e-4447-affa-046c76ded8da', '443b2620-8afe-4ee2-b0ac-ff75951eac89',
   'Power', 'ab8393a1-87aa-4934-bbd4-94f09af45e99', '3804704c-3552-412a-9fc8-afa1c3a04536', 'f171316e-f37e-4f67-95de-9d5b1cf317bd',
   false, false, 115.00, 115.00, 'registered'),

  ('00000000-0000-0000-0000-000000000001', '79cef00c-e163-449c-9f3c-d021fbb4d672', 'f3defc45-6736-4f2e-a2c5-a0ca277ad574', '2a811127-7b5e-4447-affa-046c76ded8da', '443b2620-8afe-4ee2-b0ac-ff75951eac89',
   'Elegance', 'f3a58c90-71e5-4194-a4c9-c732c1021069', '3804704c-3552-412a-9fc8-afa1c3a04536', 'f171316e-f37e-4f67-95de-9d5b1cf317bd',
   false, true, 115.00, 140.00, 'registered'),

  ('00000000-0000-0000-0000-000000000001', '79cef00c-e163-449c-9f3c-d021fbb4d672', 'f3defc45-6736-4f2e-a2c5-a0ca277ad574', '2a811127-7b5e-4447-affa-046c76ded8da', '443b2620-8afe-4ee2-b0ac-ff75951eac89',
   'Rhythm Nation', '21cf4ca9-bdfd-4069-bdc5-6a42c3776fff', '3804704c-3552-412a-9fc8-afa1c3a04536', 'f171316e-f37e-4f67-95de-9d5b1cf317bd',
   true, false, 115.00, 125.00, 'registered'),

  ('00000000-0000-0000-0000-000000000001', '79cef00c-e163-449c-9f3c-d021fbb4d672', 'f3defc45-6736-4f2e-a2c5-a0ca277ad574', '2a811127-7b5e-4447-affa-046c76ded8da', '443b2620-8afe-4ee2-b0ac-ff75951eac89',
   'Dreamscape', '8054a231-967e-4c52-83b1-b84f8090eaee', '3804704c-3552-412a-9fc8-afa1c3a04536', 'f171316e-f37e-4f67-95de-9d5b1cf317bd',
   true, true, 115.00, 150.00, 'registered'),

  -- Small Group Routines (8 entries, 5-9 dancers each)
  ('00000000-0000-0000-0000-000000000001', '79cef00c-e163-449c-9f3c-d021fbb4d672', 'f3defc45-6736-4f2e-a2c5-a0ca277ad574', '2a811127-7b5e-4447-affa-046c76ded8da', '443b2620-8afe-4ee2-b0ac-ff75951eac89',
   'Firefly', '01048636-14a4-4f11-9edc-c1d699e7b6ab', '3804704c-3552-412a-9fc8-afa1c3a04536', 'c16e265b-a8f3-4194-a657-1814fb041ad8',
   false, false, 115.00, 115.00, 'registered'),

  ('00000000-0000-0000-0000-000000000001', '79cef00c-e163-449c-9f3c-d021fbb4d672', 'f3defc45-6736-4f2e-a2c5-a0ca277ad574', '2a811127-7b5e-4447-affa-046c76ded8da', '443b2620-8afe-4ee2-b0ac-ff75951eac89',
   'Breakout', 'ab8393a1-87aa-4934-bbd4-94f09af45e99', '3804704c-3552-412a-9fc8-afa1c3a04536', 'c16e265b-a8f3-4194-a657-1814fb041ad8',
   false, false, 115.00, 115.00, 'registered'),

  ('00000000-0000-0000-0000-000000000001', '79cef00c-e163-449c-9f3c-d021fbb4d672', 'f3defc45-6736-4f2e-a2c5-a0ca277ad574', '2a811127-7b5e-4447-affa-046c76ded8da', '443b2620-8afe-4ee2-b0ac-ff75951eac89',
   'Starlight', '8054a231-967e-4c52-83b1-b84f8090eaee', '3804704c-3552-412a-9fc8-afa1c3a04536', 'c16e265b-a8f3-4194-a657-1814fb041ad8',
   false, true, 115.00, 140.00, 'registered'),

  ('00000000-0000-0000-0000-000000000001', '79cef00c-e163-449c-9f3c-d021fbb4d672', 'f3defc45-6736-4f2e-a2c5-a0ca277ad574', '2a811127-7b5e-4447-affa-046c76ded8da', '443b2620-8afe-4ee2-b0ac-ff75951eac89',
   'Velocity', '890c7630-ba83-4f1d-947f-59173a5d869f', '3804704c-3552-412a-9fc8-afa1c3a04536', 'c16e265b-a8f3-4194-a657-1814fb041ad8',
   true, false, 115.00, 125.00, 'registered'),

  ('00000000-0000-0000-0000-000000000001', '79cef00c-e163-449c-9f3c-d021fbb4d672', 'f3defc45-6736-4f2e-a2c5-a0ca277ad574', '2a811127-7b5e-4447-affa-046c76ded8da', '443b2620-8afe-4ee2-b0ac-ff75951eac89',
   'Nostalgia', '01048636-14a4-4f11-9edc-c1d699e7b6ab', '3804704c-3552-412a-9fc8-afa1c3a04536', 'c16e265b-a8f3-4194-a657-1814fb041ad8',
   false, false, 115.00, 115.00, 'registered'),

  ('00000000-0000-0000-0000-000000000001', '79cef00c-e163-449c-9f3c-d021fbb4d672', 'f3defc45-6736-4f2e-a2c5-a0ca277ad574', '2a811127-7b5e-4447-affa-046c76ded8da', '443b2620-8afe-4ee2-b0ac-ff75951eac89',
   'Renaissance', '3f4322ac-f4cb-464b-85ad-a460967374f4', '3804704c-3552-412a-9fc8-afa1c3a04536', 'c16e265b-a8f3-4194-a657-1814fb041ad8',
   true, true, 115.00, 150.00, 'registered'),

  ('00000000-0000-0000-0000-000000000001', '79cef00c-e163-449c-9f3c-d021fbb4d672', 'f3defc45-6736-4f2e-a2c5-a0ca277ad574', '2a811127-7b5e-4447-affa-046c76ded8da', '443b2620-8afe-4ee2-b0ac-ff75951eac89',
   'Electric', 'ab8393a1-87aa-4934-bbd4-94f09af45e99', '3804704c-3552-412a-9fc8-afa1c3a04536', 'c16e265b-a8f3-4194-a657-1814fb041ad8',
   false, false, 115.00, 115.00, 'registered'),

  ('00000000-0000-0000-0000-000000000001', '79cef00c-e163-449c-9f3c-d021fbb4d672', 'f3defc45-6736-4f2e-a2c5-a0ca277ad574', '2a811127-7b5e-4447-affa-046c76ded8da', '443b2620-8afe-4ee2-b0ac-ff75951eac89',
   'Serenity', '8054a231-967e-4c52-83b1-b84f8090eaee', '3804704c-3552-412a-9fc8-afa1c3a04536', 'c16e265b-a8f3-4194-a657-1814fb041ad8',
   false, false, 115.00, 115.00, 'registered'),

  -- Trio Routines (5 entries, 3 dancers each)
  ('00000000-0000-0000-0000-000000000001', '79cef00c-e163-449c-9f3c-d021fbb4d672', 'f3defc45-6736-4f2e-a2c5-a0ca277ad574', '2a811127-7b5e-4447-affa-046c76ded8da', '443b2620-8afe-4ee2-b0ac-ff75951eac89',
   'Triple Threat', '890c7630-ba83-4f1d-947f-59173a5d869f', '3804704c-3552-412a-9fc8-afa1c3a04536', '03a36044-e756-4cc6-9d14-d8236bae5080',
   false, false, 115.00, 115.00, 'registered'),

  ('00000000-0000-0000-0000-000000000001', '79cef00c-e163-449c-9f3c-d021fbb4d672', 'f3defc45-6736-4f2e-a2c5-a0ca277ad574', '2a811127-7b5e-4447-affa-046c76ded8da', '443b2620-8afe-4ee2-b0ac-ff75951eac89',
   'Harmony', '8054a231-967e-4c52-83b1-b84f8090eaee', '3804704c-3552-412a-9fc8-afa1c3a04536', '03a36044-e756-4cc6-9d14-d8236bae5080',
   false, true, 115.00, 140.00, 'registered'),

  ('00000000-0000-0000-0000-000000000001', '79cef00c-e163-449c-9f3c-d021fbb4d672', 'f3defc45-6736-4f2e-a2c5-a0ca277ad574', '2a811127-7b5e-4447-affa-046c76ded8da', '443b2620-8afe-4ee2-b0ac-ff75951eac89',
   'Urban Legends', 'ab8393a1-87aa-4934-bbd4-94f09af45e99', '3804704c-3552-412a-9fc8-afa1c3a04536', '03a36044-e756-4cc6-9d14-d8236bae5080',
   false, false, 115.00, 115.00, 'registered'),

  ('00000000-0000-0000-0000-000000000001', '79cef00c-e163-449c-9f3c-d021fbb4d672', 'f3defc45-6736-4f2e-a2c5-a0ca277ad574', '2a811127-7b5e-4447-affa-046c76ded8da', '443b2620-8afe-4ee2-b0ac-ff75951eac89',
   'Moonlight', '01048636-14a4-4f11-9edc-c1d699e7b6ab', '3804704c-3552-412a-9fc8-afa1c3a04536', '03a36044-e756-4cc6-9d14-d8236bae5080',
   true, false, 115.00, 125.00, 'registered'),

  ('00000000-0000-0000-0000-000000000001', '79cef00c-e163-449c-9f3c-d021fbb4d672', 'f3defc45-6736-4f2e-a2c5-a0ca277ad574', '2a811127-7b5e-4447-affa-046c76ded8da', '443b2620-8afe-4ee2-b0ac-ff75951eac89',
   'Enchanted', '8054a231-967e-4c52-83b1-b84f8090eaee', '3804704c-3552-412a-9fc8-afa1c3a04536', '03a36044-e756-4cc6-9d14-d8236bae5080',
   false, false, 115.00, 115.00, 'registered'),

  -- Duet Routines (5 entries, 2 dancers each)
  ('00000000-0000-0000-0000-000000000001', '79cef00c-e163-449c-9f3c-d021fbb4d672', 'f3defc45-6736-4f2e-a2c5-a0ca277ad574', '2a811127-7b5e-4447-affa-046c76ded8da', '443b2620-8afe-4ee2-b0ac-ff75951eac89',
   'Together We Rise', '890c7630-ba83-4f1d-947f-59173a5d869f', '3804704c-3552-412a-9fc8-afa1c3a04536', '03a36044-e756-4cc6-9d14-d8236bae5080',
   false, false, 115.00, 115.00, 'registered'),

  ('00000000-0000-0000-0000-000000000001', '79cef00c-e163-449c-9f3c-d021fbb4d672', 'f3defc45-6736-4f2e-a2c5-a0ca277ad574', '2a811127-7b5e-4447-affa-046c76ded8da', '443b2620-8afe-4ee2-b0ac-ff75951eac89',
   'Stronger', '01048636-14a4-4f11-9edc-c1d699e7b6ab', '3804704c-3552-412a-9fc8-afa1c3a04536', '03a36044-e756-4cc6-9d14-d8236bae5080',
   false, true, 115.00, 140.00, 'registered'),

  ('00000000-0000-0000-0000-000000000001', '79cef00c-e163-449c-9f3c-d021fbb4d672', 'f3defc45-6736-4f2e-a2c5-a0ca277ad574', '2a811127-7b5e-4447-affa-046c76ded8da', '443b2620-8afe-4ee2-b0ac-ff75951eac89',
   'Synergy', 'ab8393a1-87aa-4934-bbd4-94f09af45e99', '3804704c-3552-412a-9fc8-afa1c3a04536', '03a36044-e756-4cc6-9d14-d8236bae5080',
   true, false, 115.00, 125.00, 'registered'),

  ('00000000-0000-0000-0000-000000000001', '79cef00c-e163-449c-9f3c-d021fbb4d672', 'f3defc45-6736-4f2e-a2c5-a0ca277ad574', '2a811127-7b5e-4447-affa-046c76ded8da', '443b2620-8afe-4ee2-b0ac-ff75951eac89',
   'Reflections', '8054a231-967e-4c52-83b1-b84f8090eaee', '3804704c-3552-412a-9fc8-afa1c3a04536', '03a36044-e756-4cc6-9d14-d8236bae5080',
   false, false, 115.00, 115.00, 'registered'),

  ('00000000-0000-0000-0000-000000000001', '79cef00c-e163-449c-9f3c-d021fbb4d672', 'f3defc45-6736-4f2e-a2c5-a0ca277ad574', '2a811127-7b5e-4447-affa-046c76ded8da', '443b2620-8afe-4ee2-b0ac-ff75951eac89',
   'Gravity', '01048636-14a4-4f11-9edc-c1d699e7b6ab', '3804704c-3552-412a-9fc8-afa1c3a04536', '03a36044-e756-4cc6-9d14-d8236bae5080',
   false, false, 115.00, 115.00, 'registered'),

  -- Solo Routines (5 entries, 1 dancer each)
  ('00000000-0000-0000-0000-000000000001', '79cef00c-e163-449c-9f3c-d021fbb4d672', 'f3defc45-6736-4f2e-a2c5-a0ca277ad574', '2a811127-7b5e-4447-affa-046c76ded8da', '443b2620-8afe-4ee2-b0ac-ff75951eac89',
   'Phoenix', '01048636-14a4-4f11-9edc-c1d699e7b6ab', '3804704c-3552-412a-9fc8-afa1c3a04536', '390f9890-9ca4-4741-8d68-0f488a4f6860',
   false, false, 115.00, 115.00, 'registered'),

  ('00000000-0000-0000-0000-000000000001', '79cef00c-e163-449c-9f3c-d021fbb4d672', 'f3defc45-6736-4f2e-a2c5-a0ca277ad574', '2a811127-7b5e-4447-affa-046c76ded8da', '443b2620-8afe-4ee2-b0ac-ff75951eac89',
   'Warrior', 'ab8393a1-87aa-4934-bbd4-94f09af45e99', '3804704c-3552-412a-9fc8-afa1c3a04536', '390f9890-9ca4-4741-8d68-0f488a4f6860',
   true, false, 115.00, 125.00, 'registered'),

  ('00000000-0000-0000-0000-000000000001', '79cef00c-e163-449c-9f3c-d021fbb4d672', 'f3defc45-6736-4f2e-a2c5-a0ca277ad574', '2a811127-7b5e-4447-affa-046c76ded8da', '443b2620-8afe-4ee2-b0ac-ff75951eac89',
   'Butterfly', '8054a231-967e-4c52-83b1-b84f8090eaee', '3804704c-3552-412a-9fc8-afa1c3a04536', '390f9890-9ca4-4741-8d68-0f488a4f6860',
   false, true, 115.00, 140.00, 'registered'),

  ('00000000-0000-0000-0000-000000000001', '79cef00c-e163-449c-9f3c-d021fbb4d672', 'f3defc45-6736-4f2e-a2c5-a0ca277ad574', '2a811127-7b5e-4447-affa-046c76ded8da', '443b2620-8afe-4ee2-b0ac-ff75951eac89',
   'Thunder', '890c7630-ba83-4f1d-947f-59173a5d869f', '3804704c-3552-412a-9fc8-afa1c3a04536', '390f9890-9ca4-4741-8d68-0f488a4f6860',
   false, false, 115.00, 115.00, 'registered'),

  ('00000000-0000-0000-0000-000000000001', '79cef00c-e163-449c-9f3c-d021fbb4d672', 'f3defc45-6736-4f2e-a2c5-a0ca277ad574', '2a811127-7b5e-4447-affa-046c76ded8da', '443b2620-8afe-4ee2-b0ac-ff75951eac89',
   'Ethereal', '01048636-14a4-4f11-9edc-c1d699e7b6ab', '3804704c-3552-412a-9fc8-afa1c3a04536', '390f9890-9ca4-4741-8d68-0f488a4f6860',
   true, true, 115.00, 150.00, 'registered');

-- PART 2: Add participants to all entries
-- This uses a simpler pattern-matching approach for dancer IDs

WITH entry_map AS (
  SELECT id, title FROM competition_entries
  WHERE reservation_id = 'f3defc45-6736-4f2e-a2c5-a0ca277ad574'
),
dancer_map AS (
  SELECT id, first_name || ' ' || last_name as name
  FROM dancers
  WHERE tenant_id = '00000000-0000-0000-0000-000000000001'
  AND studio_id = '2a811127-7b5e-4447-affa-046c76ded8da'
),
participants AS (
  -- Production 1: Opening Number (ALL 20)
  SELECT (SELECT id FROM entry_map WHERE title = 'Opening Number') as entry_id, id as dancer_id FROM dancer_map
  UNION ALL
  -- Production 2: Grand Finale (ALL 20)
  SELECT (SELECT id FROM entry_map WHERE title = 'Grand Finale'), id FROM dancer_map
  UNION ALL
  -- Production 3: Unity (ALL 20)
  SELECT (SELECT id FROM entry_map WHERE title = 'Unity'), id FROM dancer_map
  UNION ALL

  -- L1: Power (15 dancers: Alexander through Mason)
  SELECT (SELECT id FROM entry_map WHERE title = 'Power'), id FROM dancer_map WHERE name IN ('Alexander Martinez','Amelia Jones','Ava Jones','Benjamin Brown','Charlotte Williams','Emma Smith','Ethan Garcia','Evelyn Rodriguez','Harper Miller','Henry Davis','Isabella Rodriguez','James Johnson','Liam Johnson','Lucas Garcia','Mason Davis')
  UNION ALL

  -- L2: Elegance (12 dancers: Mia through Ethan)
  SELECT (SELECT id FROM entry_map WHERE title = 'Elegance'), id FROM dancer_map WHERE name IN ('Mia Smith','Noah Brown','Olivia Williams','Sophia Miller','William Martinez','Alexander Martinez','Amelia Jones','Ava Jones','Benjamin Brown','Charlotte Williams','Emma Smith','Ethan Garcia')
  UNION ALL

  -- L3: Rhythm Nation (14 dancers: Evelyn through Alexander)
  SELECT (SELECT id FROM entry_map WHERE title = 'Rhythm Nation'), id FROM dancer_map WHERE name IN ('Evelyn Rodriguez','Harper Miller','Henry Davis','Isabella Rodriguez','James Johnson','Liam Johnson','Lucas Garcia','Mason Davis','Mia Smith','Noah Brown','Olivia Williams','Sophia Miller','William Martinez','Alexander Martinez')
  UNION ALL

  -- L4: Dreamscape (13 dancers: Amelia through Lucas)
  SELECT (SELECT id FROM entry_map WHERE title = 'Dreamscape'), id FROM dancer_map WHERE name IN ('Amelia Jones','Ava Jones','Benjamin Brown','Charlotte Williams','Emma Smith','Ethan Garcia','Evelyn Rodriguez','Harper Miller','Henry Davis','Isabella Rodriguez','James Johnson','Liam Johnson','Lucas Garcia')
  UNION ALL

  -- SG1: Firefly (7 dancers)
  SELECT (SELECT id FROM entry_map WHERE title = 'Firefly'), id FROM dancer_map WHERE name IN ('Mason Davis','Mia Smith','Noah Brown','Olivia Williams','Sophia Miller','William Martinez','Alexander Martinez')
  UNION ALL

  -- SG2: Breakout (6 dancers)
  SELECT (SELECT id FROM entry_map WHERE title = 'Breakout'), id FROM dancer_map WHERE name IN ('Amelia Jones','Ava Jones','Benjamin Brown','Charlotte Williams','Emma Smith','Ethan Garcia')
  UNION ALL

  -- SG3: Starlight (8 dancers)
  SELECT (SELECT id FROM entry_map WHERE title = 'Starlight'), id FROM dancer_map WHERE name IN ('Evelyn Rodriguez','Harper Miller','Henry Davis','Isabella Rodriguez','James Johnson','Liam Johnson','Lucas Garcia','Mason Davis')
  UNION ALL

  -- SG4: Velocity (5 dancers)
  SELECT (SELECT id FROM entry_map WHERE title = 'Velocity'), id FROM dancer_map WHERE name IN ('Mia Smith','Noah Brown','Olivia Williams','Sophia Miller','William Martinez')
  UNION ALL

  -- SG5: Nostalgia (9 dancers)
  SELECT (SELECT id FROM entry_map WHERE title = 'Nostalgia'), id FROM dancer_map WHERE name IN ('Alexander Martinez','Amelia Jones','Ava Jones','Benjamin Brown','Charlotte Williams','Emma Smith','Ethan Garcia','Evelyn Rodriguez','Harper Miller')
  UNION ALL

  -- SG6: Renaissance (7 dancers)
  SELECT (SELECT id FROM entry_map WHERE title = 'Renaissance'), id FROM dancer_map WHERE name IN ('Henry Davis','Isabella Rodriguez','James Johnson','Liam Johnson','Lucas Garcia','Mason Davis','Mia Smith')
  UNION ALL

  -- SG7: Electric (6 dancers)
  SELECT (SELECT id FROM entry_map WHERE title = 'Electric'), id FROM dancer_map WHERE name IN ('Noah Brown','Olivia Williams','Sophia Miller','William Martinez','Alexander Martinez','Amelia Jones')
  UNION ALL

  -- SG8: Serenity (8 dancers)
  SELECT (SELECT id FROM entry_map WHERE title = 'Serenity'), id FROM dancer_map WHERE name IN ('Ava Jones','Benjamin Brown','Charlotte Williams','Emma Smith','Ethan Garcia','Evelyn Rodriguez','Harper Miller','Henry Davis')
  UNION ALL

  -- T1: Triple Threat (3 dancers)
  SELECT (SELECT id FROM entry_map WHERE title = 'Triple Threat'), id FROM dancer_map WHERE name IN ('Isabella Rodriguez','James Johnson','Liam Johnson')
  UNION ALL

  -- T2: Harmony (3 dancers)
  SELECT (SELECT id FROM entry_map WHERE title = 'Harmony'), id FROM dancer_map WHERE name IN ('Lucas Garcia','Mason Davis','Mia Smith')
  UNION ALL

  -- T3: Urban Legends (3 dancers)
  SELECT (SELECT id FROM entry_map WHERE title = 'Urban Legends'), id FROM dancer_map WHERE name IN ('Noah Brown','Olivia Williams','Sophia Miller')
  UNION ALL

  -- T4: Moonlight (3 dancers)
  SELECT (SELECT id FROM entry_map WHERE title = 'Moonlight'), id FROM dancer_map WHERE name IN ('William Martinez','Alexander Martinez','Amelia Jones')
  UNION ALL

  -- T5: Enchanted (3 dancers)
  SELECT (SELECT id FROM entry_map WHERE title = 'Enchanted'), id FROM dancer_map WHERE name IN ('Ava Jones','Benjamin Brown','Charlotte Williams')
  UNION ALL

  -- D1: Together We Rise (2 dancers)
  SELECT (SELECT id FROM entry_map WHERE title = 'Together We Rise'), id FROM dancer_map WHERE name IN ('Emma Smith','Ethan Garcia')
  UNION ALL

  -- D2: Stronger (2 dancers)
  SELECT (SELECT id FROM entry_map WHERE title = 'Stronger'), id FROM dancer_map WHERE name IN ('Evelyn Rodriguez','Harper Miller')
  UNION ALL

  -- D3: Synergy (2 dancers)
  SELECT (SELECT id FROM entry_map WHERE title = 'Synergy'), id FROM dancer_map WHERE name IN ('Henry Davis','Isabella Rodriguez')
  UNION ALL

  -- D4: Reflections (2 dancers)
  SELECT (SELECT id FROM entry_map WHERE title = 'Reflections'), id FROM dancer_map WHERE name IN ('James Johnson','Liam Johnson')
  UNION ALL

  -- D5: Gravity (2 dancers)
  SELECT (SELECT id FROM entry_map WHERE title = 'Gravity'), id FROM dancer_map WHERE name IN ('Lucas Garcia','Mason Davis')
  UNION ALL

  -- S1: Phoenix (solo)
  SELECT (SELECT id FROM entry_map WHERE title = 'Phoenix'), id FROM dancer_map WHERE name = 'Mia Smith'
  UNION ALL

  -- S2: Warrior (solo)
  SELECT (SELECT id FROM entry_map WHERE title = 'Warrior'), id FROM dancer_map WHERE name = 'Noah Brown'
  UNION ALL

  -- S3: Butterfly (solo)
  SELECT (SELECT id FROM entry_map WHERE title = 'Butterfly'), id FROM dancer_map WHERE name = 'Olivia Williams'
  UNION ALL

  -- S4: Thunder (solo)
  SELECT (SELECT id FROM entry_map WHERE title = 'Thunder'), id FROM dancer_map WHERE name = 'Sophia Miller'
  UNION ALL

  -- S5: Ethereal (solo)
  SELECT (SELECT id FROM entry_map WHERE title = 'Ethereal'), id FROM dancer_map WHERE name = 'William Martinez'
)
INSERT INTO entry_participants (tenant_id, competition_entry_id, dancer_id)
SELECT '00000000-0000-0000-0000-000000000001', entry_id, dancer_id
FROM participants;

-- VERIFICATION QUERY
SELECT
  'ENTRIES' as type,
  COUNT(DISTINCT ce.id) as count,
  SUM(ce.total_fee) as total_value
FROM competition_entries ce
WHERE ce.reservation_id = 'f3defc45-6736-4f2e-a2c5-a0ca277ad574'
UNION ALL
SELECT
  'PARTICIPANTS' as type,
  COUNT(*) as count,
  NULL as total_value
FROM entry_participants ep
JOIN competition_entries ce ON ep.competition_entry_id = ce.id
WHERE ce.reservation_id = 'f3defc45-6736-4f2e-a2c5-a0ca277ad574'
UNION ALL
SELECT
  'PER-DANCER' as type,
  COUNT(DISTINCT ep.dancer_id) as count,
  AVG(dancer_counts.routine_count) as avg_routines
FROM entry_participants ep
JOIN competition_entries ce ON ep.competition_entry_id = ce.id
JOIN (
  SELECT dancer_id, COUNT(*) as routine_count
  FROM entry_participants ep2
  JOIN competition_entries ce2 ON ep2.competition_entry_id = ce2.id
  WHERE ce2.reservation_id = 'f3defc45-6736-4f2e-a2c5-a0ca277ad574'
  GROUP BY dancer_id
) dancer_counts ON ep.dancer_id = dancer_counts.dancer_id
WHERE ce.reservation_id = 'f3defc45-6736-4f2e-a2c5-a0ca277ad574';
