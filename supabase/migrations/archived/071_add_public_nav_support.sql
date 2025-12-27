-- =====================================================
-- Add support for public navigation items in menu system
-- This allows managing public navigation from admin menu settings
-- =====================================================

-- Add is_public_nav field to mark items for public navigation bar
ALTER TABLE admin_menu_items 
ADD COLUMN IF NOT EXISTS is_public_nav BOOLEAN DEFAULT false;

-- Add nav_metadata JSONB field for storing navigation-specific properties
-- Properties: isHashLink, showOnLanding, showOnOtherPages
ALTER TABLE admin_menu_items 
ADD COLUMN IF NOT EXISTS nav_metadata JSONB DEFAULT '{}'::jsonb;

-- Create index for public navigation items
CREATE INDEX IF NOT EXISTS idx_admin_menu_items_public_nav 
ON admin_menu_items(is_public_nav, sort_order) 
WHERE is_public_nav = true AND is_active = true;

-- First, ensure Dashboard, Projects, and other non-public items are NOT marked as public nav
UPDATE admin_menu_items 
SET 
  is_public_nav = false
WHERE href IN ('/dashboard', '/projects', '/notifications', '/contributions', '/profile')
  AND parent_id IS NULL;

-- Update existing public navigation items
-- Mark Home, Cases, Features, Contact as public navigation items
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

-- Cases (with permission)
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

-- Add Features and Contact as new menu items if they don't exist
INSERT INTO admin_menu_items (label, label_ar, href, icon, description, sort_order, permission_id, is_public_nav, nav_metadata, is_active)
VALUES 
  ('Features', 'المميزات', '#features', NULL, 'View platform features', 2, NULL, true, 
   jsonb_build_object('isHashLink', true, 'showOnLanding', true, 'showOnOtherPages', true), true),
  ('Contact', 'اتصل بنا', '#contact', 'Mail', 'Contact us', 4, NULL, true,
   jsonb_build_object('isHashLink', true, 'showOnLanding', true, 'showOnOtherPages', true), true)
ON CONFLICT (href, parent_id) DO UPDATE SET
  is_public_nav = true,
  nav_metadata = EXCLUDED.nav_metadata,
  is_active = true,
  updated_at = NOW();

-- Ensure Features has correct sort order (2)
UPDATE admin_menu_items 
SET 
  sort_order = 2
WHERE href = '#features' 
  AND parent_id IS NULL
  AND is_public_nav = true;

-- Ensure Contact has correct sort order (4)
UPDATE admin_menu_items 
SET 
  sort_order = 4
WHERE href = '#contact' 
  AND parent_id IS NULL
  AND is_public_nav = true;

-- Comments
COMMENT ON COLUMN admin_menu_items.is_public_nav IS 'If true, this item appears in the public navigation bar for unauthenticated users';
COMMENT ON COLUMN admin_menu_items.nav_metadata IS 'JSONB object storing navigation-specific properties: isHashLink, showOnLanding, showOnOtherPages';

