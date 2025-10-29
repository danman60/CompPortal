-- Phase 1 Data Cleanup: Seed award_types for EMPWR and Glow
-- Spec: TENANT_SETTINGS_SPEC.md lines 302-568 (EMPWR), lines 822-832 (Glow)
-- Risk: LOW - INSERT only, 0 existing rows, no dependencies

-- ============================================================================
-- EMPWR DANCE EXPERIENCE AWARDS
-- ============================================================================

-- OVERALL AWARDS (Placement-based, per category)
-- Spec lines 516-525
INSERT INTO award_types (tenant_id, name, description, category, award_basis, top_n, entry_size_filter)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'Top 10 Solos', 'Awarded in each classification for age divisions: Micro, Mini, Junior, Intermediate, Senior', 'overall', 'placement', 10, ARRAY['Solo']),
  ('00000000-0000-0000-0000-000000000001', 'Top 3 Duets/Trios', 'Awarded in each classification for age divisions: Micro, Mini, Junior, Intermediate, Senior', 'overall', 'placement', 3, ARRAY['Duet/Trio']),
  ('00000000-0000-0000-0000-000000000001', 'Top 3 Small Groups', 'Awarded in each classification for age divisions: Micro, Mini, Junior, Intermediate, Senior', 'overall', 'placement', 3, ARRAY['Small Group']),
  ('00000000-0000-0000-0000-000000000001', 'Top 3 Large Groups', 'Awarded in each classification for age divisions: Micro, Mini, Junior, Intermediate, Senior', 'overall', 'placement', 3, ARRAY['Large Group']),
  ('00000000-0000-0000-0000-000000000001', 'Top 3 Lines', 'Awarded in each classification for age divisions: Micro, Mini, Junior, Intermediate, Senior', 'overall', 'placement', 3, ARRAY['Line']),
  ('00000000-0000-0000-0000-000000000001', 'Top 3 Super Lines', 'Awarded in each classification for age divisions: Micro, Mini, Junior, Intermediate, Senior', 'overall', 'placement', 3, ARRAY['Super Line']),
  ('00000000-0000-0000-0000-000000000001', 'Top 3 Productions', 'All age divisions combined for Top 3', 'overall', 'placement', 3, ARRAY['Production'])
ON CONFLICT (tenant_id, name) DO NOTHING;

-- SESSION AWARDS (Subjective)
-- Spec lines 529-532
INSERT INTO award_types (tenant_id, name, description, category, award_basis)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'You Are The Key Award', 'Special award presented during session', 'session', 'subjective'),
  ('00000000-0000-0000-0000-000000000001', 'Choreo of the Session', 'Best choreography in the session', 'session', 'subjective')
ON CONFLICT (tenant_id, name) DO NOTHING;

-- ADJUDICATORS CHOICE AWARDS (Subjective)
-- Spec lines 536-546
INSERT INTO award_types (tenant_id, name, description, category, award_basis, classification_filter)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'Most Potential', 'Dancer showing exceptional potential', 'adjudicator_choice', 'subjective', NULL),
  ('00000000-0000-0000-0000-000000000001', 'Outstanding Performance - Novice', 'Best performance in Novice classification', 'adjudicator_choice', 'subjective', ARRAY['Novice']),
  ('00000000-0000-0000-0000-000000000001', 'Outstanding Performance - Part-Time', 'Best performance in Part-Time classification', 'adjudicator_choice', 'subjective', ARRAY['Part-Time']),
  ('00000000-0000-0000-0000-000000000001', 'Outstanding Performance - Competitive', 'Best performance in Competitive classification', 'adjudicator_choice', 'subjective', ARRAY['Competitive']),
  ('00000000-0000-0000-0000-000000000001', 'The Jes Sachse Tap Award', 'Excellence in tap dance', 'adjudicator_choice', 'subjective', NULL),
  ('00000000-0000-0000-0000-000000000001', 'Unlock Your PWR Award', 'Dancer embodying EMPWR values', 'adjudicator_choice', 'subjective', NULL),
  ('00000000-0000-0000-0000-000000000001', 'Ambassadorship Recipients', 'Dancers representing EMPWR values', 'adjudicator_choice', 'subjective', NULL),
  ('00000000-0000-0000-0000-000000000001', 'Top Choreo of the Weekend', 'Best choreography of the entire competition', 'adjudicator_choice', 'subjective', NULL)
ON CONFLICT (tenant_id, name) DO NOTHING;

-- FINAL AWARDS (Score + Placement based)
-- Spec lines 550-568

-- Highest Mark per classification
INSERT INTO award_types (tenant_id, name, description, category, award_basis, classification_filter)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'Highest Mark - Novice', 'Highest score in Novice classification', 'final', 'score', ARRAY['Novice']),
  ('00000000-0000-0000-0000-000000000001', 'Highest Mark - Part-Time', 'Highest score in Part-Time classification', 'final', 'score', ARRAY['Part-Time']),
  ('00000000-0000-0000-0000-000000000001', 'Highest Mark - Competitive', 'Highest score in Competitive classification', 'final', 'score', ARRAY['Competitive'])
