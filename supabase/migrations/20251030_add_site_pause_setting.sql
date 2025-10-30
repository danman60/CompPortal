-- Add site pause setting to system_settings table
-- This allows Super Admin to pause the site for all users except SA

-- Insert the site_paused setting (default to false = not paused)
INSERT INTO public.system_settings (key, value, description, category, data_type, is_public, requires_admin)
VALUES (
  'site_paused',
  'false',
  'Controls whether the site is in maintenance mode. When true, all users except super_admin see maintenance page.',
  'system',
  'boolean',
  false,
  true
)
ON CONFLICT (key) DO NOTHING;
