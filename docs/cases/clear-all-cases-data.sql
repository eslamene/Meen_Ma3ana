-- ================================================================
-- CLEAR ALL CASES AND RELATED DATA
-- ================================================================
-- WARNING: This script will DELETE ALL cases and all related data!
-- 
-- This includes:
--   - All cases
--   - All case-related contributions
--   - All contribution approval statuses
--   - All case files, images, updates, status history
--   - All case-related notifications
--   - All case-related sponsorships and recurring contributions
--
-- Tables that will be KEPT (not deleted):
--   - case_categories (reference data)
--   - users (user accounts)
--   - payment_methods (reference data)
--   - projects (separate from cases)
--   - project_cycles (related to projects)
--   - communications (user-to-user messages)
--   - localization (translation data)
--   - landing_stats (system stats)
--   - system_config (system configuration)
-- ================================================================

BEGIN;

-- ================================================================
-- STEP 1: Delete contribution_approval_status
-- ================================================================
-- This must be deleted first because it depends on contributions
-- Delete all approval statuses for case-related contributions
DO $$
DECLARE
    deleted_count INTEGER;
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'contribution_approval_status') THEN
        -- Delete approval statuses for contributions linked to cases
        DELETE FROM contribution_approval_status
        WHERE contribution_id IN (
            SELECT id FROM contributions WHERE case_id IS NOT NULL
        );
        
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        RAISE NOTICE 'Deleted % records from contribution_approval_status', deleted_count;
    END IF;
END $$;

-- ================================================================
-- STEP 2: Delete case_files
-- ================================================================
DO $$
DECLARE
    deleted_count INTEGER;
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'case_files') THEN
        DELETE FROM case_files;
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        RAISE NOTICE 'Deleted % records from case_files', deleted_count;
    END IF;
END $$;

-- ================================================================
-- STEP 3: Delete case_images (legacy table, may be renamed)
-- ================================================================
DO $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Check for case_images table
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'case_images') THEN
        DELETE FROM case_images;
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        RAISE NOTICE 'Deleted % records from case_images', deleted_count;
    END IF;
    
    -- Check for case_images_backup table (if migration renamed it)
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'case_images_backup') THEN
        DELETE FROM case_images_backup;
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        RAISE NOTICE 'Deleted % records from case_images_backup', deleted_count;
    END IF;
END $$;

-- ================================================================
-- STEP 4: Delete case_status_history
-- ================================================================
DO $$
DECLARE
    deleted_count INTEGER;
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'case_status_history') THEN
        DELETE FROM case_status_history;
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        RAISE NOTICE 'Deleted % records from case_status_history', deleted_count;
    END IF;
END $$;

-- ================================================================
-- STEP 5: Delete case_updates
-- ================================================================
DO $$
DECLARE
    deleted_count INTEGER;
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'case_updates') THEN
        DELETE FROM case_updates;
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        RAISE NOTICE 'Deleted % records from case_updates', deleted_count;
    END IF;
END $$;

-- ================================================================
-- STEP 6: Delete notifications related to cases and contributions
-- ================================================================
-- Notifications reference cases/contributions via data JSONB field
-- Delete notifications with types related to cases/contributions
DO $$
DECLARE
    deleted_count INTEGER;
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notifications') THEN
        -- Delete contribution-related notifications
        DELETE FROM notifications
        WHERE type IN (
            'contribution_approved',
            'contribution_rejected',
            'contribution_pending',
            'contribution_acknowledged'
        );
        
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        RAISE NOTICE 'Deleted % contribution-related notifications', deleted_count;
        
        -- Delete case-related notifications
        DELETE FROM notifications
        WHERE type IN (
            'case_update',
            'case_progress',
            'case_contribution',
            'case_milestone'
        );
        
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        RAISE NOTICE 'Deleted % case-related notifications', deleted_count;
        
        -- Also delete any notifications that reference cases/contributions in data field
        -- (for any other notification types that might reference them)
        DELETE FROM notifications
        WHERE data IS NOT NULL
        AND (
            data ? 'case_id' OR
            data ? 'contribution_id' OR
            (data->>'case_id') IS NOT NULL OR
            (data->>'contribution_id') IS NOT NULL
        );
        
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        RAISE NOTICE 'Deleted % additional notifications with case/contribution references', deleted_count;
    END IF;
END $$;

-- ================================================================
-- STEP 7: Delete recurring_contributions linked to cases
-- ================================================================
DO $$
DECLARE
    deleted_count INTEGER;
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'recurring_contributions') THEN
        DELETE FROM recurring_contributions WHERE case_id IS NOT NULL;
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        RAISE NOTICE 'Deleted % case-related recurring_contributions', deleted_count;
    END IF;
END $$;

