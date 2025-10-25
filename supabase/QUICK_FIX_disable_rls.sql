-- =====================================================
-- ⚠️  QUICK FIX: Temporarily Disable Storage RLS
-- 
-- THIS IS FOR DEVELOPMENT/TESTING ONLY!
-- This removes ALL security from storage.
-- 
-- HOW TO RUN:
-- 1. Open Supabase Dashboard > SQL Editor
-- 2. Copy the line below
-- 3. Click "Run"
-- =====================================================

ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;

-- ✅ Done! Now try uploading an image.

-- =====================================================
-- TO RE-ENABLE RLS LATER (with proper policies):
-- Run the full SQL from: supabase/fix-storage-rls-manual.sql
-- =====================================================

