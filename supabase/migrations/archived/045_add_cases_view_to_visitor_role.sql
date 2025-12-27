-- =====================================================
-- Add cases:view permission to public role (formerly visitor)
-- This allows unauthenticated users to view cases publicly
-- =====================================================

-- Ensure cases:view permission exists
INSERT INTO admin_permissions (name, display_name, display_name_ar, description, resource, action, is_system, is_active)
VALUES ('cases:view', 'View Cases', 'عرض الحالات', 'View donation cases', 'cases', 'view', true, true)
ON CONFLICT (name) DO UPDATE SET
    is_active = true,
    updated_at = NOW();

-- Add cases:view permission to public role (for unauthenticated users)
-- Note: This works for both 'visitor' (old name) and 'public' (new name) roles
INSERT INTO admin_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM admin_roles r, admin_permissions p
WHERE (r.name = 'public' OR r.name = 'visitor') AND p.name = 'cases:view'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Verify the permission was added
DO $$
DECLARE
    public_cases_view_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO public_cases_view_count
    FROM admin_role_permissions rp
    JOIN admin_roles r ON rp.role_id = r.id
    JOIN admin_permissions p ON rp.permission_id = p.id
    WHERE (r.name = 'public' OR r.name = 'visitor') AND p.name = 'cases:view';

    IF public_cases_view_count = 0 THEN
        RAISE EXCEPTION 'Failed to add cases:view permission to public/visitor role';
    ELSE
        RAISE NOTICE 'Successfully added cases:view permission to public role (count: %)', public_cases_view_count;
    END IF;
END $$;

