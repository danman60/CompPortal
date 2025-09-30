-- GlowDance Competition Portal - Complete Supabase Schema
-- Based on export analysis and enterprise requirements
-- Generated: September 25, 2025

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- USER PROFILES & AUTHENTICATION
-- =====================================================

-- User profiles extending Supabase auth.users
CREATE TABLE user_profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  role VARCHAR(50) DEFAULT 'studio_owner' CHECK (role IN ('studio_owner', 'admin', 'super_admin', 'judge')),
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  phone VARCHAR(50),
  timezone VARCHAR(50) DEFAULT 'America/Toronto',
  notification_preferences JSONB DEFAULT '{"email": true, "sms": false, "competition_updates": true}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, role, first_name, last_name)
  VALUES (
    NEW.id,
    'studio_owner',
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user profile creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- STUDIO MANAGEMENT
-- =====================================================

CREATE TABLE studios (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  code VARCHAR(5) UNIQUE, -- Studio identifier (A, B, C, AA, BB, etc.)
  name VARCHAR(255) NOT NULL,

  -- Address information
  address1 VARCHAR(255),
  address2 VARCHAR(255),
  city VARCHAR(100),
  province VARCHAR(50),
  postal_code VARCHAR(20),
  country VARCHAR(50) DEFAULT 'Canada',

  -- Contact information
  phone VARCHAR(50),
  fax VARCHAR(50),
  email VARCHAR(255),
  website VARCHAR(255),

  -- Primary contact
  contact_name VARCHAR(255),
  contact_phone VARCHAR(50),
  contact_email VARCHAR(255),
  contact_title VARCHAR(100),

  -- Business information
  business_number VARCHAR(50),
  tax_number VARCHAR(50),
  account_name VARCHAR(255), -- For billing

  -- Studio details
  established_year INTEGER,
  student_count INTEGER,
  instructor_count INTEGER,
  comments TEXT,

  -- Status and verification
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'suspended')),
  verified_at TIMESTAMP,
  verified_by UUID REFERENCES auth.users(id),

  -- Metadata
  logo_url TEXT,
  social_media JSONB DEFAULT '{}', -- {"instagram": "@studio", "facebook": "page"}
  settings JSONB DEFAULT '{}', -- Studio-specific settings

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- DANCER MANAGEMENT
-- =====================================================

CREATE TABLE dancers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  studio_id UUID REFERENCES studios(id) ON DELETE CASCADE NOT NULL,

  -- Personal information
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  date_of_birth DATE,
  age_override INTEGER, -- Manual age override if needed
  gender VARCHAR(20),

  -- Contact information (for older dancers)
  email VARCHAR(255),
  phone VARCHAR(50),

  -- Parent/guardian information
  parent_name VARCHAR(255),
  parent_email VARCHAR(255),
  parent_phone VARCHAR(50),
  emergency_contact_name VARCHAR(255),
  emergency_contact_phone VARCHAR(50),

  -- Medical information
  medical_conditions TEXT,
  allergies TEXT,
  medications TEXT,

  -- Dance information
  years_dancing INTEGER,
  primary_style VARCHAR(100),
  skill_level VARCHAR(50),
  previous_competitions INTEGER DEFAULT 0,

  -- Administrative
  registration_number VARCHAR(50) UNIQUE,
  photo_url TEXT,
  waiver_signed BOOLEAN DEFAULT false,
  waiver_signed_date DATE,

  -- Status
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- COMPETITION STRUCTURE
-- =====================================================

