-- =====================================================
-- Add admin:activities permission for activity logs
-- =====================================================

-- Create the admin:activities permission
INSERT INTO admin_permissions (name, display_name, display_name_ar, description, resource, action, is_system, is_active)
VALUES 
  ('admin:activities', 'View Activity Logs', 'عرض سجل الأنشطة', 'View and monitor all site activities and logs', 'admin', 'activities', true, true)
ON CONFLICT (name) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    display_name_ar = EXCLUDED.display_name_ar,
    description = EXCLUDED.description,
    is_active = true,
    updated_at = NOW();

-- Assign admin:activities permission to super_admin role
INSERT INTO admin_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM admin_roles r, admin_permissions p
WHERE r.name = 'super_admin' 
AND p.name = 'admin:activities'
ON CONFLICT DO NOTHING;

-- Update the activities menu item to use the new permission
UPDATE admin_menu_items
SET permission_id = (SELECT id FROM admin_permissions WHERE name = 'admin:activities' LIMIT 1)
WHERE href = '/admin/activities'
AND permission_id = (SELECT id FROM admin_permissions WHERE name = 'admin:dashboard' LIMIT 1);

