-- Step 3: Fix Donor Permissions (Security)
-- This script removes excessive permissions from donor role

-- ============================================
-- REMOVE EXCESSIVE PERMISSIONS FROM DONOR
-- ============================================

-- Remove case management permissions from donor
DELETE FROM rbac_role_permissions 
WHERE role_id = (SELECT id FROM rbac_roles WHERE name = 'donor')
AND permission_id IN (
    SELECT id FROM rbac_permissions 
    WHERE name IN (
        'create:cases', 'update:cases', 'delete:cases',
        'update:own_cases', 'delete:own_cases'
    )
);

-- Remove beneficiary management permissions from donor
DELETE FROM rbac_role_permissions 
WHERE role_id = (SELECT id FROM rbac_roles WHERE name = 'donor')
AND permission_id IN (
    SELECT id FROM rbac_permissions 
    WHERE name IN (
        'create:beneficiaries', 'update:beneficiaries', 'delete:beneficiaries',
        'update:own_beneficiaries', 'delete:own_beneficiaries'
    )
);

-- Remove admin permissions from donor
DELETE FROM rbac_role_permissions 
WHERE role_id = (SELECT id FROM rbac_roles WHERE name = 'donor')
AND permission_id IN (
    SELECT id FROM rbac_permissions 
    WHERE name IN (
        'view:admin_dashboard', 'view:admin_cases', 'view:admin_contributions',
        'manage:users', 'manage:rbac'
    )
);

-- ============================================
-- ENSURE DONOR HAS ONLY APPROPRIATE PERMISSIONS
-- ============================================

-- Ensure donor has basic permissions
INSERT INTO rbac_role_permissions (role_id, permission_id)
SELECT 
    (SELECT id FROM rbac_roles WHERE name = 'donor'),
    id
FROM rbac_permissions 
WHERE name IN (
    'view:dashboard',
    'view:cases', -- Can view cases but not create/update/delete
    'view:own_contributions',
    'create:contributions',
    'view:notifications'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ============================================
-- VERIFY DONOR PERMISSIONS
-- ============================================

SELECT 'Donor Permissions After Fix' as status;

SELECT 
    p.name as permission_name,
    p.display_name,
    p.resource,
    p.action,
    p.category
FROM rbac_user_roles ur
JOIN rbac_role_permissions rp ON ur.role_id = rp.role_id
JOIN rbac_permissions p ON rp.permission_id = p.id
JOIN rbac_roles r ON ur.role_id = r.id
WHERE r.name = 'donor'
AND ur.is_active = true
AND rp.is_active = true
AND p.is_active = true
ORDER BY p.name;

-- Check for any remaining admin permissions (should be empty)
SELECT 
    'SECURITY CHECK - Donor should NOT have these permissions' as warning,
    p.name as permission_name
FROM rbac_user_roles ur
JOIN rbac_role_permissions rp ON ur.role_id = rp.role_id
JOIN rbac_permissions p ON rp.permission_id = p.id
JOIN rbac_roles r ON ur.role_id = r.id
WHERE r.name = 'donor'
AND p.name LIKE '%admin%'
AND ur.is_active = true
AND rp.is_active = true
AND p.is_active = true;
