-- =====================================================
-- Ensure cases:view permission for donor role
-- This migration ensures that the donor role has the cases:view permission
-- and that the user eslam.ene@gmail.com has the donor role
-- =====================================================

-- Ensure cases:view permission exists
INSERT INTO admin_permissions (name, display_name, display_name_ar, description, resource, action, is_system, is_active)
VALUES ('cases:view', 'View Cases', 'عرض الحالات', 'View donation cases', 'cases', 'view', true, true)
ON CONFLICT (name) DO UPDATE SET
    is_active = true,
    updated_at = NOW();

-- Ensure donor role has cases:view permission
INSERT INTO admin_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM admin_roles r, admin_permissions p
WHERE r.name = 'donor' AND p.name = 'cases:view'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Ensure user eslam.ene@gmail.com has donor role
DO $$
DECLARE
    target_user_id UUID;
    donor_role_id UUID;
BEGIN
    -- Get user ID
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

    -- Assign donor role to user
    INSERT INTO admin_user_roles (user_id, role_id, is_active)
    VALUES (target_user_id, donor_role_id, true)
    ON CONFLICT (user_id, role_id) DO UPDATE SET
        is_active = true;

    RAISE NOTICE 'Successfully ensured cases:view permission for user eslam.ene@gmail.com (user_id: %)', target_user_id;
END $$;

