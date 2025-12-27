-- Migrate existing notifications to bilingual content
-- This script extracts data from existing notifications and generates proper bilingual content
-- based on notification type and data stored in the JSONB field

-- Function to replace placeholders in template strings
CREATE OR REPLACE FUNCTION replace_placeholders(
  template TEXT,
  placeholders JSONB
) RETURNS TEXT AS $$
DECLARE
  result TEXT := template;
  key TEXT;
  value TEXT;
BEGIN
  FOR key, value IN SELECT * FROM jsonb_each_text(placeholders)
  LOOP
    result := replace(result, '{' || key || '}', COALESCE(value, ''));
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Update contribution_approved notifications
-- Update even if fields exist but contain English text (from migration 086)
UPDATE notifications
SET
  title_en = 'Contribution Approved',
  title_ar = 'تمت الموافقة على المساهمة',
  message_en = replace_placeholders(
    'Your contribution of {amount} EGP for "{caseTitle}" has been approved. Thank you for your generosity!',
    jsonb_build_object(
      'amount', COALESCE((data->>'amount')::text, '0'),
      'caseTitle', COALESCE(data->>'case_title', 'Unknown Case')
    )
  ),
  message_ar = replace_placeholders(
    'تمت الموافقة على مساهمتك بقيمة {amount} جنيه للحالة "{caseTitle}". شكراً لكرمك!',
    jsonb_build_object(
      'amount', COALESCE((data->>'amount')::text, '0'),
      'caseTitle', COALESCE(data->>'case_title', 'حالة غير معروفة')
    )
  )
WHERE type = 'contribution_approved'
  AND (
    -- Update if fields are NULL
    (title_en IS NULL OR title_ar IS NULL OR message_en IS NULL OR message_ar IS NULL)
    -- OR if Arabic fields contain English text (indicating they were copied from legacy fields)
    OR (title_ar = title_en OR title_ar = 'Contribution Approved' OR message_ar = message_en)
  )
  AND (title IS NOT NULL OR message IS NOT NULL);

-- Update contribution_rejected notifications
UPDATE notifications
SET
  title_en = 'Contribution Rejected',
  title_ar = 'تم رفض المساهمة',
  message_en = replace_placeholders(
    'Your contribution of {amount} EGP for "{caseTitle}" has been rejected. Reason: {reason}',
    jsonb_build_object(
      'amount', COALESCE((data->>'amount')::text, '0'),
      'caseTitle', COALESCE(data->>'case_title', 'Unknown Case'),
      'reason', COALESCE(data->>'rejection_reason', 'No reason provided')
    )
  ),
  message_ar = replace_placeholders(
    'تم رفض مساهمتك بقيمة {amount} جنيه للحالة "{caseTitle}". السبب: {reason}',
    jsonb_build_object(
      'amount', COALESCE((data->>'amount')::text, '0'),
      'caseTitle', COALESCE(data->>'case_title', 'حالة غير معروفة'),
      'reason', COALESCE(data->>'rejection_reason', 'لم يتم تقديم سبب')
    )
  )
WHERE type = 'contribution_rejected'
  AND (
    (title_en IS NULL OR title_ar IS NULL OR message_en IS NULL OR message_ar IS NULL)
    OR (title_ar = title_en OR title_ar = 'Contribution Rejected' OR message_ar = message_en)
  )
  AND (title IS NOT NULL OR message IS NOT NULL);

-- Update contribution_pending notifications (for donors)
UPDATE notifications
SET
  title_en = 'Contribution Submitted',
  title_ar = 'تم إرسال المساهمة',
  message_en = replace_placeholders(
    'Your contribution of {amount} EGP for "{caseTitle}" has been submitted and is under review.',
    jsonb_build_object(
      'amount', COALESCE((data->>'amount')::text, '0'),
      'caseTitle', COALESCE(data->>'case_title', 'Unknown Case')
    )
  ),
  message_ar = replace_placeholders(
    'تم إرسال مساهمتك بقيمة {amount} جنيه للحالة "{caseTitle}" وهي قيد المراجعة.',
    jsonb_build_object(
      'amount', COALESCE((data->>'amount')::text, '0'),
      'caseTitle', COALESCE(data->>'case_title', 'حالة غير معروفة')
    )
  )
