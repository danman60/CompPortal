-- Database Wipe Script: Keep Schema + 3 Demo Accounts
-- Purpose: Clean slate for testing while preserving demo accounts
-- WARNING: This will delete ALL data except demo accounts and sample data

-- Step 1: Store demo account IDs (these emails should exist)
DO $$
DECLARE
  demo_studio_id UUID;
  demo_director_id UUID;
  demo_admin_id UUID;
  demo_studio_studio_id UUID;
  demo_competition_id UUID;
  empwr_tenant_id UUID := '00000000-0000-0000-0000-000000000001';
BEGIN
  -- Get user IDs from Supabase auth (assumes they exist)
  SELECT id INTO demo_studio_id FROM auth.users WHERE email = 'demo.studio@gmail.com';
  SELECT id INTO demo_director_id FROM auth.users WHERE email = 'demo.director@gmail.com';
  SELECT id INTO demo_admin_id FROM auth.users WHERE email = 'demo.admin@gmail.com';

  -- Get studio ID for demo studio director
  SELECT id INTO demo_studio_studio_id FROM studios WHERE owner_id = demo_studio_id;

  RAISE NOTICE 'Demo Account IDs:';
  RAISE NOTICE 'Studio Director: %', demo_studio_id;
  RAISE NOTICE 'Competition Director: %', demo_director_id;
  RAISE NOTICE 'Super Admin: %', demo_admin_id;
  RAISE NOTICE 'Demo Studio: %', demo_studio_studio_id;

  -- Step 2: Disable triggers temporarily
  SET session_replication_role = 'replica';

  -- Step 3: Delete all data from tables (CASCADE)
  -- Order matters: delete child tables first

  RAISE NOTICE 'Deleting all data...';

  DELETE FROM activity_logs;
  DELETE FROM scores;
  DELETE FROM entry_participants;
  DELETE FROM competition_entries;
  DELETE FROM invoices;
  DELETE FROM reservations;
  DELETE FROM dancers;
  DELETE FROM competition_sessions;
  DELETE FROM competitions;
  DELETE FROM judges;
  DELETE FROM studios WHERE id != demo_studio_studio_id; -- Keep demo studio
  DELETE FROM user_profiles WHERE id NOT IN (demo_studio_id, demo_director_id, demo_admin_id); -- Keep demo users

  RAISE NOTICE 'Data deletion complete. Demo accounts preserved.';

  -- Step 4: Re-enable triggers
  SET session_replication_role = 'origin';

  -- Step 5: Insert sample competition for testing
  INSERT INTO competitions (
    id,
    tenant_id,
    organizer_id,
    name,
    year,
    competition_start_date,
    competition_end_date,
    registration_open_date,
    registration_close_date,
    primary_location,
    status,
    registration_fee,
    late_registration_fee
  ) VALUES (
    gen_random_uuid(),
    empwr_tenant_id,
    demo_director_id,
    'EMPWR Dance Challenge 2025',
    2025,
    CURRENT_DATE + INTERVAL '30 days',
    CURRENT_DATE + INTERVAL '32 days',
    CURRENT_DATE - INTERVAL '60 days',
    CURRENT_DATE + INTERVAL '20 days',
    'Toronto Convention Centre, Toronto, ON',
    'open',
    50.00,
    25.00
  ) RETURNING id INTO demo_competition_id;

  RAISE NOTICE 'Sample competition created: %', demo_competition_id;

  -- Step 6: Insert sample reservation
  INSERT INTO reservations (
    tenant_id,
    studio_id,
    competition_id,
    spaces_requested,
    spaces_confirmed,
    status,
    deposit_amount,
    total_amount,
    payment_status
  ) VALUES (
    empwr_tenant_id,
    demo_studio_studio_id,
    demo_competition_id,
    10,
    10,
    'approved',
    500.00,
    0.00,
    'pending'
  );

  RAISE NOTICE 'Sample reservation created';

  -- Step 7: Insert sample dancers
  INSERT INTO dancers (tenant_id, studio_id, first_name, last_name, date_of_birth, gender, email, phone)
  VALUES
    (empwr_tenant_id, demo_studio_studio_id, 'Emily', 'Johnson', '2012-03-15', 'Female', null, null),
    (empwr_tenant_id, demo_studio_studio_id, 'Sophia', 'Williams', '2011-07-22', 'Female', null, null),
    (empwr_tenant_id, demo_studio_studio_id, 'Olivia', 'Brown', '2013-01-10', 'Female', null, null),
    (empwr_tenant_id, demo_studio_studio_id, 'Ava', 'Jones', '2012-11-05', 'Female', null, null),
    (empwr_tenant_id, demo_studio_studio_id, 'Isabella', 'Garcia', '2011-09-18', 'Female', null, null);

  RAISE NOTICE 'Sample dancers created';

  RAISE NOTICE 'Database wipe complete. Schema intact. Demo accounts and sample data preserved.';
  RAISE NOTICE 'Test credentials:';
  RAISE NOTICE '  Studio Director: demo.studio@gmail.com / StudioDemo123!';
  RAISE NOTICE '  Competition Director: demo.director@gmail.com / DirectorDemo123!';
  RAISE NOTICE '  Super Admin: demo.admin@gmail.com / AdminDemo123!';
END $$;
