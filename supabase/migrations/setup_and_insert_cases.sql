-- Complete script to set up bilingual fields and insert all cases from CSV
-- Run this script to ensure everything is set up correctly

BEGIN;

-- Step 1: Add bilingual fields if they don't exist
DO $$
BEGIN
    -- Check if title_en exists, if not rename title
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'cases' 
        AND column_name = 'title_en'
    ) THEN
        ALTER TABLE cases RENAME COLUMN title TO title_en;
        RAISE NOTICE 'Renamed title to title_en';
    END IF;
    
    -- Check if description_ar exists, if not rename description
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'cases' 
        AND column_name = 'description_ar'
    ) THEN
        ALTER TABLE cases RENAME COLUMN description TO description_ar;
        RAISE NOTICE 'Renamed description to description_ar';
    END IF;
    
    -- Add title_ar if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'cases' 
        AND column_name = 'title_ar'
    ) THEN
        ALTER TABLE cases ADD COLUMN title_ar TEXT;
        RAISE NOTICE 'Added title_ar column';
    END IF;
    
    -- Add description_en if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'cases' 
        AND column_name = 'description_en'
    ) THEN
        ALTER TABLE cases ADD COLUMN description_en TEXT;
        RAISE NOTICE 'Added description_en column';
    END IF;
END $$;

-- Step 2: Create case categories
INSERT INTO case_categories (name, description, is_active) VALUES 
('Medical Support', 'Medical Support category', true),
('Educational Assistance', 'Educational Assistance category', true),
('Housing & Rent', 'Housing & Rent category', true),
('Home Appliances', 'Home Appliances category', true),
('Emergency Relief', 'Emergency Relief category', true),
('Other Support', 'Other Support category', true)
ON CONFLICT DO NOTHING;

COMMIT;

-- Now run the insert script
-- The rest of the insert-cases-from-csv.sql should be run after this

