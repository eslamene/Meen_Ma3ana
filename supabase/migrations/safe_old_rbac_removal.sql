-- Safe Removal of Old RBAC Tables
-- This script checks for table existence before attempting to drop them

-- ============================================
-- STEP 1: FIX RLS POLICIES FIRST
-- ============================================

SELECT 'Step 1: Fixing RLS policies' as status;

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
-- STEP 2: CHECK WHICH OLD TABLES EXIST
-- ============================================

SELECT 'Step 2: Checking which old tables exist' as status;

-- Check which old RBAC tables still exist
SELECT 
    'Existing old tables' as check_type,
    table_name,
    'EXISTS' as status
FROM information_schema.tables 
WHERE table_name IN (
    'permission_modules', 
    'roles', 
    'permissions', 
    'user_roles', 
    'role_permissions',
    'navigation_items'
)
ORDER BY table_name;

-- ============================================
-- STEP 3: DROP FOREIGN KEY CONSTRAINTS (IF TABLES EXIST)
-- ============================================

SELECT 'Step 3: Dropping foreign key constraints' as status;

-- Only drop constraints if the tables exist
DO $$
BEGIN
    -- Drop role_permissions constraints if table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'role_permissions') THEN
        ALTER TABLE role_permissions DROP CONSTRAINT IF EXISTS role_permissions_role_id_fkey;
        ALTER TABLE role_permissions DROP CONSTRAINT IF EXISTS role_permissions_permission_id_fkey;
        RAISE NOTICE 'Dropped role_permissions constraints';
    END IF;
    
    -- Drop user_roles constraints if table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_roles') THEN
        ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS user_roles_role_id_fkey;
        RAISE NOTICE 'Dropped user_roles constraints';
    END IF;
    
    -- Drop permissions constraints if table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'permissions') THEN
        ALTER TABLE permissions DROP CONSTRAINT IF EXISTS permissions_module_id_fkey;
        RAISE NOTICE 'Dropped permissions constraints';
    END IF;
END $$;

-- Drop navigation_items table if it exists
DROP TABLE IF EXISTS navigation_items CASCADE;

-- ============================================
-- STEP 4: DELETE DATA AND DROP TABLES (IF THEY EXIST)
-- ============================================

SELECT 'Step 4: Deleting data and dropping tables' as status;

-- Delete data and drop tables only if they exist
DO $$
BEGIN
    -- Handle role_permissions
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'role_permissions') THEN
        DELETE FROM role_permissions;
        DROP TABLE role_permissions CASCADE;
        RAISE NOTICE 'Deleted and dropped role_permissions table';
    END IF;
    
    -- Handle user_roles
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_roles') THEN
        DELETE FROM user_roles;
        DROP TABLE user_roles CASCADE;
        RAISE NOTICE 'Deleted and dropped user_roles table';
    END IF;
    
    -- Handle permissions
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'permissions') THEN
        DELETE FROM permissions;
        DROP TABLE permissions CASCADE;
        RAISE NOTICE 'Deleted and dropped permissions table';
    END IF;
    
    -- Handle roles
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'roles') THEN
        DELETE FROM roles;
        DROP TABLE roles CASCADE;
        RAISE NOTICE 'Deleted and dropped roles table';
    END IF;
    
    -- Handle permission_modules
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'permission_modules') THEN
        DELETE FROM permission_modules;
        DROP TABLE permission_modules CASCADE;
        RAISE NOTICE 'Deleted and dropped permission_modules table';
    END IF;
END $$;

-- ============================================
-- STEP 5: CLEAN UP ANY BACKUP TABLES
-- ============================================

SELECT 'Step 5: Cleaning up backup tables' as status;

-- Drop any backup tables if they exist
DROP TABLE IF EXISTS old_permission_modules_backup CASCADE;
DROP TABLE IF EXISTS old_roles_backup CASCADE;
DROP TABLE IF EXISTS old_permissions_backup CASCADE;
DROP TABLE IF EXISTS old_user_roles_backup CASCADE;
DROP TABLE IF EXISTS old_role_permissions_backup CASCADE;
DROP TABLE IF EXISTS navigation_items_backup CASCADE;

-- ============================================
-- STEP 6: VERIFY COMPLETE REMOVAL
-- ============================================

SELECT 'Step 6: Verifying complete removal' as status;

-- Check that ALL old tables are completely gone
SELECT 
    'Old RBAC Tables Status' as check_type,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ ALL OLD TABLES COMPLETELY REMOVED'
        ELSE '❌ ' || COUNT(*) || ' old tables still exist: ' || string_agg(table_name, ', ')
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
-- STEP 7: VERIFY NEW SYSTEM IS INTACT
-- ============================================

SELECT 'Step 7: Verifying new system is intact' as status;

-- Check that new rbac_ tables exist and are working
SELECT 
    'New RBAC System Status' as check_type,
    CASE 
        WHEN COUNT(*) = 5 THEN '✅ ALL NEW RBAC TABLES EXIST'
        ELSE '❌ ' || (5 - COUNT(*)) || ' new tables missing: ' || 
             (SELECT string_agg(table_name, ', ') FROM information_schema.tables 
              WHERE table_name IN ('rbac_modules', 'rbac_roles', 'rbac_permissions', 'rbac_user_roles', 'rbac_role_permissions')
              AND table_name NOT IN (SELECT table_name FROM information_schema.tables WHERE table_name LIKE 'rbac_%'))
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
SELECT 'All existing old tables permanently deleted' as message;
SELECT 'All old data permanently deleted' as message;
SELECT 'New rbac_ system is the only RBAC system' as message;
SELECT 'No backup tables created - complete removal' as message;