-- ================================================================
-- STEP 8: Delete sponsorships linked to cases
-- ================================================================
DO $$
DECLARE
    deleted_count INTEGER;
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sponsorships') THEN
        DELETE FROM sponsorships WHERE case_id IS NOT NULL;
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        RAISE NOTICE 'Deleted % case-related sponsorships', deleted_count;
    END IF;
END $$;

-- ================================================================
-- STEP 9: Delete contributions linked to cases
-- ================================================================
-- This must be done after contribution_approval_status is deleted
DO $$
DECLARE
    deleted_count INTEGER;
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'contributions') THEN
        DELETE FROM contributions WHERE case_id IS NOT NULL;
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        RAISE NOTICE 'Deleted % case-related contributions', deleted_count;
    END IF;
END $$;

-- ================================================================
-- STEP 10: Delete all cases (main table)
-- ================================================================
-- This is done last after all dependent records are deleted
DO $$
DECLARE
    deleted_count INTEGER;
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'cases') THEN
        DELETE FROM cases;
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        RAISE NOTICE 'Deleted % cases', deleted_count;
    END IF;
END $$;

COMMIT;

-- ================================================================
-- VERIFICATION: Check that all data has been cleared
-- ================================================================
DO $$
DECLARE
    cases_count INTEGER := 0;
    contributions_count INTEGER := 0;
    approval_status_count INTEGER := 0;
    case_files_count INTEGER := 0;
    case_images_count INTEGER := 0;
    case_updates_count INTEGER := 0;
    case_status_history_count INTEGER := 0;
    recurring_contributions_count INTEGER := 0;
    sponsorships_count INTEGER := 0;
    notifications_count INTEGER := 0;
BEGIN
    -- Count remaining records
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'cases') THEN
        SELECT COUNT(*) INTO cases_count FROM cases;
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'contributions') THEN
        SELECT COUNT(*) INTO contributions_count FROM contributions WHERE case_id IS NOT NULL;
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'contribution_approval_status') THEN
        SELECT COUNT(*) INTO approval_status_count FROM contribution_approval_status;
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'case_files') THEN
        SELECT COUNT(*) INTO case_files_count FROM case_files;
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'case_images') THEN
        SELECT COUNT(*) INTO case_images_count FROM case_images;
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'case_updates') THEN
        SELECT COUNT(*) INTO case_updates_count FROM case_updates;
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'case_status_history') THEN
        SELECT COUNT(*) INTO case_status_history_count FROM case_status_history;
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'recurring_contributions') THEN
        SELECT COUNT(*) INTO recurring_contributions_count FROM recurring_contributions WHERE case_id IS NOT NULL;
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sponsorships') THEN
        SELECT COUNT(*) INTO sponsorships_count FROM sponsorships WHERE case_id IS NOT NULL;
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notifications') THEN
        SELECT COUNT(*) INTO notifications_count FROM notifications
        WHERE type IN (
            'contribution_approved', 'contribution_rejected', 'contribution_pending', 'contribution_acknowledged',
            'case_update', 'case_progress', 'case_contribution', 'case_milestone'
        )
        OR (data IS NOT NULL AND (data ? 'case_id' OR data ? 'contribution_id'));
    END IF;
    
    -- Report results
    RAISE NOTICE '========================================';
    RAISE NOTICE 'VERIFICATION RESULTS:';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Cases: %', cases_count;
    RAISE NOTICE 'Case-related contributions: %', contributions_count;
    RAISE NOTICE 'Contribution approval statuses: %', approval_status_count;
    RAISE NOTICE 'Case files: %', case_files_count;
    RAISE NOTICE 'Case images: %', case_images_count;
    RAISE NOTICE 'Case updates: %', case_updates_count;
    RAISE NOTICE 'Case status history: %', case_status_history_count;
    RAISE NOTICE 'Case-related recurring contributions: %', recurring_contributions_count;
    RAISE NOTICE 'Case-related sponsorships: %', sponsorships_count;
    RAISE NOTICE 'Case/contribution-related notifications: %', notifications_count;
    RAISE NOTICE '========================================';
    
    IF cases_count = 0 AND contributions_count = 0 AND approval_status_count = 0 AND 
       case_files_count = 0 AND case_images_count = 0 AND case_updates_count = 0 AND 
       case_status_history_count = 0 AND recurring_contributions_count = 0 AND 
       sponsorships_count = 0 AND notifications_count = 0 THEN
        RAISE NOTICE '✅ SUCCESS: All cases and related data have been cleared!';
        RAISE NOTICE 'You can now run the insert script to populate fresh data.';
    ELSE
        RAISE WARNING '⚠️  WARNING: Some data still remains. Please check the counts above.';
    END IF;
END $$;

