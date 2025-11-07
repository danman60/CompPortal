-- User Feedback System
-- Allows SD and CD users to submit feedback with optional star ratings
-- Daily digest emails sent to SA at 8am EST via cron job
-- Popup triggers on every 5th login for users

-- Add login counter to user_profiles
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS login_count INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_feedback_prompt_at TIMESTAMPTZ;

COMMENT ON COLUMN user_profiles.login_count IS 'Tracks number of logins for feedback prompt (every 5th login)';
COMMENT ON COLUMN user_profiles.last_feedback_prompt_at IS 'Timestamp of last feedback prompt shown to user';

-- Feedback submissions table
CREATE TABLE user_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  user_role TEXT NOT NULL CHECK (user_role IN ('studio_director', 'competition_director')),
  user_email TEXT NOT NULL,
  user_name TEXT,

  -- Feedback content
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('dream_feature', 'clunky_experience', 'bug_report', 'general')),
  star_rating INTEGER CHECK (star_rating IS NULL OR (star_rating >= 1 AND star_rating <= 5)),
  comment TEXT NOT NULL CHECK (LENGTH(TRIM(comment)) > 0),

  -- Metadata
  page_url TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Admin tracking
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'actioned', 'archived')),
  admin_notes TEXT,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id)
);

-- Indexes for performance
CREATE INDEX idx_user_feedback_tenant ON user_feedback(tenant_id);
CREATE INDEX idx_user_feedback_created ON user_feedback(created_at DESC);
CREATE INDEX idx_user_feedback_status ON user_feedback(status);
CREATE INDEX idx_user_feedback_type ON user_feedback(feedback_type);

-- RLS Policies
ALTER TABLE user_feedback ENABLE ROW LEVEL SECURITY;

-- Users can insert their own feedback
CREATE POLICY "Users can insert own feedback"
  ON user_feedback
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can view their own feedback
CREATE POLICY "Users can view own feedback"
  ON user_feedback
  FOR SELECT
  USING (auth.uid() = user_id);

-- Super admins can view all feedback
CREATE POLICY "Super admins can view all feedback"
  ON user_feedback
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
  );

-- Super admins can update feedback (status, notes)
CREATE POLICY "Super admins can update all feedback"
  ON user_feedback
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
  );

-- Comments
COMMENT ON TABLE user_feedback IS 'Stores user feedback submissions from SD and CD users';
COMMENT ON COLUMN user_feedback.feedback_type IS 'Type of feedback: dream_feature, clunky_experience, bug_report, general';
COMMENT ON COLUMN user_feedback.star_rating IS 'Optional 1-5 star rating';
COMMENT ON COLUMN user_feedback.status IS 'Admin workflow status: new, reviewed, actioned, archived';
