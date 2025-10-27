-- File: supabase/migrations/20251027_003_add_tenant_id_scores.sql

BEGIN;

ALTER TABLE scores
  ADD COLUMN tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000';

ALTER TABLE scores
  ALTER COLUMN tenant_id DROP DEFAULT;

ALTER TABLE scores
  ADD CONSTRAINT fk_scores_tenant
    FOREIGN KEY (tenant_id)
    REFERENCES tenants(id)
    ON DELETE RESTRICT;

CREATE INDEX idx_scores_tenant ON scores(tenant_id);
CREATE INDEX idx_scores_tenant_entry ON scores(tenant_id, entry_id);

ALTER TABLE scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "scores_tenant_isolation"
  ON scores FOR ALL TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "scores_service_role"
  ON scores FOR ALL TO service_role
  USING (true) WITH CHECK (true);

COMMIT;
