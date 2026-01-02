-- =====================================================
-- Fix Home Navigation Link in Database
-- This script fixes any menu items with incorrect /landing/landing paths
-- =====================================================

-- Check current home navigation items
SELECT 
  id,
  label,
  label_ar,
  href,
  is_public_nav,
  nav_metadata
FROM admin_menu_items
WHERE is_public_nav = true
  AND (href LIKE '%landing%' OR href = '/' OR href = '')
ORDER BY sort_order;

-- Fix home link: Update any /landing or /landing/landing to just /
UPDATE admin_menu_items
SET 
  href = '/',
  nav_metadata = COALESCE(nav_metadata, '{}'::jsonb) || 
    jsonb_build_object(
      'isHashLink', false,
      'showOnLanding', true,
      'showOnOtherPages', true
    )
WHERE is_public_nav = true
  AND (
    href = '/landing' 
    OR href = '/landing/landing'
    OR href LIKE '/landing/%'
    OR href LIKE '%/landing/landing%'
  )
  AND (label ILIKE '%home%' OR label_ar ILIKE '%رئيس%' OR label ILIKE '%الرئيسية%');

-- Verify the fix
SELECT 
  id,
  label,
  label_ar,
  href,
  is_public_nav,
  nav_metadata
FROM admin_menu_items
WHERE is_public_nav = true
  AND (href LIKE '%landing%' OR href = '/' OR href = '')
ORDER BY sort_order;

