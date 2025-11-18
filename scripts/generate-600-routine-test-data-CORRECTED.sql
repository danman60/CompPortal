-- ============================================================================
-- Comprehensive 600-Routine Test Data for Tester Tenant (CORRECTED SCHEMA)
-- ============================================================================
-- Purpose: Generate complete mock competition dataset for scheduler testing
-- Tenant: 00000000-0000-0000-0000-000000000003 (tester) ← STRICT SCOPE
-- Competition: 1b786221-8f8e-413f-b532-06fa20a2ff63
--
-- ⚠️ SAFETY: ALL operations filtered by tester tenant_id ONLY
-- ⚠️ NO EMPWR or Glow data will be touched
--
-- Dataset Specifications:
-- - 40 studios
-- - 2,000+ dancers (40-75 per studio)
-- - 600 routines with even classification distribution
-- - All routines have routine_age set
-- - Some extended time, some title upgrades
-- - Dancers appear in multiple routines for conflict detection
-- ============================================================================

-- Clean up existing tester data (SAFETY: tenant_id filter ensures tester-only)
DELETE FROM entry_participants WHERE tenant_id = '00000000-0000-0000-0000-000000000003';
DELETE FROM competition_entries WHERE tenant_id = '00000000-0000-0000-0000-000000000003';
DELETE FROM reservations WHERE tenant_id = '00000000-0000-0000-0000-000000000003';
DELETE FROM dancers WHERE tenant_id = '00000000-0000-0000-0000-000000000003';
DELETE FROM studios WHERE tenant_id = '00000000-0000-0000-0000-000000000003';

