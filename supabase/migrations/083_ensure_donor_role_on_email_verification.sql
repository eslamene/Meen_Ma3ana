-- =====================================================
-- Ensure Donor Role is Assigned on Email Verification
-- =====================================================
-- This migration ensures that when a user verifies their email,
-- they automatically get the donor role assigned (if not already assigned)
-- This is a backup to the INSERT trigger in case it fails

-- Function to ensure donor role is assigned when email is verified
CREATE OR REPLACE FUNCTION ensure_donor_role_on_email_verification()
RETURNS TRIGGER AS $$
DECLARE
    donor_role_id UUID;
BEGIN
    -- Only run when email_confirmed_at is set (email verification)
    IF NEW.email_confirmed_at IS NOT NULL AND (OLD.email_confirmed_at IS NULL OR OLD.email_confirmed_at IS DISTINCT FROM NEW.email_confirmed_at) THEN
        -- Get the donor role ID
        BEGIN
            SELECT id INTO donor_role_id
            FROM admin_roles
            WHERE name = 'donor'
            AND is_active = true
            LIMIT 1;
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Error querying donor role in ensure_donor_role_on_email_verification: %', SQLERRM;
            RETURN NEW;
        END;

        -- If donor role exists, ensure it's assigned to the user
        IF donor_role_id IS NOT NULL THEN
            BEGIN
                INSERT INTO admin_user_roles (user_id, role_id, is_active, assigned_at)
                VALUES (NEW.id, donor_role_id, true, NOW())
                ON CONFLICT (user_id, role_id) 
                DO UPDATE SET 
                    is_active = true,
                    assigned_at = COALESCE(admin_user_roles.assigned_at, NOW());
            EXCEPTION WHEN OTHERS THEN
                RAISE WARNING 'Failed to assign donor role on email verification for user %: %', NEW.id, SQLERRM;
            END;
        ELSE
            RAISE WARNING 'Donor role not found - cannot assign role on email verification for user %', NEW.id;
        END IF;
    END IF;
    
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Log the error but don't fail the trigger
    RAISE WARNING 'Unexpected error in ensure_donor_role_on_email_verification for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to ensure donor role on email verification
DROP TRIGGER IF EXISTS trigger_ensure_donor_role_on_email_verification ON auth.users;
CREATE TRIGGER trigger_ensure_donor_role_on_email_verification
    AFTER UPDATE OF email_confirmed_at ON auth.users
    FOR EACH ROW
    WHEN (OLD.email_confirmed_at IS DISTINCT FROM NEW.email_confirmed_at AND NEW.email_confirmed_at IS NOT NULL)
    EXECUTE FUNCTION ensure_donor_role_on_email_verification();

-- Verify the trigger was created
DO $$
DECLARE
    trigger_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'trigger_ensure_donor_role_on_email_verification'
        AND tgrelid = 'auth.users'::regclass
    ) INTO trigger_exists;
    
    IF trigger_exists THEN
        RAISE NOTICE '✅ Trigger successfully created: trigger_ensure_donor_role_on_email_verification';
    ELSE
        RAISE WARNING '❌ Trigger creation failed - please check manually';
    END IF;
END $$;

-- Add comment to document the trigger
COMMENT ON FUNCTION ensure_donor_role_on_email_verification() IS 'Ensures donor role is assigned when user verifies their email. This is a backup to the INSERT trigger.';