WHERE type = 'contribution_pending'
  AND (
    (title_en IS NULL OR title_ar IS NULL OR message_en IS NULL OR message_ar IS NULL)
    OR (title_ar = title_en OR title_ar = 'Contribution Submitted' OR message_ar = message_en)
  )
  AND (title IS NOT NULL OR message IS NOT NULL)
  -- Only update donor notifications (not admin notifications)
  AND (title IS NULL OR title NOT LIKE 'New Contribution Submitted%');

-- Update contribution_pending notifications (for admins - "New Contribution Submitted")
UPDATE notifications
SET
  title_en = 'New Contribution Submitted',
  title_ar = 'تم إرسال مساهمة جديدة',
  message_en = replace_placeholders(
    'A new contribution of {amount} EGP has been submitted for case: {caseTitle}',
    jsonb_build_object(
      'amount', COALESCE((data->>'amount')::text, '0'),
      'caseTitle', COALESCE(data->>'case_title', 'Unknown Case')
    )
  ),
  message_ar = replace_placeholders(
    'تم إرسال مساهمة جديدة بقيمة {amount} جنيه للحالة: {caseTitle}',
    jsonb_build_object(
      'amount', COALESCE((data->>'amount')::text, '0'),
      'caseTitle', COALESCE(data->>'case_title', 'حالة غير معروفة')
    )
  )
WHERE type = 'contribution_pending'
  AND (
    (title_en IS NULL OR title_ar IS NULL OR message_en IS NULL OR message_ar IS NULL)
    OR (title_ar = title_en OR title_ar = 'New Contribution Submitted' OR message_ar = message_en)
  )
  AND (title IS NOT NULL OR message IS NOT NULL)
  -- Only update admin notifications
  AND (title LIKE 'New Contribution Submitted%' OR LOWER(message) LIKE '%new contribution%');

-- Update contribution_revised notifications
UPDATE notifications
SET
  title_en = 'Contribution Revision Submitted',
  title_ar = 'تم إرسال مراجعة المساهمة',
  message_en = 'A contribution has been revised and submitted for review. Please check the updated information.',
  message_ar = 'تمت مراجعة مساهمة وإرسالها للمراجعة. يرجى التحقق من المعلومات المحدثة.'
WHERE type = 'contribution_revised'
  AND (
    (title_en IS NULL OR title_ar IS NULL OR message_en IS NULL OR message_ar IS NULL)
    OR (title_ar = title_en OR message_ar = message_en)
  )
  AND (title IS NOT NULL OR message IS NOT NULL);

-- Update case_update notifications
UPDATE notifications
SET
  title_en = COALESCE(
    CASE 
      WHEN title LIKE 'Case Update:%' THEN 
        'Case Update: ' || COALESCE(data->>'caseTitle', 'Unknown Case')
      ELSE 
        'Case Update'
    END,
    'Case Update'
  ),
  title_ar = COALESCE(
    CASE 
      WHEN title LIKE 'Case Update:%' THEN 
        'تحديث الحالة: ' || COALESCE(data->>'caseTitle', 'حالة غير معروفة')
      ELSE 
        'تحديث الحالة'
    END,
    'تحديث الحالة'
  ),
  message_en = COALESCE(message, 'A case has been updated.'),
  message_ar = COALESCE(
    CASE 
      WHEN message IS NOT NULL THEN 
        'تم تحديث حالة.'
      ELSE 
        'تم تحديث حالة.'
    END,
    'تم تحديث حالة.'
  )
WHERE type = 'case_update'
  AND (
    (title_en IS NULL OR title_ar IS NULL OR message_en IS NULL OR message_ar IS NULL)
    OR (title_ar = title_en OR message_ar = message_en)
  )
  AND (title IS NOT NULL OR message IS NOT NULL);

