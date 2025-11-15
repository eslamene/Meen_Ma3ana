-- =====================================================
-- Add Beneficiaries menu item to navigation
-- =====================================================

-- First, ensure beneficiaries:view permission exists in admin_permissions
INSERT INTO admin_permissions (name, display_name, display_name_ar, description, description_ar, resource, action, is_system, is_active)
VALUES (
    'beneficiaries:view',
    'View Beneficiaries',
    'عرض المستفيدين',
    'View beneficiary profiles',
    'عرض ملفات المستفيدين',
    'beneficiaries',
    'view',
    true,
    true
)
ON CONFLICT (name) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    display_name_ar = EXCLUDED.display_name_ar,
    description = EXCLUDED.description,
    description_ar = EXCLUDED.description_ar,
    updated_at = NOW();

DO $$
DECLARE
    menu_permission_id UUID;
BEGIN
    -- Get the beneficiaries:view permission
    SELECT id INTO menu_permission_id 
    FROM admin_permissions 
    WHERE name = 'beneficiaries:view' 
    LIMIT 1;

    -- If still not found, use admin:dashboard as fallback
    IF menu_permission_id IS NULL THEN
        SELECT id INTO menu_permission_id 
        FROM admin_permissions 
        WHERE name = 'admin:dashboard' 
        LIMIT 1;
    END IF;

    -- Add Beneficiaries to main navigation (not admin submenu)
    -- This allows regular users with the right permissions to access it
    INSERT INTO admin_menu_items (
        parent_id, 
        label, 
        label_ar, 
        href, 
        icon, 
        description, 
        sort_order, 
        permission_id
    ) VALUES (
        NULL, -- Main navigation item (not under admin)
        'Beneficiaries',
        'المستفيدون',
        '/beneficiaries',
        'Users',
        'Manage beneficiary profiles',
        8, -- After Profile (7) and before Administration (10)
        menu_permission_id
    )
    ON CONFLICT (href, parent_id) DO UPDATE SET
        label = EXCLUDED.label,
        label_ar = EXCLUDED.label_ar,
        icon = EXCLUDED.icon,
        description = EXCLUDED.description,
        sort_order = EXCLUDED.sort_order,
        permission_id = EXCLUDED.permission_id,
        updated_at = NOW();
END $$;

-- Assign beneficiaries:view permission to appropriate roles
INSERT INTO admin_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM admin_roles r, admin_permissions p
WHERE r.name IN ('super_admin', 'admin', 'moderator')
AND p.name = 'beneficiaries:view'
ON CONFLICT (role_id, permission_id) DO NOTHING;

