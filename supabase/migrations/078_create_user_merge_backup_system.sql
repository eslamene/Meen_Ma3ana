-- =====================================================
-- User Merge Backup and Rollback System
-- Creates tables and functions for safe user merging
-- =====================================================

-- Create table to store merge backups
CREATE TABLE IF NOT EXISTS user_merge_backups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  merge_id UUID NOT NULL UNIQUE, -- Unique identifier for this merge operation
  from_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  admin_user_id UUID NOT NULL REFERENCES auth.users(id),
  delete_source BOOLEAN NOT NULL DEFAULT false,
  
  -- Backup data stored as JSONB for flexibility
  backup_data JSONB NOT NULL, -- Stores all affected records before merge
  
  -- Metadata
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'completed', 'rolled_back', 'failed'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  rolled_back_at TIMESTAMPTZ,
  
  -- Statistics
  total_records_backed_up INTEGER DEFAULT 0,
  total_records_migrated INTEGER DEFAULT 0,
  
  -- Error tracking
  errors JSONB, -- Array of error messages if any
  
  -- Additional metadata
  ip_address INET,
  user_agent TEXT,
  notes TEXT
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_merge_backups_from_user ON user_merge_backups(from_user_id);
CREATE INDEX IF NOT EXISTS idx_user_merge_backups_to_user ON user_merge_backups(to_user_id);
CREATE INDEX IF NOT EXISTS idx_user_merge_backups_merge_id ON user_merge_backups(merge_id);
CREATE INDEX IF NOT EXISTS idx_user_merge_backups_status ON user_merge_backups(status);
CREATE INDEX IF NOT EXISTS idx_user_merge_backups_created_at ON user_merge_backups(created_at DESC);

-- Add RLS policies
ALTER TABLE user_merge_backups ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Admins can view merge backups" ON user_merge_backups;
DROP POLICY IF EXISTS "System can insert merge backups" ON user_merge_backups;
DROP POLICY IF EXISTS "Admins can update merge backups" ON user_merge_backups;

-- Policy: Admins can view all merge backups
CREATE POLICY "Admins can view merge backups" ON user_merge_backups
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM admin_user_roles aur
      JOIN admin_roles ar ON aur.role_id = ar.id
      WHERE aur.user_id = auth.uid()
      AND ar.name = 'super_admin'
    )
  );

-- Policy: System can insert merge backups (allows service role and authenticated users)
CREATE POLICY "System can insert merge backups" ON user_merge_backups
  FOR INSERT WITH CHECK (true);

-- Policy: Admins can update merge backups (for rollback status)
CREATE POLICY "Admins can update merge backups" ON user_merge_backups
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM admin_user_roles aur
      JOIN admin_roles ar ON aur.role_id = ar.id
      WHERE aur.user_id = auth.uid()
      AND ar.name = 'super_admin'
    )
  );

