-- Add display_order column to case_images table
-- This column is used to determine the order in which images are displayed

ALTER TABLE case_images 
ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_case_images_display_order 
ON case_images(case_id, display_order);

-- Update existing records to have a display_order based on their creation time
WITH ordered_images AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (PARTITION BY case_id ORDER BY created_at) - 1 AS new_order
  FROM case_images
)
UPDATE case_images
SET display_order = ordered_images.new_order
FROM ordered_images
WHERE case_images.id = ordered_images.id;

-- Comment
COMMENT ON COLUMN case_images.display_order IS 'Order in which images should be displayed (0-indexed)';

