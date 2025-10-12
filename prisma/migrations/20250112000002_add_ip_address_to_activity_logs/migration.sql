-- Add IP address tracking to activity_logs for security audit trail
ALTER TABLE "public"."activity_logs"
ADD COLUMN IF NOT EXISTS "ip_address" VARCHAR(45);

-- Add index for IP address lookups (security investigations)
CREATE INDEX IF NOT EXISTS "idx_activity_logs_ip_address" ON "public"."activity_logs"("ip_address");

-- Add index for timestamp + IP combination (audit queries)
CREATE INDEX IF NOT EXISTS "idx_activity_logs_timestamp_ip" ON "public"."activity_logs"("timestamp", "ip_address");
