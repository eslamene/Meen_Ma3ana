-- =====================================================
-- Add unique constraint on phone numbers
-- Ensures that each phone number can only be assigned to one account
-- =====================================================

-- First, check for and handle any duplicate phone numbers
-- Set duplicate phone numbers to NULL (keeping the first occurrence)
DO $$
DECLARE
  duplicate_record RECORD;
BEGIN
  -- Find all duplicate phone numbers (excluding NULL values)
  FOR duplicate_record IN
    SELECT phone, COUNT(*) as count
    FROM users
    WHERE phone IS NOT NULL AND phone != ''
    GROUP BY phone
    HAVING COUNT(*) > 1
  LOOP
    -- Keep the first user (by created_at) and set others to NULL
    UPDATE users
    SET phone = NULL,
        updated_at = NOW()
    WHERE phone = duplicate_record.phone
      AND id NOT IN (
        SELECT id
        FROM users
        WHERE phone = duplicate_record.phone
        ORDER BY created_at ASC
        LIMIT 1
      );
    
    RAISE NOTICE 'Removed duplicate phone number: % (kept first occurrence)', duplicate_record.phone;
  END LOOP;
END $$;

-- Create a unique partial index on phone (only for non-null, non-empty values)
-- This allows multiple NULL values but ensures uniqueness for actual phone numbers
CREATE UNIQUE INDEX IF NOT EXISTS users_phone_unique 
ON users (phone) 
WHERE phone IS NOT NULL AND phone != '';

-- Add comment to document the constraint
COMMENT ON INDEX users_phone_unique IS 'Ensures phone numbers are unique across all user accounts. Allows multiple NULL values.';

