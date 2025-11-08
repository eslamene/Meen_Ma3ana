-- Ensure user has contributions:read permission
-- This migration verifies and grants contributions:read permission to the user

BEGIN;

-- Step 1: Ensure contributions:read permission exists (from migration 003)
INSERT INTO admin_permissions (name, display_name, display_name_ar, description, resource, action, is_system, is_active)
VALUES ('contributions:read', 'Read Contributions', 'قراءة المساهمات', 'Read/view own contributions', 'contributions', 'read', true, true)
ON CONFLICT (name) DO UPDATE SET
    is_active = true,
    updated_at = NOW();

-- Step 2: Ensure contributions:read is assigned to donor role
INSERT INTO admin_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM admin_roles r, admin_permissions p
WHERE r.name = 'donor' AND p.name = 'contributions:read'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Step 3: Ensure user has donor role (if not already assigned)
DO $$
DECLARE
    target_user_id UUID;
    donor_role_id UUID;
BEGIN
    -- Find user by email
    SELECT id INTO target_user_id
    FROM auth.users
    WHERE email = 'eslam.ene@gmail.com';
    
    IF target_user_id IS NULL THEN
        RAISE EXCEPTION 'User with email eslam.ene@gmail.com not found';
    END IF;
    
    -- Get donor role ID
    SELECT id INTO donor_role_id
    FROM admin_roles
    WHERE name = 'donor';
    
    IF donor_role_id IS NULL THEN
        RAISE EXCEPTION 'Donor role not found';
    END IF;
    
    -- Assign donor role to user if not already assigned
    INSERT INTO admin_user_roles (user_id, role_id, is_active)
    VALUES (target_user_id, donor_role_id, true)
    ON CONFLICT (user_id, role_id) DO UPDATE SET
        is_active = true;
    
    RAISE NOTICE 'Successfully ensured contributions:read permission for user eslam.ene@gmail.com (user_id: %)', target_user_id;
END $$;

-- Verification query: Check if user has the contributions:read permission
SELECT 
    u.email,
    r.name as role_name,
    p.name as permission_name,
    p.display_name as permission_display_name
FROM auth.users u
JOIN admin_user_roles ur ON u.id = ur.user_id AND ur.is_active = true
JOIN admin_roles r ON ur.role_id = r.id
JOIN admin_role_permissions rp ON r.id = rp.role_id
JOIN admin_permissions p ON rp.permission_id = p.id AND p.is_active = true
WHERE u.email = 'eslam.ene@gmail.com'
AND p.name = 'contributions:read'
ORDER BY r.name;

COMMIT;

