-- Insert social media links into system_config
-- This migration adds social media URLs and email to the system configuration

INSERT INTO system_config (config_key, config_value, description, description_ar) VALUES
  ('facebook_url', 'https://www.facebook.com/meenma3ana/', 'Facebook page URL', 'رابط صفحة فيسبوك'),
  ('instagram_url', 'https://instagram.com/MeenMa3ana', 'Instagram profile URL', 'رابط حساب إنستغرام'),
  ('email', 'meen@ma3ana.org', 'Contact email address', 'عنوان البريد الإلكتروني للتواصل')
ON CONFLICT (config_key) 
DO UPDATE SET 
  config_value = EXCLUDED.config_value,
  description = EXCLUDED.description,
  description_ar = EXCLUDED.description_ar,
  updated_at = NOW();

