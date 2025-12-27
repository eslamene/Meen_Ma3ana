-- Verification script to run AFTER the migration
-- This shows what was actually updated

-- Count notifications by type with bilingual fields populated
SELECT 
  type,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE title_en IS NOT NULL) as has_title_en,
  COUNT(*) FILTER (WHERE title_ar IS NOT NULL) as has_title_ar,
  COUNT(*) FILTER (WHERE message_en IS NOT NULL) as has_message_en,
  COUNT(*) FILTER (WHERE message_ar IS NOT NULL) as has_message_ar,
  COUNT(*) FILTER (WHERE title_en IS NOT NULL AND title_ar IS NOT NULL AND message_en IS NOT NULL AND message_ar IS NOT NULL) as fully_bilingual
FROM notifications
GROUP BY type
ORDER BY total DESC;

-- Show sample of updated notifications
SELECT 
  id,
  type,
  title_en,
  title_ar,
  LEFT(message_en, 50) as message_en_preview,
  LEFT(message_ar, 50) as message_ar_preview,
  created_at
FROM notifications
WHERE title_en IS NOT NULL AND title_ar IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;

-- Check for any notifications still missing bilingual fields
SELECT 
  COUNT(*) as still_missing_bilingual,
  type,
  COUNT(*) as count
FROM notifications
WHERE (title_en IS NULL OR title_ar IS NULL OR message_en IS NULL OR message_ar IS NULL)
GROUP BY type
ORDER BY count DESC;





