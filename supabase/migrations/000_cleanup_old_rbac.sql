-- ============================================
-- CLEANUP OLD RBAC SYSTEM
-- This script removes all old rbac_ tables and related data
-- Run this BEFORE creating the new admin system
-- ============================================

BEGIN;

-- ============================================
-- STEP 1: Drop all views that depend on rbac_ tables
-- ============================================

DROP VIEW IF EXISTS rbac_audit_summary CASCADE;
DROP VIEW IF EXISTS rbac_permission_change_audit CASCADE;
DROP VIEW IF EXISTS rbac_role_assignment_audit CASCADE;

-- ============================================
-- STEP 2: Drop all rbac_ tables in correct order (respecting foreign keys)
-- ============================================

-- Drop junction tables first (they have foreign keys)
DROP TABLE IF EXISTS rbac_permission_group_assignments CASCADE;
DROP TABLE IF EXISTS rbac_role_permissions CASCADE;
DROP TABLE IF EXISTS rbac_user_roles CASCADE;

-- Drop audit tables
DROP TABLE IF EXISTS rbac_audit_log CASCADE;
DROP TABLE IF EXISTS rbac_permission_change_audit CASCADE;
DROP TABLE IF EXISTS rbac_role_assignment_audit CASCADE;

-- Drop main tables
DROP TABLE IF EXISTS rbac_permission_groups CASCADE;
DROP TABLE IF EXISTS rbac_permissions CASCADE;
DROP TABLE IF EXISTS rbac_modules CASCADE;
DROP TABLE IF EXISTS rbac_roles CASCADE;

-- ============================================
-- STEP 3: Drop any functions related to old RBAC system
-- ============================================

DROP FUNCTION IF EXISTS get_user_rbac_permissions(UUID) CASCADE;
DROP FUNCTION IF EXISTS get_user_rbac_roles(UUID) CASCADE;
DROP FUNCTION IF EXISTS check_rbac_permission(UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS check_rbac_role(UUID, TEXT) CASCADE;

-- ============================================
-- STEP 4: Clean up any remaining old RBAC tables (catch-all)
-- ============================================

-- Drop any other tables that might exist with rbac_ prefix
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename LIKE 'rbac_%'
    ) LOOP
        EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
        RAISE NOTICE 'Dropped table: %', r.tablename;
    END LOOP;
END $$;

-- Drop any views that might exist with rbac_ prefix
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT viewname 
        FROM pg_views 
        WHERE schemaname = 'public' 
        AND viewname LIKE 'rbac_%'
    ) LOOP
        EXECUTE 'DROP VIEW IF EXISTS ' || quote_ident(r.viewname) || ' CASCADE';
        RAISE NOTICE 'Dropped view: %', r.viewname;
    END LOOP;
END $$;

COMMIT;

-- ============================================
-- VERIFICATION: Check what rbac_ tables/views remain
-- ============================================

SELECT 
    '🔍 Remaining rbac_ Tables' as check_type,
    tablename as object_name,
    'table' as object_type
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename LIKE 'rbac_%'

UNION ALL

SELECT 
    '🔍 Remaining rbac_ Views' as check_type,
    viewname as object_name,
    'view' as object_type
FROM pg_views 
WHERE schemaname = 'public' 
AND viewname LIKE 'rbac_%'

ORDER BY object_type, object_name;

-- Final verification message
SELECT 
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ All old RBAC tables/views have been removed'
        ELSE '⚠️ Some rbac_ objects still exist: ' || COUNT(*)::TEXT
    END as cleanup_status
FROM (
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE 'rbac_%'
    UNION ALL
    SELECT viewname FROM pg_views WHERE schemaname = 'public' AND viewname LIKE 'rbac_%'
) remaining_objects;

