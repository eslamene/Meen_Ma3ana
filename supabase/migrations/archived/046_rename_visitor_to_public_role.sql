-- =====================================================
-- Rename "visitor" role to "public" for clarity
-- "public" is more intuitive and aligns with common terminology
-- =====================================================

-- Update the role name from "visitor" to "public"
UPDATE admin_roles
SET 
    name = 'public',
    display_name = 'Public',
    display_name_ar = 'عام',
    description = 'Unauthenticated users and public access',
    description_ar = 'المستخدمون غير المصرح لهم والوصول العام',
    updated_at = NOW()
WHERE name = 'visitor';

-- Verify the update
DO $$
DECLARE
    public_role_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO public_role_count
    FROM admin_roles
    WHERE name = 'public';

    IF public_role_count = 0 THEN
        RAISE EXCEPTION 'Failed to rename visitor role to public';
    ELSE
        RAISE NOTICE 'Successfully renamed visitor role to public';
    END IF;
END $$;

