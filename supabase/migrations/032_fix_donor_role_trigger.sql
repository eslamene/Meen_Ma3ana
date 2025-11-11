-- Fix trigger to handle errors gracefully
-- This makes the trigger more resilient so it doesn't fail user creation

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

-- The trigger is already created, this just updates the function
-- No need to recreate the trigger

