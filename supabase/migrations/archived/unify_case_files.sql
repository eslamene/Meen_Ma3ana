-- ============================================
-- UNIFIED CASE FILES MIGRATION
-- ============================================
-- This migration consolidates case_images and supporting_documents (JSON)
-- into a single unified case_files table for better management

-- ============================================
-- 1. CREATE NEW UNIFIED TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS case_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  original_filename TEXT,
  file_url TEXT NOT NULL,
  file_path TEXT,
  file_type TEXT NOT NULL, -- MIME type (image/jpeg, application/pdf, etc.)
  file_size BIGINT DEFAULT 0,
  category TEXT DEFAULT 'other', -- photos, medical, financial, identity, videos, audio, other
  description TEXT,
  is_public BOOLEAN DEFAULT false,
  is_primary BOOLEAN DEFAULT false, -- For primary case image
  display_order INTEGER DEFAULT 0,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. CREATE INDEXES
-- ============================================

CREATE INDEX idx_case_files_case_id ON case_files(case_id);
CREATE INDEX idx_case_files_category ON case_files(category);
CREATE INDEX idx_case_files_filename ON case_files(filename);
CREATE INDEX idx_case_files_file_type ON case_files(file_type);
CREATE INDEX idx_case_files_display_order ON case_files(case_id, display_order);
CREATE INDEX idx_case_files_is_primary ON case_files(case_id, is_primary);

-- ============================================
-- 3. MIGRATE DATA FROM case_images
-- ============================================

INSERT INTO case_files (
  case_id,
  filename,
  original_filename,
  file_url,
  file_path,
  file_type,
  file_size,
  category,
  is_public,
  is_primary,
  display_order,
  created_at,
  updated_at
)
SELECT 
  case_id,
  COALESCE(
    filename,
    regexp_replace(image_url, '^.*/([^/]+)(\?.*)?$', '\1')
  ) as filename,
  regexp_replace(image_url, '^.*/([^/]+)(\?.*)?$', '\1') as original_filename,
  image_url as file_url,
  NULL as file_path,
  'image/jpeg' as file_type, -- Default, update if you know the actual types
  0 as file_size,
  'photos' as category,
  false as is_public,
  COALESCE(is_primary, false) as is_primary,
  COALESCE(display_order, 0) as display_order,
  created_at,
  updated_at
FROM case_images
WHERE case_id IS NOT NULL;

-- ============================================
-- 4. MIGRATE DATA FROM supporting_documents (JSON)
-- ============================================

-- This extracts JSON data from cases.supporting_documents and inserts into case_files
WITH parsed_docs AS (
  SELECT 
    id as case_id,
    jsonb_array_elements(
      CASE 
        WHEN supporting_documents IS NOT NULL 
          AND supporting_documents != '' 
          AND supporting_documents != 'null'
        THEN supporting_documents::jsonb
        ELSE '[]'::jsonb
      END
    ) as doc
  FROM cases
  WHERE supporting_documents IS NOT NULL 
    AND supporting_documents != '' 
    AND supporting_documents != 'null'
)
INSERT INTO case_files (
  case_id,
  filename,
  original_filename,
  file_url,
  file_path,
  file_type,
  file_size,
  category,
  description,
  is_public,
  is_primary,
  display_order,
  created_at
)
SELECT 
  case_id,
  doc->>'originalName' as filename,
  doc->>'originalName' as original_filename,
  doc->>'url' as file_url,
  doc->>'path' as file_path,
  COALESCE(doc->>'type', 'application/octet-stream') as file_type,
  COALESCE((doc->>'size')::bigint, 0) as file_size,
  COALESCE(doc->>'category', 'other') as category,
  doc->>'description' as description,
  COALESCE((doc->>'isPublic')::boolean, false) as is_public,
  false as is_primary,
  0 as display_order,
  COALESCE((doc->>'uploadedAt')::timestamptz, NOW())
FROM parsed_docs
WHERE doc->>'url' IS NOT NULL;

-- ============================================
-- 5. ADD COMMENTS
-- ============================================

COMMENT ON TABLE case_files IS 'Unified storage for all case files (images, documents, videos, etc.)';
COMMENT ON COLUMN case_files.filename IS 'Display name for the file (user can edit this)';
COMMENT ON COLUMN case_files.original_filename IS 'Original filename when uploaded';
COMMENT ON COLUMN case_files.file_url IS 'Full URL to access the file in storage';
COMMENT ON COLUMN case_files.file_path IS 'Storage path (relative to bucket)';
COMMENT ON COLUMN case_files.category IS 'File category: photos, medical, financial, identity, videos, audio, other';
COMMENT ON COLUMN case_files.is_primary IS 'Whether this is the primary/featured image for the case';
COMMENT ON COLUMN case_files.display_order IS 'Order in which files should be displayed (0-indexed)';

-- ============================================
-- 6. CREATE UPDATED_AT TRIGGER
-- ============================================

CREATE OR REPLACE FUNCTION update_case_files_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_case_files_updated_at
  BEFORE UPDATE ON case_files
  FOR EACH ROW
  EXECUTE FUNCTION update_case_files_updated_at();

-- ============================================
-- 7. BACKUP OLD DATA (Optional - keep for safety)
-- ============================================

-- Rename old table instead of dropping (can drop later after verification)
ALTER TABLE IF EXISTS case_images RENAME TO case_images_backup;

-- Note: We keep supporting_documents field in cases table for now
-- You can set it to NULL after verifying migration:
-- UPDATE cases SET supporting_documents = NULL WHERE supporting_documents IS NOT NULL;

-- ============================================
-- 8. REFRESH SCHEMA CACHE
-- ============================================

NOTIFY pgrst, 'reload schema';

