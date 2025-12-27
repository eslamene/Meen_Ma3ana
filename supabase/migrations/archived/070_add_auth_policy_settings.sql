-- Migration: Add authentication policy settings to system_config
-- This allows administrators to control password requirements and email validation

-- Insert authentication password policy settings with default values
INSERT INTO system_config (config_key, config_value, description, description_ar) VALUES
  ('auth.password.min_length', '8', 'Minimum password length required', 'الحد الأدنى لطول كلمة المرور المطلوبة'),
  ('auth.password.require_uppercase', 'true', 'Require at least one uppercase letter in password', 'يتطلب حرف كبير واحد على الأقل في كلمة المرور'),
  ('auth.password.require_lowercase', 'true', 'Require at least one lowercase letter in password', 'يتطلب حرف صغير واحد على الأقل في كلمة المرور'),
  ('auth.password.require_number', 'true', 'Require at least one number in password', 'يتطلب رقم واحد على الأقل في كلمة المرور'),
  ('auth.password.require_special', 'true', 'Require at least one special character in password', 'يتطلب رمز خاص واحد على الأقل في كلمة المرور'),
  ('auth.email.regex', $$(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])$$, 'RFC 5322 compliant regular expression pattern for email validation (comprehensive - handles quoted strings and IP addresses). Stored with dollar-quoting to avoid escaping issues.', 'نمط التعبير النمطي المتوافق مع RFC 5322 للتحقق من صحة البريد الإلكتروني (شامل - يتعامل مع السلاسل المقتبسة وعناوين IP). مخزن باستخدام علامات الدولار لتجنب مشاكل التهريب.')
ON CONFLICT (config_key) DO UPDATE SET
  config_value = EXCLUDED.config_value,
  description = EXCLUDED.description,
  description_ar = EXCLUDED.description_ar,
  updated_at = NOW();

-- Add comment
COMMENT ON TABLE system_config IS 'Generic key-value store for system configuration values including validation rules, pagination settings, and authentication policies';

