-- =====================================================
-- COMPLETE STORAGE POLICIES SETUP
-- For all buckets in your Supabase project
-- 
-- Run this in: Supabase Dashboard → SQL Editor
-- =====================================================

BEGIN;

-- =====================================================
-- 1. CASE-IMAGES BUCKET
-- =====================================================

-- Drop any existing policies
DROP POLICY IF EXISTS "case_images_public_read" ON storage.objects;
DROP POLICY IF EXISTS "case_images_authenticated_upload" ON storage.objects;
DROP POLICY IF EXISTS "case_images_owner_update" ON storage.objects;
DROP POLICY IF EXISTS "case_images_owner_delete" ON storage.objects;

-- Public read access for case images
CREATE POLICY "case_images_public_read" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'case-images');

-- Authenticated users can upload
CREATE POLICY "case_images_authenticated_upload" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'case-images' 
  AND auth.role() = 'authenticated'
);

-- Owners can update
CREATE POLICY "case_images_owner_update" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'case-images' 
  AND (auth.uid() = owner OR auth.uid() IN (
    SELECT user_id FROM user_roles WHERE role_name = 'admin'
  ))
);

-- Owners can delete
CREATE POLICY "case_images_owner_delete" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'case-images' 
  AND (auth.uid() = owner OR auth.uid() IN (
    SELECT user_id FROM user_roles WHERE role_name = 'admin'
  ))
);

-- =====================================================
-- 2. CONTRIBUTIONS BUCKET
-- =====================================================

DROP POLICY IF EXISTS "contributions_public_read" ON storage.objects;
DROP POLICY IF EXISTS "contributions_authenticated_upload" ON storage.objects;
DROP POLICY IF EXISTS "contributions_owner_access" ON storage.objects;
DROP POLICY IF EXISTS "contributions_admin_access" ON storage.objects;

-- Public read for approved contributions
CREATE POLICY "contributions_public_read" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'contributions');

-- Authenticated users can upload proof of payment
CREATE POLICY "contributions_authenticated_upload" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'contributions' 
  AND auth.role() = 'authenticated'
);

-- Owners can update/delete their files
CREATE POLICY "contributions_owner_access" 
ON storage.objects 
FOR ALL 
USING (
  bucket_id = 'contributions' 
  AND auth.uid() = owner
);

-- Admins can access all contribution files
CREATE POLICY "contributions_admin_access" 
ON storage.objects 
FOR ALL 
USING (
  bucket_id = 'contributions' 
  AND auth.uid() IN (
    SELECT user_id FROM user_roles WHERE role_name = 'admin'
  )
);

-- =====================================================
-- 3. USERS BUCKET (Profile pictures, etc.)
-- =====================================================

DROP POLICY IF EXISTS "users_public_read" ON storage.objects;
DROP POLICY IF EXISTS "users_owner_upload" ON storage.objects;
DROP POLICY IF EXISTS "users_owner_manage" ON storage.objects;

-- Public read for user avatars
CREATE POLICY "users_public_read" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'users');

-- Users can upload their own files
CREATE POLICY "users_owner_upload" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'users' 
  AND auth.role() = 'authenticated'
);

-- Users can update/delete only their own files
CREATE POLICY "users_owner_manage" 
ON storage.objects 
FOR ALL 
USING (
  bucket_id = 'users' 
  AND auth.uid() = owner
);

-- =====================================================
-- 4. SPONSOR_APPLICATIONS BUCKET
-- =====================================================

DROP POLICY IF EXISTS "sponsor_apps_authenticated_upload" ON storage.objects;
DROP POLICY IF EXISTS "sponsor_apps_owner_access" ON storage.objects;
DROP POLICY IF EXISTS "sponsor_apps_admin_access" ON storage.objects;

-- Authenticated users can submit applications
CREATE POLICY "sponsor_apps_authenticated_upload" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'sponsor_applications' 
  AND auth.role() = 'authenticated'
);

-- Applicants can view/update their own
CREATE POLICY "sponsor_apps_owner_access" 
ON storage.objects 
FOR ALL 
USING (
  bucket_id = 'sponsor_applications' 
  AND auth.uid() = owner
);

-- Admins can review all applications
CREATE POLICY "sponsor_apps_admin_access" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'sponsor_applications' 
  AND auth.uid() IN (
    SELECT user_id FROM user_roles WHERE role_name = 'admin'
  )
);

-- =====================================================
-- 5. RECURRING_CONTRIBUTIONS BUCKET
-- =====================================================

DROP POLICY IF EXISTS "recurring_public_read" ON storage.objects;
DROP POLICY IF EXISTS "recurring_authenticated_upload" ON storage.objects;
DROP POLICY IF EXISTS "recurring_owner_manage" ON storage.objects;
DROP POLICY IF EXISTS "recurring_admin_access" ON storage.objects;

-- Public read for recurring contribution info
CREATE POLICY "recurring_public_read" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'recurring_contributions');

