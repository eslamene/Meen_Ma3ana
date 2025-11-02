-- Create system config table (generic key-value store for system configuration)
CREATE TABLE IF NOT EXISTS system_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key TEXT NOT NULL UNIQUE,
  config_value TEXT NOT NULL,
  description TEXT, -- Optional description of what this config is for (English)
  description_ar TEXT, -- Optional description in Arabic
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on config_key for faster lookups
CREATE INDEX IF NOT EXISTS idx_system_config_key ON system_config(config_key);

-- Insert initial contact info values
INSERT INTO system_config (config_key, config_value, description, description_ar) VALUES
  ('whatsapp_number', '201234567890', 'WhatsApp contact number for chat support', 'رقم واتساب للدعم والدردشة'),
  ('whatsapp_default_message', 'Hello! I''d like to know more about Meen Ma3ana.', 'Default pre-filled message for WhatsApp chat (English)', 'رسالة افتراضية لواتساب (إنجليزي)'),
  ('whatsapp_default_message_ar', 'مرحبا! أريد معرفة المزيد عن مين معانا.', 'Default pre-filled message for WhatsApp chat (Arabic)', 'رسالة افتراضية لواتساب (عربي)'),
  ('email', 'support@ma3ana.org', 'Contact email address', 'البريد الإلكتروني للتواصل')
ON CONFLICT (config_key) DO NOTHING;

-- Enable RLS
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read system config (public data)
CREATE POLICY "Anyone can read system config"
  ON system_config
  FOR SELECT
  USING (true);

-- Policy: Only authenticated users can update system config
CREATE POLICY "Authenticated users can update system config"
  ON system_config
  FOR UPDATE
  USING (auth.role() = 'authenticated');

-- Policy: Only authenticated users can insert system config
CREATE POLICY "Authenticated users can insert system config"
  ON system_config
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Add comment
COMMENT ON TABLE system_config IS 'Generic key-value store for system configuration values';

