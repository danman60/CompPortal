-- Classification Exception Request & Approval System
-- Spec: docs/specs/CLASSIFICATION_EXCEPTION_APPROVAL_SPEC.md
-- Created: November 4, 2025

-- =============================================================================
-- 1. Add new entry status for pending classification approval
-- =============================================================================

-- Extend competition_entries.status enum
-- Note: This is a soft extension - we use VARCHAR(50) so no ALTER needed
-- Just documenting the new valid status value: 'pending_classification_approval'

-- =============================================================================
-- 2. Create classification_exception_requests table
-- =============================================================================

CREATE TABLE classification_exception_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Core References
  entry_id UUID NOT NULL REFERENCES competition_entries(id) ON DELETE CASCADE,
  reservation_id UUID NOT NULL REFERENCES reservations(id),
  competition_id UUID NOT NULL REFERENCES competitions(id),
  studio_id UUID NOT NULL REFERENCES studios(id),
  tenant_id UUID NOT NULL REFERENCES tenants(id),

  -- Classification Details
  auto_calculated_classification_id UUID NOT NULL REFERENCES classifications(id),
  requested_classification_id UUID NOT NULL REFERENCES classifications(id),
  approved_classification_id UUID REFERENCES classifications(id), -- Set by CD on decision

  -- Request Details
  sd_justification TEXT NOT NULL, -- Required from SD
  cd_comments TEXT, -- Optional from CD

  -- Status & Decision
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'resolved'
  cd_decision_type VARCHAR(50), -- 'approved_as_requested', 'approved_different'

  -- Timestamps
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  responded_at TIMESTAMP, -- When CD made decision
  reminder_sent_at TIMESTAMP, -- For 5-day reminder

  -- Audit
  created_by UUID NOT NULL REFERENCES user_profiles(id),
  responded_by UUID REFERENCES user_profiles(id),

  -- Constraints
  CONSTRAINT unique_entry_request UNIQUE(entry_id) -- Only one request per entry
);

-- =============================================================================
-- 3. Create indexes for performance
-- =============================================================================

CREATE INDEX idx_classification_requests_status ON classification_exception_requests(status);
CREATE INDEX idx_classification_requests_competition ON classification_exception_requests(competition_id);
CREATE INDEX idx_classification_requests_studio ON classification_exception_requests(studio_id);
CREATE INDEX idx_classification_requests_tenant ON classification_exception_requests(tenant_id);
CREATE INDEX idx_classification_requests_created_at ON classification_exception_requests(created_at);
CREATE INDEX idx_classification_requests_entry ON classification_exception_requests(entry_id);

-- =============================================================================
-- 4. Row Level Security (RLS)
-- =============================================================================

ALTER TABLE classification_exception_requests ENABLE ROW LEVEL SECURITY;

-- Competition Directors can view all requests for their tenant
CREATE POLICY "Competition Directors can view classification requests"
ON classification_exception_requests
FOR SELECT
USING (
  tenant_id IN (
    SELECT tenant_id
    FROM user_profiles
    WHERE id = auth.uid()
    AND role IN ('competition_director', 'super_admin')
  )
);

-- Studio Directors can view requests for their studio
CREATE POLICY "Studio Directors can view their classification requests"
ON classification_exception_requests
FOR SELECT
USING (
  studio_id IN (
    SELECT studio_id
    FROM user_profiles
    WHERE id = auth.uid()
    AND role = 'studio_director'
  )
);

-- Studio Directors can create requests for their studio's entries
CREATE POLICY "Studio Directors can create classification requests"
ON classification_exception_requests
FOR INSERT
WITH CHECK (
  studio_id IN (
    SELECT studio_id
    FROM user_profiles
    WHERE id = auth.uid()
    AND role = 'studio_director'
  )
  AND tenant_id IN (
    SELECT tenant_id
    FROM user_profiles
    WHERE id = auth.uid()
  )
);

-- Competition Directors can update requests (respond)
CREATE POLICY "Competition Directors can update classification requests"
ON classification_exception_requests
FOR UPDATE
USING (
  tenant_id IN (
    SELECT tenant_id
    FROM user_profiles
    WHERE id = auth.uid()
    AND role IN ('competition_director', 'super_admin')
  )
);

-- Studio Directors can delete their own pending requests (cancel)
CREATE POLICY "Studio Directors can delete pending requests"
ON classification_exception_requests
FOR DELETE
USING (
  studio_id IN (
    SELECT studio_id
    FROM user_profiles
    WHERE id = auth.uid()
    AND role = 'studio_director'
  )
  AND status = 'pending'
);

-- =============================================================================
-- 5. Add comment documentation
-- =============================================================================

COMMENT ON TABLE classification_exception_requests IS 'Tracks requests from Studio Directors for classification exceptions. CD must approve before entry can be included in summary submission.';

COMMENT ON COLUMN classification_exception_requests.entry_id IS 'The entry requesting exception. CASCADE deletes request if entry deleted.';
COMMENT ON COLUMN classification_exception_requests.auto_calculated_classification_id IS 'The classification auto-calculated by the system based on dancer classifications.';
COMMENT ON COLUMN classification_exception_requests.requested_classification_id IS 'The classification the SD is requesting (may differ from auto-calculated).';
COMMENT ON COLUMN classification_exception_requests.approved_classification_id IS 'The final classification set by CD. May match requested OR be different (CD denial).';
COMMENT ON COLUMN classification_exception_requests.sd_justification IS 'Required justification from SD explaining why exception is needed.';
COMMENT ON COLUMN classification_exception_requests.cd_comments IS 'Optional comments from CD when making decision.';
COMMENT ON COLUMN classification_exception_requests.status IS 'pending = awaiting CD response, approved = CD approved as requested, resolved = CD set different classification';
COMMENT ON COLUMN classification_exception_requests.cd_decision_type IS 'approved_as_requested = CD approved SD request, approved_different = CD set different classification (denial)';
COMMENT ON COLUMN classification_exception_requests.reminder_sent_at IS 'Timestamp when 5-day reminder email was sent to CD. Only one reminder sent.';
