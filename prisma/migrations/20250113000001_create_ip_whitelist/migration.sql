-- Create IP Whitelist table for restricting sensitive admin actions
CREATE TABLE IF NOT EXISTS "public"."ip_whitelist" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL REFERENCES "public"."tenants"("id") ON DELETE CASCADE,
  "ip_address" VARCHAR(45) NOT NULL,
  "ip_range_start" VARCHAR(45),
  "ip_range_end" VARCHAR(45),
  "description" TEXT,
  "is_active" BOOLEAN DEFAULT true,
  "created_by" UUID REFERENCES "public"."auth"."users"("id"),
  "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS "idx_ip_whitelist_tenant" ON "public"."ip_whitelist"("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_ip_whitelist_ip" ON "public"."ip_whitelist"("ip_address");
CREATE INDEX IF NOT EXISTS "idx_ip_whitelist_active" ON "public"."ip_whitelist"("is_active");

-- Add RLS policies
ALTER TABLE "public"."ip_whitelist" ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view whitelist for their tenant
CREATE POLICY "Users can view IP whitelist for their tenant"
  ON "public"."ip_whitelist"
  FOR SELECT
  USING (tenant_id IN (
    SELECT tenant_id FROM public.user_roles WHERE user_id = auth.uid()
  ));

-- Policy: Only admins can manage IP whitelist
CREATE POLICY "Admins can manage IP whitelist"
  ON "public"."ip_whitelist"
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND tenant_id = ip_whitelist.tenant_id
        AND role IN ('competition_director', 'admin')
    )
  );
