-- Ensure User Has Role - Simple and Robust
-- This script will definitely assign your user to the admin role

-- 1. Show current users
SELECT 'Current Users' as info, id, email, created_at 
FROM auth.users 
ORDER BY created_at DESC;

-- 2. Show available roles
SELECT 'Available Roles' as info, id, name, display_name 
FROM roles 
ORDER BY name;

-- 3. Show current user roles
SELECT 'Current User Roles' as info, 
       u.email, 
       r.name as role_name, 
       r.display_name,
       ur.assigned_at
FROM user_roles ur
JOIN auth.users u ON ur.user_id = u.id
JOIN roles r ON ur.role_id = r.id
ORDER BY u.email, r.name;

-- 4. Assign admin role to the most recent user (you)
-- This will work regardless of your user ID
INSERT INTO user_roles (user_id, role_id, assigned_by)
SELECT 
    u.id as user_id,
    r.id as role_id,
    u.id as assigned_by
FROM auth.users u
CROSS JOIN roles r
WHERE r.name = 'admin'
AND u.id = (
    SELECT id FROM auth.users 
    ORDER BY created_at DESC 
    LIMIT 1
)
ON CONFLICT (user_id, role_id) DO NOTHING;

-- 5. Verify the assignment
SELECT 'User Role Assignment Complete' as status;
SELECT 'Assigned Roles' as info, 
       u.email, 
       r.name as role_name, 
       r.display_name
FROM user_roles ur
JOIN auth.users u ON ur.user_id = u.id
JOIN roles r ON ur.role_id = r.id
WHERE u.id = (
    SELECT id FROM auth.users 
    ORDER BY created_at DESC 
    LIMIT 1
)
ORDER BY r.name;