-- Update case_progress notifications
UPDATE notifications
SET
  title_en = 'Case Progress Update',
  title_ar = 'تحديث تقدم الحالة',
  message_en = COALESCE(message, 'There has been progress on a case you are following.'),
  message_ar = COALESCE(
    CASE 
      WHEN message IS NOT NULL THEN 
        'كان هناك تقدم في حالة تتابعها.'
      ELSE 
        'كان هناك تقدم في حالة تتابعها.'
    END,
    'كان هناك تقدم في حالة تتابعها.'
  )
WHERE type = 'case_progress'
  AND (
    (title_en IS NULL OR title_ar IS NULL OR message_en IS NULL OR message_ar IS NULL)
    OR (title_ar = title_en OR message_ar = message_en)
  )
  AND (title IS NOT NULL OR message IS NOT NULL);

-- Update case_contribution notifications
UPDATE notifications
SET
  title_en = 'New Case Contribution',
  title_ar = 'مساهمة حالة جديدة',
  message_en = COALESCE(message, 'A new contribution has been made to a case you are following.'),
  message_ar = COALESCE(
    CASE 
      WHEN message IS NOT NULL THEN 
        'تم إجراء مساهمة جديدة في حالة تتابعها.'
      ELSE 
        'تم إجراء مساهمة جديدة في حالة تتابعها.'
    END,
    'تم إجراء مساهمة جديدة في حالة تتابعها.'
  )
WHERE type = 'case_contribution'
  AND (
    (title_en IS NULL OR title_ar IS NULL OR message_en IS NULL OR message_ar IS NULL)
    OR (title_ar = title_en OR message_ar = message_en)
  )
  AND (title IS NOT NULL OR message IS NOT NULL);

-- Update case_milestone notifications
UPDATE notifications
SET
  title_en = 'Case Milestone Reached',
  title_ar = 'تم الوصول إلى معلم الحالة',
  message_en = COALESCE(message, 'A case you are following has reached an important milestone.'),
  message_ar = COALESCE(
    CASE 
      WHEN message IS NOT NULL THEN 
        'وصلت حالة تتابعها إلى معلم مهم.'
      ELSE 
        'وصلت حالة تتابعها إلى معلم مهم.'
    END,
    'وصلت حالة تتابعها إلى معلم مهم.'
  )
WHERE type = 'case_milestone'
  AND (
    (title_en IS NULL OR title_ar IS NULL OR message_en IS NULL OR message_ar IS NULL)
    OR (title_ar = title_en OR message_ar = message_en)
  )
  AND (title IS NOT NULL OR message IS NOT NULL);

-- For any remaining notifications that don't match the above types,
-- use the legacy title/message as fallback for both languages
UPDATE notifications
SET
  title_en = COALESCE(title_en, title, 'Notification'),
  title_ar = COALESCE(title_ar, title, 'إشعار'),
  message_en = COALESCE(message_en, message, 'You have a new notification.'),
  message_ar = COALESCE(message_ar, message, 'لديك إشعار جديد.')
WHERE (title_en IS NULL OR title_ar IS NULL OR message_en IS NULL OR message_ar IS NULL);

-- Clean up the helper function
DROP FUNCTION IF EXISTS replace_placeholders(TEXT, JSONB);

-- Add a comment documenting the migration
COMMENT ON TABLE notifications IS 'Notifications table with bilingual support. Use title_en/title_ar and message_en/message_ar for new notifications. Legacy title/message fields are kept for backward compatibility.';

-- Report what was updated (this will show in the migration output)
DO $$
DECLARE
  updated_count INTEGER;
  total_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_count FROM notifications;
  SELECT COUNT(*) INTO updated_count 
  FROM notifications 
  WHERE title_en IS NOT NULL AND title_ar IS NOT NULL 
    AND message_en IS NOT NULL AND message_ar IS NOT NULL;
  
  RAISE NOTICE 'Migration Summary:';
  RAISE NOTICE 'Total notifications: %', total_count;
  RAISE NOTICE 'Notifications with bilingual content: %', updated_count;
  RAISE NOTICE 'Notifications still missing bilingual fields: %', (total_count - updated_count);
END $$;

