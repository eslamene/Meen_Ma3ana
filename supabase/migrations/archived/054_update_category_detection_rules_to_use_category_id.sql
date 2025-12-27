-- =====================================================
-- Update Category Detection Rules to use category_id
-- Changes from category_key (string) to category_id (UUID FK)
-- =====================================================

-- Step 1: Add new category_id column
ALTER TABLE category_detection_rules 
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES case_categories(id) ON DELETE CASCADE;

-- Step 2: Migrate existing data by matching category_key to case_categories
-- Map category_key strings to actual category IDs based on actual database data
UPDATE category_detection_rules cdr
SET category_id = (
    SELECT cc.id 
    FROM case_categories cc
    WHERE 
        -- Map to actual category IDs from the database
        (cdr.category_key = 'medical' AND cc.id = '034662d0-00ef-41fc-bfbf-90db9c7499dd')
        OR (cdr.category_key = 'education' AND cc.id = '449ca259-a73d-4edf-b000-9bbd91c89973')
        OR (cdr.category_key = 'housing' AND cc.id = '39db1de3-6f6c-474a-a656-0d12affbd4f5')
        OR (cdr.category_key = 'appliances' AND cc.id = '8f076fa0-e9f2-4211-bfbd-93ee641d81ef')
        OR (cdr.category_key = 'emergency' AND cc.id = '91087680-b694-4811-8de2-ff855282772e')
        OR (cdr.category_key = 'livelihood' AND cc.id = 'b6efa2f3-ca32-4e5a-996a-042b6b7d5204')
        OR (cdr.category_key = 'community' AND cc.id = '42bc0f18-c976-4e80-a34f-769182804c90')
        OR (cdr.category_key = 'basicneeds' AND cc.id = 'e6b1e54e-4fa0-4160-8dc0-0f9601be0a22')
        OR (cdr.category_key = 'other' AND cc.id = 'bf61fb1a-1cb4-4e88-b0e3-af462a1cceb6')
    LIMIT 1
)
WHERE category_id IS NULL;

-- Step 3: Assign any remaining unmatched rules to "General Support" category (acts as "Other")
UPDATE category_detection_rules
SET category_id = 'bf61fb1a-1cb4-4e88-b0e3-af462a1cceb6' -- General Support
WHERE category_id IS NULL;

-- Step 4: Make category_id NOT NULL after migration
ALTER TABLE category_detection_rules 
ALTER COLUMN category_id SET NOT NULL;

-- Step 5: Drop old category_key column and unique constraint
ALTER TABLE category_detection_rules 
DROP CONSTRAINT IF EXISTS category_detection_rules_category_key_keyword_key;

ALTER TABLE category_detection_rules 
DROP COLUMN IF EXISTS category_key;

-- Step 6: Create new unique constraint on category_id and keyword
ALTER TABLE category_detection_rules 
ADD CONSTRAINT category_detection_rules_category_id_keyword_unique 
UNIQUE(category_id, keyword);

-- Step 7: Update indexes
DROP INDEX IF EXISTS idx_category_detection_rules_category_key;
CREATE INDEX IF NOT EXISTS idx_category_detection_rules_category_id ON category_detection_rules(category_id);
CREATE INDEX IF NOT EXISTS idx_category_detection_rules_keyword ON category_detection_rules(keyword);
CREATE INDEX IF NOT EXISTS idx_category_detection_rules_active ON category_detection_rules(is_active) WHERE is_active = true;

