-- Migration: Add desktop pagination settings to system_config
-- This allows administrators to control default items per page and available options for desktop/admin views

-- Insert desktop pagination default items per page setting
INSERT INTO system_config (config_key, config_value, description, description_ar) VALUES
  ('pagination.desktop.default_items_per_page', '10', 'Default number of items per page for desktop/admin views', 'العدد الافتراضي للعناصر في كل صفحة لعرض سطح المكتب/الإدارة')
ON CONFLICT (config_key) DO UPDATE SET
  config_value = EXCLUDED.config_value,
  description = EXCLUDED.description,
  description_ar = EXCLUDED.description_ar,
  updated_at = NOW();

-- Insert desktop pagination items per page options setting
INSERT INTO system_config (config_key, config_value, description, description_ar) VALUES
  ('pagination.desktop.items_per_page_options', '10,25,50,100', 'Comma-separated list of available page size options for desktop/admin views', 'قائمة مفصولة بفواصل لخيارات حجم الصفحة المتاحة لعرض سطح المكتب/الإدارة')
ON CONFLICT (config_key) DO UPDATE SET
  config_value = EXCLUDED.config_value,
  description = EXCLUDED.description,
  description_ar = EXCLUDED.description_ar,
  updated_at = NOW();

-- Add comment
COMMENT ON TABLE system_config IS 'Generic key-value store for system configuration values including validation rules and pagination settings';

