-- Update contribution created_at dates to match case created_at dates
-- Also updates related notifications created_at dates
-- This migration is for historical data alignment
-- 
-- IMPORTANT: This script is idempotent and can be run multiple times safely
-- It only updates records where dates don't match

-- Step 1: Update contributions.created_at to match cases.created_at
-- Only update contributions that have a case_id and where dates differ
-- Safety check: Only update if case.created_at exists and is valid
UPDATE contributions c
SET created_at = cases.created_at,
    updated_at = NOW()
FROM cases
WHERE c.case_id = cases.id
  AND c.case_id IS NOT NULL
  AND cases.created_at IS NOT NULL
  AND c.created_at IS NOT NULL
  AND c.created_at != cases.created_at;

-- Log the number of contributions updated
DO $$
DECLARE
    updated_count INTEGER;
    total_with_cases INTEGER;
BEGIN
    -- Count contributions that now match their case dates
    SELECT COUNT(*) INTO updated_count
    FROM contributions c
    JOIN cases ON c.case_id = cases.id
    WHERE c.case_id IS NOT NULL
      AND c.created_at = cases.created_at;
    
    -- Count total contributions with cases
    SELECT COUNT(*) INTO total_with_cases
    FROM contributions c
    WHERE c.case_id IS NOT NULL;
    
    RAISE NOTICE 'Updated % out of % contributions to match their case created_at dates', updated_count, total_with_cases;
END $$;

-- Step 2: Update contribution_approval_status.created_at to match contribution created_at
-- This ensures approval status records are aligned with their contributions
-- Only update if dates differ
UPDATE contribution_approval_status cas
SET created_at = c.created_at,
    updated_at = NOW()
FROM contributions c
WHERE cas.contribution_id = c.id
  AND cas.created_at IS NOT NULL
  AND c.created_at IS NOT NULL
  AND cas.created_at != c.created_at;

-- Log the number of approval status records updated
DO $$
DECLARE
    updated_count INTEGER;
    total_records INTEGER;
BEGIN
    -- Count approval status records that now match their contribution dates
    SELECT COUNT(*) INTO updated_count
    FROM contribution_approval_status cas
    JOIN contributions c ON cas.contribution_id = c.id
    WHERE cas.created_at = c.created_at;
    
    -- Count total approval status records
    SELECT COUNT(*) INTO total_records
    FROM contribution_approval_status;
    
    RAISE NOTICE 'Updated % out of % contribution_approval_status records to match their contribution created_at dates', updated_count, total_records;
END $$;

-- Step 3: Update notifications.created_at to match contribution created_at
-- Only update notifications that are related to contributions
-- Notification types: 'contribution_approved', 'contribution_rejected', 'contribution_pending'
-- Safety check: Only update if contribution_id exists in data and contribution exists
UPDATE notifications n
SET created_at = c.created_at,
    updated_at = NOW()
FROM contributions c
WHERE n.type IN ('contribution_approved', 'contribution_rejected', 'contribution_pending')
  AND n.data IS NOT NULL
  AND n.data->>'contribution_id' IS NOT NULL
  AND n.data->>'contribution_id' = c.id::text
  AND n.created_at IS NOT NULL
  AND c.created_at IS NOT NULL
  AND n.created_at != c.created_at;

-- Log the number of notifications updated
DO $$
DECLARE
    updated_count INTEGER;
    total_contribution_notifications INTEGER;
BEGIN
    -- Count notifications that now match their contribution dates
    SELECT COUNT(*) INTO updated_count
    FROM notifications n
    JOIN contributions c ON n.data->>'contribution_id' = c.id::text
    WHERE n.type IN ('contribution_approved', 'contribution_rejected', 'contribution_pending')
      AND n.created_at = c.created_at;
    
    -- Count total contribution-related notifications
    SELECT COUNT(*) INTO total_contribution_notifications
    FROM notifications
    WHERE type IN ('contribution_approved', 'contribution_rejected', 'contribution_pending')
      AND data IS NOT NULL
      AND data->>'contribution_id' IS NOT NULL;
    
    RAISE NOTICE 'Updated % out of % contribution-related notifications to match their contribution created_at dates', updated_count, total_contribution_notifications;
