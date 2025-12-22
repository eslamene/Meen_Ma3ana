-- =====================================================
-- Remove Database Triggers for Donor Role Assignment
-- =====================================================
-- Role assignment is now handled by the backend system
-- This migration removes the database triggers to avoid conflicts

-- Drop the trigger that assigns donor role on user creation
DROP TRIGGER IF EXISTS trigger_assign_donor_role_on_user_create ON auth.users;

-- Drop the trigger that assigns donor role on email verification
DROP TRIGGER IF EXISTS trigger_ensure_donor_role_on_email_verification ON auth.users;

-- Optionally drop the functions (they won't be used anymore)
-- Uncomment these if you want to completely remove them:
DROP FUNCTION IF EXISTS assign_donor_role_to_new_user();
DROP FUNCTION IF EXISTS ensure_donor_role_on_email_verification();

-- Verify triggers were removed
DO $$
DECLARE
    trigger_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO trigger_count
    FROM pg_trigger
    WHERE tgname IN (
        'trigger_assign_donor_role_on_user_create',
        'trigger_ensure_donor_role_on_email_verification'
    )
    AND tgrelid = 'auth.users'::regclass;
    
    IF trigger_count = 0 THEN
        RAISE NOTICE '✅ All donor role assignment triggers successfully removed';
    ELSE
        RAISE WARNING '❌ Some triggers still exist - please check manually';
    END IF;
END $$;





