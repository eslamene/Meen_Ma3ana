-- =====================================================
-- COMPREHENSIVE TRIGGER FIX AND VERIFICATION
-- =====================================================
-- Run this in Supabase Dashboard > SQL Editor
-- This will verify the current state and apply the fix if needed

-- Step 1: Check current function definition
DO $$
DECLARE
    func_body TEXT;
    has_exception BOOLEAN := FALSE;
BEGIN
    SELECT prosrc INTO func_body
    FROM pg_proc
    WHERE proname = 'assign_donor_role_to_new_user'
    LIMIT 1;
    
    IF func_body IS NULL THEN
        RAISE NOTICE '❌ Function not found!';
    ELSE
        -- Check if exception handler exists
        IF func_body LIKE '%EXCEPTION WHEN OTHERS%' THEN
            RAISE NOTICE '✅ Fix is APPLIED - Function contains EXCEPTION handler';
            has_exception := TRUE;
        ELSE
            RAISE NOTICE '❌ Fix is NOT applied - Function missing EXCEPTION handler';
        END IF;
        
        -- Check for RAISE WARNING
        IF func_body LIKE '%RAISE WARNING%' THEN
            RAISE NOTICE '✅ Function contains RAISE WARNING';
        ELSE
            RAISE NOTICE '⚠️  Function missing RAISE WARNING';
        END IF;
    END IF;
END $$;

-- Step 2: Apply the fix (this will update the function)
CREATE OR REPLACE FUNCTION assign_donor_role_to_new_user()
RETURNS TRIGGER AS $$
DECLARE
    donor_role_id UUID;
BEGIN
    -- Get the donor role ID
    SELECT id INTO donor_role_id
    FROM admin_roles
    WHERE name = 'donor'
    AND is_active = true
    LIMIT 1;

    -- If donor role exists, assign it to the new user
    IF donor_role_id IS NOT NULL THEN
        BEGIN
            INSERT INTO admin_user_roles (user_id, role_id, is_active, assigned_at)
            VALUES (NEW.id, donor_role_id, true, NOW())
            ON CONFLICT (user_id, role_id) DO NOTHING;
        EXCEPTION WHEN OTHERS THEN
            -- Log warning but don't fail user creation
            -- The trigger will complete successfully even if role assignment fails
            RAISE WARNING 'Failed to assign donor role to user %: %', NEW.id, SQLERRM;
        END;
    ELSE
        -- Log warning if donor role doesn't exist
        RAISE WARNING 'Donor role not found - cannot assign role to user %', NEW.id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Verify the fix was applied
DO $$
DECLARE
    func_body TEXT;
BEGIN
    SELECT prosrc INTO func_body
    FROM pg_proc
    WHERE proname = 'assign_donor_role_to_new_user'
    LIMIT 1;
    
    IF func_body LIKE '%EXCEPTION WHEN OTHERS%' AND func_body LIKE '%RAISE WARNING%' THEN
        RAISE NOTICE '✅✅✅ TRIGGER FIX SUCCESSFULLY APPLIED! ✅✅✅';
        RAISE NOTICE 'You can now run: node scripts/import-contributions-with-users.js';
    ELSE
        RAISE NOTICE '❌ Fix verification failed - please check the function manually';
    END IF;
END $$;

-- Step 4: Verify trigger exists
SELECT 
    tgname as trigger_name,
    tgrelid::regclass as table_name,
    tgenabled as enabled
FROM pg_trigger
WHERE tgname = 'trigger_assign_donor_role_on_user_create';

-- Expected result: Should show the trigger on auth.users table

