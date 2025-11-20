-- =====================================================
-- Fix public navigation items - ensure only correct items are shown
-- This fixes the issue where Dashboard, Projects, etc. appear before Home
-- =====================================================

-- First, unmark all items that should NOT be in public navigation
UPDATE admin_menu_items 
SET 
  is_public_nav = false
WHERE href IN ('/dashboard', '/projects', '/notifications', '/contributions', '/profile')
  AND parent_id IS NULL;

-- Ensure only the correct items are marked as public nav with proper sort order
-- Home (sort_order = 1)
UPDATE admin_menu_items 
SET 
  is_public_nav = true,
  sort_order = 1,
  nav_metadata = jsonb_build_object(
    'isHashLink', false,
    'showOnLanding', true,
    'showOnOtherPages', true
  )
WHERE href IN ('/', '/landing') 
  AND parent_id IS NULL;

-- Features (sort_order = 2)
UPDATE admin_menu_items 
SET 
  is_public_nav = true,
  sort_order = 2,
  nav_metadata = jsonb_build_object(
    'isHashLink', true,
    'showOnLanding', true,
    'showOnOtherPages', true
  )
WHERE href = '#features' 
  AND parent_id IS NULL;

-- Cases (sort_order = 3)
UPDATE admin_menu_items 
SET 
  is_public_nav = true,
  sort_order = 3,
  nav_metadata = jsonb_build_object(
    'isHashLink', false,
    'showOnLanding', true,
    'showOnOtherPages', true
  )
WHERE href = '/cases' 
  AND parent_id IS NULL;

-- Contact (sort_order = 4)
UPDATE admin_menu_items 
SET 
  is_public_nav = true,
  sort_order = 4,
  nav_metadata = jsonb_build_object(
    'isHashLink', true,
    'showOnLanding', true,
    'showOnOtherPages', true
  )
WHERE href = '#contact' 
  AND parent_id IS NULL;

-- Verify: Show all public nav items with their sort order
SELECT 
  label,
  href,
  sort_order,
  is_public_nav,
  nav_metadata
FROM admin_menu_items
WHERE is_public_nav = true
  AND parent_id IS NULL
  AND is_active = true
ORDER BY sort_order;

