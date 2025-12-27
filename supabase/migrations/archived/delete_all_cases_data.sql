-- Delete all data from cases-related tables
-- WARNING: This will delete ALL cases and related data. Use with caution!
-- This script handles cases where some tables might not exist

BEGIN;

-- Delete all case-related data first (due to foreign key constraints)
-- Only delete if tables exist

-- Delete case status history (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'case_status_history') THEN
        DELETE FROM case_status_history;
        RAISE NOTICE 'Deleted all records from case_status_history';
    END IF;
END $$;

-- Delete case updates (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'case_updates') THEN
        DELETE FROM case_updates;
        RAISE NOTICE 'Deleted all records from case_updates';
    END IF;
END $$;

-- Delete case images (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'case_images') THEN
        DELETE FROM case_images;
        RAISE NOTICE 'Deleted all records from case_images';
    END IF;
END $$;

-- Delete contributions linked to cases (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'contributions') THEN
        DELETE FROM contributions WHERE case_id IS NOT NULL;
        RAISE NOTICE 'Deleted all case-related contributions';
    END IF;
END $$;

-- Delete sponsorships linked to cases (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sponsorships') THEN
        DELETE FROM sponsorships WHERE case_id IS NOT NULL;
        RAISE NOTICE 'Deleted all case-related sponsorships';
    END IF;
END $$;

-- Delete all cases (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'cases') THEN
        DELETE FROM cases;
        RAISE NOTICE 'Deleted all cases';
    END IF;
END $$;

COMMIT;

-- Verify deletion
DO $$
DECLARE
    cases_count INTEGER := 0;
    contributions_count INTEGER := 0;
    case_images_count INTEGER := 0;
    case_updates_count INTEGER := 0;
    case_status_history_count INTEGER := 0;
    sponsorships_count INTEGER := 0;
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'cases') THEN
        SELECT COUNT(*) INTO cases_count FROM cases;
        RAISE NOTICE 'Remaining cases: %', cases_count;
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'contributions') THEN
        SELECT COUNT(*) INTO contributions_count FROM contributions WHERE case_id IS NOT NULL;
        RAISE NOTICE 'Remaining case contributions: %', contributions_count;
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'case_images') THEN
        SELECT COUNT(*) INTO case_images_count FROM case_images;
        RAISE NOTICE 'Remaining case images: %', case_images_count;
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'case_updates') THEN
        SELECT COUNT(*) INTO case_updates_count FROM case_updates;
        RAISE NOTICE 'Remaining case updates: %', case_updates_count;
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'case_status_history') THEN
        SELECT COUNT(*) INTO case_status_history_count FROM case_status_history;
        RAISE NOTICE 'Remaining case status history: %', case_status_history_count;
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sponsorships') THEN
        SELECT COUNT(*) INTO sponsorships_count FROM sponsorships WHERE case_id IS NOT NULL;
        RAISE NOTICE 'Remaining case sponsorships: %', sponsorships_count;
    END IF;
    
    IF cases_count = 0 AND contributions_count = 0 AND case_images_count = 0 AND 
       case_updates_count = 0 AND case_status_history_count = 0 AND sponsorships_count = 0 THEN
        RAISE NOTICE '✅ All cases-related data has been successfully deleted. Ready for clean start!';
    END IF;
END $$;

