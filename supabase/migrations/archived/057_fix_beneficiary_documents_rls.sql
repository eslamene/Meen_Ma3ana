-- =====================================================
-- FIX BENEFICIARY DOCUMENTS RLS POLICIES
-- Allow authenticated users to upload/manage documents
-- and allow admins full access
-- =====================================================

BEGIN;

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view beneficiary documents" ON beneficiary_documents;
DROP POLICY IF EXISTS "Users can insert beneficiary documents" ON beneficiary_documents;
DROP POLICY IF EXISTS "Users can update beneficiary documents" ON beneficiary_documents;
DROP POLICY IF EXISTS "Users can delete beneficiary documents" ON beneficiary_documents;

-- Policy 1: Authenticated users can view all beneficiary documents
-- (This allows editing beneficiaries and viewing their documents)
CREATE POLICY "Authenticated users can view beneficiary documents" ON beneficiary_documents
  FOR SELECT USING (
    auth.role() = 'authenticated'
  );

-- Policy 2: Only admins and super admins can insert documents
CREATE POLICY "Admins can insert beneficiary documents" ON beneficiary_documents
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_user_roles ur
      JOIN admin_roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid() 
      AND ur.is_active = true
      AND r.name IN ('admin', 'super_admin')
      AND r.is_active = true
    )
  );

-- Policy 3: Only admins and super admins can update documents
CREATE POLICY "Admins can update beneficiary documents" ON beneficiary_documents
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM admin_user_roles ur
      JOIN admin_roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid() 
      AND ur.is_active = true
      AND r.name IN ('admin', 'super_admin')
      AND r.is_active = true
    )
  );

-- Policy 4: Only admins and super admins can delete documents
CREATE POLICY "Admins can delete beneficiary documents" ON beneficiary_documents
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM admin_user_roles ur
      JOIN admin_roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid() 
      AND ur.is_active = true
      AND r.name IN ('admin', 'super_admin')
      AND r.is_active = true
    )
  );

-- Policy 5: Admins have full access to all beneficiary documents
CREATE POLICY "Admins have full access to beneficiary documents" ON beneficiary_documents
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM admin_user_roles ur
      JOIN admin_roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid() 
      AND ur.is_active = true
      AND r.name IN ('admin', 'super_admin')
      AND r.is_active = true
    )
  );

COMMIT;

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Check all policies created
SELECT 
  policyname,
  cmd as operation,
  permissive
FROM pg_policies 
WHERE tablename = 'beneficiary_documents' 
  AND schemaname = 'public'
ORDER BY policyname;

