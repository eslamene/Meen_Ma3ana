-- Delete all test data from cases table
-- WARNING: This will delete ALL cases. Use with caution!
-- Only run this if you want to clear all test data
-- This script handles cases where some tables might not exist

BEGIN;

-- Delete all case-related data first (due to foreign key constraints)
-- Only delete if tables exist

-- Delete case status history (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'case_status_history') THEN
        DELETE FROM case_status_history;
    END IF;
END $$;

-- Delete case updates (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'case_updates') THEN
        DELETE FROM case_updates;
    END IF;
END $$;

-- Delete case images (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'case_images') THEN
        DELETE FROM case_images;
    END IF;
END $$;

-- Delete contributions linked to cases (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'contributions') THEN
        DELETE FROM contributions WHERE case_id IS NOT NULL;
    END IF;
END $$;

-- Delete sponsorships linked to cases (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sponsorships') THEN
        DELETE FROM sponsorships WHERE case_id IS NOT NULL;
    END IF;
END $$;

-- Delete all cases (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'cases') THEN
        DELETE FROM cases;
    END IF;
END $$;

COMMIT;

-- Verify deletion
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'cases') THEN
        RAISE NOTICE 'Remaining cases: %', (SELECT COUNT(*) FROM cases);
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'contributions') THEN
        RAISE NOTICE 'Remaining case contributions: %', (SELECT COUNT(*) FROM contributions WHERE case_id IS NOT NULL);
    END IF;
END $$;