-- Function to create a backup snapshot before merge
CREATE OR REPLACE FUNCTION create_user_merge_backup(
  p_merge_id UUID,
  p_from_user_id UUID,
  p_to_user_id UUID,
  p_admin_user_id UUID,
  p_delete_source BOOLEAN DEFAULT false,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_backup_id UUID;
  v_backup_data JSONB := '{}'::JSONB;
  v_record_count INTEGER := 0;
  v_table_data JSONB;
  v_error_message TEXT;
BEGIN
  -- Create backup record with initial empty backup_data
  INSERT INTO user_merge_backups (
    merge_id,
    from_user_id,
    to_user_id,
    admin_user_id,
    delete_source,
    ip_address,
    user_agent,
    status,
    backup_data
  ) VALUES (
    p_merge_id,
    p_from_user_id,
    p_to_user_id,
    p_admin_user_id,
    p_delete_source,
    p_ip_address,
    p_user_agent,
    'pending',
    '{}'::JSONB  -- Initialize with empty JSONB to satisfy NOT NULL constraint
  ) RETURNING id INTO v_backup_id;

  -- Backup contributions
  SELECT jsonb_agg(row_to_json(t)) INTO v_table_data
  FROM (
    SELECT * FROM contributions WHERE donor_id = p_from_user_id
  ) t;
  v_backup_data := v_backup_data || jsonb_build_object('contributions', COALESCE(v_table_data, '[]'::jsonb));
  v_record_count := v_record_count + COALESCE(jsonb_array_length(v_table_data), 0);

  -- Backup notifications
  SELECT jsonb_agg(row_to_json(t)) INTO v_table_data
  FROM (
    SELECT * FROM notifications WHERE recipient_id = p_from_user_id
  ) t;
  v_backup_data := v_backup_data || jsonb_build_object('notifications', COALESCE(v_table_data, '[]'::jsonb));
  v_record_count := v_record_count + COALESCE(jsonb_array_length(v_table_data), 0);

  -- Backup recurring contributions
  SELECT jsonb_agg(row_to_json(t)) INTO v_table_data
  FROM (
    SELECT * FROM recurring_contributions WHERE donor_id = p_from_user_id
  ) t;
  v_backup_data := v_backup_data || jsonb_build_object('recurring_contributions', COALESCE(v_table_data, '[]'::jsonb));
  v_record_count := v_record_count + COALESCE(jsonb_array_length(v_table_data), 0);

  -- Backup sponsorships
  SELECT jsonb_agg(row_to_json(t)) INTO v_table_data
  FROM (
    SELECT * FROM sponsorships WHERE sponsor_id = p_from_user_id
  ) t;
  v_backup_data := v_backup_data || jsonb_build_object('sponsorships', COALESCE(v_table_data, '[]'::jsonb));
  v_record_count := v_record_count + COALESCE(jsonb_array_length(v_table_data), 0);

  -- Backup communications
  SELECT jsonb_agg(row_to_json(t)) INTO v_table_data
  FROM (
    SELECT * FROM communications WHERE sender_id = p_from_user_id OR recipient_id = p_from_user_id
  ) t;
  v_backup_data := v_backup_data || jsonb_build_object('communications', COALESCE(v_table_data, '[]'::jsonb));
  v_record_count := v_record_count + COALESCE(jsonb_array_length(v_table_data), 0);

  -- Backup cases (created_by, assigned_to, sponsored_by)
  SELECT jsonb_agg(row_to_json(t)) INTO v_table_data
  FROM (
    SELECT * FROM cases WHERE created_by = p_from_user_id OR assigned_to = p_from_user_id OR sponsored_by = p_from_user_id
  ) t;
  v_backup_data := v_backup_data || jsonb_build_object('cases', COALESCE(v_table_data, '[]'::jsonb));
  v_record_count := v_record_count + COALESCE(jsonb_array_length(v_table_data), 0);

  -- Backup case status history
  SELECT jsonb_agg(row_to_json(t)) INTO v_table_data
  FROM (
    SELECT * FROM case_status_history WHERE changed_by = p_from_user_id
  ) t;
  v_backup_data := v_backup_data || jsonb_build_object('case_status_history', COALESCE(v_table_data, '[]'::jsonb));
  v_record_count := v_record_count + COALESCE(jsonb_array_length(v_table_data), 0);

  -- Backup case updates
  SELECT jsonb_agg(row_to_json(t)) INTO v_table_data
  FROM (
    SELECT * FROM case_updates WHERE created_by = p_from_user_id
  ) t;
  v_backup_data := v_backup_data || jsonb_build_object('case_updates', COALESCE(v_table_data, '[]'::jsonb));
  v_record_count := v_record_count + COALESCE(jsonb_array_length(v_table_data), 0);

  -- Backup projects
  SELECT jsonb_agg(row_to_json(t)) INTO v_table_data
  FROM (
    SELECT * FROM projects WHERE created_by = p_from_user_id OR assigned_to = p_from_user_id
  ) t;
  v_backup_data := v_backup_data || jsonb_build_object('projects', COALESCE(v_table_data, '[]'::jsonb));
  v_record_count := v_record_count + COALESCE(jsonb_array_length(v_table_data), 0);

  -- Backup contribution approval status
  SELECT jsonb_agg(row_to_json(t)) INTO v_table_data
  FROM (
    SELECT * FROM contribution_approval_status WHERE admin_id = p_from_user_id
  ) t;
  v_backup_data := v_backup_data || jsonb_build_object('contribution_approval_status', COALESCE(v_table_data, '[]'::jsonb));
  v_record_count := v_record_count + COALESCE(jsonb_array_length(v_table_data), 0);

  -- Backup category detection rules
  SELECT jsonb_agg(row_to_json(t)) INTO v_table_data
  FROM (
    SELECT * FROM category_detection_rules WHERE created_by = p_from_user_id OR updated_by = p_from_user_id
  ) t;
  v_backup_data := v_backup_data || jsonb_build_object('category_detection_rules', COALESCE(v_table_data, '[]'::jsonb));
  v_record_count := v_record_count + COALESCE(jsonb_array_length(v_table_data), 0);

  -- Backup landing stats
  SELECT jsonb_agg(row_to_json(t)) INTO v_table_data
  FROM (
    SELECT * FROM landing_stats WHERE updated_by = p_from_user_id
  ) t;
  v_backup_data := v_backup_data || jsonb_build_object('landing_stats', COALESCE(v_table_data, '[]'::jsonb));
  v_record_count := v_record_count + COALESCE(jsonb_array_length(v_table_data), 0);

  -- Backup system config
  SELECT jsonb_agg(row_to_json(t)) INTO v_table_data
  FROM (
    SELECT * FROM system_config WHERE updated_by = p_from_user_id
  ) t;
  v_backup_data := v_backup_data || jsonb_build_object('system_config', COALESCE(v_table_data, '[]'::jsonb));
  v_record_count := v_record_count + COALESCE(jsonb_array_length(v_table_data), 0);

  -- Backup system content
  SELECT jsonb_agg(row_to_json(t)) INTO v_table_data
  FROM (
    SELECT * FROM system_content WHERE updated_by = p_from_user_id
  ) t;
  v_backup_data := v_backup_data || jsonb_build_object('system_content', COALESCE(v_table_data, '[]'::jsonb));
  v_record_count := v_record_count + COALESCE(jsonb_array_length(v_table_data), 0);

  -- Backup site activity logs (if table exists)
  BEGIN
    SELECT jsonb_agg(row_to_json(t)) INTO v_table_data
    FROM (
      SELECT * FROM site_activity_log WHERE user_id = p_from_user_id
    ) t;
    v_backup_data := v_backup_data || jsonb_build_object('site_activity_log', COALESCE(v_table_data, '[]'::jsonb));
    v_record_count := v_record_count + COALESCE(jsonb_array_length(v_table_data), 0);
  EXCEPTION WHEN undefined_table THEN
    -- Table doesn't exist, skip
    NULL;
  END;

  -- Backup beneficiaries
  BEGIN
    SELECT jsonb_agg(row_to_json(t)) INTO v_table_data
    FROM (
      SELECT * FROM beneficiaries WHERE created_by = p_from_user_id
    ) t;
    v_backup_data := v_backup_data || jsonb_build_object('beneficiaries', COALESCE(v_table_data, '[]'::jsonb));
    v_record_count := v_record_count + COALESCE(jsonb_array_length(v_table_data), 0);
  EXCEPTION WHEN undefined_table THEN
    -- Table doesn't exist, skip
    NULL;
  END;

  -- Backup beneficiary documents (if table exists)
  BEGIN
    SELECT jsonb_agg(row_to_json(t)) INTO v_table_data
    FROM (
      SELECT * FROM beneficiary_documents WHERE uploaded_by = p_from_user_id
    ) t;
    v_backup_data := v_backup_data || jsonb_build_object('beneficiary_documents', COALESCE(v_table_data, '[]'::jsonb));
    v_record_count := v_record_count + COALESCE(jsonb_array_length(v_table_data), 0);
  EXCEPTION WHEN undefined_table THEN
    -- Table doesn't exist, skip
    NULL;
  END;

  -- Backup source user record (if delete_source is true)
  IF p_delete_source THEN
    SELECT row_to_json(t) INTO v_table_data
    FROM (
      SELECT * FROM users WHERE id = p_from_user_id
    ) t;
    v_backup_data := v_backup_data || jsonb_build_object('source_user', v_table_data);
  END IF;

  -- Update backup record with data
  UPDATE user_merge_backups
  SET 
    backup_data = v_backup_data,
    total_records_backed_up = v_record_count
  WHERE id = v_backup_id;

  RETURN v_backup_id;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error and update backup record with error status
    v_error_message := SQLERRM || ' (SQLSTATE: ' || SQLSTATE || ')';
    
    -- Try to update backup record with error
    BEGIN
      UPDATE user_merge_backups
      SET 
        status = 'failed',
        errors = jsonb_build_array(v_error_message)
      WHERE id = v_backup_id;
    EXCEPTION WHEN OTHERS THEN
      -- If update fails, at least log it
      RAISE NOTICE 'Failed to update backup record with error: %', SQLERRM;
    END;
    
    -- Re-raise the error with context
    RAISE EXCEPTION 'Error creating backup: %', v_error_message;
END;
$$;

-- Grant execute permission (idempotent - will not error if already granted)
DO $$
BEGIN
  GRANT EXECUTE ON FUNCTION create_user_merge_backup(UUID, UUID, UUID, UUID, BOOLEAN, INET, TEXT) TO authenticated;
EXCEPTION WHEN OTHERS THEN
  -- Permission already granted or role doesn't exist, continue
  NULL;
END $$;

DO $$
BEGIN
  GRANT EXECUTE ON FUNCTION create_user_merge_backup(UUID, UUID, UUID, UUID, BOOLEAN, INET, TEXT) TO service_role;
EXCEPTION WHEN OTHERS THEN
  -- Permission already granted or role doesn't exist, continue
  NULL;
END $$;

-- Add comments
COMMENT ON TABLE user_merge_backups IS 'Stores backup snapshots of user data before merging accounts. Used for rollback capability.';
COMMENT ON FUNCTION create_user_merge_backup IS 'Creates a comprehensive backup of all user-related data before merge operation';

