-- Migration: Add schedule_status and related fields to competitions table

ALTER TABLE competitions
ADD COLUMN schedule_status VARCHAR(20) DEFAULT 'not_started'
  CHECK (schedule_status IN ('not_started', 'draft', 'finalized', 'published')),
ADD COLUMN schedule_finalized_at TIMESTAMPTZ,
ADD COLUMN schedule_finalized_by UUID REFERENCES auth.users(id),
ADD COLUMN schedule_published_at TIMESTAMPTZ,
ADD COLUMN schedule_published_by UUID REFERENCES auth.users(id);

COMMENT ON COLUMN competitions.schedule_status IS 'State machine: not_started -> draft -> finalized -> published';
COMMENT ON COLUMN competitions.schedule_finalized_at IS 'Timestamp when schedule was locked (numbers frozen)';
COMMENT ON COLUMN competitions.schedule_published_at IS 'Timestamp when studio names were revealed';
