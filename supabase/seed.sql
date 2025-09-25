-- GlowDance Competition Portal - Sample Data for Development
-- Test data for local development and demonstrations
-- Generated: September 25, 2025

-- =====================================================
-- SAMPLE DATA FOR DEVELOPMENT
-- =====================================================

-- Insert default classifications
INSERT INTO classifications (name, description, skill_level, color_code) VALUES
  ('Recreational', 'Entry-level dancers, focus on fun and participation', 1, '#22c55e'),
  ('Competitive', 'Intermediate dancers with some competition experience', 3, '#3b82f6'),
  ('Crystal', 'Advanced dancers with significant training and experience', 4, '#8b5cf6'),
  ('Titanium', 'Elite level dancers, highest skill division', 5, '#ef4444');

-- Insert standard age groups (from export analysis)
INSERT INTO age_groups (name, short_name, min_age, max_age, competitive_group, sort_order) VALUES
  ('Mini (7-8)', 'Mini', 7, 8, 'Mini (7-8)', 1),
  ('Pre Junior (9-10)', 'Pre Junior', 9, 10, 'Pre Junior (9-10)', 2),
  ('Junior (11-12)', 'Junior', 11, 12, 'Junior (11-12)', 3),
  ('Teen (13-14)', 'Teen', 13, 14, 'Teen (13-14)', 4),
  ('Senior (15-16)', 'Senior', 15, 16, 'Senior (15-16)', 5),
  ('Senior+ (17+)', 'Senior+', 17, 99, 'Senior+ (17+)', 6);

-- Insert dance categories (from export analysis)
INSERT INTO dance_categories (name, description, category_award_grouping, competitive_award_grouping, sort_order) VALUES
  ('Ballet', 'Classical ballet technique and choreography', 'Ballet, Demi-Character, Pointe, Modern', 'Solos', 1),
  ('Jazz', 'Jazz technique with contemporary styling', 'Jazz, Musical Theatre, Tap', 'Solos', 2),
  ('Lyrical', 'Expressive dance combining ballet and jazz', 'Lyrical, Contemporary, Modern', 'Solos', 3),
  ('Contemporary', 'Modern contemporary dance technique', 'Lyrical, Contemporary, Modern', 'Solos', 4),
  ('Hip Hop', 'Urban dance styles and street dance', 'Hip Hop, Commercial', 'Solos', 5),
  ('Tap', 'Percussive dance using tap shoes', 'Jazz, Musical Theatre, Tap', 'Solos', 6),
  ('Acro', 'Dance with acrobatic and gymnastic elements', 'Acro, Tumbling', 'Solos', 7),
  ('Musical Theatre', 'Broadway-style dance and performance', 'Jazz, Musical Theatre, Tap', 'Solos', 8),
  ('Pointe', 'Ballet on pointe shoes', 'Ballet, Demi-Character, Pointe, Modern', 'Solos', 9);

-- Insert entry size categories
INSERT INTO entry_size_categories (name, min_participants, max_participants, base_fee, sort_order) VALUES
  ('Solo', 1, 1, 75.00, 1),
  ('Duet/Trio', 2, 3, 90.00, 2),
  ('Small Group', 4, 8, 120.00, 3),
  ('Large Group', 9, 15, 150.00, 4),
  ('Production', 16, 999, 200.00, 5);

-- Insert default system settings
INSERT INTO system_settings (key, value, description, category, data_type) VALUES
  ('competition_default_judges', '3', 'Default number of judges per competition', 'competition', 'number'),
  ('entry_fee_late_multiplier', '1.25', 'Multiplier for late registration fees', 'competition', 'number'),
  ('max_entries_per_dancer', '8', 'Maximum entries allowed per dancer per competition', 'competition', 'number'),
  ('email_from_address', '"GlowDance Portal" <noreply@glowdance.com>', 'Default from address for system emails', 'email', 'string'),
  ('timezone_default', 'America/Toronto', 'Default timezone for competitions', 'general', 'string');

-- Insert default email templates
INSERT INTO email_templates (template_key, name, subject, html_body, text_body) VALUES
  ('registration_confirmation', 'Registration Confirmation',
   'Welcome to {{competition_name}} - Registration Confirmed',
   '<h1>Welcome to {{competition_name}}!</h1><p>Your studio registration has been confirmed.</p>',
   'Welcome to {{competition_name}}! Your studio registration has been confirmed.'),

  ('entry_confirmation', 'Entry Confirmation',
   'Entry Confirmed: {{entry_title}} - {{competition_name}}',
   '<h1>Entry Confirmed</h1><p>Your entry "{{entry_title}}" has been registered for {{competition_name}}.</p>',
   'Your entry "{{entry_title}}" has been registered for {{competition_name}}.');

-- Insert sample competition
INSERT INTO competitions (name, year, description, registration_opens, registration_closes, competition_start_date, competition_end_date, primary_location, entry_fee, late_fee, status)
VALUES
  ('GlowDance Championship 2025', 2025, 'Annual championship competition featuring elite dancers from across North America',
   NOW() - INTERVAL '30 days', NOW() + INTERVAL '30 days',
   NOW() + INTERVAL '60 days', NOW() + INTERVAL '66 days',
   'Toronto Convention Centre', 75.00, 25.00, 'registration_open');

-- Get the competition ID for sample data
DO $$
DECLARE
    comp_id UUID;
    location_id UUID;
    session_id UUID;
    studio_id UUID;
    dancer_id UUID;
    entry_id UUID;
    classification_rec UUID;
    classification_comp UUID;
    age_group_junior UUID;
    age_group_teen UUID;
    category_jazz UUID;
    category_ballet UUID;
    size_solo UUID;
    size_duet UUID;
