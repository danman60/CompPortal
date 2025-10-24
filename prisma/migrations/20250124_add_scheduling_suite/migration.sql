-- Advanced Scheduling Suite
-- Supports drag-drop scheduling with routine numbers, breaks, conflicts, and SD suggestions

-- Master schedule table
CREATE TABLE IF NOT EXISTS schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id UUID NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'locked')),
  locked_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_schedules_competition ON schedules(competition_id);
CREATE INDEX idx_schedules_status ON schedules(status);

-- Schedule items (routines + break cards)
CREATE TABLE IF NOT EXISTS schedule_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
  item_type VARCHAR(20) NOT NULL CHECK (item_type IN ('routine', 'break')),

  -- For routine items
  entry_id UUID REFERENCES competition_entries(id) ON DELETE CASCADE,
  routine_number INT CHECK (routine_number >= 100 AND routine_number <= 999),

  -- For break items
  break_type VARCHAR(20) CHECK (break_type IN ('lunch', 'break', 'awards')),
  break_label VARCHAR(100),

  -- Positioning
  day_number INT NOT NULL CHECK (day_number >= 1 AND day_number <= 4),
  session_number INT NOT NULL CHECK (session_number >= 1 AND session_number <= 4),
  running_order INT NOT NULL,

  -- Timing
  start_time TIME,
  duration_minutes INT DEFAULT 5,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure either entry_id OR break_type is set, not both
  CONSTRAINT check_item_type_fields CHECK (
    (item_type = 'routine' AND entry_id IS NOT NULL AND break_type IS NULL) OR
    (item_type = 'break' AND entry_id IS NULL AND break_type IS NOT NULL)
  )
);

CREATE INDEX idx_schedule_items_schedule ON schedule_items(schedule_id);
CREATE INDEX idx_schedule_items_entry ON schedule_items(entry_id);
CREATE INDEX idx_schedule_items_day_session ON schedule_items(day_number, session_number);
CREATE INDEX idx_schedule_items_running_order ON schedule_items(running_order);
CREATE INDEX idx_schedule_items_routine_number ON schedule_items(routine_number);

-- Detected scheduling conflicts
CREATE TABLE IF NOT EXISTS schedule_conflicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
  conflict_type VARCHAR(50) NOT NULL,
  entry_ids UUID[] NOT NULL DEFAULT '{}',
  dancer_ids UUID[] NOT NULL DEFAULT '{}',
  severity VARCHAR(20) NOT NULL DEFAULT 'warning' CHECK (severity IN ('info', 'warning', 'critical')),
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_schedule_conflicts_schedule ON schedule_conflicts(schedule_id);
CREATE INDEX idx_schedule_conflicts_severity ON schedule_conflicts(severity);

-- SD suggestions for schedule changes
CREATE TABLE IF NOT EXISTS schedule_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
  studio_id UUID NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  suggested_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  suggestion_type VARCHAR(50) NOT NULL,
  details JSONB NOT NULL,
  notes TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_schedule_suggestions_schedule ON schedule_suggestions(schedule_id);
CREATE INDEX idx_schedule_suggestions_studio ON schedule_suggestions(studio_id);
CREATE INDEX idx_schedule_suggestions_status ON schedule_suggestions(status);

-- Add routine_number to competition_entries for locked schedules
ALTER TABLE competition_entries
ADD COLUMN IF NOT EXISTS routine_number INT CHECK (routine_number >= 100 AND routine_number <= 999);

CREATE INDEX IF NOT EXISTS idx_competition_entries_routine_number ON competition_entries(routine_number);

-- Comments
COMMENT ON TABLE schedules IS 'Master schedules for competitions with draft/locked status';
COMMENT ON TABLE schedule_items IS 'Individual routine placements and break cards in the schedule';
COMMENT ON TABLE schedule_conflicts IS 'Auto-detected conflicts like back-to-back dancer appearances';
COMMENT ON TABLE schedule_suggestions IS 'Studio director suggestions for schedule changes';
COMMENT ON COLUMN schedule_items.routine_number IS 'Assigned routine number (100-999), becomes permanent when schedule is locked';
COMMENT ON COLUMN competition_entries.routine_number IS 'Final routine number when schedule is locked (denormalized from schedule_items)';
