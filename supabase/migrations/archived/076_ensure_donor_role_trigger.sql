-- =====================================================
-- Ensure Donor Role Auto-Assignment Trigger
-- =====================================================
-- This migration ensures that new registered users are
-- automatically assigned the donor role via database trigger

-- Step 1: Update the function with robust error handling
CREATE OR REPLACE FUNCTION assign_donor_role_to_new_user()
RETURNS TRIGGER AS $$
DECLARE
    donor_role_id UUID;
BEGIN
    -- Wrap entire function in exception handler as final safety net
    BEGIN
        -- Get the donor role ID
        BEGIN
            SELECT id INTO donor_role_id
            FROM admin_roles
            WHERE name = 'donor'
            AND is_active = true
            LIMIT 1;
        EXCEPTION WHEN OTHERS THEN
            -- If query fails, log and continue
            RAISE WARNING 'Error querying donor role: %', SQLERRM;
            RETURN NEW; -- Exit early, user creation succeeds
        END;

        -- If donor role exists, assign it to the new user
        IF donor_role_id IS NOT NULL THEN
            BEGIN
                INSERT INTO admin_user_roles (user_id, role_id, is_active, assigned_at)
                VALUES (NEW.id, donor_role_id, true, NOW())
                ON CONFLICT (user_id, role_id) DO NOTHING;
            EXCEPTION WHEN OTHERS THEN
                -- Log warning but don't fail user creation
                RAISE WARNING 'Failed to assign donor role to user %: %', NEW.id, SQLERRM;
            END;
        ELSE
            -- Log warning if donor role doesn't exist
            RAISE WARNING 'Donor role not found - cannot assign role to user %', NEW.id;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        -- Final safety net - catch ANY error and log it
        -- But ALWAYS return NEW to allow user creation to succeed
        RAISE WARNING 'Unexpected error in assign_donor_role_to_new_user for user %: %', NEW.id, SQLERRM;
    END;

    -- Always return NEW to allow user creation to succeed
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 2: Ensure the trigger exists and is properly attached
DROP TRIGGER IF EXISTS trigger_assign_donor_role_on_user_create ON auth.users;

CREATE TRIGGER trigger_assign_donor_role_on_user_create
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION assign_donor_role_to_new_user();

-- Step 3: Verify the trigger was created
DO $$
DECLARE
    trigger_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'trigger_assign_donor_role_on_user_create'
        AND tgrelid = 'auth.users'::regclass
    ) INTO trigger_exists;
    
    IF trigger_exists THEN
        RAISE NOTICE '✅ Trigger successfully created: trigger_assign_donor_role_on_user_create';
    ELSE
        RAISE WARNING '❌ Trigger creation failed - please check manually';
    END IF;
END $$;

-- Step 4: Verify the function exists
DO $$
DECLARE
    func_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM pg_proc
        WHERE proname = 'assign_donor_role_to_new_user'
    ) INTO func_exists;
    
    IF func_exists THEN
        RAISE NOTICE '✅ Function successfully created: assign_donor_role_to_new_user';
    ELSE
        RAISE WARNING '❌ Function creation failed - please check manually';
    END IF;
END $$;