CREATE TABLE competitions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  year INTEGER NOT NULL,
  description TEXT,

  -- Dates and timing
  registration_opens TIMESTAMP,
  registration_closes TIMESTAMP,
  competition_start_date DATE,
  competition_end_date DATE,

  -- Location and logistics
  primary_location VARCHAR(255),
  venue_address TEXT,
  venue_capacity INTEGER,

  -- Competition structure
  session_count INTEGER DEFAULT 1,
  number_of_judges INTEGER DEFAULT 3,
  entry_fee DECIMAL(10,2),
  late_fee DECIMAL(10,2),

  -- Competition settings
  allow_age_overrides BOOLEAN DEFAULT true,
  allow_multiple_entries BOOLEAN DEFAULT true,
  require_video_submissions BOOLEAN DEFAULT false,

  -- Status and visibility
  status VARCHAR(50) DEFAULT 'upcoming' CHECK (status IN ('draft', 'upcoming', 'registration_open', 'registration_closed', 'in_progress', 'completed', 'cancelled')),
  is_public BOOLEAN DEFAULT true,

  -- Metadata
  logo_url TEXT,
  website VARCHAR(255),
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),
  rules_document_url TEXT,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Competition locations (multiple venues for large events)
CREATE TABLE competition_locations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  competition_id UUID REFERENCES competitions(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(255) NOT NULL,
  address TEXT,
  capacity INTEGER,

  -- Timing
  date_start DATE,
  date_end DATE,
  setup_time TIME,
  doors_open TIME,
  competition_start TIME,
  competition_end TIME,

  -- Facilities
  dressing_rooms INTEGER,
  warm_up_areas INTEGER,
  parking_spaces INTEGER,
  accessibility_features TEXT[],

  -- Technical specs
  stage_dimensions VARCHAR(100),
  audio_system TEXT,
  lighting_system TEXT,
  video_recording BOOLEAN DEFAULT false,
  live_streaming BOOLEAN DEFAULT false,

  created_at TIMESTAMP DEFAULT NOW()
);

-- Competition sessions (day/time divisions)
CREATE TABLE competition_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  competition_id UUID REFERENCES competitions(id) ON DELETE CASCADE NOT NULL,
  location_id UUID REFERENCES competition_locations(id) ON DELETE CASCADE,

  session_number INTEGER NOT NULL,
  session_name VARCHAR(255), -- "Morning Session", "Elite Finals", etc.
  session_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME,

  -- Session details
  max_entries INTEGER,
  entry_count INTEGER DEFAULT 0,
  warm_up_time INTERVAL DEFAULT '15 minutes',

  -- Judging panel for this session
  head_judge UUID REFERENCES auth.users(id),
  judges JSONB DEFAULT '[]', -- Array of judge IDs

  status VARCHAR(50) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),

  created_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- DANCE CATEGORIES & CLASSIFICATIONS
-- =====================================================

-- Skill level classifications (from export analysis)
CREATE TABLE classifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE, -- "Titanium", "Crystal", "Competitive", "Recreational"
  description TEXT,
  skill_level INTEGER, -- 1-5 ranking
  color_code VARCHAR(7), -- Hex color for UI

  -- Requirements
  min_years_experience INTEGER,
  requires_audition BOOLEAN DEFAULT false,
  entry_requirements TEXT,

  created_at TIMESTAMP DEFAULT NOW()
);

-- Age group definitions
CREATE TABLE age_groups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL, -- "Junior (11-12)"
  short_name VARCHAR(20), -- "Junior"
  min_age INTEGER NOT NULL,
  max_age INTEGER NOT NULL,

  -- Different grouping systems for awards
  competitive_group VARCHAR(100), -- "Junior (11-12)"
  dynamic_group VARCHAR(100), -- "Junior (11-12)"
  form_grouping VARCHAR(100), -- "11-13 Yrs"

  -- Display order
  sort_order INTEGER,

  created_at TIMESTAMP DEFAULT NOW()
);

