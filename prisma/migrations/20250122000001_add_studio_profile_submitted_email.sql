-- Add studio_profile_submitted to email_type enum
-- Notifies CDs when a new studio completes registration

ALTER TYPE email_type ADD VALUE IF NOT EXISTS 'studio_profile_submitted';

-- Comment
COMMENT ON TYPE email_type IS 'Email notification types - includes studio profile submission notifications';
