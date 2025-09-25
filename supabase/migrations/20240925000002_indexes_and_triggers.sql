-- GlowDance Competition Portal - Indexes, Triggers, and Optimization
-- Performance optimization and data integrity
-- Generated: September 25, 2025

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Studios
CREATE INDEX idx_studios_owner ON studios(owner_id);
CREATE INDEX idx_studios_code ON studios(code);
CREATE INDEX idx_studios_status ON studios(status);

-- Dancers
CREATE INDEX idx_dancers_studio ON dancers(studio_id);
CREATE INDEX idx_dancers_name ON dancers(first_name, last_name);
CREATE INDEX idx_dancers_age ON dancers(date_of_birth);

-- Competitions
CREATE INDEX idx_competitions_year ON competitions(year);
CREATE INDEX idx_competitions_status ON competitions(status);
CREATE INDEX idx_competitions_dates ON competitions(competition_start_date, competition_end_date);

-- Competition Entries (critical for export performance)
CREATE INDEX idx_entries_competition ON competition_entries(competition_id);
CREATE INDEX idx_entries_studio ON competition_entries(studio_id);
CREATE INDEX idx_entries_sequence ON competition_entries(sequence_number);
CREATE INDEX idx_entries_session ON competition_entries(session_id);
CREATE INDEX idx_entries_performance_time ON competition_entries(performance_date, performance_time);

-- Entry Participants
CREATE INDEX idx_participants_entry ON entry_participants(entry_id);
CREATE INDEX idx_participants_dancer ON entry_participants(dancer_id);

-- Reservations
CREATE INDEX idx_reservations_studio ON reservations(studio_id);
CREATE INDEX idx_reservations_competition ON reservations(competition_id);
CREATE INDEX idx_reservations_status ON reservations(status);

-- Scores and Rankings
CREATE INDEX idx_scores_entry ON scores(entry_id);
CREATE INDEX idx_scores_judge ON scores(judge_id);
CREATE INDEX idx_rankings_competition ON rankings(competition_id);
CREATE INDEX idx_rankings_category ON rankings(category_id, age_group_id, classification_id);

-- Documents
CREATE INDEX idx_documents_competition ON documents(competition_id);
CREATE INDEX idx_documents_studio ON documents(studio_id);
CREATE INDEX idx_documents_type ON documents(document_type);

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE studios ENABLE ROW LEVEL SECURITY;
ALTER TABLE dancers ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE competition_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE entry_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE rankings ENABLE ROW LEVEL SECURITY;
ALTER TABLE awards ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- User Profiles: Users can only see their own profile
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

-- Studios: Studio owners can only see their own studios
CREATE POLICY "Studio owners can view own studios" ON studios
  FOR ALL USING (
    owner_id = auth.uid() OR
    auth.jwt() ->> 'role' IN ('admin', 'super_admin')
  );

-- Dancers: Studio owners can only see dancers in their studios
CREATE POLICY "Studio access to dancers" ON dancers
  FOR ALL USING (
    studio_id IN (
      SELECT id FROM studios WHERE owner_id = auth.uid()
    ) OR
    auth.jwt() ->> 'role' IN ('admin', 'super_admin')
  );

-- Reservations: Studio owners can only see their reservations
CREATE POLICY "Studio access to reservations" ON reservations
  FOR ALL USING (
    studio_id IN (
      SELECT id FROM studios WHERE owner_id = auth.uid()
    ) OR
    auth.jwt() ->> 'role' IN ('admin', 'super_admin')
  );

-- Competition Entries: Studio owners can see their entries, admins see all
CREATE POLICY "Studio access to entries" ON competition_entries
  FOR ALL USING (
    studio_id IN (
      SELECT id FROM studios WHERE owner_id = auth.uid()
    ) OR
    auth.jwt() ->> 'role' IN ('admin', 'super_admin', 'judge')
  );

-- Entry Participants: Access through entry permissions
CREATE POLICY "Entry participant access" ON entry_participants
  FOR ALL USING (
    entry_id IN (
      SELECT id FROM competition_entries WHERE
        studio_id IN (
          SELECT id FROM studios WHERE owner_id = auth.uid()
        )
    ) OR
    auth.jwt() ->> 'role' IN ('admin', 'super_admin', 'judge')
  );

-- Scores: Judges can see scores they gave, studios can see their scores
CREATE POLICY "Score access control" ON scores
  FOR SELECT USING (
    -- Judges can see scores they gave
    judge_id IN (
      SELECT id FROM judges WHERE user_id = auth.uid()
    ) OR
    -- Studios can see scores for their entries
    entry_id IN (
      SELECT id FROM competition_entries WHERE
        studio_id IN (
          SELECT id FROM studios WHERE owner_id = auth.uid()
        )
    ) OR
    auth.jwt() ->> 'role' IN ('admin', 'super_admin')
  );

-- Only judges can insert/update their own scores
CREATE POLICY "Judges can manage own scores" ON scores
  FOR INSERT WITH CHECK (
    judge_id IN (
      SELECT id FROM judges WHERE user_id = auth.uid()
    ) OR
    auth.jwt() ->> 'role' IN ('admin', 'super_admin')
  );

CREATE POLICY "Judges can update own scores" ON scores
  FOR UPDATE USING (
    judge_id IN (
      SELECT id FROM judges WHERE user_id = auth.uid()
    ) OR
    auth.jwt() ->> 'role' IN ('admin', 'super_admin')
  );

-- Documents: Access based on visibility and ownership
CREATE POLICY "Document access control" ON documents
  FOR SELECT USING (
    visibility = 'public' OR
    (visibility = 'studio' AND studio_id IN (
      SELECT id FROM studios WHERE owner_id = auth.uid()
    )) OR
    uploaded_by = auth.uid() OR
    auth.jwt() ->> 'role' IN ('admin', 'super_admin')
  );

-- =====================================================
-- REAL-TIME SUBSCRIPTIONS
-- =====================================================

-- Enable real-time on key tables for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE competitions;
ALTER PUBLICATION supabase_realtime ADD TABLE competition_entries;
ALTER PUBLICATION supabase_realtime ADD TABLE scores;
ALTER PUBLICATION supabase_realtime ADD TABLE rankings;
ALTER PUBLICATION supabase_realtime ADD TABLE reservations;

-- =====================================================
-- FUNCTIONS AND TRIGGERS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_studios_updated_at BEFORE UPDATE ON studios
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dancers_updated_at BEFORE UPDATE ON dancers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reservations_updated_at BEFORE UPDATE ON reservations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_competition_entries_updated_at BEFORE UPDATE ON competition_entries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate dancer age at competition date
CREATE OR REPLACE FUNCTION calculate_dancer_age(birth_date DATE, competition_date DATE)
RETURNS INTEGER AS $$
BEGIN
    RETURN EXTRACT(YEAR FROM AGE(competition_date, birth_date));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to generate next entry number for a competition
CREATE OR REPLACE FUNCTION get_next_entry_number(comp_id UUID)
RETURNS INTEGER AS $$
DECLARE
    next_num INTEGER;
BEGIN
    SELECT COALESCE(MAX(entry_number), 0) + 1
    INTO next_num
    FROM competition_entries
    WHERE competition_id = comp_id;

    RETURN next_num;
END;
$$ LANGUAGE plpgsql;