-- Dance style categories
CREATE TABLE dance_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE, -- "Ballet", "Jazz", "Hip Hop", etc.
  description TEXT,

  -- Award groupings (from export analysis)
  category_award_grouping VARCHAR(255), -- "Ballet, Demi-Character, Pointe, Modern"
  competitive_award_grouping VARCHAR(100), -- "Solos"
  other_award_grouping VARCHAR(100), -- "Solos"

  -- Category specifications
  music_time_limit INTERVAL, -- Maximum routine length
  requires_specific_attire BOOLEAN DEFAULT false,
  attire_requirements TEXT,

  -- Display
  color_code VARCHAR(7),
  icon_name VARCHAR(50), -- For UI icons
  sort_order INTEGER,

  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Entry size categories (Solo, Duet, Small Group, etc.)
CREATE TABLE entry_size_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(50) NOT NULL, -- "Solo", "Duet/Trio", "Small Group"
  min_participants INTEGER NOT NULL,
  max_participants INTEGER NOT NULL,

  -- Pricing
  base_fee DECIMAL(10,2),
  per_participant_fee DECIMAL(10,2),

  sort_order INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- COMPETITION ENTRIES & RESERVATIONS
-- =====================================================

-- Studio reservations for competition locations
CREATE TABLE reservations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  studio_id UUID REFERENCES studios(id) ON DELETE CASCADE NOT NULL,
  competition_id UUID REFERENCES competitions(id) ON DELETE CASCADE NOT NULL,
  location_id UUID REFERENCES competition_locations(id) ON DELETE CASCADE,

  -- Reservation details
  spaces_requested INTEGER NOT NULL,
  spaces_confirmed INTEGER DEFAULT 0,

  -- Agent information (person handling reservation)
  agent_first_name VARCHAR(100),
  agent_last_name VARCHAR(100),
  agent_email VARCHAR(255),
  agent_phone VARCHAR(50),
  agent_title VARCHAR(100),

  -- Legal requirements
  age_of_consent BOOLEAN DEFAULT false,
  waiver_consent BOOLEAN DEFAULT false,
  media_consent BOOLEAN DEFAULT false,

  -- Payment information
  deposit_amount DECIMAL(10,2),
  total_amount DECIMAL(10,2),
  payment_status VARCHAR(50) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'partial', 'paid', 'refunded', 'cancelled')),
  payment_due_date DATE,

  -- Status and notes
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled', 'waitlisted')),
  internal_notes TEXT,
  public_notes TEXT,

  -- Timestamps
  requested_at TIMESTAMP DEFAULT NOW(),
  approved_at TIMESTAMP,
  approved_by UUID REFERENCES auth.users(id),

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Individual competition entries
CREATE TABLE competition_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  competition_id UUID REFERENCES competitions(id) ON DELETE CASCADE NOT NULL,
  reservation_id UUID REFERENCES reservations(id) ON DELETE CASCADE,
  studio_id UUID REFERENCES studios(id) ON DELETE CASCADE NOT NULL,

  -- Entry identification
  entry_number INTEGER, -- Sequential number (1, 2, 3...)
  sequence_number INTEGER, -- Running order number

  -- Performance details
  title VARCHAR(255) NOT NULL,
  category_id UUID REFERENCES dance_categories(id) NOT NULL,
  classification_id UUID REFERENCES classifications(id) NOT NULL,
  age_group_id UUID REFERENCES age_groups(id) NOT NULL,
  entry_size_category_id UUID REFERENCES entry_size_categories(id) NOT NULL,

  -- Scheduling information
  session_id UUID REFERENCES competition_sessions(id),
  performance_date DATE,
  performance_time TIME,
  duration INTERVAL, -- Actual routine length
  warm_up_time TIME,

  -- Competition structure
  heat VARCHAR(50), -- Heat division for large categories
  running_order INTEGER,

  -- Advanced features (from export analysis)
  is_title_upgrade BOOLEAN DEFAULT false,
  is_title_interview BOOLEAN DEFAULT false,
  is_improvisation BOOLEAN DEFAULT false,
  is_glow_off_round BOOLEAN DEFAULT false,
  is_overall_competition BOOLEAN DEFAULT false,

  -- Entry linking for running order
  previous_entry_id UUID REFERENCES competition_entries(id),
  next_entry_id UUID REFERENCES competition_entries(id),

  -- Music and technical
  music_title VARCHAR(255),
  music_artist VARCHAR(255),
  music_duration INTERVAL,
  music_file_url TEXT,
  special_requirements TEXT,

  -- Fees and payment
  entry_fee DECIMAL(10,2),
  late_fee DECIMAL(10,2) DEFAULT 0,
  total_fee DECIMAL(10,2),

  -- Status
  status VARCHAR(50) DEFAULT 'registered' CHECK (status IN ('draft', 'registered', 'confirmed', 'performed', 'scored', 'awarded', 'disqualified', 'withdrawn')),

  -- Additional information
  choreographer VARCHAR(255),
  costume_description TEXT,
  props_required TEXT,
  accessibility_needs TEXT,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Participants in each entry (dancers performing)
