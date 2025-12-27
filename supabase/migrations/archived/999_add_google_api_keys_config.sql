-- Migration: Add Google API Keys configuration to system_config
-- This allows Google Translate and Google Gemini API keys to be managed through System Settings UI
-- Keys can be set in system_config or environment variables (system_config takes precedence)

-- Insert Google Translate API key config
INSERT INTO system_config (config_key, config_value, description, description_ar, group_type) VALUES
  (
    'google.translate.api_key',
    '',
    'Google Translate API key for text translation between Arabic and English. Get your key from Google Cloud Console: https://console.cloud.google.com/',
    'مفتاح API لترجمة Google لترجمة النصوص بين العربية والإنجليزية. احصل على المفتاح من Google Cloud Console: https://console.cloud.google.com/',
    'google'
  )
ON CONFLICT (config_key) DO UPDATE SET
  description = EXCLUDED.description,
  description_ar = EXCLUDED.description_ar,
  group_type = EXCLUDED.group_type,
  updated_at = NOW();

-- Insert Google Gemini API key config
INSERT INTO system_config (config_key, config_value, description, description_ar, group_type) VALUES
  (
    'google.gemini.api_key',
    '',
    'Google Gemini API key for AI content generation (titles, descriptions). Get your key from Google Cloud Console: https://console.cloud.google.com/',
    'مفتاح API لـ Google Gemini لتوليد المحتوى بالذكاء الاصطناعي (العناوين والأوصاف). احصل على المفتاح من Google Cloud Console: https://console.cloud.google.com/',
    'google'
  )
ON CONFLICT (config_key) DO UPDATE SET
  description = EXCLUDED.description,
  description_ar = EXCLUDED.description_ar,
  group_type = EXCLUDED.group_type,
  updated_at = NOW();

-- Insert Anthropic API key config (for fallback AI generation)
INSERT INTO system_config (config_key, config_value, description, description_ar, group_type) VALUES
  (
    'anthropic.api_key',
    '',
    'Anthropic Claude API key for AI content generation (fallback if Google Gemini is not configured). Get your key from: https://console.anthropic.com/',
    'مفتاح API لـ Anthropic Claude لتوليد المحتوى بالذكاء الاصطناعي (بديل إذا لم يتم تكوين Google Gemini). احصل على المفتاح من: https://console.anthropic.com/',
    'anthropic'
  )
ON CONFLICT (config_key) DO UPDATE SET
  description = EXCLUDED.description,
  description_ar = EXCLUDED.description_ar,
  group_type = EXCLUDED.group_type,
  updated_at = NOW();

-- Add comment
COMMENT ON TABLE system_config IS 'Generic key-value store for system configuration values including API keys, validation rules, and pagination settings';

