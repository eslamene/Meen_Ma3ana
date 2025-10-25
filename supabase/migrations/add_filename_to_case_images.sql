-- Add filename column to case_images table for display names
-- This allows users to set custom display names for images without renaming the actual file in storage

ALTER TABLE case_images 
ADD COLUMN IF NOT EXISTS filename TEXT;

-- Update existing records to extract filename from image_url
UPDATE case_images
SET filename = CASE 
  WHEN image_url IS NOT NULL THEN 
    regexp_replace(image_url, '^.*/([^/]+)(\?.*)?$', '\1')
  ELSE 'image.jpg'
END
WHERE filename IS NULL;

-- Add index for search performance
CREATE INDEX IF NOT EXISTS idx_case_images_filename 
ON case_images(filename);

-- Comment
COMMENT ON COLUMN case_images.filename IS 'Display name for the image file (can be different from storage filename)';

-- ============================================
-- NOTE: Supporting Documents
-- ============================================
-- Supporting documents are stored as JSON in the cases.supporting_documents field,
-- not in a separate table. The filename is already part of the JSON structure
-- and is managed by the application code, so no migration is needed for documents.

