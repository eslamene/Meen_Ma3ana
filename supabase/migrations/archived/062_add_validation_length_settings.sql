-- Migration: Add validation length settings to system_config
-- This allows administrators to control validation lengths for case forms

-- Insert validation length settings with default values
INSERT INTO system_config (config_key, config_value, description, description_ar) VALUES
  ('validation.case.title.min_length', '10', 'Minimum character length for case title', 'الحد الأدنى لطول عنوان الحالة'),
  ('validation.case.title.max_length', '100', 'Maximum character length for case title', 'الحد الأقصى لطول عنوان الحالة'),
  ('validation.case.description.min_length', '50', 'Minimum character length for case description', 'الحد الأدنى لطول وصف الحالة'),
  ('validation.case.description.max_length', '2000', 'Maximum character length for case description', 'الحد الأقصى لطول وصف الحالة'),
  ('validation.case.target_amount.max', '1000000', 'Maximum target amount for cases (in EGP)', 'الحد الأقصى للمبلغ المستهدف للحالات (بالجنيه المصري)'),
  ('validation.case.duration.max', '365', 'Maximum duration for one-time cases (in days)', 'الحد الأقصى لمدة الحالات لمرة واحدة (بالأيام)')
ON CONFLICT (config_key) DO UPDATE SET
  description = EXCLUDED.description,
  description_ar = EXCLUDED.description_ar,
  updated_at = NOW();

-- Add comment
COMMENT ON TABLE system_config IS 'Generic key-value store for system configuration values including validation rules';

