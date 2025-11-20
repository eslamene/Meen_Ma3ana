-- =====================================================
-- Create Site Activity Logging System
-- Comprehensive logging for all site activities
-- =====================================================

-- Create site_activity_log table
CREATE TABLE IF NOT EXISTS site_activity_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id VARCHAR(255),
  activity_type VARCHAR(50) NOT NULL, -- 'page_view', 'api_call', 'user_action', 'data_change', 'auth_event', 'system_event', 'error'
  category VARCHAR(50), -- 'navigation', 'authentication', 'data', 'admin', 'system', 'security'
  action VARCHAR(100) NOT NULL, -- 'view_page', 'create_case', 'update_profile', 'login', 'logout', etc.
  resource_type VARCHAR(100), -- 'case', 'user', 'contribution', 'page', 'api'
  resource_id UUID,
  resource_path VARCHAR(500), -- URL path or API endpoint
  method VARCHAR(10), -- HTTP method for API calls
  status_code INTEGER, -- HTTP status code
  ip_address INET,
  user_agent TEXT,
  referer VARCHAR(500),
  details JSONB, -- Additional context data
  metadata JSONB, -- Performance metrics, device info, etc.
  severity VARCHAR(20) DEFAULT 'info', -- 'info', 'warning', 'error', 'critical'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_site_activity_user_id ON site_activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_site_activity_session_id ON site_activity_log(session_id);
CREATE INDEX IF NOT EXISTS idx_site_activity_type ON site_activity_log(activity_type);
CREATE INDEX IF NOT EXISTS idx_site_activity_category ON site_activity_log(category);
CREATE INDEX IF NOT EXISTS idx_site_activity_action ON site_activity_log(action);
CREATE INDEX IF NOT EXISTS idx_site_activity_resource_type ON site_activity_log(resource_type);
CREATE INDEX IF NOT EXISTS idx_site_activity_resource_id ON site_activity_log(resource_id);
CREATE INDEX IF NOT EXISTS idx_site_activity_created_at ON site_activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_site_activity_severity ON site_activity_log(severity);
CREATE INDEX IF NOT EXISTS idx_site_activity_resource_path ON site_activity_log(resource_path);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_site_activity_user_created ON site_activity_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_site_activity_type_created ON site_activity_log(activity_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_site_activity_resource_created ON site_activity_log(resource_type, resource_id, created_at DESC);

-- Enable RLS
ALTER TABLE site_activity_log ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own activity logs, admins can view all
CREATE POLICY "Users can view own activity logs" ON site_activity_log
  FOR SELECT USING (
    auth.uid() = user_id OR
    auth.uid() IN (
      SELECT user_id FROM admin_user_roles 
      WHERE role_id IN (
        SELECT id FROM admin_roles WHERE name IN ('admin', 'super_admin')
      ) AND is_active = true
    )
    -- Allow viewing logs where user_id is NULL (anonymous visitors) for admins
    OR (user_id IS NULL AND auth.uid() IN (
      SELECT user_id FROM admin_user_roles 
      WHERE role_id IN (
        SELECT id FROM admin_roles WHERE name IN ('admin', 'super_admin')
      ) AND is_active = true
    ))
  );

-- Policy: System can insert activity logs
CREATE POLICY "System can insert activity logs" ON site_activity_log
  FOR INSERT WITH CHECK (true);

-- Policy: Only admins can delete old logs (for cleanup)
CREATE POLICY "Admins can delete activity logs" ON site_activity_log
  FOR DELETE USING (
    auth.uid() IN (
      SELECT user_id FROM admin_user_roles 
      WHERE role_id IN (
        SELECT id FROM admin_roles WHERE name IN ('admin', 'super_admin')
      ) AND is_active = true
    )
  );

-- Create function to automatically clean up old logs (optional, can be called manually)
CREATE OR REPLACE FUNCTION cleanup_old_activity_logs(retention_days INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM site_activity_log
  WHERE created_at < NOW() - (retention_days || ' days')::INTERVAL
    AND severity != 'critical'; -- Keep critical logs longer
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create view for activity summary (for analytics)
CREATE OR REPLACE VIEW site_activity_summary AS
SELECT
  DATE_TRUNC('day', created_at) as date,
  activity_type,
  category,
  action,
  COUNT(*) as count,
  COUNT(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL) as unique_users,
  COUNT(DISTINCT session_id) as unique_sessions,
  COUNT(DISTINCT session_id) FILTER (WHERE user_id IS NULL) as unique_visitor_sessions,
  COUNT(*) FILTER (WHERE user_id IS NULL) as visitor_activities,
  COUNT(*) FILTER (WHERE user_id IS NOT NULL) as authenticated_activities
FROM site_activity_log
GROUP BY DATE_TRUNC('day', created_at), activity_type, category, action;

-- Create view for visitor analytics (anonymous users)
CREATE OR REPLACE VIEW visitor_activity_summary AS
SELECT
  DATE_TRUNC('day', created_at) as date,
  activity_type,
  category,
  action,
  COUNT(*) as count,
  COUNT(DISTINCT session_id) as unique_visitor_sessions,
  COUNT(DISTINCT ip_address) as unique_visitor_ips,
  COUNT(DISTINCT resource_path) as unique_pages_viewed
FROM site_activity_log
WHERE user_id IS NULL
GROUP BY DATE_TRUNC('day', created_at), activity_type, category, action;

-- Create view for visitor sessions (track visitor journeys)
CREATE OR REPLACE VIEW visitor_sessions AS
SELECT
  session_id,
  MIN(created_at) as session_start,
  MAX(created_at) as session_end,
  COUNT(*) as page_views,
  COUNT(DISTINCT resource_path) as unique_pages,
  array_agg(DISTINCT resource_path ORDER BY resource_path) as pages_visited,
  MAX(ip_address) as ip_address,
  MAX(user_agent) as user_agent,
  EXTRACT(EPOCH FROM (MAX(created_at) - MIN(created_at))) as session_duration_seconds
FROM site_activity_log
WHERE user_id IS NULL AND activity_type = 'page_view'
GROUP BY session_id;

-- Grant permissions
GRANT SELECT ON site_activity_log TO authenticated;
GRANT SELECT ON site_activity_summary TO authenticated;
GRANT SELECT ON visitor_activity_summary TO authenticated;
GRANT SELECT ON visitor_sessions TO authenticated;

-- Allow anonymous access for inserting logs (visitor tracking)
GRANT INSERT ON site_activity_log TO anon;

-- Add comment
COMMENT ON TABLE site_activity_log IS 'Comprehensive activity logging for all site activities including page views, API calls, user actions, and system events. Supports both authenticated users and anonymous visitors.';
COMMENT ON COLUMN site_activity_log.user_id IS 'User ID for authenticated users, NULL for anonymous visitors';
COMMENT ON COLUMN site_activity_log.session_id IS 'Session identifier for tracking visitor sessions and user sessions';
COMMENT ON COLUMN site_activity_log.activity_type IS 'Type of activity: page_view, api_call, user_action, data_change, auth_event, system_event, error';
COMMENT ON COLUMN site_activity_log.category IS 'Category for grouping: navigation, authentication, data, admin, system, security';
COMMENT ON COLUMN site_activity_log.severity IS 'Severity level: info, warning, error, critical';
COMMENT ON VIEW visitor_activity_summary IS 'Summary of anonymous visitor activities for analytics';
COMMENT ON VIEW visitor_sessions IS 'Visitor session tracking showing page views, duration, and journey';

