-- Simple Cleanup of Old RBAC Tables
-- Copy and paste this into Supabase SQL Editor

-- ============================================
-- STEP 1: FIX RLS POLICIES
-- ============================================

-- Drop old policies that depend on user_roles
DROP POLICY IF EXISTS "case_images_owner_update" ON storage.objects;
DROP POLICY IF EXISTS "case_images_owner_delete" ON storage.objects;
DROP POLICY IF EXISTS "contributions_admin_access" ON storage.objects;
DROP POLICY IF EXISTS "sponsor_apps_admin_access" ON storage.objects;
DROP POLICY IF EXISTS "recurring_admin_access" ON storage.objects;
DROP POLICY IF EXISTS "case_files_admin_manage" ON storage.objects;
DROP POLICY IF EXISTS "Admins can manage all beneficiaries" ON beneficiaries;

-- Recreate policies using rbac_user_roles
CREATE POLICY "case_images_owner_update" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'case-images' AND
        auth.uid()::text = (storage.foldername(name))[1] AND
        EXISTS (
            SELECT 1 FROM rbac_user_roles ur
            JOIN rbac_roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() 
            AND r.name IN ('admin', 'super_admin')
            AND ur.is_active = true
        )
    );

CREATE POLICY "case_images_owner_delete" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'case-images' AND
        auth.uid()::text = (storage.foldername(name))[1] AND
        EXISTS (
            SELECT 1 FROM rbac_user_roles ur
            JOIN rbac_roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() 
            AND r.name IN ('admin', 'super_admin')
            AND ur.is_active = true
        )
    );

CREATE POLICY "contributions_admin_access" ON storage.objects
    FOR ALL USING (
        bucket_id = 'contributions' AND
        EXISTS (
            SELECT 1 FROM rbac_user_roles ur
            JOIN rbac_roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() 
            AND r.name IN ('admin', 'super_admin')
            AND ur.is_active = true
        )
    );

CREATE POLICY "sponsor_apps_admin_access" ON storage.objects
    FOR ALL USING (
        bucket_id = 'sponsor-apps' AND
        EXISTS (
            SELECT 1 FROM rbac_user_roles ur
            JOIN rbac_roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() 
            AND r.name IN ('admin', 'super_admin')
            AND ur.is_active = true
        )
    );

CREATE POLICY "recurring_admin_access" ON storage.objects
    FOR ALL USING (
        bucket_id = 'recurring' AND
        EXISTS (
            SELECT 1 FROM rbac_user_roles ur
            JOIN rbac_roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() 
            AND r.name IN ('admin', 'super_admin')
            AND ur.is_active = true
        )
    );

CREATE POLICY "case_files_admin_manage" ON storage.objects
    FOR ALL USING (
        bucket_id = 'case-files' AND
        EXISTS (
            SELECT 1 FROM rbac_user_roles ur
            JOIN rbac_roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() 
            AND r.name IN ('admin', 'super_admin')
            AND ur.is_active = true
        )
    );

CREATE POLICY "Admins can manage all beneficiaries" ON beneficiaries
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM rbac_user_roles ur
            JOIN rbac_roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() 
            AND r.name IN ('admin', 'super_admin')
            AND ur.is_active = true
        )
    );

-- ============================================
-- STEP 2: REMOVE NAVIGATION_ITEMS
-- ============================================

-- Create backup and drop navigation_items
CREATE TABLE IF NOT EXISTS navigation_items_backup AS SELECT * FROM navigation_items;
DROP TABLE IF EXISTS navigation_items;

-- ============================================
-- STEP 3: CREATE BACKUPS
-- ============================================

-- Create backups of old tables
CREATE TABLE IF NOT EXISTS old_permission_modules_backup AS SELECT * FROM permission_modules;
CREATE TABLE IF NOT EXISTS old_roles_backup AS SELECT * FROM roles;
CREATE TABLE IF NOT EXISTS old_permissions_backup AS SELECT * FROM permissions;
CREATE TABLE IF NOT EXISTS old_user_roles_backup AS SELECT * FROM user_roles;
CREATE TABLE IF NOT EXISTS old_role_permissions_backup AS SELECT * FROM role_permissions;

-- ============================================
-- STEP 4: DROP OLD RBAC TABLES
-- ============================================

-- Drop foreign key constraints first
ALTER TABLE role_permissions DROP CONSTRAINT IF EXISTS role_permissions_role_id_fkey;
ALTER TABLE role_permissions DROP CONSTRAINT IF EXISTS role_permissions_permission_id_fkey;
ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS user_roles_role_id_fkey;
ALTER TABLE permissions DROP CONSTRAINT IF EXISTS permissions_module_id_fkey;

-- Drop old RBAC tables
DROP TABLE IF EXISTS role_permissions;
DROP TABLE IF EXISTS user_roles;
DROP TABLE IF EXISTS permissions;
DROP TABLE IF EXISTS roles;
DROP TABLE IF EXISTS permission_modules;

-- ============================================
-- STEP 5: VERIFY CLEANUP
-- ============================================

-- Check that old tables are gone
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'permission_modules') 
        THEN '❌ permission_modules still exists'
        ELSE '✅ permission_modules removed'
    END as status
UNION ALL
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'roles') 
        THEN '❌ roles still exists'
        ELSE '✅ roles removed'
    END as status
UNION ALL
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'permissions') 
        THEN '❌ permissions still exists'
        ELSE '✅ permissions removed'
    END as status
UNION ALL
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_roles') 
        THEN '❌ user_roles still exists'
        ELSE '✅ user_roles removed'
    END as status
UNION ALL
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'role_permissions') 
        THEN '❌ role_permissions still exists'
        ELSE '✅ role_permissions removed'
    END as status
UNION ALL
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'navigation_items') 
        THEN '❌ navigation_items still exists'
        ELSE '✅ navigation_items removed'
    END as status;

-- Check that new tables exist
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'rbac_modules') 
        THEN '✅ rbac_modules exists'
        ELSE '❌ rbac_modules missing'
    END as status
UNION ALL
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'rbac_roles') 
        THEN '✅ rbac_roles exists'
        ELSE '❌ rbac_roles missing'
    END as status
UNION ALL
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'rbac_permissions') 
        THEN '✅ rbac_permissions exists'
        ELSE '❌ rbac_permissions missing'
    END as status
UNION ALL
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'rbac_user_roles') 
        THEN '✅ rbac_user_roles exists'
        ELSE '❌ rbac_user_roles missing'
    END as status
UNION ALL
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'rbac_role_permissions') 
        THEN '✅ rbac_role_permissions exists'
        ELSE '❌ rbac_role_permissions missing'
    END as status;

-- Test that the new system works
SELECT 
    'Donor Permissions Count' as check_type,
    COUNT(*) as permission_count
FROM rbac_user_roles ur
JOIN rbac_role_permissions rp ON ur.role_id = rp.role_id
JOIN rbac_permissions p ON rp.permission_id = p.id
JOIN rbac_roles r ON ur.role_id = r.id
WHERE r.name = 'donor'
AND ur.is_active = true
AND rp.is_active = true
AND p.is_active = true;

SELECT 'CLEANUP COMPLETE - Old RBAC system completely removed!' as status;
