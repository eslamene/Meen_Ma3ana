-- Create function for cascaded case deletion
-- This function will delete all data related to a case in the correct order

CREATE OR REPLACE FUNCTION delete_case_cascaded(case_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if case exists
  IF NOT EXISTS (SELECT 1 FROM cases WHERE id = case_id) THEN
    RAISE EXCEPTION 'Case not found';
  END IF;

  -- Check if case has contributions
  IF EXISTS (SELECT 1 FROM contributions WHERE case_id = case_id) THEN
    RAISE EXCEPTION 'Cannot delete case with existing contributions';
  END IF;

  -- Delete in order to respect foreign key constraints
  
  -- 1. Delete case updates (case_updates table)
  DELETE FROM case_updates WHERE case_id = case_id;
  
  -- 2. Delete case files (case_files table)
  DELETE FROM case_files WHERE case_id = case_id;
  
  -- 3. Delete case images (case_images_backup table if exists)
  DELETE FROM case_images_backup WHERE case_id = case_id;
  
  -- 4. Delete case contributions (should be empty due to check above)
  DELETE FROM contributions WHERE case_id = case_id;
  
  -- 5. Delete case notifications (if any)
  DELETE FROM notifications WHERE case_id = case_id;
  
  -- 6. Delete case comments (if any)
  DELETE FROM case_comments WHERE case_id = case_id;
  
  -- 7. Delete case likes/favorites (if any)
  DELETE FROM case_favorites WHERE case_id = case_id;
  
  -- 8. Delete case tags (if any)
  DELETE FROM case_tags WHERE case_id = case_id;
  
  -- 9. Delete case categories (if any)
  DELETE FROM case_categories WHERE case_id = case_id;
  
  -- 10. Finally, delete the case itself
  DELETE FROM cases WHERE id = case_id;
  
  -- Log the deletion
  INSERT INTO audit_logs (action, table_name, record_id, user_id, created_at)
  VALUES ('DELETE', 'cases', case_id, auth.uid(), NOW());
  
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION delete_case_cascaded(UUID) TO authenticated;

-- Create audit_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  action VARCHAR(50) NOT NULL,
  table_name VARCHAR(100) NOT NULL,
  record_id UUID NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON audit_logs(table_name);

-- Add RLS policies for audit_logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own audit logs
CREATE POLICY "Users can view own audit logs" ON audit_logs
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: System can insert audit logs
CREATE POLICY "System can insert audit logs" ON audit_logs
  FOR INSERT WITH CHECK (true);
