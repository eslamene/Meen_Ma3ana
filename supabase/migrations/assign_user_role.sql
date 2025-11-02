-- Assign User Role Script
-- This script helps you assign a role to your user

-- 1. First, let's see all users to find your user ID
SELECT 'Current Users' as info, id, email, created_at 
FROM auth.users 
ORDER BY created_at DESC;

-- 2. Show available roles
SELECT 'Available Roles' as info, id, name, display_name 
FROM roles 
ORDER BY name;

-- 3. Instructions:
-- Replace 'YOUR_USER_ID_HERE' with your actual user ID from step 1
-- Replace 'admin' with the role you want to assign (admin, moderator, donor, etc.)

-- Example commands (uncomment and modify as needed):

-- Assign admin role:
-- INSERT INTO user_roles (user_id, role_id, assigned_by)
-- SELECT 'YOUR_USER_ID_HERE', r.id, 'YOUR_USER_ID_HERE'
-- FROM roles r
-- WHERE r.name = 'admin'
-- ON CONFLICT (user_id, role_id) DO NOTHING;

-- Assign moderator role:
-- INSERT INTO user_roles (user_id, role_id, assigned_by)
-- SELECT 'YOUR_USER_ID_HERE', r.id, 'YOUR_USER_ID_HERE'
-- FROM roles r
-- WHERE r.name = 'moderator'
-- ON CONFLICT (user_id, role_id) DO NOTHING;

-- Assign donor role:
-- INSERT INTO user_roles (user_id, role_id, assigned_by)
-- SELECT 'YOUR_USER_ID_HERE', r.id, 'YOUR_USER_ID_HERE'
-- FROM roles r
-- WHERE r.name = 'donor'
-- ON CONFLICT (user_id, role_id) DO NOTHING;

-- 4. Check current user roles
SELECT 'Current User Roles' as info, 
       u.email, 
       r.name as role_name, 
       r.display_name,
       ur.assigned_at
FROM user_roles ur
JOIN auth.users u ON ur.user_id = u.id
JOIN roles r ON ur.role_id = r.id
ORDER BY u.email, r.name;
