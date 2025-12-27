-- Add English and Arabic title and description fields to cases table
-- This migration adds support for bilingual case content with consistent naming

-- Rename existing columns to be consistent
ALTER TABLE cases 
RENAME COLUMN title TO title_en;

ALTER TABLE cases 
RENAME COLUMN description TO description_ar;

-- Add new columns for Arabic title and English description
ALTER TABLE cases 
ADD COLUMN IF NOT EXISTS title_ar TEXT,
ADD COLUMN IF NOT EXISTS description_en TEXT;

-- Update existing data: assume current title_en is English and description_ar is Arabic
-- description_en will be populated from description_ar initially (can be updated later)
UPDATE cases 
SET description_en = description_ar
WHERE description_en IS NULL AND description_ar IS NOT NULL;

COMMENT ON COLUMN cases.title_en IS 'Case title in English';
COMMENT ON COLUMN cases.title_ar IS 'Case title in Arabic';
COMMENT ON COLUMN cases.description_ar IS 'Case description in Arabic';
COMMENT ON COLUMN cases.description_en IS 'Case description in English';

