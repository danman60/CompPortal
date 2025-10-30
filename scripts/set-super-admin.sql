-- Set danieljohnabrahamson@gmail.com as super_admin
-- This removes their studio_director role and studio association

-- First, let's see the current state
SELECT id, email, role, studio_id, tenant_id
FROM public.users
WHERE email = 'danieljohnabrahamson@gmail.com';

-- Update the user to super_admin role and remove studio association
UPDATE public.users
SET
  role = 'super_admin',
  studio_id = NULL
WHERE email = 'danieljohnabrahamson@gmail.com';

-- Verify the update
SELECT id, email, role, studio_id, tenant_id
FROM public.users
WHERE email = 'danieljohnabrahamson@gmail.com';
