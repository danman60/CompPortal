-- Email Preferences Table
-- Allows users to toggle which automated emails they want to receive

CREATE TYPE email_type AS ENUM (
  'reservation_submitted',      -- CD: When SD submits reservation
  'reservation_approved',        -- SD: When CD approves reservation
  'reservation_rejected',        -- SD: When CD rejects reservation
  'routine_summary_submitted',   -- CD: When SD submits routine summary
  'invoice_received',            -- SD: When invoice is created
  'payment_confirmed',           -- SD: When payment is processed
  'entry_submitted',             -- SD: Confirmation of routine submission
  'missing_music',               -- SD: Reminder to upload music
  'studio_approved',             -- SD: Welcome email when approved
  'studio_rejected'              -- SD: Rejection notification
);

CREATE TABLE IF NOT EXISTS email_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  email_type email_type NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  -- Ensure one preference row per user per email type
  UNIQUE(user_id, email_type)
);

-- Indexes for performance
CREATE INDEX idx_email_preferences_user_id ON email_preferences(user_id);
CREATE INDEX idx_email_preferences_enabled ON email_preferences(enabled);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_email_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_email_preferences_updated_at
  BEFORE UPDATE ON email_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_email_preferences_updated_at();

-- Comments
COMMENT ON TABLE email_preferences IS 'User email notification preferences - all emails enabled by default';
COMMENT ON COLUMN email_preferences.user_id IS 'Reference to user (CD or SD)';
COMMENT ON COLUMN email_preferences.email_type IS 'Type of email notification';
COMMENT ON COLUMN email_preferences.enabled IS 'Whether this email type is enabled for this user';
