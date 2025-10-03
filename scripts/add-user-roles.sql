-- Step 1: Create the user_role enum type
CREATE TYPE public.user_role AS ENUM ('studio_director', 'competition_director', 'super_admin');

-- Step 2: Add a temporary column with the enum type
ALTER TABLE public.user_profiles ADD COLUMN role_new public.user_role DEFAULT 'studio_director';

-- Step 3: Migrate existing data (studio_owner -> studio_director)
UPDATE public.user_profiles
SET role_new = 'studio_director'
WHERE role = 'studio_owner' OR role IS NULL;

-- Step 4: Drop the old role column
ALTER TABLE public.user_profiles DROP COLUMN role;

-- Step 5: Rename the new column to role
ALTER TABLE public.user_profiles RENAME COLUMN role_new TO role;

-- Confirm migration
SELECT role, COUNT(*) FROM public.user_profiles GROUP BY role;