CREATE TABLE entry_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  entry_id UUID REFERENCES competition_entries(id) ON DELETE CASCADE NOT NULL,
  dancer_id UUID REFERENCES dancers(id) ON DELETE CASCADE NOT NULL,

  -- Participant details (denormalized for performance)
  dancer_name VARCHAR(255) NOT NULL, -- Full name for quick access
  dancer_age INTEGER, -- Age at time of competition

  -- Role in the performance
  role VARCHAR(100), -- "Lead", "Supporting", "Ensemble"
  display_order INTEGER, -- Order in credits/programs

  -- Individual requirements
  costume_size VARCHAR(20),
  special_needs TEXT,

  created_at TIMESTAMP DEFAULT NOW(),

  -- Ensure unique participant per entry
  UNIQUE(entry_id, dancer_id)
);

-- =====================================================
-- JUDGING & SCORING SYSTEM
-- =====================================================

-- Judge profiles
CREATE TABLE judges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  competition_id UUID REFERENCES competitions(id) ON DELETE CASCADE,

  -- Judge information
  name VARCHAR(255) NOT NULL,
  credentials TEXT,
  specialization VARCHAR(100), -- Primary dance style expertise
  years_judging INTEGER,
  certification_level VARCHAR(50),

  -- Competition assignment
  judge_number INTEGER, -- Judge 1, Judge 2, etc.
  panel_assignment VARCHAR(100), -- "Main Panel", "Title Panel"
  sessions JSONB DEFAULT '[]', -- Array of session IDs

  -- Contact information
  email VARCHAR(255),
  phone VARCHAR(50),

  -- Status
  confirmed BOOLEAN DEFAULT false,
  checked_in BOOLEAN DEFAULT false,

  created_at TIMESTAMP DEFAULT NOW()
);

-- Individual scores for each entry
CREATE TABLE scores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  entry_id UUID REFERENCES competition_entries(id) ON DELETE CASCADE NOT NULL,
  judge_id UUID REFERENCES judges(id) ON DELETE CASCADE NOT NULL,

  -- Scoring components
  technical_score DECIMAL(5,2),
  artistic_score DECIMAL(5,2),
  performance_score DECIMAL(5,2),
  overall_score DECIMAL(5,2),

  -- Total and ranking
  total_score DECIMAL(6,2) NOT NULL,
  placement INTEGER,

  -- Judge feedback
  comments TEXT,
  strengths TEXT,
  areas_for_improvement TEXT,

  -- Scoring metadata
  scored_at TIMESTAMP DEFAULT NOW(),
  modified_at TIMESTAMP,
  is_final BOOLEAN DEFAULT false,

  -- Unique constraint: one score per judge per entry
  UNIQUE(entry_id, judge_id)
);

