-- Create routine_import_sessions table for CSV import workflow
-- Part of CSV Import Redesign (data loader architecture)

CREATE TABLE routine_import_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id UUID NOT NULL,
  reservation_id UUID NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  completed BOOLEAN DEFAULT false,
  current_index INT DEFAULT 0,
  total_routines INT NOT NULL,
  routines JSONB NOT NULL,

  CONSTRAINT fk_studio FOREIGN KEY (studio_id) REFERENCES studios(id) ON DELETE CASCADE,
  CONSTRAINT fk_reservation FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE CASCADE
);

-- Add indexes for performance
CREATE INDEX idx_import_sessions_studio ON routine_import_sessions(studio_id);
CREATE INDEX idx_import_sessions_completed ON routine_import_sessions(completed);
CREATE INDEX idx_import_sessions_created_at ON routine_import_sessions(created_at);

-- Add RLS policies for multi-tenant isolation
ALTER TABLE routine_import_sessions ENABLE ROW LEVEL SECURITY;

-- Studios can only see their own import sessions
CREATE POLICY routine_import_sessions_tenant_isolation ON routine_import_sessions
  FOR ALL
  USING (studio_id IN (
    SELECT id FROM studios WHERE tenant_id = current_setting('app.current_tenant_id', TRUE)::uuid
  ));

-- Super admins can see all import sessions
CREATE POLICY routine_import_sessions_super_admin ON routine_import_sessions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'super_admin'
    )
  );
