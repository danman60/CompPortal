-- File: supabase/migrations/20251027_001_add_tenant_id_competition_sessions.sql

BEGIN;

-- Add column (NOT NULL immediately since table is empty)
ALTER TABLE competition_sessions
  ADD COLUMN tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000';

-- Remove default (was just for schema safety)
ALTER TABLE competition_sessions
  ALTER COLUMN tenant_id DROP DEFAULT;

-- Add foreign key
ALTER TABLE competition_sessions
  ADD CONSTRAINT fk_competition_sessions_tenant
    FOREIGN KEY (tenant_id)
    REFERENCES tenants(id)
    ON DELETE RESTRICT;

-- Add indexes
CREATE INDEX idx_competition_sessions_tenant
  ON competition_sessions(tenant_id);
CREATE INDEX idx_competition_sessions_tenant_competition
  ON competition_sessions(tenant_id, competition_id);

-- Enable RLS
ALTER TABLE competition_sessions ENABLE ROW LEVEL SECURITY;

-- Authenticated users policy
CREATE POLICY "competition_sessions_tenant_isolation"
  ON competition_sessions
  FOR ALL
  TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()));

-- Service role bypass (for Prisma)
CREATE POLICY "competition_sessions_service_role"
  ON competition_sessions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMIT;
