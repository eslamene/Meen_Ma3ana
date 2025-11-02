-- Step 4: Add Indexes and RLS Policies
-- This script adds performance indexes and security policies

-- ============================================
-- CREATE PERFORMANCE INDEXES
-- ============================================

-- User role lookups
CREATE INDEX IF NOT EXISTS idx_rbac_user_roles_user_id ON rbac_user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_rbac_user_roles_role_id ON rbac_user_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_rbac_user_roles_active ON rbac_user_roles(user_id, is_active) WHERE is_active = true;

-- Role permission lookups
CREATE INDEX IF NOT EXISTS idx_rbac_role_permissions_role_id ON rbac_role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_rbac_role_permissions_permission_id ON rbac_role_permissions(permission_id);
CREATE INDEX IF NOT EXISTS idx_rbac_role_permissions_active ON rbac_role_permissions(role_id, is_active) WHERE is_active = true;

-- Permission lookups
CREATE INDEX IF NOT EXISTS idx_rbac_permissions_resource_action ON rbac_permissions(resource, action);
CREATE INDEX IF NOT EXISTS idx_rbac_permissions_module_id ON rbac_permissions(module_id);
CREATE INDEX IF NOT EXISTS idx_rbac_permissions_active ON rbac_permissions(is_active) WHERE is_active = true;

-- Audit log lookups
CREATE INDEX IF NOT EXISTS idx_rbac_audit_log_user_id ON rbac_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_rbac_audit_log_created_at ON rbac_audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_rbac_audit_log_table_record ON rbac_audit_log(table_name, record_id);

-- ============================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================

-- Enable RLS on all rbac tables
ALTER TABLE rbac_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE rbac_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rbac_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE rbac_user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE rbac_role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rbac_audit_log ENABLE ROW LEVEL SECURITY;

-- ============================================
-- CREATE RLS POLICIES
-- ============================================

-- RLS Policies for rbac_roles
CREATE POLICY "Anyone can view active roles" ON rbac_roles
    FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage roles" ON rbac_roles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM rbac_user_roles ur
            JOIN rbac_roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() 
            AND r.name IN ('admin', 'super_admin')
            AND ur.is_active = true
        )
    );

-- RLS Policies for rbac_permissions
CREATE POLICY "Anyone can view active permissions" ON rbac_permissions
    FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage permissions" ON rbac_permissions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM rbac_user_roles ur
            JOIN rbac_roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() 
            AND r.name IN ('admin', 'super_admin')
            AND ur.is_active = true
        )
    );

-- RLS Policies for rbac_user_roles
CREATE POLICY "Users can view own roles" ON rbac_user_roles
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can manage user roles" ON rbac_user_roles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM rbac_user_roles ur
            JOIN rbac_roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() 
            AND r.name IN ('admin', 'super_admin')
            AND ur.is_active = true
        )
    );

-- RLS Policies for rbac_audit_log
CREATE POLICY "Admins can view audit logs" ON rbac_audit_log
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM rbac_user_roles ur
            JOIN rbac_roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() 
            AND r.name IN ('admin', 'super_admin')
            AND ur.is_active = true
        )
    );

-- ============================================
-- CREATE HELPER FUNCTIONS
-- ============================================

-- Function to check if user has permission
CREATE OR REPLACE FUNCTION rbac_has_permission(user_id UUID, permission_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM rbac_user_roles ur
        JOIN rbac_role_permissions rp ON ur.role_id = rp.role_id
        JOIN rbac_permissions p ON rp.permission_id = p.id
        WHERE ur.user_id = rbac_has_permission.user_id
        AND p.name = permission_name
        AND ur.is_active = true
        AND rp.is_active = true
        AND p.is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user permissions
CREATE OR REPLACE FUNCTION rbac_get_user_permissions(user_id UUID)
RETURNS TABLE(permission_name TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT p.name
    FROM rbac_user_roles ur
    JOIN rbac_role_permissions rp ON ur.role_id = rp.role_id
    JOIN rbac_permissions p ON rp.permission_id = p.id
    WHERE ur.user_id = rbac_get_user_permissions.user_id
    AND ur.is_active = true
    AND rp.is_active = true
    AND p.is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user roles
CREATE OR REPLACE FUNCTION rbac_get_user_roles(user_id UUID)
RETURNS TABLE(role_name TEXT, role_level INTEGER) AS $$
BEGIN
    RETURN QUERY
    SELECT r.name, r.level
    FROM rbac_user_roles ur
    JOIN rbac_roles r ON ur.role_id = r.id
    WHERE ur.user_id = rbac_get_user_roles.user_id
    AND ur.is_active = true
    AND r.is_active = true
    ORDER BY r.level DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- VERIFY SETUP
-- ============================================

SELECT 'Indexes and RLS Setup Complete' as status;

-- Check indexes were created
SELECT 
    indexname,
    tablename
FROM pg_indexes 
WHERE tablename LIKE 'rbac_%'
ORDER BY tablename, indexname;

-- Check RLS is enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename LIKE 'rbac_%'
ORDER BY tablename;
