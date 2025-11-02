-- Enhanced RBAC Audit Logging System
-- This migration enhances the audit logging capabilities for RBAC changes

-- ============================================
-- STEP 1: ENHANCE AUDIT LOG TABLE
-- ============================================

-- Add additional columns to rbac_audit_log for better tracking
ALTER TABLE rbac_audit_log 
ADD COLUMN IF NOT EXISTS session_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS request_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS severity VARCHAR(20) DEFAULT 'info',
ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'rbac',
ADD COLUMN IF NOT EXISTS details JSONB,
ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_rbac_audit_log_session_id ON rbac_audit_log(session_id);
CREATE INDEX IF NOT EXISTS idx_rbac_audit_log_severity ON rbac_audit_log(severity);
CREATE INDEX IF NOT EXISTS idx_rbac_audit_log_category ON rbac_audit_log(category);
CREATE INDEX IF NOT EXISTS idx_rbac_audit_log_created_at_desc ON rbac_audit_log(created_at DESC);

-- ============================================
-- STEP 2: CREATE AUDIT LOGGING FUNCTIONS
-- ============================================

-- Function to log RBAC changes
CREATE OR REPLACE FUNCTION rbac_log_change(
    p_user_id UUID,
    p_action VARCHAR(50),
    p_table_name VARCHAR(50),
    p_record_id UUID DEFAULT NULL,
    p_old_values JSONB DEFAULT NULL,
    p_new_values JSONB DEFAULT NULL,
    p_session_id VARCHAR(255) DEFAULT NULL,
    p_request_id VARCHAR(255) DEFAULT NULL,
    p_severity VARCHAR(20) DEFAULT 'info',
    p_category VARCHAR(50) DEFAULT 'rbac',
    p_details JSONB DEFAULT NULL,
    p_metadata JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    log_id UUID;
BEGIN
    INSERT INTO rbac_audit_log (
        user_id,
        action,
        table_name,
        record_id,
        old_values,
        new_values,
        session_id,
        request_id,
        severity,
        category,
        details,
        metadata,
        ip_address,
        user_agent,
        created_at
    ) VALUES (
        p_user_id,
        p_action,
        p_table_name,
        p_record_id,
        p_old_values,
        p_new_values,
        p_session_id,
        p_request_id,
        p_severity,
        p_category,
        p_details,
        p_metadata,
        inet_client_addr(),
        current_setting('request.headers', true)::json->>'user-agent',
        NOW()
    ) RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log role assignments
CREATE OR REPLACE FUNCTION rbac_log_role_assignment(
    p_user_id UUID,
    p_target_user_id UUID,
    p_role_name VARCHAR(50),
    p_action VARCHAR(50), -- 'assign' or 'revoke'
    p_session_id VARCHAR(255) DEFAULT NULL,
    p_request_id VARCHAR(255) DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    log_id UUID;
    role_id UUID;
BEGIN
    -- Get role ID
    SELECT id INTO role_id FROM rbac_roles WHERE name = p_role_name;
    
    -- Log the change
    SELECT rbac_log_change(
        p_user_id,
        p_action,
        'rbac_user_roles',
        role_id,
        NULL,
        jsonb_build_object(
            'target_user_id', p_target_user_id,
            'role_name', p_role_name,
            'action', p_action
        ),
        p_session_id,
        p_request_id,
        CASE WHEN p_action = 'assign' THEN 'info' ELSE 'warning' END,
        'role_assignment',
        jsonb_build_object(
            'target_user_id', p_target_user_id,
            'role_name', p_role_name
        )
    ) INTO log_id;
    
    RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log permission changes
CREATE OR REPLACE FUNCTION rbac_log_permission_change(
    p_user_id UUID,
    p_role_name VARCHAR(50),
    p_permission_name VARCHAR(100),
    p_action VARCHAR(50), -- 'grant' or 'revoke'
    p_session_id VARCHAR(255) DEFAULT NULL,
    p_request_id VARCHAR(255) DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    log_id UUID;
    role_id UUID;
    permission_id UUID;
BEGIN
    -- Get role and permission IDs
    SELECT id INTO role_id FROM rbac_roles WHERE name = p_role_name;
    SELECT id INTO permission_id FROM rbac_permissions WHERE name = p_permission_name;
    
    -- Log the change
    SELECT rbac_log_change(
        p_user_id,
        p_action,
        'rbac_role_permissions',
        role_id,
        NULL,
        jsonb_build_object(
            'role_name', p_role_name,
            'permission_name', p_permission_name,
            'action', p_action
        ),
        p_session_id,
        p_request_id,
        CASE WHEN p_action = 'grant' THEN 'info' ELSE 'warning' END,
        'permission_change',
        jsonb_build_object(
            'role_name', p_role_name,
            'permission_name', p_permission_name
        )
    ) INTO log_id;
    
    RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STEP 3: CREATE TRIGGERS FOR AUTOMATIC LOGGING
-- ============================================

-- Trigger function for rbac_user_roles changes
CREATE OR REPLACE FUNCTION rbac_audit_user_roles_trigger()
RETURNS TRIGGER AS $$
DECLARE
    role_name VARCHAR(50);
    action_type VARCHAR(50);
BEGIN
    -- Get role name
    SELECT name INTO role_name FROM rbac_roles WHERE id = COALESCE(NEW.role_id, OLD.role_id);
    
    -- Determine action type
    IF TG_OP = 'INSERT' THEN
        action_type := 'assign';
    ELSIF TG_OP = 'UPDATE' THEN
        action_type := 'update';
    ELSIF TG_OP = 'DELETE' THEN
        action_type := 'revoke';
    END IF;
    
    -- Log the change
    PERFORM rbac_log_change(
        COALESCE(NEW.assigned_by, OLD.assigned_by),
        action_type,
        'rbac_user_roles',
        COALESCE(NEW.id, OLD.id),
        CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END,
        CASE WHEN TG_OP != 'DELETE' THEN to_jsonb(NEW) ELSE NULL END,
        NULL,
        NULL,
        CASE WHEN action_type = 'revoke' THEN 'warning' ELSE 'info' END,
        'role_assignment',
        jsonb_build_object(
            'target_user_id', COALESCE(NEW.user_id, OLD.user_id),
            'role_name', role_name
        )
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger for rbac_user_roles
DROP TRIGGER IF EXISTS rbac_audit_user_roles_trigger ON rbac_user_roles;
CREATE TRIGGER rbac_audit_user_roles_trigger
    AFTER INSERT OR UPDATE OR DELETE ON rbac_user_roles
    FOR EACH ROW EXECUTE FUNCTION rbac_audit_user_roles_trigger();

-- Trigger function for rbac_role_permissions changes
CREATE OR REPLACE FUNCTION rbac_audit_role_permissions_trigger()
RETURNS TRIGGER AS $$
DECLARE
    role_name VARCHAR(50);
    permission_name VARCHAR(100);
    action_type VARCHAR(50);
BEGIN
    -- Get role and permission names
    SELECT name INTO role_name FROM rbac_roles WHERE id = COALESCE(NEW.role_id, OLD.role_id);
    SELECT name INTO permission_name FROM rbac_permissions WHERE id = COALESCE(NEW.permission_id, OLD.permission_id);
    
    -- Determine action type
    IF TG_OP = 'INSERT' THEN
        action_type := 'grant';
    ELSIF TG_OP = 'UPDATE' THEN
        action_type := 'update';
    ELSIF TG_OP = 'DELETE' THEN
        action_type := 'revoke';
    END IF;
    
    -- Log the change
    PERFORM rbac_log_change(
        COALESCE(NEW.granted_by, OLD.granted_by),
        action_type,
        'rbac_role_permissions',
        COALESCE(NEW.id, OLD.id),
        CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END,
        CASE WHEN TG_OP != 'DELETE' THEN to_jsonb(NEW) ELSE NULL END,
        NULL,
        NULL,
        CASE WHEN action_type = 'revoke' THEN 'warning' ELSE 'info' END,
        'permission_change',
        jsonb_build_object(
            'role_name', role_name,
            'permission_name', permission_name
        )
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger for rbac_role_permissions
DROP TRIGGER IF EXISTS rbac_audit_role_permissions_trigger ON rbac_role_permissions;
CREATE TRIGGER rbac_audit_role_permissions_trigger
    AFTER INSERT OR UPDATE OR DELETE ON rbac_role_permissions
    FOR EACH ROW EXECUTE FUNCTION rbac_audit_role_permissions_trigger();

-- ============================================
-- STEP 4: CREATE AUDIT LOG VIEWS
-- ============================================

-- View for role assignment audit logs
CREATE OR REPLACE VIEW rbac_role_assignment_audit AS
SELECT 
    al.id,
    al.created_at,
    al.user_id as performed_by,
    al.details->>'target_user_id' as target_user_id,
    al.details->>'role_name' as role_name,
    al.action,
    al.severity,
    al.session_id,
    al.request_id,
    al.ip_address,
    al.user_agent
FROM rbac_audit_log al
WHERE al.category = 'role_assignment'
ORDER BY al.created_at DESC;

-- View for permission change audit logs
CREATE OR REPLACE VIEW rbac_permission_change_audit AS
SELECT 
    al.id,
    al.created_at,
    al.user_id as performed_by,
    al.details->>'role_name' as role_name,
    al.details->>'permission_name' as permission_name,
    al.action,
    al.severity,
    al.session_id,
    al.request_id,
    al.ip_address,
    al.user_agent
FROM rbac_audit_log al
WHERE al.category = 'permission_change'
ORDER BY al.created_at DESC;

-- View for all RBAC audit logs
CREATE OR REPLACE VIEW rbac_audit_summary AS
SELECT 
    al.id,
    al.created_at,
    al.user_id as performed_by,
    al.action,
    al.table_name,
    al.record_id,
    al.severity,
    al.category,
    al.details,
    al.session_id,
    al.request_id,
    al.ip_address
FROM rbac_audit_log al
WHERE al.category IN ('rbac', 'role_assignment', 'permission_change')
ORDER BY al.created_at DESC;

-- ============================================
-- STEP 5: CREATE AUDIT LOG CLEANUP FUNCTION
-- ============================================

-- Function to clean up old audit logs
CREATE OR REPLACE FUNCTION rbac_cleanup_audit_logs(
    p_retention_days INTEGER DEFAULT 90
)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM rbac_audit_log 
    WHERE created_at < NOW() - INTERVAL '1 day' * p_retention_days;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Log the cleanup
    PERFORM rbac_log_change(
        NULL,
        'cleanup',
        'rbac_audit_log',
        NULL,
        NULL,
        jsonb_build_object('retention_days', p_retention_days, 'deleted_count', deleted_count),
        NULL,
        NULL,
        'info',
        'maintenance',
        jsonb_build_object('retention_days', p_retention_days)
    );
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- COMPLETION STATUS
-- ============================================

SELECT 'Enhanced RBAC Audit Logging System Created' as status;
SELECT 'Audit logging functions created' as message;
SELECT 'Automatic triggers enabled' as message;
SELECT 'Audit log views created' as message;
SELECT 'Cleanup function available' as message;
