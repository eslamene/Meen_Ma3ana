-- Grant sponsorships:read permission to user
-- This migration:
-- 1. Creates the sponsorships:read permission if it doesn't exist
-- 2. Assigns it to the donor role (since sponsorships are typically for donors/sponsors)
-- 3. Ensures the user has the donor role

BEGIN;

-- Step 1: Create sponsorships permissions if they don't exist
INSERT INTO admin_permissions (name, display_name, display_name_ar, description, resource, action, is_system, is_active)
VALUES 
('sponsorships:read', 'Read Sponsorships', 'قراءة الرعايات', 'View and read sponsorship information', 'sponsorships', 'read', true, true),
('sponsorships:create', 'Create Sponsorships', 'إنشاء الرعايات', 'Create new sponsorship requests', 'sponsorships', 'create', true, true)
ON CONFLICT (name) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    display_name_ar = EXCLUDED.display_name_ar,
    description = EXCLUDED.description,
    resource = EXCLUDED.resource,
    action = EXCLUDED.action,
    is_active = true,
    updated_at = NOW();

-- Step 2: Assign sponsorships permissions to donor role
INSERT INTO admin_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM admin_roles r, admin_permissions p
WHERE r.name = 'donor'
AND p.name IN ('sponsorships:read', 'sponsorships:create')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Step 3: Also assign to moderator and admin roles (they should have access too)
INSERT INTO admin_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM admin_roles r, admin_permissions p
WHERE r.name IN ('moderator', 'admin', 'super_admin')
AND p.name IN ('sponsorships:read', 'sponsorships:create')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Step 4: Find user by email and ensure they have donor role
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
    
    RAISE NOTICE 'Successfully granted sponsorships:read permission to user eslam.ene@gmail.com (user_id: %)', target_user_id;
END $$;

-- Verification query: Check if user has the sponsorships permissions
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
AND p.name IN ('sponsorships:read', 'sponsorships:create')
ORDER BY p.name;

COMMIT;

