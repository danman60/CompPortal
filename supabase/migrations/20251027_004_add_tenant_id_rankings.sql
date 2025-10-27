-- File: supabase/migrations/20251027_004_add_tenant_id_rankings.sql

BEGIN;

ALTER TABLE rankings
  ADD COLUMN tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000';

ALTER TABLE rankings
  ALTER COLUMN tenant_id DROP DEFAULT;

ALTER TABLE rankings
  ADD CONSTRAINT fk_rankings_tenant
    FOREIGN KEY (tenant_id)
    REFERENCES tenants(id)
    ON DELETE RESTRICT;

CREATE INDEX idx_rankings_tenant ON rankings(tenant_id);
CREATE INDEX idx_rankings_tenant_entry ON rankings(tenant_id, entry_id);

ALTER TABLE rankings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rankings_tenant_isolation"
  ON rankings FOR ALL TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "rankings_service_role"
  ON rankings FOR ALL TO service_role
  USING (true) WITH CHECK (true);

COMMIT;
