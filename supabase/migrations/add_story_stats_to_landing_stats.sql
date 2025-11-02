-- Add success story statistics to landing_stats table
-- This migration adds the story-specific stats that were previously hardcoded in translations

-- Insert story stats with initial small values (can be updated later)
INSERT INTO landing_stats (stat_key, stat_value, display_format) VALUES
  ('story_medical_raised', 0, 'EGP'),
  ('story_education_students', 0, ''),
  ('story_housing_families', 0, '')
ON CONFLICT (stat_key) DO NOTHING;

-- Add comment for documentation
COMMENT ON TABLE landing_stats IS 'Stores landing page statistics including success story numbers that can be manually or automatically updated';

