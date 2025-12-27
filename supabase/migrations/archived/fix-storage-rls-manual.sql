-- =====================================================
-- MANUAL FIX: Storage RLS Policies for case-images
-- 
-- ⚠️  IMPORTANT: Run this as the Supabase POSTGRES user
-- 
-- HOW TO RUN:
-- 1. Open Supabase Dashboard
-- 2. Go to: SQL Editor (left sidebar)
-- 3. Create New Query
-- 4. Copy this ENTIRE file
-- 5. Click "Run"
-- =====================================================

-- Option 1: RECOMMENDED - Set up proper RLS policies
-- =====================================================

BEGIN;

-- Drop existing policies (if any)
DROP POLICY IF EXISTS "case_images_public_read" ON storage.objects;
DROP POLICY IF EXISTS "case_images_authenticated_insert" ON storage.objects;
DROP POLICY IF EXISTS "case_images_authenticated_upload" ON storage.objects;
DROP POLICY IF EXISTS "case_images_owner_update" ON storage.objects;
DROP POLICY IF EXISTS "case_images_owner_delete" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;

-- Enable RLS if not already enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy 1: Allow everyone to view case images (public read)
CREATE POLICY "case_images_public_read" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'case-images');

-- Policy 2: Allow authenticated users to upload case images
CREATE POLICY "case_images_authenticated_upload" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'case-images' 
  AND auth.role() = 'authenticated'
);

-- Policy 3: Allow file owners to update their files
CREATE POLICY "case_images_owner_update" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'case-images' 
  AND auth.uid() = owner
);

-- Policy 4: Allow file owners to delete their files
CREATE POLICY "case_images_owner_delete" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'case-images' 
  AND auth.uid() = owner
);

COMMIT;

-- Verify policies were created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'objects' 
  AND schemaname = 'storage'
  AND policyname LIKE 'case_images%'
ORDER BY policyname;

-- =====================================================
-- Option 2: TEMPORARY FIX - Disable RLS (FOR DEVELOPMENT ONLY!)
-- ⚠️  WARNING: This removes all security from storage
-- Only use this temporarily for testing
-- =====================================================

-- Uncomment the line below ONLY if you want to temporarily disable RLS for testing:
-- ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;

-- To re-enable RLS later, run:
-- ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check if RLS is enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity 
FROM pg_tables 
WHERE tablename = 'objects' 
  AND schemaname = 'storage';

-- List all storage policies
SELECT 
  policyname,
  cmd,
  permissive
FROM pg_policies 
WHERE tablename = 'objects' 
  AND schemaname = 'storage'
ORDER BY policyname;