-- Overall competition rankings
CREATE TABLE rankings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  competition_id UUID REFERENCES competitions(id) ON DELETE CASCADE NOT NULL,
  entry_id UUID REFERENCES competition_entries(id) ON DELETE CASCADE NOT NULL,

  -- Ranking details
  category_id UUID REFERENCES dance_categories(id) NOT NULL,
  age_group_id UUID REFERENCES age_groups(id) NOT NULL,
  classification_id UUID REFERENCES classifications(id) NOT NULL,

  -- Scores and placement
  total_score DECIMAL(8,2) NOT NULL,
  average_score DECIMAL(6,2),
  placement INTEGER NOT NULL,

  -- Award categories (from export analysis)
  category_award_placement INTEGER,
  competitive_award_placement INTEGER,
  overall_award_placement INTEGER,

  -- Special recognitions
  is_title_winner BOOLEAN DEFAULT false,
  is_glow_off_winner BOOLEAN DEFAULT false,
  special_awards TEXT[], -- Array of special award names

  created_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- AWARDS & RECOGNITION
-- =====================================================

-- Award definitions
CREATE TABLE award_types (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL, -- "1st Place", "High Score", "Title Winner"
  description TEXT,
  category VARCHAR(50), -- "Placement", "Special", "Title"

  -- Award appearance
  color VARCHAR(7),
  icon_name VARCHAR(50),
  certificate_template VARCHAR(100),

  -- Eligibility
  min_score DECIMAL(6,2),
  requires_minimum_entries INTEGER,

  sort_order INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Individual awards given
CREATE TABLE awards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  competition_id UUID REFERENCES competitions(id) ON DELETE CASCADE NOT NULL,
  entry_id UUID REFERENCES competition_entries(id) ON DELETE CASCADE NOT NULL,
  award_type_id UUID REFERENCES award_types(id) NOT NULL,

  -- Award details
  placement INTEGER, -- 1st, 2nd, 3rd, etc.
  score DECIMAL(6,2),

  -- Award category grouping (from export analysis)
  award_category VARCHAR(100), -- Which award grouping this falls under

  -- Recognition details
  certificate_url TEXT,
  trophy_type VARCHAR(100),
  special_recognition TEXT,

  -- Ceremony information
  presented_at TIMESTAMP,
  presented_by VARCHAR(255),

  created_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- ELITE COMPETITION FEATURES
-- =====================================================

-- Title rounds and special competitions (from PDF analysis)
CREATE TABLE title_rounds (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  competition_id UUID REFERENCES competitions(id) ON DELETE CASCADE NOT NULL,

  -- Title round details
  round_type VARCHAR(50) NOT NULL, -- "Title Interview", "Glow-Off", "Finals"
  name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Scheduling
  session_id UUID REFERENCES competition_sessions(id),
  scheduled_date DATE,
  scheduled_time TIME,
  duration INTERVAL,

  -- Eligibility requirements
  min_score_required DECIMAL(6,2),
  max_participants INTEGER,
  categories JSONB, -- Array of eligible category/age/classification combinations

  -- Title round specifics
  interview_duration INTERVAL, -- For title interviews
  improvisation_style VARCHAR(100), -- For improv rounds
  special_requirements TEXT,

  status VARCHAR(50) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  created_at TIMESTAMP DEFAULT NOW()
);

-- VIP experiences and premium events (from PDF analysis)
CREATE TABLE vip_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  competition_id UUID REFERENCES competitions(id) ON DELETE CASCADE NOT NULL,

  -- Event details
  event_type VARCHAR(100) NOT NULL, -- "Waterpark", "Awards Gala", "Private Reception"
  name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Venue and timing
  venue_name VARCHAR(255),
  venue_address TEXT,
  event_date DATE,
  start_time TIME,
  end_time TIME,

  -- Capacity and pricing
  max_participants INTEGER,
  participant_count INTEGER DEFAULT 0,
  ticket_price DECIMAL(10,2),

  -- Event specifics
  dress_code VARCHAR(100),
  included_amenities TEXT[],
  special_instructions TEXT,

  -- Requirements
  age_restrictions VARCHAR(100),
  requires_waiver BOOLEAN DEFAULT false,
  requires_advance_booking BOOLEAN DEFAULT true,

  status VARCHAR(50) DEFAULT 'scheduled' CHECK (status IN ('planned', 'scheduled', 'in_progress', 'completed', 'cancelled')),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Elite instructor assignments (from PDF analysis)
CREATE TABLE elite_instructors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  competition_id UUID REFERENCES competitions(id) ON DELETE CASCADE NOT NULL,

  -- Instructor details
  name VARCHAR(255) NOT NULL,
  credentials TEXT,
  specialization VARCHAR(100),
  bio TEXT,

  -- Contact information
  email VARCHAR(255),
  phone VARCHAR(50),
  website VARCHAR(255),

  -- Assignment details
  assigned_teams TEXT[], -- Array of team/studio names
  session_assignments JSONB, -- Detailed schedule assignments

  -- Professional details
  hourly_rate DECIMAL(10,2),
  travel_required BOOLEAN DEFAULT false,
  equipment_needs TEXT,

  created_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- FILE STORAGE & DOCUMENTS
-- =====================================================

-- Document management using Supabase Storage
CREATE TABLE documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- File information
  filename VARCHAR(255) NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  file_size INTEGER,
  mime_type VARCHAR(100),
  storage_path TEXT NOT NULL, -- Supabase Storage path

  -- Document metadata
  document_type VARCHAR(50) NOT NULL, -- "schedule", "export", "waiver", "music", "photo"
  title VARCHAR(255),
  description TEXT,

  -- Relationships
  competition_id UUID REFERENCES competitions(id) ON DELETE CASCADE,
  studio_id UUID REFERENCES studios(id) ON DELETE CASCADE,
  entry_id UUID REFERENCES competition_entries(id) ON DELETE CASCADE,
  uploaded_by UUID REFERENCES auth.users(id),

  -- Access control
  visibility VARCHAR(20) DEFAULT 'private' CHECK (visibility IN ('public', 'competition', 'studio', 'private')),
  password_protected BOOLEAN DEFAULT false,

  -- Processing status (for exports/generation)
  processing_status VARCHAR(20) DEFAULT 'ready' CHECK (processing_status IN ('uploading', 'processing', 'ready', 'error')),
  processing_error TEXT,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- SYSTEM SETTINGS & CONFIGURATION
-- =====================================================

-- Platform-wide settings
CREATE TABLE system_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key VARCHAR(100) UNIQUE NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  category VARCHAR(50), -- "general", "competition", "email", "payment"

  -- Validation
  data_type VARCHAR(20) NOT NULL, -- "string", "number", "boolean", "json"
  validation_rules JSONB, -- Schema for value validation

  -- Access control
  is_public BOOLEAN DEFAULT false,
  requires_admin BOOLEAN DEFAULT true,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Email templates for notifications
CREATE TABLE email_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Template identification
  template_key VARCHAR(100) UNIQUE NOT NULL, -- "registration_confirmation", "competition_reminder"
  name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Template content
  subject VARCHAR(255) NOT NULL,
  html_body TEXT NOT NULL,
  text_body TEXT,

  -- Template variables
  available_variables JSONB, -- Documentation of available template variables

  -- Status
  is_active BOOLEAN DEFAULT true,
  version INTEGER DEFAULT 1,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

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
  ('competition_default_judges', '3'::jsonb, 'Default number of judges per competition', 'competition', 'number'),
  ('entry_fee_late_multiplier', '1.25'::jsonb, 'Multiplier for late registration fees', 'competition', 'number'),
  ('max_entries_per_dancer', '8'::jsonb, 'Maximum entries allowed per dancer per competition', 'competition', 'number'),
  ('email_from_address', '"GlowDance Portal <noreply@glowdance.com>"'::jsonb, 'Default from address for system emails', 'email', 'string'),
  ('timezone_default', '"America/Toronto"'::jsonb, 'Default timezone for competitions', 'general', 'string');

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