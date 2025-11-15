-- Migration: Remove old case creation route references
-- This migration cleans up any menu items or references to the old multi-step case creation flow
-- The old routes (/cases/create/details and /cases/create/images) have been replaced with a unified /cases/create page

-- ============================================
-- CLEANUP: Remove menu items for old routes
-- ============================================

-- Remove any menu items that reference the old multi-step case creation routes
DELETE FROM admin_menu_items 
WHERE href LIKE '%/cases/create/details%' 
   OR href LIKE '%/cases/create/images%';

-- Note: The generic 'cases:create' permission remains valid as it applies to case creation in general
-- No permission cleanup is needed as the permission is route-agnostic

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
DECLARE
    deleted_count INTEGER;
BEGIN
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    IF deleted_count > 0 THEN
        RAISE NOTICE 'Removed % menu item(s) referencing old case creation routes', deleted_count;
    ELSE
        RAISE NOTICE 'No menu items found referencing old case creation routes';
    END IF;
END $$;