BEGIN
    -- Get IDs for relationships
    SELECT id INTO comp_id FROM competitions WHERE name = 'GlowDance Championship 2025';
    SELECT id INTO classification_rec FROM classifications WHERE name = 'Recreational';
    SELECT id INTO classification_comp FROM classifications WHERE name = 'Competitive';
    SELECT id INTO age_group_junior FROM age_groups WHERE name = 'Junior (11-12)';
    SELECT id INTO age_group_teen FROM age_groups WHERE name = 'Teen (13-14)';
    SELECT id INTO category_jazz FROM dance_categories WHERE name = 'Jazz';
    SELECT id INTO category_ballet FROM dance_categories WHERE name = 'Ballet';
    SELECT id INTO size_solo FROM entry_size_categories WHERE name = 'Solo';
    SELECT id INTO size_duet FROM entry_size_categories WHERE name = 'Duet/Trio';

    -- Insert sample competition location
    INSERT INTO competition_locations (competition_id, name, address, capacity, date_start, date_end, doors_open, competition_start, competition_end)
    VALUES (comp_id, 'Main Competition Hall', '255 Front St W, Toronto, ON M5V 2W6', 1500,
            NOW() + INTERVAL '60 days', NOW() + INTERVAL '66 days', '08:00', '09:00', '21:00')
    RETURNING id INTO location_id;

    -- Insert sample session
    INSERT INTO competition_sessions (competition_id, location_id, session_number, session_name, session_date, start_time, end_time, max_entries)
    VALUES (comp_id, location_id, 1, 'Morning Session - Recreational & Competitive',
            (NOW() + INTERVAL '60 days')::DATE, '09:00', '12:00', 50)
    RETURNING id INTO session_id;

    -- Insert sample studio (this would normally be created by user registration)
    INSERT INTO studios (owner_id, code, name, city, province, country, phone, email, contact_name, status)
    VALUES (
        '00000000-0000-0000-0000-000000000000', -- Placeholder user ID
        'A', 'Elite Dance Academy', 'Toronto', 'Ontario', 'Canada',
        '(416) 555-0123', 'info@elitedanceacademy.com', 'Sarah Johnson', 'approved'
    ) RETURNING id INTO studio_id;

    -- Insert sample dancer
    INSERT INTO dancers (studio_id, first_name, last_name, date_of_birth, gender, parent_name, parent_email, parent_phone, years_dancing, primary_style, status)
    VALUES (studio_id, 'Emma', 'Williams', '2012-03-15', 'Female', 'Jennifer Williams', 'jennifer.williams@email.com', '(416) 555-0456', 5, 'Jazz', 'active')
    RETURNING id INTO dancer_id;

    -- Insert sample competition entry
    INSERT INTO competition_entries (
        competition_id, studio_id, entry_number, sequence_number, title,
        category_id, classification_id, age_group_id, entry_size_category_id,
        session_id, performance_date, performance_time, duration,
        music_title, music_artist, entry_fee, total_fee, status, choreographer
    ) VALUES (
        comp_id, studio_id, 1, 1, 'Dreams Take Flight',
        category_jazz, classification_comp, age_group_junior, size_solo,
        session_id, (NOW() + INTERVAL '60 days')::DATE, '09:15', '00:03:30',
        'Fly Me to the Moon', 'Frank Sinatra', 75.00, 75.00, 'registered', 'Sarah Johnson'
    ) RETURNING id INTO entry_id;

    -- Link dancer to entry
    INSERT INTO entry_participants (entry_id, dancer_id, dancer_name, dancer_age, role, display_order)
    VALUES (entry_id, dancer_id, 'Emma Williams', 13, 'Solo Performer', 1);

    -- Insert sample reservation
    INSERT INTO reservations (
        studio_id, competition_id, location_id, spaces_requested, spaces_confirmed,
        agent_first_name, agent_last_name, agent_email, agent_phone,
        age_of_consent, waiver_consent, media_consent,
        total_amount, payment_status, status
    ) VALUES (
        studio_id, comp_id, location_id, 5, 5,
        'Sarah', 'Johnson', 'sarah@elitedanceacademy.com', '(416) 555-0123',
        true, true, true,
        375.00, 'paid', 'approved'
    );

END $$;

-- =====================================================
-- COMMENTS AND DOCUMENTATION
-- =====================================================

COMMENT ON TABLE competitions IS 'Main competition events with dates, locations, and settings';
COMMENT ON TABLE studios IS 'Dance studios that register for competitions';
COMMENT ON TABLE dancers IS 'Individual dancers registered under studios';
COMMENT ON TABLE competition_entries IS 'Individual performance entries in competitions';
COMMENT ON TABLE entry_participants IS 'Dancers participating in each competition entry';
COMMENT ON TABLE scores IS 'Individual judge scores for each performance';
COMMENT ON TABLE rankings IS 'Overall competition rankings and placements';

-- Competition entry sequence explanation
COMMENT ON COLUMN competition_entries.entry_number IS 'Sequential entry number (1, 2, 3...) for competition organization';
COMMENT ON COLUMN competition_entries.sequence_number IS 'Running order number for performance scheduling';

-- Export analysis integration
COMMENT ON TABLE classifications IS 'Skill level divisions: Recreational, Competitive, Crystal, Titanium (from export analysis)';
COMMENT ON TABLE age_groups IS 'Age-based competition divisions with multiple grouping systems (from export analysis)';
COMMENT ON TABLE title_rounds IS 'Elite competition features: Title interviews, Glow-Off championships (from PDF analysis)';
COMMENT ON TABLE vip_events IS 'Premium experiences: Waterpark events, Awards galas (from PDF analysis)';