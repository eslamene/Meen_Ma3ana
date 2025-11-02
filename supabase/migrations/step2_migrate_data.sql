-- Step 2: Migrate Data to RBAC Tables
-- This script migrates data from old tables to new rbac_ tables

-- ============================================
-- MIGRATE MODULES
-- ============================================

INSERT INTO rbac_modules (name, display_name, description, icon, color, sort_order)
SELECT name, display_name, description, icon, color, sort_order
FROM permission_modules
ON CONFLICT (name) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    description = EXCLUDED.description,
    icon = EXCLUDED.icon,
    color = EXCLUDED.color,
    sort_order = EXCLUDED.sort_order,
    updated_at = NOW();

-- ============================================
-- MIGRATE ROLES
-- ============================================

INSERT INTO rbac_roles (name, display_name, description, is_system, level)
SELECT 
    name, 
    display_name, 
    description, 
    COALESCE(is_system, false),
    CASE 
        WHEN name = 'visitor' THEN 0
        WHEN name = 'donor' THEN 1
        WHEN name = 'moderator' THEN 2
        WHEN name = 'admin' THEN 3
        WHEN name = 'super_admin' THEN 4
        ELSE 0
    END
FROM roles
ON CONFLICT (name) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    description = EXCLUDED.description,
    is_system = EXCLUDED.is_system,
    level = EXCLUDED.level,
    updated_at = NOW();

-- ============================================
-- MIGRATE PERMISSIONS
-- ============================================

INSERT INTO rbac_permissions (name, display_name, description, resource, action, module_id, category)
SELECT 
    p.name,
    p.display_name,
    p.description,
    p.resource,
    p.action,
    rm.id,
    CASE 
        WHEN p.name LIKE 'view:%' THEN 'view'
        WHEN p.name LIKE 'create:%' THEN 'create'
        WHEN p.name LIKE 'update:%' THEN 'update'
        WHEN p.name LIKE 'delete:%' THEN 'delete'
        WHEN p.name LIKE 'manage:%' THEN 'manage'
        WHEN p.name LIKE 'approve:%' THEN 'approve'
        ELSE 'other'
    END
FROM permissions p
JOIN rbac_modules rm ON rm.name = (
    SELECT pm.name FROM permission_modules pm WHERE pm.id = p.module_id
)
ON CONFLICT (name) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    description = EXCLUDED.description,
    resource = EXCLUDED.resource,
    action = EXCLUDED.action,
    module_id = EXCLUDED.module_id,
    category = EXCLUDED.category,
    updated_at = NOW();

-- ============================================
-- MIGRATE USER ROLES
-- ============================================

INSERT INTO rbac_user_roles (user_id, role_id, assigned_by, assigned_at)
SELECT 
    ur.user_id,
    rr.id,
    ur.assigned_by,
    COALESCE(ur.assigned_at, NOW())
FROM user_roles ur
JOIN rbac_roles rr ON rr.name = (
    SELECT r.name FROM roles r WHERE r.id = ur.role_id
)
ON CONFLICT (user_id, role_id) DO NOTHING;

-- ============================================
-- MIGRATE ROLE PERMISSIONS
-- ============================================

INSERT INTO rbac_role_permissions (role_id, permission_id, granted_at)
SELECT 
    rr.id as role_id,
    rp.id as permission_id,
    NOW() as granted_at
FROM role_permissions old_rp
JOIN rbac_roles rr ON rr.name = (
    SELECT r.name FROM roles r WHERE r.id = old_rp.role_id
)
JOIN rbac_permissions rp ON rp.name = (
    SELECT p.name FROM permissions p WHERE p.id = old_rp.permission_id
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ============================================
-- VERIFY MIGRATION
-- ============================================

SELECT 'Data Migration Complete' as status;

SELECT 'rbac_modules' as table_name, count(*) as record_count FROM rbac_modules
UNION ALL
SELECT 'rbac_roles' as table_name, count(*) as record_count FROM rbac_roles
UNION ALL
SELECT 'rbac_permissions' as table_name, count(*) as record_count FROM rbac_permissions
UNION ALL
SELECT 'rbac_user_roles' as table_name, count(*) as record_count FROM rbac_user_roles
UNION ALL
SELECT 'rbac_role_permissions' as table_name, count(*) as record_count FROM rbac_role_permissions;
