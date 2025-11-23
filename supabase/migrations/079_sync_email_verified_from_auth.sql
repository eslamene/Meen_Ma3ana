-- =====================================================
-- Sync email_verified from auth.users.email_confirmed_at
-- Automatically syncs email_verified in users table when
-- email_confirmed_at is updated in auth.users
-- =====================================================

-- Function to sync email_verified from auth.users.email_confirmed_at
CREATE OR REPLACE FUNCTION sync_email_verified()
RETURNS TRIGGER AS $$
BEGIN
  -- Update email_verified in users table when email_confirmed_at changes
  IF NEW.email_confirmed_at IS NOT NULL AND (OLD.email_confirmed_at IS NULL OR OLD.email_confirmed_at IS DISTINCT FROM NEW.email_confirmed_at) THEN
    UPDATE users
    SET email_verified = true,
        updated_at = NOW()
    WHERE id = NEW.id;
  ELSIF NEW.email_confirmed_at IS NULL AND OLD.email_confirmed_at IS NOT NULL THEN
    -- If email_confirmed_at is removed (shouldn't happen, but handle it)
    UPDATE users
    SET email_verified = false,
        updated_at = NOW()
    WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users to sync email_verified
-- Note: This trigger runs on auth.users table changes
DROP TRIGGER IF EXISTS sync_email_verified_trigger ON auth.users;
CREATE TRIGGER sync_email_verified_trigger
  AFTER UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW
  WHEN (OLD.email_confirmed_at IS DISTINCT FROM NEW.email_confirmed_at)
  EXECUTE FUNCTION sync_email_verified();

-- Also sync on INSERT if email_confirmed_at is already set
CREATE OR REPLACE FUNCTION sync_email_verified_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.email_confirmed_at IS NOT NULL THEN
    UPDATE users
    SET email_verified = true,
        updated_at = NOW()
    WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS sync_email_verified_insert_trigger ON auth.users;
CREATE TRIGGER sync_email_verified_insert_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW
  WHEN (NEW.email_confirmed_at IS NOT NULL)
  EXECUTE FUNCTION sync_email_verified_on_insert();

-- Backfill existing data: sync email_verified for all users based on current email_confirmed_at
UPDATE users u
SET email_verified = COALESCE(
  (SELECT email_confirmed_at IS NOT NULL 
   FROM auth.users au 
   WHERE au.id = u.id),
  false
),
updated_at = NOW()
WHERE email_verified != COALESCE(
  (SELECT email_confirmed_at IS NOT NULL 
   FROM auth.users au 
   WHERE au.id = u.id),
  false
);

-- Add comment to document the trigger
COMMENT ON FUNCTION sync_email_verified() IS 'Syncs email_verified in users table when email_confirmed_at changes in auth.users';
COMMENT ON FUNCTION sync_email_verified_on_insert() IS 'Syncs email_verified in users table when a new user is inserted with email_confirmed_at already set';

