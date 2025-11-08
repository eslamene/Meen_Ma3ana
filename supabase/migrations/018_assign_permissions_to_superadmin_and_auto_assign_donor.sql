-- =====================================================
-- Assign all permissions to super_admin role
-- Automatically assign donor role to new users
-- =====================================================

-- Step 1: Assign all active permissions to super_admin role
INSERT INTO admin_role_permissions (role_id, permission_id)
SELECT 
    r.id as role_id,
    p.id as permission_id
FROM admin_roles r
CROSS JOIN admin_permissions p
WHERE r.name = 'super_admin'
AND p.is_active = true
AND NOT EXISTS (
    SELECT 1 FROM admin_role_permissions rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
);

-- Step 1b: Assign basic view permissions to visitor role (for unauthenticated users)
-- Visitor role should have read-only permissions for public content (dashboard only)
-- Cases require authentication, so cases:view is NOT included
INSERT INTO admin_role_permissions (role_id, permission_id)
SELECT 
    r.id as role_id,
    p.id as permission_id
FROM admin_roles r
CROSS JOIN admin_permissions p
WHERE r.name = 'visitor'
AND p.is_active = true
AND p.name IN (
    'dashboard:view'        -- View dashboard (public landing only)
    -- Note: cases:view is NOT included - cases require authentication
)
AND NOT EXISTS (
    SELECT 1 FROM admin_role_permissions rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
);

-- Step 2: Create function to automatically assign donor role to new users
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
        INSERT INTO admin_user_roles (user_id, role_id, is_active, assigned_at)
        VALUES (NEW.id, donor_role_id, true, NOW())
        ON CONFLICT (user_id, role_id) DO NOTHING;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Create trigger to automatically assign donor role when user is created
DROP TRIGGER IF EXISTS trigger_assign_donor_role_on_user_create ON auth.users;
CREATE TRIGGER trigger_assign_donor_role_on_user_create
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION assign_donor_role_to_new_user();

-- Step 4: Assign donor role to any existing users who don't have it
INSERT INTO admin_user_roles (user_id, role_id, is_active, assigned_at)
SELECT 
    u.id as user_id,
    r.id as role_id,
    true as is_active,
    NOW() as assigned_at
FROM auth.users u
CROSS JOIN admin_roles r
WHERE r.name = 'donor'
AND r.is_active = true
AND NOT EXISTS (
    SELECT 1 FROM admin_user_roles ur
    WHERE ur.user_id = u.id AND ur.role_id = r.id
);

-- Step 5: Verify super_admin has all permissions
DO $$
DECLARE
    super_admin_permissions_count INTEGER;
    total_permissions_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO super_admin_permissions_count
    FROM admin_role_permissions rp
    JOIN admin_roles r ON rp.role_id = r.id
    WHERE r.name = 'super_admin';

    SELECT COUNT(*) INTO total_permissions_count
    FROM admin_permissions
    WHERE is_active = true;

    RAISE NOTICE 'Super Admin Permissions: % / %', super_admin_permissions_count, total_permissions_count;
END $$;