END $$;

-- Step 4: Summary report
DO $$
DECLARE
    contributions_with_cases INTEGER;
    contributions_matching_dates INTEGER;
    notifications_matching_dates INTEGER;
    approval_status_matching_dates INTEGER;
BEGIN
    -- Count contributions with cases
    SELECT COUNT(*) INTO contributions_with_cases
    FROM contributions
    WHERE case_id IS NOT NULL;
    
    -- Count contributions matching case dates
    SELECT COUNT(*) INTO contributions_matching_dates
    FROM contributions c
    JOIN cases ON c.case_id = cases.id
    WHERE c.created_at = cases.created_at;
    
    -- Count notifications matching contribution dates
    SELECT COUNT(*) INTO notifications_matching_dates
    FROM notifications n
    JOIN contributions c ON n.data->>'contribution_id' = c.id::text
    WHERE n.type IN ('contribution_approved', 'contribution_rejected', 'contribution_pending')
      AND n.created_at = c.created_at;
    
    -- Count approval status matching contribution dates
    SELECT COUNT(*) INTO approval_status_matching_dates
    FROM contribution_approval_status cas
    JOIN contributions c ON cas.contribution_id = c.id
    WHERE cas.created_at = c.created_at;
    
    RAISE NOTICE '=== Migration Summary ===';
    RAISE NOTICE 'Contributions with cases: %', contributions_with_cases;
    RAISE NOTICE 'Contributions matching case dates: %', contributions_matching_dates;
    RAISE NOTICE 'Notifications matching contribution dates: %', notifications_matching_dates;
    RAISE NOTICE 'Approval status matching contribution dates: %', approval_status_matching_dates;
END $$;

-- Step 5: Verification queries (commented out - uncomment to run manually)
-- These queries help verify the migration results

-- Verify contributions and their case dates
/*
SELECT 
    c.id as contribution_id,
    c.created_at as contribution_created_at,
    cases.id as case_id,
    cases.created_at as case_created_at,
    c.created_at = cases.created_at as dates_match,
    EXTRACT(EPOCH FROM (c.created_at - cases.created_at)) as time_difference_seconds
FROM contributions c
LEFT JOIN cases ON c.case_id = cases.id
WHERE c.case_id IS NOT NULL
ORDER BY ABS(EXTRACT(EPOCH FROM (c.created_at - cases.created_at))) DESC
LIMIT 20;
*/

-- Verify notifications and their related contribution dates
/*
SELECT 
    n.id as notification_id,
    n.type as notification_type,
    n.created_at as notification_created_at,
    c.id as contribution_id,
    c.created_at as contribution_created_at,
    n.created_at = c.created_at as dates_match,
    EXTRACT(EPOCH FROM (n.created_at - c.created_at)) as time_difference_seconds
FROM notifications n
JOIN contributions c ON n.data->>'contribution_id' = c.id::text
WHERE n.type IN ('contribution_approved', 'contribution_rejected', 'contribution_pending')
ORDER BY ABS(EXTRACT(EPOCH FROM (n.created_at - c.created_at))) DESC
LIMIT 20;
*/

-- Verify approval status and contribution dates
/*
SELECT 
    cas.id as approval_status_id,
    cas.contribution_id,
    cas.created_at as approval_status_created_at,
    c.created_at as contribution_created_at,
    cas.created_at = c.created_at as dates_match,
    EXTRACT(EPOCH FROM (cas.created_at - c.created_at)) as time_difference_seconds
FROM contribution_approval_status cas
JOIN contributions c ON cas.contribution_id = c.id
ORDER BY ABS(EXTRACT(EPOCH FROM (cas.created_at - c.created_at))) DESC
LIMIT 20;
*/