-- ============================================================================
-- STUDIOS (40 studios) - TESTER TENANT ONLY
-- ============================================================================
INSERT INTO studios (tenant_id, name, email, phone, address1, city, province, postal_code, public_code, status, created_at, updated_at)
VALUES
  ('00000000-0000-0000-0000-000000000003', 'Starlight Dance Academy', 'info@starlightdance.com', '555-0101', '123 Main St', 'Springfield', 'IL', '62701', 'STAR01', 'active', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000003', 'Rhythm & Motion Dance Studio', 'contact@rhythmmotion.com', '555-0102', '456 Oak Ave', 'Madison', 'WI', '53703', 'RHYT02', 'active', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000003', 'Elite Dance Company', 'admin@elitedance.com', '555-0103', '789 Elm St', 'Chicago', 'IL', '60601', 'ELIT03', 'active', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000003', 'Grace Ballet School', 'info@graceballet.com', '555-0104', '321 Pine Rd', 'Milwaukee', 'WI', '53202', 'GRAC04', 'active', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000003', 'Broadway Bound Dance Studio', 'hello@broadwaybound.com', '555-0105', '654 Maple Dr', 'Indianapolis', 'IN', '46204', 'BROA05', 'active', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000003', 'Center Stage Dance Academy', 'info@centerstage.com', '555-0106', '987 Cedar Ln', 'Detroit', 'MI', '48201', 'CENT06', 'active', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000003', 'Fusion Dance Collective', 'contact@fusiondance.com', '555-0107', '147 Birch St', 'Columbus', 'OH', '43215', 'FUSI07', 'active', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000003', 'Momentum Dance Studio', 'info@momentumdance.com', '555-0108', '258 Willow Way', 'Minneapolis', 'MN', '55401', 'MOME08', 'active', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000003', 'Spotlight Performing Arts', 'admin@spotlightpa.com', '555-0109', '369 Ash Ave', 'St. Louis', 'MO', '63101', 'SPOT09', 'active', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000003', 'Encore Dance Academy', 'hello@encoredance.com', '555-0110', '741 Spruce Dr', 'Kansas City', 'MO', '64101', 'ENCO10', 'active', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000003', 'Prima Dance Studio', 'info@primadance.com', '555-0111', '852 Cypress Ln', 'Cincinnati', 'OH', '45202', 'PRIM11', 'active', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000003', 'Velocity Dance Company', 'contact@velocitydance.com', '555-0112', '963 Poplar St', 'Cleveland', 'OH', '44113', 'VELO12', 'active', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000003', 'Elevate Dance Studio', 'info@elevatedance.com', '555-0113', '159 Walnut Rd', 'Omaha', 'NE', '68102', 'ELEV13', 'active', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000003', 'Infinity Dance Center', 'admin@infinitydance.com', '555-0114', '357 Chestnut Ave', 'Des Moines', 'IA', '50309', 'INFI14', 'active', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000003', 'Harmony Dance Academy', 'hello@harmonydance.com', '555-0115', '486 Magnolia Dr', 'Rockford', 'IL', '61101', 'HARM15', 'active', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000003', 'Radiance Dance Studio', 'info@radiancedance.com', '555-0116', '753 Dogwood Way', 'Peoria', 'IL', '61602', 'RADI16', 'active', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000003', 'Synergy Dance Collective', 'contact@synergydance.com', '555-0117', '951 Hickory Ln', 'Grand Rapids', 'MI', '49503', 'SYNE17', 'active', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000003', 'Apex Dance Company', 'info@apexdance.com', '555-0118', '842 Sycamore St', 'Dayton', 'OH', '45402', 'APEX18', 'active', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000003', 'Pinnacle Dance Studio', 'admin@pinnacledance.com', '555-0119', '267 Redwood Ave', 'Toledo', 'OH', '43604', 'PINN19', 'active', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000003', 'Legacy Dance Academy', 'hello@legacydance.com', '555-0120', '584 Laurel Dr', 'Fort Wayne', 'IN', '46802', 'LEGA20', 'active', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000003', 'Prestige Dance Center', 'info@prestigedance.com', '555-0121', '692 Hawthorn Rd', 'Evansville', 'IN', '47708', 'PRES21', 'active', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000003', 'Phoenix Dance Studio', 'contact@phoenixdance.com', '555-0122', '418 Juniper Way', 'South Bend', 'IN', '46601', 'PHOE22', 'active', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000003', 'Zenith Dance Company', 'info@zenithdance.com', '555-0123', '829 Beech Ln', 'Green Bay', 'WI', '54301', 'ZENI23', 'active', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000003', 'Eclipse Dance Academy', 'admin@eclipsedance.com', '555-0124', '537 Alder St', 'Lansing', 'MI', '48933', 'ECLI24', 'active', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000003', 'Cascade Dance Studio', 'hello@cascadedance.com', '555-0125', '946 Fir Ave', 'Ann Arbor', 'MI', '48104', 'CASC25', 'active', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000003', 'Triumph Dance Center', 'info@triumphdance.com', '555-0126', '173 Aspen Dr', 'Rochester', 'MN', '55901', 'TRIU26', 'active', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000003', 'Odyssey Dance Collective', 'contact@odysseydance.com', '555-0127', '462 Cottonwood Rd', 'Duluth', 'MN', '55802', 'ODYS27', 'active', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000003', 'Aspire Dance Studio', 'info@aspiredance.com', '555-0128', '795 Hemlock Way', 'Bloomington', 'IN', '47401', 'ASPI28', 'active', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000003', 'Summit Dance Academy', 'admin@summitdance.com', '555-0129', '381 Mulberry Ln', 'Cedar Rapids', 'IA', '52401', 'SUMM29', 'active', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000003', 'Inspire Dance Company', 'hello@inspiredance.com', '555-0130', '628 Sequoia St', 'Wichita', 'KS', '67202', 'INSP30', 'active', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000003', 'Evolution Dance Studio', 'info@evolutiondance.com', '555-0131', '914 Rosewood Ave', 'Aurora', 'IL', '60505', 'EVOL31', 'active', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000003', 'Virtuoso Dance Center', 'contact@virtuosodance.com', '555-0132', '246 Basswood Dr', 'Naperville', 'IL', '60540', 'VIRT32', 'active', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000003', 'Renaissance Dance Academy', 'info@renaissancedance.com', '555-0133', '573 Buttonwood Rd', 'Joliet', 'IL', '60432', 'RENA33', 'active', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000003', 'Catalyst Dance Studio', 'admin@catalystdance.com', '555-0134', '817 Willowood Way', 'Warren', 'MI', '48089', 'CATA34', 'active', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000003', 'Kinetic Dance Collective', 'hello@kineticdance.com', '555-0135', '492 Firwood Ln', 'Sterling Heights', 'MI', '48310', 'KINE35', 'active', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000003', 'Dynasty Dance Company', 'info@dynastydance.com', '555-0136', '685 Oakwood St', 'Sioux Falls', 'SD', '57104', 'DYNA36', 'active', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000003', 'Precision Dance Studio', 'contact@precisiondance.com', '555-0137', '328 Pinewood Ave', 'Fargo', 'ND', '58102', 'PREC37', 'active', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000003', 'Majesty Dance Academy', 'info@majestydance.com', '555-0138', '754 Maplewood Dr', 'Lincoln', 'NE', '68508', 'MAJE38', 'active', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000003', 'Serenity Dance Center', 'admin@serenitydance.com', '555-0139', '916 Cedarwood Rd', 'Topeka', 'KS', '66603', 'SERE39', 'active', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000003', 'Luminous Dance Studio', 'hello@luminousdance.com', '555-0140', '241 Elmwood Way', 'Springfield', 'MO', '65806', 'LUMI40', 'active', NOW(), NOW());

-- Store studio IDs for reference (TESTER TENANT ONLY)
CREATE TEMP TABLE temp_studio_ids AS
SELECT id, name, ROW_NUMBER() OVER (ORDER BY name) as studio_num
FROM studios
WHERE tenant_id = '00000000-0000-0000-0000-000000000003';

-- ============================================================================
-- RESERVATIONS (40 reservations, 15 tokens each = 600 total) - TESTER ONLY
-- ============================================================================
INSERT INTO reservations (
  id, studio_id, competition_id, tenant_id,
  status, tokens_requested, tokens_approved, tokens_used,
  submission_date, approval_date,
  created_at, updated_at
)
SELECT
  gen_random_uuid(),
  id,
  '1b786221-8f8e-413f-b532-06fa20a2ff63',
  '00000000-0000-0000-0000-000000000003',
  'summarized',
  15, 15, 0,
  CURRENT_DATE - INTERVAL '30 days',
  CURRENT_DATE - INTERVAL '25 days',
  NOW(), NOW()
FROM temp_studio_ids;

-- Store reservation IDs for reference (TESTER TENANT ONLY)
CREATE TEMP TABLE temp_reservation_ids AS
SELECT r.id, r.studio_id, s.studio_num, s.name as studio_name
FROM reservations r
JOIN temp_studio_ids s ON r.studio_id = s.id
WHERE r.tenant_id = '00000000-0000-0000-0000-000000000003';

-- ============================================================================
-- DANCERS (40-75 per studio = ~2,200 dancers total) - TESTER TENANT ONLY
-- ============================================================================
-- Generate dancers with realistic age distributions
DO $$
DECLARE
  v_studio RECORD;
  v_dancer_count INT;
  v_first_names TEXT[] := ARRAY['Emma', 'Olivia', 'Ava', 'Isabella', 'Sophia', 'Mia', 'Charlotte', 'Amelia', 'Harper', 'Evelyn',
                                  'Abigail', 'Emily', 'Elizabeth', 'Sofia', 'Avery', 'Ella', 'Scarlett', 'Grace', 'Chloe', 'Victoria',
                                  'Riley', 'Aria', 'Lily', 'Aubrey', 'Zoey', 'Penelope', 'Lillian', 'Addison', 'Layla', 'Natalie',
                                  'Liam', 'Noah', 'William', 'James', 'Oliver', 'Benjamin', 'Elijah', 'Lucas', 'Mason', 'Logan',
                                  'Alexander', 'Ethan', 'Jacob', 'Michael', 'Daniel', 'Henry', 'Jackson', 'Sebastian', 'Aiden', 'Matthew',
                                  'Samuel', 'David', 'Joseph', 'Carter', 'Owen', 'Wyatt', 'John', 'Jack', 'Luke', 'Jayden'];
  v_last_names TEXT[] := ARRAY['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
                                'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin',
                                'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson',
                                'Walker', 'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores',
                                'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell', 'Carter', 'Roberts'];
  v_classification_ids UUID[] := ARRAY[
    'b27ffde5-f4f2-47b1-88d3-710481b84fd4'::uuid,  -- Emerald
    '7107ff82-3d17-4fa9-ac69-696f6fe575b3'::uuid,  -- Sapphire
    'b692f4e8-c1cb-44fd-8709-41d922039100'::uuid,  -- Crystal
    'e85dde23-754b-49ec-aabf-d07c2103ab9d'::uuid   -- Titanium
  ];
  i INT;
  v_age INT;
  v_dob DATE;
  v_classification UUID;
BEGIN
  FOR v_studio IN SELECT * FROM temp_studio_ids LOOP
    -- Random dancer count between 40-75
    v_dancer_count := 40 + floor(random() * 36)::INT;

    FOR i IN 1..v_dancer_count LOOP
      -- Random age between 5 and 19
      v_age := 5 + floor(random() * 15)::INT;
      v_dob := CURRENT_DATE - (v_age || ' years')::INTERVAL - (floor(random() * 365)::INT || ' days')::INTERVAL;

      -- Assign classification based on skill distribution
      v_classification := v_classification_ids[1 + floor(random() * 4)::INT];

      INSERT INTO dancers (
        id, studio_id, tenant_id,
        first_name, last_name, date_of_birth,
        classification_id, status,
        created_at, updated_at
      ) VALUES (
        gen_random_uuid(),
        v_studio.id,
        '00000000-0000-0000-0000-000000000003',
        v_first_names[1 + floor(random() * 60)::INT],
        v_last_names[1 + floor(random() * 50)::INT],
        v_dob,
        v_classification,
        'active',
        NOW(), NOW()
      );
    END LOOP;
  END LOOP;
END $$;

-- Store dancer IDs by studio for linking (TESTER TENANT ONLY)
CREATE TEMP TABLE temp_dancer_ids AS
SELECT
  d.id as dancer_id,
  d.studio_id,
  d.first_name || ' ' || d.last_name as full_name,
  d.date_of_birth,
  EXTRACT(YEAR FROM AGE(CURRENT_DATE, d.date_of_birth))::INT as age,
  d.classification_id,
  s.studio_num,
  ROW_NUMBER() OVER (PARTITION BY d.studio_id ORDER BY d.date_of_birth) as dancer_num
FROM dancers d
JOIN temp_studio_ids s ON d.studio_id = s.id
WHERE d.tenant_id = '00000000-0000-0000-0000-000000000003';

-- ============================================================================
-- COMPETITION ENTRIES (600 routines) - TESTER TENANT ONLY
-- ============================================================================
-- Generate routines with even distribution across classifications
DO $$
DECLARE
  v_routine_titles TEXT[] := ARRAY[
    'Breakthrough', 'Echoes', 'Awakening', 'Midnight Dreams', 'Fire & Ice',
    'Sanctuary', 'Wonderland', 'Revolution', 'Illuminate', 'Transcendence',
    'Velocity', 'Serendipity', 'Phenomenon', 'Euphoria', 'Renaissance',
    'Metamorphosis', 'Crescendo', 'Kaleidoscope', 'Resilience', 'Enigma',
    'Infinity', 'Radiance', 'Genesis', 'Odyssey', 'Catalyst',
    'Vertigo', 'Pinnacle', 'Solstice', 'Tempest', 'Aurora',
    'Mirage', 'Momentum', 'Zenith', 'Eclipse', 'Cascade',
    'Phoenix Rising', 'Starlight', 'Thunder', 'Whisper', 'Prism',
    'Harmony', 'Spectrum', 'Crimson', 'Silver', 'Golden',
    'Sapphire', 'Emerald', 'Crystal', 'Titanium', 'Diamond'
  ];

  v_age_groups UUID[] := ARRAY[
    '71147042-f47a-46cc-8af9-e8dc3d653296'::uuid,  -- Mini (5-8)
    '409ae91d-3ddf-45d0-aa87-cb63b9d45dbe'::uuid,  -- Junior (9-11)
    '443a7105-81b6-4b74-be58-be00883240e1'::uuid,  -- Teen (12-14)
    'f21cec48-8d38-41cd-b9ea-865e65fe29e5'::uuid   -- Senior (15-19)
  ];

  v_classifications UUID[] := ARRAY[
    'b27ffde5-f4f2-47b1-88d3-710481b84fd4'::uuid,  -- Emerald
    '7107ff82-3d17-4fa9-ac69-696f6fe575b3'::uuid,  -- Sapphire
    'b692f4e8-c1cb-44fd-8709-41d922039100'::uuid,  -- Crystal
    'e85dde23-754b-49ec-aabf-d07c2103ab9d'::uuid,  -- Titanium
    'a4c6f685-8d3b-4f11-9f70-50ea970889ee'::uuid   -- Production
  ];

  v_categories UUID[] := ARRAY[
    '30ae0dd9-526a-4047-969b-571683591950'::uuid,  -- Jazz
    'd0eb106b-7eaa-458a-af64-72a15ccc9a37'::uuid,  -- Contemporary
    'd7275a79-810d-43b0-913f-e2e3c0d00fa0'::uuid,  -- Tap
    'b00fef1c-8931-4cc3-86c9-585dc5c56e0c'::uuid,  -- Ballet
    '488753c4-2790-41a9-9ad1-81502d73b8f4'::uuid,  -- Hip Hop
    '5da32173-2d54-472c-86bc-7c5108e38d9e'::uuid,  -- Lyrical
    '675f841b-7ec6-4a7e-96e0-43f53ae79eeb'::uuid   -- Musical Theatre
  ];

  v_entry_sizes UUID[] := ARRAY[
    '594da57b-84d9-4b75-83f0-b722c10fcae0'::uuid,  -- Solo
    '2c0ff5d6-fd4d-4907-9083-58d5f616d7f1'::uuid,  -- Duet
    'd6d06bd0-e190-4920-9bad-1145d9f80f37'::uuid,  -- Small Group
    '1c7be617-f255-4ba4-b9f8-e5c36cdd370c'::uuid,  -- Large Group
    'fe8f81e2-65b9-4d14-af33-8189dc5fa3b4'::uuid   -- Production
  ];

  v_reservation RECORD;
  v_routines_per_studio INT;
  v_classification_idx INT;
  v_entry_size UUID;
  v_routine_age INT;
  v_is_extended BOOLEAN;
  v_is_title BOOLEAN;
  i INT;
  routine_counter INT := 0;
BEGIN
  -- Distribute 600 routines across 40 studios (15 each)
  FOR v_reservation IN SELECT * FROM temp_reservation_ids ORDER BY studio_num LOOP
    v_routines_per_studio := 15;

    -- Cycle through classifications evenly (120 routines per classification)
    v_classification_idx := ((v_reservation.studio_num - 1) % 5) + 1;

    FOR i IN 1..v_routines_per_studio LOOP
      routine_counter := routine_counter + 1;

      -- Determine entry size (40% solo, 13% duet, 25% small, 13% large, 7% production)
      IF routine_counter % 100 <= 40 THEN
        v_entry_size := v_entry_sizes[1];  -- Solo
      ELSIF routine_counter % 100 <= 53 THEN
        v_entry_size := v_entry_sizes[2];  -- Duet
      ELSIF routine_counter % 100 <= 78 THEN
        v_entry_size := v_entry_sizes[3];  -- Small Group
      ELSIF routine_counter % 100 <= 91 THEN
        v_entry_size := v_entry_sizes[4];  -- Large Group
      ELSE
        v_entry_size := v_entry_sizes[5];  -- Production
      END IF;

      -- Routine age: varies by age group
      v_routine_age := 5 + floor(random() * 15)::INT;

      -- 10% extended time
      v_is_extended := (random() < 0.1);

      -- 20% of solos with title upgrade
      v_is_title := (v_entry_size = v_entry_sizes[1] AND random() < 0.2);

      INSERT INTO competition_entries (
        tenant_id, competition_id, reservation_id, studio_id,
        title, status,
        category_id,
        classification_id,
        age_group_id,
        entry_size_category_id,
        routine_age,
        routine_length_minutes,
        routine_length_seconds,
        extended_time_requested,
        is_title_upgrade,
        entry_fee, total_fee,
        created_at, updated_at
      ) VALUES (
        '00000000-0000-0000-0000-000000000003',
        '1b786221-8f8e-413f-b532-06fa20a2ff63',
        v_reservation.id,
        v_reservation.studio_id,
        v_routine_titles[1 + floor(random() * 50)::INT] || ' ' || routine_counter::TEXT,
        'registered',
        v_categories[1 + floor(random() * 7)::INT],
        v_classifications[v_classification_idx],
        v_age_groups[1 + floor(random() * 4)::INT],
        v_entry_size,
        v_routine_age,
        2 + floor(random() * 3)::INT,  -- 2-4 minutes
        floor(random() * 60)::INT,     -- 0-59 seconds
        v_is_extended,
        v_is_title,
        100.00, 100.00,
        NOW(), NOW()
      );

      -- Rotate classification for next routine
      v_classification_idx := (v_classification_idx % 5) + 1;
    END LOOP;
  END LOOP;
END $$;

-- Store entry IDs for linking participants (TESTER TENANT ONLY)
CREATE TEMP TABLE temp_entry_ids AS
SELECT
  e.id as entry_id,
  e.studio_id,
  e.entry_size_category_id,
  es.min_participants,
  es.max_participants,
  s.studio_num
FROM competition_entries e
JOIN entry_size_categories es ON e.entry_size_category_id = es.id
JOIN temp_studio_ids s ON e.studio_id = s.id
WHERE e.tenant_id = '00000000-0000-0000-0000-000000000003';

-- ============================================================================
-- ENTRY PARTICIPANTS (Link dancers to routines) - TESTER TENANT ONLY
-- ============================================================================
DO $$
DECLARE
  v_entry RECORD;
  v_dancer RECORD;
  v_participant_count INT;
  v_dancers_added INT;
BEGIN
  FOR v_entry IN SELECT * FROM temp_entry_ids ORDER BY entry_id LOOP
    -- Determine number of participants for this entry
    v_participant_count := v_entry.min_participants +
                           floor(random() * (v_entry.max_participants - v_entry.min_participants + 1))::INT;

    v_dancers_added := 0;

    -- Add dancers from the same studio
    FOR v_dancer IN
      SELECT * FROM temp_dancer_ids
      WHERE studio_id = v_entry.studio_id
      ORDER BY RANDOM()
      LIMIT v_participant_count
    LOOP
      INSERT INTO entry_participants (
        tenant_id, entry_id, dancer_id,
        dancer_name, dancer_age,
        created_at
      ) VALUES (
        '00000000-0000-0000-0000-000000000003',
        v_entry.entry_id,
        v_dancer.dancer_id,
        v_dancer.full_name,
        v_dancer.age,
        NOW()
      );

      v_dancers_added := v_dancers_added + 1;
    END LOOP;
  END LOOP;
END $$;

-- ============================================================================
-- VERIFICATION QUERIES (TESTER TENANT ONLY)
-- ============================================================================
SELECT
  '✅ Studios Created' as checkpoint,
  COUNT(*) as count
FROM studios
WHERE tenant_id = '00000000-0000-0000-0000-000000000003';

SELECT
  '✅ Dancers Created' as checkpoint,
  COUNT(*) as count
FROM dancers
WHERE tenant_id = '00000000-0000-0000-0000-000000000003';

SELECT
  '✅ Reservations Created' as checkpoint,
  COUNT(*) as count,
  SUM(tokens_approved) as total_tokens
FROM reservations
WHERE tenant_id = '00000000-0000-0000-0000-000000000003';

SELECT
  '✅ Routines Created' as checkpoint,
  COUNT(*) as count,
  COUNT(*) FILTER (WHERE routine_age IS NOT NULL) as with_routine_age,
  COUNT(*) FILTER (WHERE extended_time_requested = true) as with_extended_time,
  COUNT(*) FILTER (WHERE is_title_upgrade = true) as with_title_upgrade
FROM competition_entries
WHERE tenant_id = '00000000-0000-0000-0000-000000000003';

SELECT
  '✅ Classification Distribution' as checkpoint,
  c.name as classification,
  COUNT(*) as routine_count
FROM competition_entries e
JOIN classifications c ON e.classification_id = c.id
WHERE e.tenant_id = '00000000-0000-0000-0000-000000000003'
GROUP BY c.name, c.skill_level
ORDER BY c.skill_level;

SELECT
  '✅ Entry Size Distribution' as checkpoint,
  es.name as entry_size,
  COUNT(*) as routine_count
FROM competition_entries e
JOIN entry_size_categories es ON e.entry_size_category_id = es.id
WHERE e.tenant_id = '00000000-0000-0000-0000-000000000003'
GROUP BY es.name, es.sort_order
ORDER BY es.sort_order;

SELECT
  '✅ Entry Participants Created' as checkpoint,
  COUNT(*) as total_participants,
  COUNT(DISTINCT entry_id) as entries_with_participants,
  COUNT(DISTINCT dancer_id) as unique_dancers_used
FROM entry_participants
WHERE tenant_id = '00000000-0000-0000-0000-000000000003';

-- Clean up temp tables
DROP TABLE IF EXISTS temp_studio_ids;
DROP TABLE IF EXISTS temp_reservation_ids;
DROP TABLE IF EXISTS temp_dancer_ids;
DROP TABLE IF EXISTS temp_entry_ids;

-- ============================================================================
-- COMPLETE ✅
-- ============================================================================
SELECT '🎉 Test Data Generation Complete!' as status,
       '600 routines, 40 studios, 2000+ dancers, all linked for conflict detection' as details,
       'TESTER TENANT ONLY - No EMPWR/Glow data touched' as safety_confirmation;
