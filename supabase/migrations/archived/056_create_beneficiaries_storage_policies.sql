-- =====================================================
-- STORAGE POLICIES FOR BENEFICIARIES BUCKET
-- Allows authenticated users to upload and manage beneficiary documents
-- 
-- IMPORTANT: Run this in Supabase Dashboard → SQL Editor
-- Make sure you're logged in as a project owner/admin
-- If you get "must be owner" error, try running via Supabase CLI or API
-- =====================================================

BEGIN;

-- =====================================================
-- BENEFICIARIES BUCKET POLICIES
-- =====================================================

-- Drop any existing policies for beneficiaries bucket
DROP POLICY IF EXISTS "beneficiaries_authenticated_read" ON storage.objects;
DROP POLICY IF EXISTS "beneficiaries_authenticated_upload" ON storage.objects;
DROP POLICY IF EXISTS "beneficiaries_owner_update" ON storage.objects;
DROP POLICY IF EXISTS "beneficiaries_owner_delete" ON storage.objects;
DROP POLICY IF EXISTS "beneficiaries_admin_access" ON storage.objects;

-- Policy 1: Authenticated users can read beneficiary documents
-- (Documents may be public or private, but authenticated users can view them)
CREATE POLICY "beneficiaries_authenticated_read" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'beneficiaries' 
  AND auth.role() = 'authenticated'
);

-- Policy 2: Authenticated users can upload beneficiary documents
CREATE POLICY "beneficiaries_authenticated_upload" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'beneficiaries' 
  AND auth.role() = 'authenticated'
);

-- Policy 3: File owners can update their uploaded files
CREATE POLICY "beneficiaries_owner_update" 
ON storage.objects 
FOR UPDATE
USING (
  bucket_id = 'beneficiaries' 
  AND auth.uid() = owner
);

-- Policy 4: File owners can delete their uploaded files
CREATE POLICY "beneficiaries_owner_delete" 
ON storage.objects 
FOR DELETE
USING (
  bucket_id = 'beneficiaries' 
  AND auth.uid() = owner
);

-- Policy 5: Admins can access all beneficiary documents
CREATE POLICY "beneficiaries_admin_access" 
ON storage.objects 
FOR ALL 
USING (
  bucket_id = 'beneficiaries' 
  AND EXISTS (
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

-- Check beneficiaries bucket policies
SELECT 
  policyname,
  cmd as operation,
  permissive
FROM pg_policies 
WHERE tablename = 'objects' 
  AND schemaname = 'storage'
  AND policyname LIKE 'beneficiaries%'
ORDER BY policyname;

