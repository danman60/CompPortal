-- Schedule Review Workflow Migration
-- Creates tables and columns for multi-version schedule review system
-- Date: November 26, 2025

-- 1. Create schedule_versions table
CREATE TABLE IF NOT EXISTS schedule_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  competition_id UUID NOT NULL REFERENCES competitions(id),

  version_number INTEGER NOT NULL, -- 0, 1, 2, 3...
  status VARCHAR(50) NOT NULL, -- 'draft', 'under_review', 'review_closed'

  sent_at TIMESTAMP WITH TIME ZONE, -- When CD clicked "Send to Studios"
  deadline TIMESTAMP WITH TIME ZONE, -- When review period ends
  closed_at TIMESTAMP WITH TIME ZONE, -- When deadline passed (auto-set)

  sent_by_user_id UUID REFERENCES users(id), -- CD who sent it
  feedback_window_days INTEGER, -- How many days SDs had to respond

  -- Snapshot metadata
  routine_count INTEGER, -- How many routines in this version
  notes_count INTEGER, -- How many SD notes submitted
  responding_studios_count INTEGER, -- How many studios submitted at least 1 note
  total_studios_count INTEGER, -- How many studios registered

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(tenant_id, competition_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_schedule_versions_competition ON schedule_versions(competition_id);
CREATE INDEX IF NOT EXISTS idx_schedule_versions_status ON schedule_versions(status);
CREATE INDEX IF NOT EXISTS idx_schedule_versions_deadline ON schedule_versions(deadline);

-- 2. Add version tracking columns to competition_entries
ALTER TABLE competition_entries
ADD COLUMN IF NOT EXISTS version_created INTEGER DEFAULT 0, -- Which version this routine was first scheduled
ADD COLUMN IF NOT EXISTS version_last_modified INTEGER DEFAULT 0, -- Which version last changed time/day
ADD COLUMN IF NOT EXISTS sd_note_version INTEGER; -- Which version SD added/edited note

-- 3. Create schedule_version_snapshots table (optional - for full history)
CREATE TABLE IF NOT EXISTS schedule_version_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  version_id UUID NOT NULL REFERENCES schedule_versions(id) ON DELETE CASCADE,

  -- Snapshot of competition_entries row at time of version send
  entry_id UUID NOT NULL REFERENCES competition_entries(id) ON DELETE CASCADE,
  entry_number INTEGER,
  scheduled_day DATE,
  performance_time TIME,
  scheduling_notes TEXT,
  has_studio_requests BOOLEAN,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_snapshots_version ON schedule_version_snapshots(version_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_entry ON schedule_version_snapshots(entry_id);

-- 4. Function to auto-close review periods when deadline passes
CREATE OR REPLACE FUNCTION close_expired_reviews()
RETURNS void AS $$
BEGIN
  UPDATE schedule_versions
  SET status = 'review_closed',
      closed_at = NOW(),
      updated_at = NOW()
  WHERE status = 'under_review'
    AND deadline < NOW()
    AND closed_at IS NULL;
END;
$$ LANGUAGE plpgsql;

-- 5. Function to calculate response statistics
CREATE OR REPLACE FUNCTION update_version_statistics(p_version_id UUID)
RETURNS void AS $$
DECLARE
  v_competition_id UUID;
  v_tenant_id UUID;
BEGIN
  -- Get competition and tenant ID
  SELECT competition_id, tenant_id INTO v_competition_id, v_tenant_id
  FROM schedule_versions
  WHERE id = p_version_id;

  -- Update statistics
  UPDATE schedule_versions
  SET
    routine_count = (
      SELECT COUNT(*)
      FROM competition_entries
      WHERE competition_id = v_competition_id
        AND tenant_id = v_tenant_id
        AND performance_time IS NOT NULL
    ),
    notes_count = (
      SELECT COUNT(*)
      FROM competition_entries
      WHERE competition_id = v_competition_id
        AND tenant_id = v_tenant_id
        AND has_studio_requests = TRUE
        AND sd_note_version = schedule_versions.version_number
    ),
    responding_studios_count = (
      SELECT COUNT(DISTINCT studio_id)
      FROM competition_entries
      WHERE competition_id = v_competition_id
        AND tenant_id = v_tenant_id
        AND has_studio_requests = TRUE
        AND sd_note_version = schedule_versions.version_number
    ),
    total_studios_count = (
      SELECT COUNT(DISTINCT studio_id)
      FROM competition_entries
      WHERE competition_id = v_competition_id
        AND tenant_id = v_tenant_id
    ),
    updated_at = NOW()
  WHERE id = p_version_id;
END;
$$ LANGUAGE plpgsql;

-- 6. Create initial version 0 for all existing competitions (if they have scheduled routines)
INSERT INTO schedule_versions (
  tenant_id,
  competition_id,
  version_number,
  status,
  routine_count,
  created_at,
  updated_at
)
SELECT DISTINCT
  ce.tenant_id,
  ce.competition_id,
  0,
  'draft',
  COUNT(*) OVER (PARTITION BY ce.competition_id),
  NOW(),
  NOW()
FROM competition_entries ce
WHERE ce.performance_time IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM schedule_versions sv
    WHERE sv.competition_id = ce.competition_id
      AND sv.tenant_id = ce.tenant_id
  )
GROUP BY ce.tenant_id, ce.competition_id;

-- 7. Add comment documentation
COMMENT ON TABLE schedule_versions IS 'Tracks different versions of competition schedules sent to Studio Directors for review';
COMMENT ON COLUMN schedule_versions.version_number IS 'Sequential version number starting from 0';
COMMENT ON COLUMN schedule_versions.status IS 'Current state: draft (CD editing), under_review (SDs can add notes), review_closed (deadline passed)';
COMMENT ON COLUMN schedule_versions.deadline IS 'When the review period ends and SDs can no longer submit notes';
COMMENT ON COLUMN schedule_versions.feedback_window_days IS 'How many days SDs were given to provide feedback';

COMMENT ON COLUMN competition_entries.version_created IS 'The version number when this routine was first scheduled';
COMMENT ON COLUMN competition_entries.version_last_modified IS 'The version number when this routine schedule was last changed';
COMMENT ON COLUMN competition_entries.sd_note_version IS 'The version number when Studio Director last added/edited their note';