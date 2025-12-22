-- Diagnostic script to check what notifications would be updated
-- Run this BEFORE running the migration to see what will be affected

-- Check notification types and counts
SELECT 
  type,
  COUNT(*) as total_count,
  COUNT(*) FILTER (WHERE title_en IS NULL OR title_ar IS NULL OR message_en IS NULL OR message_ar IS NULL) as needs_update,
  COUNT(*) FILTER (WHERE data IS NOT NULL) as has_data,
  COUNT(*) FILTER (WHERE data->>'amount' IS NOT NULL) as has_amount,
  COUNT(*) FILTER (WHERE data->>'case_title' IS NOT NULL) as has_case_title
FROM notifications
GROUP BY type
ORDER BY total_count DESC;

-- Sample notifications that need updating (first 10 of each type)
SELECT 
  id,
  type,
  title,
  LEFT(message, 50) as message_preview,
  data,
  title_en IS NULL as missing_title_en,
  title_ar IS NULL as missing_title_ar,
  message_en IS NULL as missing_message_en,
  message_ar IS NULL as missing_message_ar
FROM notifications
WHERE (title_en IS NULL OR title_ar IS NULL OR message_en IS NULL OR message_ar IS NULL)
ORDER BY type, created_at DESC
LIMIT 20;

-- Check specific notification types
SELECT 
  'contribution_approved' as type,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE title_en IS NULL OR title_ar IS NULL OR message_en IS NULL OR message_ar IS NULL) as needs_update
FROM notifications
WHERE type = 'contribution_approved'

UNION ALL

SELECT 
  'contribution_rejected' as type,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE title_en IS NULL OR title_ar IS NULL OR message_en IS NULL OR message_ar IS NULL) as needs_update
FROM notifications
WHERE type = 'contribution_rejected'

UNION ALL

SELECT 
  'contribution_pending' as type,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE title_en IS NULL OR title_ar IS NULL OR message_en IS NULL OR message_ar IS NULL) as needs_update
FROM notifications
WHERE type = 'contribution_pending'

UNION ALL

SELECT 
  'contribution_revised' as type,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE title_en IS NULL OR title_ar IS NULL OR message_en IS NULL OR message_ar IS NULL) as needs_update
FROM notifications
WHERE type = 'contribution_revised';

-- Check data field structure for contribution notifications
SELECT 
  type,
  data->>'amount' as amount,
  data->>'case_title' as case_title,
  data->>'rejection_reason' as rejection_reason,
  data->>'contribution_id' as contribution_id,
  title,
  LEFT(message, 100) as message_preview
FROM notifications
WHERE type IN ('contribution_approved', 'contribution_rejected', 'contribution_pending')
  AND (title_en IS NULL OR title_ar IS NULL OR message_en IS NULL OR message_ar IS NULL)
LIMIT 10;




