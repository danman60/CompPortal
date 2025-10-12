-- Migration Pattern for CompPortal
-- Filename: YYYYMMDD_descriptive_name.sql
-- Example: 20251011_add_notifications_table.sql

-- Description: [Brief description of what this migration does]
-- Author: Claude Code
-- Date: [Current date]

-- ============================================
-- CREATE TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign keys (always index these)
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  studio_id UUID REFERENCES studios(id) ON DELETE CASCADE,

  -- Data fields
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('info', 'success', 'warning', 'error')),
  is_read BOOLEAN NOT NULL DEFAULT false,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at TIMESTAMPTZ,

  -- Optional: JSONB for flexible data
  metadata JSONB DEFAULT '{}'::jsonb
);

-- ============================================
-- CREATE INDEXES
-- ============================================

-- Foreign key indexes (CRITICAL for performance)
CREATE INDEX IF NOT EXISTS idx_notifications_user_id
  ON notifications(user_id);

CREATE INDEX IF NOT EXISTS idx_notifications_studio_id
  ON notifications(studio_id)
  WHERE studio_id IS NOT NULL;

-- Query optimization indexes
CREATE INDEX IF NOT EXISTS idx_notifications_unread
  ON notifications(user_id, is_read, created_at DESC)
  WHERE is_read = false;

-- JSONB indexes (if querying metadata)
CREATE INDEX IF NOT EXISTS idx_notifications_metadata_gin
  ON notifications USING GIN (metadata);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own notifications
CREATE POLICY notifications_select_own
  ON notifications
  FOR SELECT
  USING (user_id = (SELECT auth.uid()));

-- Policy: Users can insert their own notifications
CREATE POLICY notifications_insert_own
  ON notifications
  FOR INSERT
  WITH CHECK (user_id = (SELECT auth.uid()));

-- Policy: Users can update their own notifications
CREATE POLICY notifications_update_own
  ON notifications
  FOR UPDATE
  USING (user_id = (SELECT auth.uid()));

-- Policy: Users can delete their own notifications
CREATE POLICY notifications_delete_own
  ON notifications
  FOR DELETE
  USING (user_id = (SELECT auth.uid()));

-- Policy: Competition Directors can view all studio notifications
CREATE POLICY notifications_select_cd
  ON notifications
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (SELECT auth.uid())
      AND role IN ('competition_director', 'super_admin')
    )
  );

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Function: Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp;

-- Trigger: Auto-update updated_at
CREATE TRIGGER update_notifications_updated_at_trigger
  BEFORE UPDATE ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_notifications_updated_at();

-- ============================================
-- ALTER EXISTING TABLES
-- ============================================

-- Add new column to existing table
ALTER TABLE competitions
  ADD COLUMN IF NOT EXISTS notification_enabled BOOLEAN DEFAULT true;

-- Add constraint
ALTER TABLE competitions
  ADD CONSTRAINT check_notification_email
  CHECK (notification_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- ============================================
-- SEED DATA (Optional)
-- ============================================

-- Insert default notification types (only if they don't exist)
INSERT INTO notification_types (name, description) VALUES
  ('entry_submitted', 'Entry has been submitted'),
  ('invoice_paid', 'Invoice has been paid'),
  ('music_reminder', 'Music file upload reminder')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- CLEANUP (If needed)
-- ============================================

-- Drop old indexes if replacing
-- DROP INDEX IF EXISTS old_index_name;

-- Drop old columns if no longer needed
-- ALTER TABLE table_name DROP COLUMN IF EXISTS old_column;

/**
 * TESTING CHECKLIST:
 *
 * 1. Apply migration:
 *    supabase:apply_migration({ name: "20251011_add_notifications", sql: "..." })
 *
 * 2. Run security advisors:
 *    supabase:get_advisors({ type: "security" })
 *    supabase:get_advisors({ type: "performance" })
 *
 * 3. Generate types:
 *    supabase:generate_typescript_types()
 *
 * 4. Verify RLS policies:
 *    - Test as Studio Director (can only see own)
 *    - Test as Competition Director (can see all)
 *
 * 5. Check performance:
 *    - EXPLAIN ANALYZE SELECT * FROM notifications WHERE user_id = '...'
 *    - Verify indexes are being used
 */

/**
 * KEY PATTERNS:
 *
 * 1. Always use IF NOT EXISTS for idempotency
 * 2. Index all foreign keys for JOIN performance
 * 3. Enable RLS on all user-facing tables
 * 4. Use (SELECT auth.uid()) for RLS, not auth.uid()
 * 5. Add SECURITY DEFINER and search_path to functions
 * 6. Use CHECK constraints for data validation
 * 7. Add metadata JSONB column for flexibility
 * 8. Create indexes AFTER table creation
 * 9. Use CASCADE for foreign key deletes if appropriate
 * 10. Test with security advisors after applying
 */
