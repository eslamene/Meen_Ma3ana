-- ============================================
-- UPDATE LANDING_CONTACTS MESSAGE LENGTH CONSTRAINT
-- ============================================
-- Increase message length limit from 5000 to 10000 characters

-- Drop the old constraint
ALTER TABLE landing_contacts 
DROP CONSTRAINT IF EXISTS message_length;

-- Add new constraint with increased limit
ALTER TABLE landing_contacts 
ADD CONSTRAINT message_length CHECK (char_length(message) >= 20 AND char_length(message) <= 10000);

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';

