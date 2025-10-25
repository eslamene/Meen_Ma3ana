-- =====================================================
-- SIMPLE STORAGE POLICIES FOR ALL BUCKETS
-- Basic setup: Public read + Authenticated write
-- 
-- Run this in: Supabase Dashboard → SQL Editor
-- =====================================================

BEGIN;

-- Enable RLS on storage.objects if not already enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- POLICIES FOR: case-images
-- =====================================================
CREATE POLICY "case_images_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'case-images');
CREATE POLICY "case_images_auth_write" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'case-images' AND auth.role() = 'authenticated');
CREATE POLICY "case_images_owner_update" ON storage.objects FOR UPDATE USING (bucket_id = 'case-images' AND auth.uid() = owner);
CREATE POLICY "case_images_owner_delete" ON storage.objects FOR DELETE USING (bucket_id = 'case-images' AND auth.uid() = owner);

-- =====================================================
-- POLICIES FOR: contributions
-- =====================================================
CREATE POLICY "contributions_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'contributions');
CREATE POLICY "contributions_auth_write" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'contributions' AND auth.role() = 'authenticated');
CREATE POLICY "contributions_owner_update" ON storage.objects FOR UPDATE USING (bucket_id = 'contributions' AND auth.uid() = owner);
CREATE POLICY "contributions_owner_delete" ON storage.objects FOR DELETE USING (bucket_id = 'contributions' AND auth.uid() = owner);

-- =====================================================
-- POLICIES FOR: users
-- =====================================================
CREATE POLICY "users_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'users');
CREATE POLICY "users_auth_write" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'users' AND auth.role() = 'authenticated');
CREATE POLICY "users_owner_update" ON storage.objects FOR UPDATE USING (bucket_id = 'users' AND auth.uid() = owner);
CREATE POLICY "users_owner_delete" ON storage.objects FOR DELETE USING (bucket_id = 'users' AND auth.uid() = owner);

-- =====================================================
-- POLICIES FOR: sponsor_applications
-- =====================================================
CREATE POLICY "sponsor_apps_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'sponsor_applications');
CREATE POLICY "sponsor_apps_auth_write" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'sponsor_applications' AND auth.role() = 'authenticated');
CREATE POLICY "sponsor_apps_owner_update" ON storage.objects FOR UPDATE USING (bucket_id = 'sponsor_applications' AND auth.uid() = owner);
CREATE POLICY "sponsor_apps_owner_delete" ON storage.objects FOR DELETE USING (bucket_id = 'sponsor_applications' AND auth.uid() = owner);

-- =====================================================
-- POLICIES FOR: recurring_contributions
-- =====================================================
CREATE POLICY "recurring_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'recurring_contributions');
CREATE POLICY "recurring_auth_write" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'recurring_contributions' AND auth.role() = 'authenticated');
CREATE POLICY "recurring_owner_update" ON storage.objects FOR UPDATE USING (bucket_id = 'recurring_contributions' AND auth.uid() = owner);
CREATE POLICY "recurring_owner_delete" ON storage.objects FOR DELETE USING (bucket_id = 'recurring_contributions' AND auth.uid() = owner);

-- =====================================================
-- POLICIES FOR: case-files
-- =====================================================
CREATE POLICY "case_files_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'case-files');
CREATE POLICY "case_files_auth_write" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'case-files' AND auth.role() = 'authenticated');
CREATE POLICY "case_files_owner_update" ON storage.objects FOR UPDATE USING (bucket_id = 'case-files' AND auth.uid() = owner);
CREATE POLICY "case_files_owner_delete" ON storage.objects FOR DELETE USING (bucket_id = 'case-files' AND auth.uid() = owner);

COMMIT;

-- =====================================================
-- VERIFY: Check all policies were created
-- =====================================================
SELECT 
  policyname,
  cmd,
  permissive
FROM pg_policies 
WHERE tablename = 'objects' 
  AND schemaname = 'storage'
ORDER BY policyname;

-- Expected: 24 policies total (4 policies × 6 buckets)
SELECT COUNT(*) as total_policies 
FROM pg_policies 
WHERE tablename = 'objects' 
  AND schemaname = 'storage';

