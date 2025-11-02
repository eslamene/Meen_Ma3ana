-- Fix notifications table to ensure proper sorting
-- Add created_at column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notifications' AND column_name = 'created_at'
    ) THEN
        ALTER TABLE notifications ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- Update existing notifications that might have NULL created_at
UPDATE notifications 
SET created_at = NOW() - INTERVAL '1 day' * (RANDOM() * 7)  -- Random date within last week
WHERE created_at IS NULL;

-- Ensure created_at is NOT NULL
ALTER TABLE notifications ALTER COLUMN created_at SET NOT NULL;

-- Create index for better sorting performance
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_created ON notifications(recipient_id, created_at DESC);

-- Add updated_at column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notifications' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE notifications ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- Create trigger to automatically update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS update_notifications_updated_at ON notifications;
CREATE TRIGGER update_notifications_updated_at
    BEFORE UPDATE ON notifications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create function for reliable notification sorting
CREATE OR REPLACE FUNCTION get_user_notifications_sorted(user_id UUID)
RETURNS TABLE (
    id UUID,
    type TEXT,
    recipient_id UUID,
    title TEXT,
    message TEXT,
    data JSONB,
    read BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
) 
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        n.id,
        n.type,
        n.recipient_id,
        n.title,
        n.message,
        n.data,
        n.read,
        n.created_at,
        n.updated_at
    FROM notifications n
    WHERE n.recipient_id = user_id
    ORDER BY 
        COALESCE(n.created_at, n.updated_at, NOW()) DESC,
        n.id DESC
    LIMIT 100;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_user_notifications_sorted(UUID) TO authenticated;
