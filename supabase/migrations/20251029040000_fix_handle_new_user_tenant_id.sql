-- Fix handle_new_user trigger to include tenant_id
-- Issue: Trigger was creating user_profiles with NULL tenant_id
-- Impact: Caused 500 errors on getCurrentUser and blocked CSV import

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, tenant_id, role, first_name, last_name)
  VALUES (
    NEW.id,
    (NEW.raw_user_meta_data->>'tenant_id')::uuid,  -- Extract tenant_id from metadata
    'studio_director',  -- Updated from 'studio_owner' to match current schema
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Also update existing user_profiles with NULL tenant_id
-- Match them to EMPWR tenant (default for existing users)
UPDATE public.user_profiles
SET tenant_id = '00000000-0000-0000-0000-000000000001'
WHERE tenant_id IS NULL
  AND id IN (SELECT id FROM auth.users);
