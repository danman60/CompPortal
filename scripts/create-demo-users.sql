-- Create demo user accounts for testing RBAC
-- Run this in Supabase SQL editor

-- Note: This uses Supabase's internal functions to create users
-- The passwords are hashed automatically by Supabase

-- 1. Studio Director Demo Account
DO $$
DECLARE
  studio_user_id uuid;
  demo_studio_id uuid;
BEGIN
  -- Insert into auth.users (Supabase handles password hashing)
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000'::uuid,
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'studio@compportal.test',
    crypt('StudioDemo123!', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  )
  RETURNING id INTO studio_user_id;

  -- Create or get demo studio
  INSERT INTO public.studios (
    id,
    owner_id,
    code,
    name,
    city,
    province,
    email,
    status,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    studio_user_id,
    'DEMO1',
    'Demo Dance Studio',
    'Toronto',
    'ON',
    'studio@compportal.test',
    'verified',
    NOW(),
    NOW()
  )
  RETURNING id INTO demo_studio_id;

  -- Create user profile with studio_director role
  INSERT INTO public.user_profiles (
    id,
    role,
    first_name,
    last_name,
    created_at,
    updated_at
  ) VALUES (
    studio_user_id,
    'studio_director',
    'Studio',
    'Director',
    NOW(),
    NOW()
  );

  RAISE NOTICE 'Created studio director account: studio@compportal.test / StudioDemo123!';
END $$;

-- 2. Competition Director Demo Account
DO $$
DECLARE
  director_user_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000'::uuid,
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'director@compportal.test',
    crypt('DirectorDemo123!', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  )
  RETURNING id INTO director_user_id;

  INSERT INTO public.user_profiles (
    id,
    role,
    first_name,
    last_name,
    created_at,
    updated_at
  ) VALUES (
    director_user_id,
    'competition_director',
    'Competition',
    'Director',
    NOW(),
    NOW()
  );

  RAISE NOTICE 'Created competition director account: director@compportal.test / DirectorDemo123!';
END $$;

-- 3. Super Admin Demo Account
DO $$
DECLARE
  admin_user_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000'::uuid,
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'admin@compportal.test',
    crypt('AdminDemo123!', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  )
  RETURNING id INTO admin_user_id;

  INSERT INTO public.user_profiles (
    id,
    role,
    first_name,
    last_name,
    created_at,
    updated_at
  ) VALUES (
    admin_user_id,
    'super_admin',
    'Super',
    'Admin',
    NOW(),
    NOW()
  );

  RAISE NOTICE 'Created super admin account: admin@compportal.test / AdminDemo123!';
END $$;

-- Verify all accounts were created
SELECT
  u.email,
  up.role,
  up.first_name,
  up.last_name,
  s.name as studio_name
FROM auth.users u
LEFT JOIN public.user_profiles up ON u.id = up.id
LEFT JOIN public.studios s ON u.id = s.owner_id
WHERE u.email LIKE '%@compportal.test'
ORDER BY up.role;
