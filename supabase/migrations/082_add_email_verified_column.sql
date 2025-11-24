-- =====================================================
-- Add email_verified column to users table if it doesn't exist
-- This fixes the error: column "email_verified" of relation "users" does not exist
-- =====================================================

-- Check if column exists, if not, add it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'email_verified'
    ) THEN
        ALTER TABLE public.users 
        ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT false;
        
        RAISE NOTICE '✅ Added email_verified column to users table';
    ELSE
        RAISE NOTICE '✅ email_verified column already exists in users table';
    END IF;
END $$;

-- Add comment to document the column
COMMENT ON COLUMN public.users.email_verified IS 'Indicates whether the user has verified their email address. Synced from auth.users.email_confirmed_at via trigger.';

