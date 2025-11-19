-- Fix handle_new_user trigger to set default role for all signups
-- ROOT CAUSE: Nov 13 migration set role=NULL to prevent orphaned signups from having studio_director role
-- IMPACT: Self-signup users (no claim code) never went through claim flow, so role stayed NULL forever
-- SECURITY: NULL role + vulnerable routers (if ctx.tenantId) = cross-tenant data leak
-- SOLUTION: Set default role='studio_director' for ALL signups, backfill existing NULL role users

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, tenant_id, role, first_name, last_name)
  VALUES (
    NEW.id,
    (NEW.raw_user_meta_data->>'tenant_id')::uuid,
    'studio_director',  -- FIX: Set default role for all signups (was NULL from Nov 13 fix)
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Backfill existing users with NULL role
UPDATE user_profiles
SET role = 'studio_director'
WHERE role IS NULL
  AND tenant_id IS NOT NULL;
