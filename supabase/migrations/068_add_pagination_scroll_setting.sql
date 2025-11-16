-- Migration: Add pagination scroll items per page setting to system_config
-- This allows administrators to control how many items load per scroll on mobile devices

-- Insert pagination scroll setting with default value
INSERT INTO system_config (config_key, config_value, description, description_ar) VALUES
  ('pagination.scroll.items_per_page', '3', 'Number of items to load per scroll on mobile devices', 'عدد العناصر التي يتم تحميلها عند التمرير على الأجهزة المحمولة')
ON CONFLICT (config_key) DO UPDATE SET
  description = EXCLUDED.description,
  description_ar = EXCLUDED.description_ar,
  updated_at = NOW();

-- Add comment
COMMENT ON TABLE system_config IS 'Generic key-value store for system configuration values including validation rules and pagination settings';

