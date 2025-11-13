-- Fix handle_new_user trigger security issue
-- BUG: Trigger was setting role='studio_director' during signup BEFORE studio claim
-- IMPACT: Orphaned signups (abandoned, unconfirmed) had studio_director role with no studio
-- SECURITY: Before fix, these orphaned accounts could see ALL data across tenants
-- SOLUTION: Set role=NULL during signup, let claimStudio set role='studio_director' after claim

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, tenant_id, role, first_name, last_name)
  VALUES (
    NEW.id,
    (NEW.raw_user_meta_data->>'tenant_id')::uuid,  -- Extract tenant_id from metadata
    NULL,  -- FIX: Don't set role during signup - let claimStudio set it after studio is claimed
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- No data migration needed - existing users are fine, this only affects NEW signups
