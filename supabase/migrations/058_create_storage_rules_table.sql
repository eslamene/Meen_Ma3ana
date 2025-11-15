-- =====================================================
-- STORAGE RULES TABLE
-- Custom app-managed rules for file upload size and allowed types
-- =====================================================

BEGIN;

-- Create storage_rules table
CREATE TABLE IF NOT EXISTS storage_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_name TEXT NOT NULL UNIQUE,
  max_file_size_mb INTEGER NOT NULL DEFAULT 5,
  allowed_extensions TEXT[] NOT NULL DEFAULT ARRAY['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf', 'doc', 'docx', 'txt', 'xls', 'xlsx', 'mp4', 'webm', 'ogg', 'avi', 'mp3', 'wav', 'm4a'],
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index on bucket_name for faster lookups
CREATE INDEX IF NOT EXISTS idx_storage_rules_bucket_name ON storage_rules(bucket_name);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_storage_rules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER storage_rules_updated_at
  BEFORE UPDATE ON storage_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_storage_rules_updated_at();

-- Enable RLS
ALTER TABLE storage_rules ENABLE ROW LEVEL SECURITY;

-- Policy: Only authenticated users can read storage rules
CREATE POLICY "storage_rules_select"
  ON storage_rules
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Policy: Only admins can insert/update storage rules
CREATE POLICY "storage_rules_insert"
  ON storage_rules
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_user_roles ur
      JOIN admin_roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND ur.is_active = true
      AND r.name IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "storage_rules_update"
  ON storage_rules
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM admin_user_roles ur
      JOIN admin_roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND ur.is_active = true
      AND r.name IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "storage_rules_delete"
  ON storage_rules
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM admin_user_roles ur
      JOIN admin_roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND ur.is_active = true
      AND r.name IN ('admin', 'super_admin')
    )
  );

COMMIT;

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Check storage_rules table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'storage_rules'
ORDER BY ordinal_position;

-- Check RLS policies
SELECT 
  policyname,
  cmd as operation,
  permissive
FROM pg_policies 
WHERE tablename = 'storage_rules'
ORDER BY policyname;