ON CONFLICT (tenant_id, name) DO NOTHING;

-- Dancer of the Year per age division
INSERT INTO award_types (tenant_id, name, description, category, award_basis, age_division_filter)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'Dancer of the Year - Micro', 'Top dancer in Micro age division (5 & under)', 'final', 'score', ARRAY['Micro']),
  ('00000000-0000-0000-0000-000000000001', 'Dancer of the Year - Mini', 'Top dancer in Mini age division (6-8)', 'final', 'score', ARRAY['Mini']),
  ('00000000-0000-0000-0000-000000000001', 'Dancer of the Year - Junior', 'Top dancer in Junior age division (9-11)', 'final', 'score', ARRAY['Junior']),
  ('00000000-0000-0000-0000-000000000001', 'Dancer of the Year - Intermediate', 'Top dancer in Intermediate age division (12-14)', 'final', 'score', ARRAY['Intermediate']),
  ('00000000-0000-0000-0000-000000000001', 'Dancer of the Year - Senior', 'Top dancer in Senior age division (15-17)', 'final', 'score', ARRAY['Senior'])
ON CONFLICT (tenant_id, name) DO NOTHING;

-- Top Studio per classification
INSERT INTO award_types (tenant_id, name, description, category, award_basis, classification_filter)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'Top Studio - Novice', 'Highest cumulative score in Novice classification', 'final', 'score', ARRAY['Novice']),
  ('00000000-0000-0000-0000-000000000001', 'Top Studio - Part-Time', 'Highest cumulative score in Part-Time classification', 'final', 'score', ARRAY['Part-Time']),
  ('00000000-0000-0000-0000-000000000001', 'Top Studio - Competitive', 'Highest cumulative score in Competitive classification', 'final', 'score', ARRAY['Competitive'])
ON CONFLICT (tenant_id, name) DO NOTHING;

-- ============================================================================
-- GLOW DANCE COMPETITION AWARDS
-- ============================================================================

-- SPECIAL AWARDS (Subjective)
-- Spec lines 822-832
INSERT INTO award_types (tenant_id, name, description, category, award_basis)
VALUES
  ('4b9c1713-40ab-460b-8dda-5a8cf6cbc9b5', 'Heartfelt Execution', 'Award for emotional and heartfelt performance', 'special', 'subjective'),
  ('4b9c1713-40ab-460b-8dda-5a8cf6cbc9b5', 'Creative Brilliance', 'Award for exceptional creativity and originality', 'special', 'subjective'),
  ('4b9c1713-40ab-460b-8dda-5a8cf6cbc9b5', 'Outstanding Technique', 'Award for exceptional technical execution', 'special', 'subjective'),
  ('4b9c1713-40ab-460b-8dda-5a8cf6cbc9b5', 'Captivating Performance', 'Award for mesmerizing stage presence', 'special', 'subjective'),
  ('4b9c1713-40ab-460b-8dda-5a8cf6cbc9b5', 'Outstanding Performance', 'Overall outstanding performance award', 'special', 'subjective'),
  ('4b9c1713-40ab-460b-8dda-5a8cf6cbc9b5', 'Artistic Edge', 'Award for unique artistic interpretation', 'special', 'subjective'),
  ('4b9c1713-40ab-460b-8dda-5a8cf6cbc9b5', 'Unparalleled Precision', 'Award for exceptional precision and accuracy', 'special', 'subjective'),
  ('4b9c1713-40ab-460b-8dda-5a8cf6cbc9b5', 'You Are Glowing Award', 'Judges choice award, includes full entry-fee scholarship to next Glow competition', 'special', 'subjective'),
  ('4b9c1713-40ab-460b-8dda-5a8cf6cbc9b5', 'Kindness Award', 'Selected by Glow Team for exemplary kindness and sportsmanship', 'special', 'subjective'),
  ('4b9c1713-40ab-460b-8dda-5a8cf6cbc9b5', 'Born to Glow Award', 'In loving memory of Eleanor "Ellie" Butler - for dancer who embodies grace, talent, and light', 'special', 'subjective')
ON CONFLICT (tenant_id, name) DO NOTHING;

-- Verification
DO $$
DECLARE
  empwr_count INTEGER;
  glow_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO empwr_count FROM award_types WHERE tenant_id = '00000000-0000-0000-0000-000000000001';
  SELECT COUNT(*) INTO glow_count FROM award_types WHERE tenant_id = '4b9c1713-40ab-460b-8dda-5a8cf6cbc9b5';

  RAISE NOTICE 'EMPWR award types: %', empwr_count;
  RAISE NOTICE 'Glow award types: %', glow_count;

  IF empwr_count < 25 THEN
    RAISE WARNING 'Expected at least 25 EMPWR award types, got %', empwr_count;
  ELSIF glow_count < 10 THEN
    RAISE WARNING 'Expected at least 10 Glow award types, got %', glow_count;
  ELSE
    RAISE NOTICE 'SUCCESS: Award types seeded for both tenants';
  END IF;
END $$;