-- Authenticated users can upload
CREATE POLICY "recurring_authenticated_upload" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'recurring_contributions' 
  AND auth.role() = 'authenticated'
);

-- Owners manage their recurring contributions
CREATE POLICY "recurring_owner_manage" 
ON storage.objects 
FOR ALL 
USING (
  bucket_id = 'recurring_contributions' 
  AND auth.uid() = owner
);

-- Admins can access all
CREATE POLICY "recurring_admin_access" 
ON storage.objects 
FOR ALL 
USING (
  bucket_id = 'recurring_contributions' 
  AND auth.uid() IN (
    SELECT user_id FROM user_roles WHERE role_name = 'admin'
  )
);

-- =====================================================
-- 6. CASE-FILES BUCKET (Documents, PDFs, etc.)
-- =====================================================

DROP POLICY IF EXISTS "case_files_public_read" ON storage.objects;
DROP POLICY IF EXISTS "case_files_authenticated_upload" ON storage.objects;
DROP POLICY IF EXISTS "case_files_admin_manage" ON storage.objects;

-- Public read for case supporting documents
CREATE POLICY "case_files_public_read" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'case-files');

-- Authenticated users can upload case documents
CREATE POLICY "case_files_authenticated_upload" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'case-files' 
  AND auth.role() = 'authenticated'
);

-- Admins and case owners can manage files
CREATE POLICY "case_files_admin_manage" 
ON storage.objects 
FOR ALL 
USING (
  bucket_id = 'case-files' 
  AND (
    auth.uid() = owner 
    OR auth.uid() IN (
      SELECT user_id FROM user_roles WHERE role_name = 'admin'
    )
  )
);

-- =====================================================
-- 7. BENEFICIARIES BUCKET (Beneficiary documents)
-- =====================================================

DROP POLICY IF EXISTS "beneficiaries_authenticated_read" ON storage.objects;
DROP POLICY IF EXISTS "beneficiaries_authenticated_upload" ON storage.objects;
DROP POLICY IF EXISTS "beneficiaries_owner_update" ON storage.objects;
DROP POLICY IF EXISTS "beneficiaries_owner_delete" ON storage.objects;
DROP POLICY IF EXISTS "beneficiaries_admin_access" ON storage.objects;

-- Authenticated users can read beneficiary documents
CREATE POLICY "beneficiaries_authenticated_read" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'beneficiaries' 
  AND auth.role() = 'authenticated'
);

-- Authenticated users can upload beneficiary documents
CREATE POLICY "beneficiaries_authenticated_upload" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'beneficiaries' 
  AND auth.role() = 'authenticated'
);

-- File owners can update their uploaded files
CREATE POLICY "beneficiaries_owner_update" 
ON storage.objects 
FOR UPDATE
USING (
  bucket_id = 'beneficiaries' 
  AND auth.uid() = owner
);

-- File owners can delete their uploaded files
CREATE POLICY "beneficiaries_owner_delete" 
ON storage.objects 
FOR DELETE
USING (
  bucket_id = 'beneficiaries' 
  AND auth.uid() = owner
);

-- Admins can access all beneficiary documents
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
-- VERIFICATION QUERIES
-- =====================================================

-- Check all policies created
SELECT 
  policyname,
  CASE 
    WHEN policyname LIKE 'case_images%' THEN 'case-images'
    WHEN policyname LIKE 'contributions%' THEN 'contributions'
    WHEN policyname LIKE 'users%' THEN 'users'
    WHEN policyname LIKE 'sponsor_apps%' THEN 'sponsor_applications'
    WHEN policyname LIKE 'recurring%' THEN 'recurring_contributions'
    WHEN policyname LIKE 'case_files%' THEN 'case-files'
    WHEN policyname LIKE 'beneficiaries%' THEN 'beneficiaries'
    ELSE 'unknown'
  END as bucket,
  cmd as operation,
  permissive
FROM pg_policies 
WHERE tablename = 'objects' 
  AND schemaname = 'storage'
ORDER BY bucket, policyname;

-- Count policies per bucket
SELECT 
  CASE 
    WHEN policyname LIKE 'case_images%' THEN 'case-images'
    WHEN policyname LIKE 'contributions%' THEN 'contributions'
    WHEN policyname LIKE 'users%' THEN 'users'
    WHEN policyname LIKE 'sponsor_apps%' THEN 'sponsor_applications'
    WHEN policyname LIKE 'recurring%' THEN 'recurring_contributions'
    WHEN policyname LIKE 'case_files%' THEN 'case-files'
    WHEN policyname LIKE 'beneficiaries%' THEN 'beneficiaries'
    ELSE 'unknown'
  END as bucket,
  COUNT(*) as policy_count
FROM pg_policies 
WHERE tablename = 'objects' 
  AND schemaname = 'storage'
GROUP BY bucket
ORDER BY bucket;

