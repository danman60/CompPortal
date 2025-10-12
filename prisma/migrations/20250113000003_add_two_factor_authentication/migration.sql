-- Two-Factor Authentication Fields
-- Add TOTP 2FA support to user profiles

-- ============================================================================
-- ADD 2FA FIELDS TO USER_PROFILES
-- ============================================================================

-- Enable/disable flag
ALTER TABLE "public"."user_profiles"
  ADD COLUMN IF NOT EXISTS "two_factor_enabled" BOOLEAN DEFAULT false;

-- TOTP secret (encrypted in application layer)
ALTER TABLE "public"."user_profiles"
  ADD COLUMN IF NOT EXISTS "two_factor_secret" TEXT;

-- Backup codes (array of hashed codes)
ALTER TABLE "public"."user_profiles"
  ADD COLUMN IF NOT EXISTS "two_factor_backup_codes" JSONB;

-- Timestamp of 2FA setup
ALTER TABLE "public"."user_profiles"
  ADD COLUMN IF NOT EXISTS "two_factor_verified_at" TIMESTAMP(6);

-- ============================================================================
-- CREATE 2FA AUDIT LOG TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS "public"."two_factor_audit_log" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL REFERENCES "public"."user_profiles"("id") ON DELETE CASCADE,
  "action" VARCHAR(50) NOT NULL, -- 'setup', 'verify', 'disable', 'backup_used'
  "success" BOOLEAN DEFAULT true,
  "ip_address" VARCHAR(45),
  "user_agent" TEXT,
  "timestamp" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- INDEXES FOR 2FA AUDIT LOG
-- ============================================================================

CREATE INDEX IF NOT EXISTS "idx_2fa_audit_user" ON "public"."two_factor_audit_log"("user_id");
CREATE INDEX IF NOT EXISTS "idx_2fa_audit_timestamp" ON "public"."two_factor_audit_log"("timestamp" DESC);
CREATE INDEX IF NOT EXISTS "idx_2fa_audit_action" ON "public"."two_factor_audit_log"("action");

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS on audit log
ALTER TABLE "public"."two_factor_audit_log" ENABLE ROW LEVEL SECURITY;

-- Users can only view their own 2FA audit logs
CREATE POLICY IF NOT EXISTS "Users can view their own 2FA audit logs"
  ON "public"."two_factor_audit_log"
  FOR SELECT
  USING (user_id = auth.uid());

-- Service role can insert audit logs
CREATE POLICY IF NOT EXISTS "Service role can insert 2FA audit logs"
  ON "public"."two_factor_audit_log"
  FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON COLUMN "public"."user_profiles"."two_factor_enabled" IS 'Whether 2FA is enabled for this user';
COMMENT ON COLUMN "public"."user_profiles"."two_factor_secret" IS 'TOTP secret key (encrypted in application)';
COMMENT ON COLUMN "public"."user_profiles"."two_factor_backup_codes" IS 'Array of hashed backup codes';
COMMENT ON COLUMN "public"."user_profiles"."two_factor_verified_at" IS 'Timestamp when 2FA was first verified';

COMMENT ON TABLE "public"."two_factor_audit_log" IS 'Audit trail for 2FA actions';
