-- Check the actual columns in contributions table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'contributions'
ORDER BY ordinal_position;

