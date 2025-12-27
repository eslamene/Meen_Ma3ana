-- =====================================================
-- Remove admin:manage permission and menu item
-- The /admin/manage page has been removed and replaced with
-- separate pages under /admin/system-management/*
-- =====================================================

-- Remove menu item for /admin/manage
DELETE FROM admin_menu_items
WHERE href = '/admin/manage';

-- Remove admin:manage permission (if it exists)
-- Note: This permission may not exist if it was never created
DELETE FROM admin_permissions
WHERE name = 'admin:manage';

-- Remove any role-permission associations for admin:manage
DELETE FROM admin_role_permissions
WHERE permission_id IN (
  SELECT id FROM admin_permissions WHERE name = 'admin:manage'
);

-- Note: The admin:manage permission was likely never created as a separate permission
-- The menu item may have used other permissions like admin:dashboard or admin:users
-- This migration is safe to run even if the permission doesn't exist

