-- Migration: Add group_type column to system_config
-- This allows grouping system configuration settings by type (auth, validation, pagination, contact, etc.)

-- Add group_type column
ALTER TABLE system_config
ADD COLUMN IF NOT EXISTS group_type TEXT;

-- Create index on group_type for faster filtering
CREATE INDEX IF NOT EXISTS idx_system_config_group_type ON system_config(group_type);

-- Update existing records with appropriate group types based on config_key patterns
UPDATE system_config
SET group_type = CASE
  WHEN config_key LIKE 'auth.%' THEN 'auth'
  WHEN config_key LIKE 'validation.%' THEN 'validation'
  WHEN config_key LIKE 'pagination.%' THEN 'pagination'
  WHEN config_key IN ('email', 'facebook_url', 'instagram_url', 'whatsapp_number', 'whatsapp_default_message', 'whatsapp_default_message_ar') THEN 'contact'
  ELSE 'general'
END
WHERE group_type IS NULL;

-- Add comment
COMMENT ON COLUMN system_config.group_type IS 'Groups configuration settings by type (auth, validation, pagination, contact, general) for better organization';


