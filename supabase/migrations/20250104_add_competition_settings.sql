-- Competition Settings Table
-- This table stores configurable competition parameters like routine types, age divisions, classifications, etc.

CREATE TABLE IF NOT EXISTS public.competition_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_category TEXT NOT NULL,
  setting_key TEXT NOT NULL,
  setting_value JSONB NOT NULL,
  display_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

  -- Ensure unique keys within categories
  CONSTRAINT unique_category_key UNIQUE (setting_category, setting_key),

  -- Validate category values
  CONSTRAINT valid_category CHECK (
    setting_category IN (
      'routine_types',
      'age_divisions',
      'classification_levels',
      'dance_styles',
      'time_limits',
      'scoring_rubric',
      'awards'
    )
  )
);

-- Add index for faster queries
CREATE INDEX idx_settings_category ON public.competition_settings(setting_category);
CREATE INDEX idx_settings_active ON public.competition_settings(is_active);
CREATE INDEX idx_settings_display_order ON public.competition_settings(display_order);

-- Enable RLS
ALTER TABLE public.competition_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Anyone can read active settings
CREATE POLICY "Anyone can view active settings"
  ON public.competition_settings
  FOR SELECT
  USING (is_active = true);

-- Only competition directors and super admins can view all settings
CREATE POLICY "Admins can view all settings"
  ON public.competition_settings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid()
      AND role IN ('competition_director', 'super_admin')
    )
  );

-- Only competition directors and super admins can modify settings
CREATE POLICY "Admins can insert settings"
  ON public.competition_settings
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid()
      AND role IN ('competition_director', 'super_admin')
    )
  );

CREATE POLICY "Admins can update settings"
  ON public.competition_settings
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid()
      AND role IN ('competition_director', 'super_admin')
    )
  );

CREATE POLICY "Admins can delete settings"
  ON public.competition_settings
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid()
      AND role IN ('competition_director', 'super_admin')
    )
  );

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_competition_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_competition_settings_timestamp
  BEFORE UPDATE ON public.competition_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_competition_settings_timestamp();

-- Seed some default settings
INSERT INTO public.competition_settings (setting_category, setting_key, setting_value, display_order, is_active) VALUES
-- Routine Types
('routine_types', 'solo', '{"label": "Solo", "minPerformers": 1, "maxPerformers": 1}', 1, true),
('routine_types', 'duo_trio', '{"label": "Duo/Trio", "minPerformers": 2, "maxPerformers": 3}', 2, true),
('routine_types', 'small_group', '{"label": "Small Group", "minPerformers": 4, "maxPerformers": 9}', 3, true),
('routine_types', 'large_group', '{"label": "Large Group", "minPerformers": 10, "maxPerformers": 19}', 4, true),
('routine_types', 'line', '{"label": "Line", "minPerformers": 20, "maxPerformers": 999}', 5, true),
('routine_types', 'production', '{"label": "Production", "minPerformers": 30, "maxPerformers": 999}', 6, true),

-- Age Divisions
('age_divisions', 'petite', '{"label": "Petite", "minAge": 5, "maxAge": 8}', 1, true),
('age_divisions', 'mini', '{"label": "Mini", "minAge": 9, "maxAge": 11}', 2, true),
('age_divisions', 'junior', '{"label": "Junior", "minAge": 12, "maxAge": 14}', 3, true),
('age_divisions', 'teen', '{"label": "Teen", "minAge": 15, "maxAge": 17}', 4, true),
('age_divisions', 'senior', '{"label": "Senior", "minAge": 18, "maxAge": 99}', 5, true),

-- Classification Levels
('classification_levels', 'recreational', '{"label": "Recreational", "skillLevel": 1, "description": "Entry level dancers"}', 1, true),
('classification_levels', 'intermediate', '{"label": "Intermediate", "skillLevel": 2, "description": "Developing dancers"}', 2, true),
('classification_levels', 'competitive', '{"label": "Competitive", "skillLevel": 3, "description": "Advanced dancers"}', 3, true),
('classification_levels', 'elite', '{"label": "Elite", "skillLevel": 4, "description": "Top tier dancers"}', 4, true),

-- Dance Styles
('dance_styles', 'ballet', '{"label": "Ballet", "abbreviation": "BAL"}', 1, true),
('dance_styles', 'tap', '{"label": "Tap", "abbreviation": "TAP"}', 2, true),
('dance_styles', 'jazz', '{"label": "Jazz", "abbreviation": "JAZ"}', 3, true),
('dance_styles', 'contemporary', '{"label": "Contemporary", "abbreviation": "CON"}', 4, true),
('dance_styles', 'lyrical', '{"label": "Lyrical", "abbreviation": "LYR"}', 5, true),
('dance_styles', 'hip_hop', '{"label": "Hip Hop", "abbreviation": "HIP"}', 6, true),
('dance_styles', 'musical_theater', '{"label": "Musical Theater", "abbreviation": "MT"}', 7, true),
('dance_styles', 'open', '{"label": "Open", "abbreviation": "OPN"}', 8, true),

-- Time Limits (in seconds)
('time_limits', 'solo', '{"label": "Solo", "maxDuration": 150, "warningThreshold": 135}', 1, true),
('time_limits', 'duo_trio', '{"label": "Duo/Trio", "maxDuration": 180, "warningThreshold": 165}', 2, true),
('time_limits', 'group', '{"label": "Group", "maxDuration": 240, "warningThreshold": 225}', 3, true),
('time_limits', 'production', '{"label": "Production", "maxDuration": 420, "warningThreshold": 405}', 4, true),

-- Scoring Rubric
('scoring_rubric', 'technique', '{"label": "Technique", "maxPoints": 100, "weight": 0.4}', 1, true),
('scoring_rubric', 'execution', '{"label": "Execution", "maxPoints": 100, "weight": 0.3}', 2, true),
('scoring_rubric', 'choreography', '{"label": "Choreography", "maxPoints": 100, "weight": 0.2}', 3, true),
('scoring_rubric', 'showmanship', '{"label": "Showmanship", "maxPoints": 100, "weight": 0.1}', 4, true),

-- Awards
('awards', 'platinum', '{"label": "Platinum", "minScore": 90, "maxScore": 100, "color": "#E5E4E2"}', 1, true),
('awards', 'high_gold', '{"label": "High Gold", "minScore": 85, "maxScore": 89.99, "color": "#FFD700"}', 2, true),
('awards', 'gold', '{"label": "Gold", "minScore": 80, "maxScore": 84.99, "color": "#DAA520"}', 3, true),
('awards', 'high_silver', '{"label": "High Silver", "minScore": 75, "maxScore": 79.99, "color": "#C0C0C0"}', 4, true),
('awards', 'silver', '{"label": "Silver", "minScore": 70, "maxScore": 74.99, "color": "#A8A8A8"}', 5, true)
ON CONFLICT (setting_category, setting_key) DO NOTHING;

-- Grant permissions
GRANT SELECT ON public.competition_settings TO authenticated;
GRANT ALL ON public.competition_settings TO service_role;

COMMENT ON TABLE public.competition_settings IS 'Stores configurable competition parameters and rules';
COMMENT ON COLUMN public.competition_settings.setting_category IS 'Category of setting (routine_types, age_divisions, etc.)';
COMMENT ON COLUMN public.competition_settings.setting_key IS 'Unique key within category';
COMMENT ON COLUMN public.competition_settings.setting_value IS 'JSON value containing setting configuration';
COMMENT ON COLUMN public.competition_settings.display_order IS 'Order for displaying settings in UI';
COMMENT ON COLUMN public.competition_settings.is_active IS 'Whether this setting is currently active';
