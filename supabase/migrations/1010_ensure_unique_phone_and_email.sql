-- =====================================================
-- Ensure unique constraints on phone and email
-- This migration ensures both phone numbers and emails are unique
-- IMPORTANT: This migration is safe for users without phone numbers
-- - Multiple NULL phone values are allowed
-- - Only non-null, non-empty phone numbers must be unique
-- =====================================================

-- First, handle any duplicate phone numbers (only affects users WITH phone numbers)
-- Normalize and deduplicate phone numbers
-- Users without phone numbers (NULL) are not affected
DO $$
DECLARE
  duplicate_record RECORD;
  normalized_phone TEXT;
  duplicate_count INTEGER := 0;
BEGIN
  -- Find all duplicate phone numbers (excluding NULL and empty values)
  -- Normalize phone numbers first to catch duplicates in different formats
  FOR duplicate_record IN
    WITH normalized_phones AS (
      SELECT 
        id,
        phone,
        created_at,
        -- Normalize phone: remove spaces, dashes, parentheses, country codes
        REGEXP_REPLACE(
          REGEXP_REPLACE(
            REGEXP_REPLACE(
              REGEXP_REPLACE(phone, '[\s\-\(\)]', '', 'g'), 
              '^\+20', ''
            ), 
            '^0020', ''
          ),
          '^20', ''
        ) as normalized
      FROM users
      WHERE phone IS NOT NULL AND phone != '' AND TRIM(phone) != ''
    ),
    duplicates AS (
      SELECT normalized, COUNT(*) as count, array_agg(id ORDER BY created_at) as user_ids
      FROM normalized_phones
      GROUP BY normalized
      HAVING COUNT(*) > 1
    )
    SELECT * FROM duplicates
  LOOP
    -- Keep the first user (by created_at) and set others to NULL
    -- This preserves users without phones and only affects duplicates
    UPDATE users
    SET phone = NULL,
        updated_at = NOW()
    WHERE id = ANY(duplicate_record.user_ids[2:])
      AND phone IS NOT NULL;
    
    duplicate_count := duplicate_count + 1;
    RAISE NOTICE 'Removed duplicate phone numbers (normalized: %). Kept first user, set others to NULL.', duplicate_record.normalized;
  END LOOP;
  
  IF duplicate_count = 0 THEN
    RAISE NOTICE 'No duplicate phone numbers found. All existing phone numbers are unique.';
  END IF;
END $$;

-- Create a unique partial index on phone (only for non-null, non-empty values)
-- This is SAFE for users without phone numbers:
-- - Multiple NULL values are explicitly allowed
-- - Multiple empty strings are allowed
-- - Only actual phone numbers (non-null, non-empty) must be unique
DROP INDEX IF EXISTS users_phone_unique;
CREATE UNIQUE INDEX IF NOT EXISTS users_phone_unique 
ON users (phone) 
WHERE phone IS NOT NULL AND phone != '' AND TRIM(phone) != '';

-- Verify the index was created successfully
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'users_phone_unique' 
    AND tablename = 'users'
  ) THEN
    RAISE NOTICE '✅ Phone uniqueness index created successfully. NULL values are allowed.';
  ELSE
    RAISE WARNING '⚠️ Phone uniqueness index may not have been created.';
  END IF;
END $$;

-- Ensure email unique constraint exists (should already exist, but ensure it)
-- Check if constraint exists, if not create it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_constraint 
    WHERE conname = 'users_email_unique'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_email_unique UNIQUE (email);
  END IF;
END $$;

-- Add comments to document the constraints
COMMENT ON INDEX users_phone_unique IS 'Ensures phone numbers are unique across all user accounts. IMPORTANT: Allows multiple NULL values, so users without phone numbers are not affected.';
COMMENT ON CONSTRAINT users_email_unique ON users IS 'Ensures email addresses are unique across all user accounts.';

-- Also ensure email is checked in auth.users
-- Note: Supabase Auth already enforces email uniqueness, but we document it here
COMMENT ON TABLE users IS 'Users table with unique constraints on email and phone. Email must be unique. Phone must be unique when not NULL (multiple NULL values allowed for users without phones).';

