-- Complete Removal of Old RBAC Tables
-- This script PERMANENTLY DELETES all old RBAC tables and data

-- ============================================
-- STEP 1: FIX RLS POLICIES FIRST
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
-- STEP 2: DROP FOREIGN KEY CONSTRAINTS
-- ============================================

-- Drop all foreign key constraints that reference old tables
ALTER TABLE role_permissions DROP CONSTRAINT IF EXISTS role_permissions_role_id_fkey;
ALTER TABLE role_permissions DROP CONSTRAINT IF EXISTS role_permissions_permission_id_fkey;
ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS user_roles_role_id_fkey;
ALTER TABLE permissions DROP CONSTRAINT IF EXISTS permissions_module_id_fkey;

-- Drop navigation_items table and its constraints
DROP TABLE IF EXISTS navigation_items CASCADE;

-- ============================================
-- STEP 3: PERMANENTLY DELETE OLD RBAC TABLES
-- ============================================

-- Delete all data from old tables first
DELETE FROM role_permissions;
DELETE FROM user_roles;
DELETE FROM permissions;
DELETE FROM roles;
DELETE FROM permission_modules;

-- Drop the old RBAC tables completely
DROP TABLE IF EXISTS role_permissions CASCADE;
DROP TABLE IF EXISTS user_roles CASCADE;
DROP TABLE IF EXISTS permissions CASCADE;
DROP TABLE IF EXISTS roles CASCADE;
DROP TABLE IF EXISTS permission_modules CASCADE;

-- ============================================
-- STEP 4: CLEAN UP ANY REMAINING REFERENCES
-- ============================================

-- Drop any remaining backup tables if they exist
DROP TABLE IF EXISTS old_permission_modules_backup CASCADE;
DROP TABLE IF EXISTS old_roles_backup CASCADE;
DROP TABLE IF EXISTS old_permissions_backup CASCADE;
DROP TABLE IF EXISTS old_user_roles_backup CASCADE;
DROP TABLE IF EXISTS old_role_permissions_backup CASCADE;
DROP TABLE IF EXISTS navigation_items_backup CASCADE;

-- ============================================
-- STEP 5: VERIFY COMPLETE REMOVAL
-- ============================================

-- Check that ALL old tables are completely gone
SELECT 
    'Old RBAC Tables Status' as check_type,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ ALL OLD TABLES COMPLETELY REMOVED'
        ELSE '❌ ' || COUNT(*) || ' old tables still exist'
    END as status
FROM information_schema.tables 
WHERE table_name IN (
    'permission_modules', 
    'roles', 
    'permissions', 
    'user_roles', 
    'role_permissions',
    'navigation_items'
);

-- List any remaining old tables (should be empty)
SELECT 
    'Remaining old tables' as check_type,
    table_name
FROM information_schema.tables 
WHERE table_name IN (
    'permission_modules', 
    'roles', 
    'permissions', 
    'user_roles', 
    'role_permissions',
    'navigation_items'
);

-- ============================================
-- STEP 6: VERIFY NEW SYSTEM IS INTACT
-- ============================================

-- Check that new rbac_ tables exist and are working
SELECT 
    'New RBAC System Status' as check_type,
    CASE 
        WHEN COUNT(*) = 5 THEN '✅ ALL NEW RBAC TABLES EXIST'
        ELSE '❌ ' || (5 - COUNT(*)) || ' new tables missing'
    END as status
FROM information_schema.tables 
WHERE table_name IN (
    'rbac_modules', 
    'rbac_roles', 
    'rbac_permissions', 
    'rbac_user_roles', 
    'rbac_role_permissions'
);

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

-- ============================================
-- COMPLETION STATUS
-- ============================================

SELECT 'OLD RBAC SYSTEM COMPLETELY REMOVED' as status;
SELECT 'All old tables permanently deleted' as message;
SELECT 'All old data permanently deleted' as message;
SELECT 'New rbac_ system is the only RBAC system' as message;
SELECT 'No backup tables created - complete removal' as message;
