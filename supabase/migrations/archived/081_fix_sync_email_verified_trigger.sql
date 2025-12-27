-- =====================================================
-- Fix sync_email_verified trigger to handle missing users table row
-- Uses INSERT ... ON CONFLICT to ensure row exists before updating
-- =====================================================

-- Function to sync email_verified from auth.users.email_confirmed_at
-- Now handles case where users table row doesn't exist yet
CREATE OR REPLACE FUNCTION sync_email_verified()
RETURNS TRIGGER AS $$
BEGIN
  -- Update email_verified in users table when email_confirmed_at changes
  IF NEW.email_confirmed_at IS NOT NULL AND (OLD.email_confirmed_at IS NULL OR OLD.email_confirmed_at IS DISTINCT FROM NEW.email_confirmed_at) THEN
    -- Use INSERT ... ON CONFLICT to ensure row exists
    -- This handles the case where the users table row wasn't created during signup
    INSERT INTO users (id, email, email_verified, role, created_at, updated_at)
    VALUES (
      NEW.id, 
      COALESCE(NEW.email, NEW.id::text || '@placeholder.local'), 
      true, 
      'donor', 
      COALESCE(NEW.created_at, NOW()), 
      NOW()
    )
    ON CONFLICT (id) 
    DO UPDATE SET 
      email_verified = true,
      email = COALESCE(EXCLUDED.email, users.email),
      updated_at = NOW();
  ELSIF NEW.email_confirmed_at IS NULL AND OLD.email_confirmed_at IS NOT NULL THEN
    -- If email_confirmed_at is removed (shouldn't happen, but handle it)
    UPDATE users
    SET email_verified = false,
        updated_at = NOW()
    WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log the error but don't fail the trigger
  -- This ensures email verification doesn't fail due to users table issues
  RAISE WARNING 'Error in sync_email_verified for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Also sync on INSERT if email_confirmed_at is already set
CREATE OR REPLACE FUNCTION sync_email_verified_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.email_confirmed_at IS NOT NULL THEN
    -- Use INSERT ... ON CONFLICT to ensure row exists
    INSERT INTO users (id, email, email_verified, role, created_at, updated_at)
    VALUES (
      NEW.id, 
      COALESCE(NEW.email, NEW.id::text || '@placeholder.local'), 
      true, 
      'donor', 
      COALESCE(NEW.created_at, NOW()), 
      NOW()
    )
    ON CONFLICT (id) 
    DO UPDATE SET 
      email_verified = true,
      email = COALESCE(EXCLUDED.email, users.email),
      updated_at = NOW();
  END IF;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log the error but don't fail the trigger
  RAISE WARNING 'Error in sync_email_verified_on_insert for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment to document the fix
COMMENT ON FUNCTION sync_email_verified() IS 'Syncs email_verified in users table when email_confirmed_at changes in auth.users. Now handles missing users table rows gracefully.';
COMMENT ON FUNCTION sync_email_verified_on_insert() IS 'Syncs email_verified in users table when a new user is inserted with email_confirmed_at already set. Now handles missing users table rows gracefully.';






