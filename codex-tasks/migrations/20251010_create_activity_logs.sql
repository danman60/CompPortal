-- Create activity_logs table and policies
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  studio_id UUID REFERENCES public.studios(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  entity_name TEXT,
  details JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON public.activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_studio_id ON public.activity_logs(studio_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON public.activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity ON public.activity_logs(entity_type, entity_id);

-- Enable RLS
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Users can view own activities
DO $$ BEGIN
  CREATE POLICY "Users can view own activities"
    ON public.activity_logs FOR SELECT
    USING (user_id = (SELECT auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Studios can view studio activities (owner-based)
DO $$ BEGIN
  CREATE POLICY "Studios can view studio activities"
    ON public.activity_logs FOR SELECT
    USING (
      studio_id IN (
        SELECT id FROM public.studios WHERE owner_id = (SELECT auth.uid())
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Authenticated users can insert their own activities
DO $$ BEGIN
  CREATE POLICY "Authenticated users can create activity logs"
    ON public.activity_logs FOR INSERT
    TO authenticated
    WITH CHECK (user_id = (SELECT auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

