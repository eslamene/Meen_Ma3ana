-- Cleanup Old RBAC Tables
-- This script removes the old RBAC tables after successful migration
-- WARNING: Only run this after verifying the new system works correctly!

-- ============================================
-- BACKUP OLD TABLES (Optional)
-- ============================================

-- Create backup tables with current data
CREATE TABLE IF NOT EXISTS old_permission_modules AS SELECT * FROM permission_modules;
CREATE TABLE IF NOT EXISTS old_roles AS SELECT * FROM roles;
CREATE TABLE IF NOT EXISTS old_permissions AS SELECT * FROM permissions;
CREATE TABLE IF NOT EXISTS old_user_roles AS SELECT * FROM user_roles;
CREATE TABLE IF NOT EXISTS old_role_permissions AS SELECT * FROM role_permissions;

-- ============================================
-- DROP OLD TABLES
-- ============================================

-- Drop foreign key constraints first
ALTER TABLE role_permissions DROP CONSTRAINT IF EXISTS role_permissions_role_id_fkey;
ALTER TABLE role_permissions DROP CONSTRAINT IF EXISTS role_permissions_permission_id_fkey;
ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS user_roles_role_id_fkey;
ALTER TABLE permissions DROP CONSTRAINT IF EXISTS permissions_module_id_fkey;

-- Drop old tables
DROP TABLE IF EXISTS role_permissions;
DROP TABLE IF EXISTS user_roles;
DROP TABLE IF EXISTS permissions;
DROP TABLE IF EXISTS roles;
DROP TABLE IF EXISTS permission_modules;

-- ============================================
-- VERIFICATION
-- ============================================

-- Verify old tables are gone
SELECT 'Old Tables Cleanup' as status;

SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'permission_modules') 
        THEN '❌ permission_modules still exists'
        ELSE '✅ permission_modules removed'
    END as permission_modules_status
UNION ALL
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'roles') 
        THEN '❌ roles still exists'
        ELSE '✅ roles removed'
    END as roles_status
UNION ALL
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'permissions') 
        THEN '❌ permissions still exists'
        ELSE '✅ permissions removed'
    END as permissions_status
UNION ALL
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_roles') 
        THEN '❌ user_roles still exists'
        ELSE '✅ user_roles removed'
    END as user_roles_status
UNION ALL
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'role_permissions') 
        THEN '❌ role_permissions still exists'
        ELSE '✅ role_permissions removed'
    END as role_permissions_status;

-- Verify new tables exist
SELECT 'New Tables Verification' as status;

SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'rbac_modules') 
        THEN '✅ rbac_modules exists'
        ELSE '❌ rbac_modules missing'
    END as rbac_modules_status
UNION ALL
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'rbac_roles') 
        THEN '✅ rbac_roles exists'
        ELSE '❌ rbac_roles missing'
    END as rbac_roles_status
UNION ALL
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'rbac_permissions') 
        THEN '✅ rbac_permissions exists'
        ELSE '❌ rbac_permissions missing'
    END as rbac_permissions_status
UNION ALL
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'rbac_user_roles') 
        THEN '✅ rbac_user_roles exists'
        ELSE '❌ rbac_user_roles missing'
    END as rbac_user_roles_status
UNION ALL
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'rbac_role_permissions') 
        THEN '✅ rbac_role_permissions exists'
        ELSE '❌ rbac_role_permissions missing'
    END as rbac_role_permissions_status;

-- Final summary
SELECT 'Cleanup Complete' as status;
SELECT 'Old RBAC tables have been removed and backed up' as message;
SELECT 'New rbac_ prefixed tables are active' as message;
SELECT 'Please update your application code to use the new table names' as message;
