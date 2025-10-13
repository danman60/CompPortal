-- Studio user roles and permissions
-- Migration: 20251012_add_studio_users_roles

-- Create studio_users join table
CREATE TABLE IF NOT EXISTS public.studio_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id UUID NOT NULL REFERENCES public.studios(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL DEFAULT 'staff', -- 'owner', 'admin', 'staff', 'viewer'
  permissions JSONB DEFAULT '{}', -- Flexible permission overrides
  invited_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  invited_at TIMESTAMP DEFAULT NOW(),
  accepted_at TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(studio_id, user_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_studio_users_studio ON public.studio_users(studio_id);
CREATE INDEX IF NOT EXISTS idx_studio_users_user ON public.studio_users(user_id);
CREATE INDEX IF NOT EXISTS idx_studio_users_role ON public.studio_users(role);

-- Enable RLS
ALTER TABLE public.studio_users ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own studio associations
CREATE POLICY "Users can view their studio memberships"
ON public.studio_users FOR SELECT
USING (
  user_id = (SELECT auth.uid())
  OR studio_id IN (
    SELECT studio_id FROM public.studio_users
    WHERE user_id = (SELECT auth.uid()) AND role IN ('owner', 'admin')
  )
);

-- RLS Policy: Owners and admins can insert new studio users
CREATE POLICY "Owners and admins can add studio users"
ON public.studio_users FOR INSERT
WITH CHECK (
  studio_id IN (
    SELECT studio_id FROM public.studio_users
    WHERE user_id = (SELECT auth.uid()) AND role IN ('owner', 'admin')
  )
);

-- RLS Policy: Owners and admins can update studio users
CREATE POLICY "Owners and admins can update studio users"
ON public.studio_users FOR UPDATE
USING (
  studio_id IN (
    SELECT studio_id FROM public.studio_users
    WHERE user_id = (SELECT auth.uid()) AND role IN ('owner', 'admin')
  )
);

-- RLS Policy: Only owners can delete studio users
CREATE POLICY "Only owners can remove studio users"
ON public.studio_users FOR DELETE
USING (
  studio_id IN (
    SELECT studio_id FROM public.studio_users
    WHERE user_id = (SELECT auth.uid()) AND role = 'owner'
  )
);

-- Seed existing owners into studio_users
INSERT INTO public.studio_users (studio_id, user_id, role, accepted_at, invited_by)
SELECT
  id as studio_id,
  owner_id as user_id,
  'owner' as role,
  created_at as accepted_at,
  owner_id as invited_by
FROM public.studios
WHERE owner_id IS NOT NULL
ON CONFLICT (studio_id, user_id) DO NOTHING;

COMMENT ON TABLE public.studio_users IS 'Join table for multi-user studio access with role-based permissions';
COMMENT ON COLUMN public.studio_users.role IS 'Roles: owner (full access), admin (manage users/settings), staff (create/edit routines), viewer (read-only)';
COMMENT ON COLUMN public.studio_users.permissions IS 'JSONB for granular permission overrides: {can_manage_billing: true, can_delete_dancers: false}';

