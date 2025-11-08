-- Quick verification script to check database state
-- Run this first to see what's missing

-- Check if cases table exists and has columns
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'cases'
ORDER BY ordinal_position;

-- Check current case count
SELECT COUNT(*) as total_cases FROM cases;

-- Check if bilingual columns exist
SELECT 
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'cases' 
        AND column_name = 'title_en'
    ) THEN '✅ title_en exists' ELSE '❌ title_en missing' END as title_en_status,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'cases' 
        AND column_name = 'title_ar'
    ) THEN '✅ title_ar exists' ELSE '❌ title_ar missing' END as title_ar_status,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'cases' 
        AND column_name = 'description_en'
    ) THEN '✅ description_en exists' ELSE '❌ description_en missing' END as description_en_status,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'cases' 
        AND column_name = 'description_ar'
    ) THEN '✅ description_ar exists' ELSE '❌ description_ar missing' END as description_ar_status;

-- Check if users exist
SELECT COUNT(*) as user_count FROM users;
SELECT id, email, role FROM users LIMIT 1;

-- Check if case_categories exist
SELECT COUNT(*) as category_count FROM case_categories;
SELECT name FROM case_categories;

-- Check contributions
SELECT COUNT(*) as total_contributions FROM contributions;
SELECT COUNT(*) as case_contributions FROM contributions WHERE case_id IS NOT NULL;

