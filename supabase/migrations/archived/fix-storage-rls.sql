-- =====================================================
-- Fix Storage RLS Policies for case-images bucket
-- Run this in Supabase SQL Editor
-- =====================================================

-- Enable RLS on storage.objects if not already enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "case_images_public_read" ON storage.objects;
DROP POLICY IF EXISTS "case_images_authenticated_insert" ON storage.objects;
DROP POLICY IF EXISTS "case_images_authenticated_upload" ON storage.objects;
DROP POLICY IF EXISTS "case_images_owner_update" ON storage.objects;
DROP POLICY IF EXISTS "case_images_owner_delete" ON storage.objects;

-- Policy 1: Allow public to view case images
CREATE POLICY "case_images_public_read" ON storage.objects
FOR SELECT
USING (bucket_id = 'case-images');

-- Policy 2: Allow authenticated users to upload case images
CREATE POLICY "case_images_authenticated_upload" ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'case-images' AND
  auth.role() = 'authenticated'
);

-- Policy 3: Allow file owners and admins to update files
CREATE POLICY "case_images_owner_update" ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'case-images' AND
  auth.role() = 'authenticated' AND
  (
    owner = auth.uid() OR
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid() 
      AND r.name IN ('admin', 'moderator')
    )
  )
);

-- Policy 4: Allow file owners and admins to delete files
CREATE POLICY "case_images_owner_delete" ON storage.objects
FOR DELETE
USING (
  bucket_id = 'case-images' AND
  auth.role() = 'authenticated' AND
  (
    owner = auth.uid() OR
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid() 
      AND r.name IN ('admin', 'moderator')
    )
  )
);

-- Verify the policies were created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename = 'objects' 
AND policyname LIKE 'case_images%'
ORDER BY policyname;

