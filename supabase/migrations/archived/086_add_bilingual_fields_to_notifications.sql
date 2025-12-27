-- Add bilingual fields to notifications table
-- This migration adds support for English and Arabic notification content

-- Add new columns for bilingual content
ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS title_en TEXT,
ADD COLUMN IF NOT EXISTS title_ar TEXT,
ADD COLUMN IF NOT EXISTS message_en TEXT,
ADD COLUMN IF NOT EXISTS message_ar TEXT;

-- Initial migration: populate bilingual fields from legacy fields as temporary fallback
-- Note: A more comprehensive migration script (087_migrate_notifications_to_bilingual.sql) 
-- will properly translate existing notifications based on their type and data
UPDATE notifications 
SET 
  title_en = COALESCE(title_en, title),
  title_ar = COALESCE(title_ar, title),
  message_en = COALESCE(message_en, message),
  message_ar = COALESCE(message_ar, message)
WHERE (title_en IS NULL OR title_ar IS NULL OR message_en IS NULL OR message_ar IS NULL)
  AND (title IS NOT NULL OR message IS NOT NULL);

-- Make legacy fields nullable (they're kept for backward compatibility)
ALTER TABLE notifications 
ALTER COLUMN title DROP NOT NULL,
ALTER COLUMN message DROP NOT NULL;

-- Add comments
COMMENT ON COLUMN notifications.title_en IS 'Notification title in English';
COMMENT ON COLUMN notifications.title_ar IS 'Notification title in Arabic';
COMMENT ON COLUMN notifications.message_en IS 'Notification message in English';
COMMENT ON COLUMN notifications.message_ar IS 'Notification message in Arabic';
COMMENT ON COLUMN notifications.title IS 'Legacy title field (kept for backward compatibility)';
COMMENT ON COLUMN notifications.message IS 'Legacy message field (kept for backward compatibility)';

