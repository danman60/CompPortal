-- File: supabase/migrations/20251027_005_add_tenant_id_awards.sql

BEGIN;

ALTER TABLE awards
  ADD COLUMN tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000';

ALTER TABLE awards
  ALTER COLUMN tenant_id DROP DEFAULT;

ALTER TABLE awards
  ADD CONSTRAINT fk_awards_tenant
    FOREIGN KEY (tenant_id)
    REFERENCES tenants(id)
    ON DELETE RESTRICT;

CREATE INDEX idx_awards_tenant ON awards(tenant_id);
CREATE INDEX idx_awards_tenant_entry ON awards(tenant_id, entry_id);

ALTER TABLE awards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "awards_tenant_isolation"
  ON awards FOR ALL TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "awards_service_role"
  ON awards FOR ALL TO service_role
  USING (true) WITH CHECK (true);

COMMIT;
