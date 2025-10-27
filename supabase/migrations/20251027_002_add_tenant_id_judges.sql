-- File: supabase/migrations/20251027_002_add_tenant_id_judges.sql

BEGIN;

ALTER TABLE judges
  ADD COLUMN tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000';

ALTER TABLE judges
  ALTER COLUMN tenant_id DROP DEFAULT;

ALTER TABLE judges
  ADD CONSTRAINT fk_judges_tenant
    FOREIGN KEY (tenant_id)
    REFERENCES tenants(id)
    ON DELETE RESTRICT;

CREATE INDEX idx_judges_tenant ON judges(tenant_id);
CREATE INDEX idx_judges_tenant_competition ON judges(tenant_id, competition_id);

ALTER TABLE judges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "judges_tenant_isolation"
  ON judges FOR ALL TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "judges_service_role"
  ON judges FOR ALL TO service_role
  USING (true) WITH CHECK (true);

COMMIT;
