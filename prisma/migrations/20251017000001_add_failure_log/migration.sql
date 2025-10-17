-- CreateTable: failure_log for tracking silent failures
CREATE TABLE "failure_log" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "operation_type" TEXT NOT NULL,
    "operation_name" TEXT NOT NULL,
    "entity_type" TEXT,
    "entity_id" UUID,
    "error_message" TEXT NOT NULL,
    "error_details" JSONB,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "resolved_at" TIMESTAMPTZ,
    "created_by" UUID,
    "tenant_id" UUID,

    CONSTRAINT "failure_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "failure_log_status_idx" ON "failure_log"("status");
CREATE INDEX "failure_log_operation_type_idx" ON "failure_log"("operation_type");
CREATE INDEX "failure_log_entity_idx" ON "failure_log"("entity_type", "entity_id");
CREATE INDEX "failure_log_created_at_idx" ON "failure_log"("created_at" DESC);

-- AddForeignKey
ALTER TABLE "failure_log" ADD CONSTRAINT "failure_log_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "failure_log" ADD CONSTRAINT "failure_log_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add RLS policy
ALTER TABLE "failure_log" ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view failure logs for their tenant
CREATE POLICY "failure_log_view_policy" ON "failure_log"
    FOR SELECT
    USING (
        tenant_id IN (
            SELECT tenant_id FROM user_profiles WHERE user_id = auth.uid()
        )
    );

-- Policy: System can insert failure logs
CREATE POLICY "failure_log_insert_policy" ON "failure_log"
    FOR INSERT
    WITH CHECK (true);

-- Policy: Admins can update failure logs (for retry/resolve)
CREATE POLICY "failure_log_update_policy" ON "failure_log"
    FOR UPDATE
    USING (
        tenant_id IN (
            SELECT up.tenant_id FROM user_profiles up
            WHERE up.user_id = auth.uid() AND up.role IN ('super_admin', 'competition_director')
        )
    );

-- Add comment
COMMENT ON TABLE "failure_log" IS 'Tracks silent failures (email, API calls, etc.) for visibility and retry capability';
