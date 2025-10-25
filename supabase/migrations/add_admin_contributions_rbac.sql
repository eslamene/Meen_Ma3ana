-- Add Admin Contributions Management to RBAC and Navigation
-- This migration adds permissions, navigation items, and role assignments for admin contribution management

-- ============================================================================
-- 1. GET MODULE IDs
-- ============================================================================

DO $$
DECLARE
  v_contributions_module_id UUID;
  v_admin_module_id UUID;
BEGIN
  -- Get Contributions module ID
  SELECT id INTO v_contributions_module_id
  FROM permission_modules
  WHERE name = 'contributions'
  LIMIT 1;

  -- Get Admin module ID
  SELECT id INTO v_admin_module_id
  FROM permission_modules
  WHERE name = 'admin'
  LIMIT 1;

  -- Create Contributions module if it doesn't exist
  IF v_contributions_module_id IS NULL THEN
    INSERT INTO permission_modules (name, display_name, description, icon, order_index)
    VALUES (
      'contributions',
      'Contributions Management',
      'Manage donations and contributions',
      'DollarSign',
      4
    )
    RETURNING id INTO v_contributions_module_id;
    
    RAISE NOTICE 'Created Contributions module: %', v_contributions_module_id;
  END IF;

  -- Create Admin module if it doesn't exist
  IF v_admin_module_id IS NULL THEN
    INSERT INTO permission_modules (name, display_name, description, icon, order_index)
    VALUES (
      'admin',
      'Administration',
      'Administrative functions and oversight',
      'Shield',
      10
    )
    RETURNING id INTO v_admin_module_id;
    
    RAISE NOTICE 'Created Admin module: %', v_admin_module_id;
  END IF;

  -- ============================================================================
  -- 2. CREATE PERMISSIONS
  -- ============================================================================

  -- Admin Contributions Management Permissions
  INSERT INTO permissions (name, display_name, description, resource, action, module_id)
  VALUES 
    -- View all contributions (admin)
    (
      'view:all_contributions',
      'View All Contributions',
      'View contributions from all donors',
      'contributions',
      'view',
      v_admin_module_id
    ),
    -- Approve contributions
    (
      'approve:contributions',
      'Approve Contributions',
      'Approve pending contribution requests',
      'contributions',
      'approve',
      v_admin_module_id
    ),
    -- Reject contributions
    (
      'reject:contributions',
      'Reject Contributions',
      'Reject pending contribution requests',
      'contributions',
      'reject',
      v_admin_module_id
    ),
    -- Moderate contributions
    (
      'moderate:contributions',
      'Moderate Contributions',
      'Full moderation access to contributions',
      'contributions',
      'moderate',
      v_admin_module_id
    ),
    -- View pending contributions
    (
      'view:pending_contributions',
      'View Pending Contributions',
      'View contributions awaiting approval',
      'contributions',
      'view_pending',
      v_admin_module_id
    )
  ON CONFLICT (name) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    description = EXCLUDED.description,
    module_id = EXCLUDED.module_id;

  RAISE NOTICE 'Created/Updated admin contribution permissions';

  -- ============================================================================
  -- 3. CREATE NAVIGATION ITEMS
  -- ============================================================================

  -- Get permission IDs
  DECLARE
    v_view_all_perm_id UUID;
    v_moderate_perm_id UUID;
    v_view_pending_perm_id UUID;
  BEGIN
    SELECT id INTO v_view_all_perm_id FROM permissions WHERE name = 'view:all_contributions';
    SELECT id INTO v_moderate_perm_id FROM permissions WHERE name = 'moderate:contributions';
    SELECT id INTO v_view_pending_perm_id FROM permissions WHERE name = 'view:pending_contributions';

    -- Main Admin Contributions Page
    INSERT INTO navigation_items (
      key,
      label_key,
      href,
      icon,
      module_id,
      permission_id,
      parent_id,
      order_index,
      is_standalone,
      is_active,
      exact_match
    )
    VALUES (
      'admin_contributions',
      'navigation.allContributions',
      '/admin/contributions',
      'DollarSign',
      v_admin_module_id,
      v_view_all_perm_id,
      NULL,
      150,
      false,
      true,
      false
    )
    ON CONFLICT (key) DO UPDATE SET
      label_key = EXCLUDED.label_key,
      href = EXCLUDED.href,
      icon = EXCLUDED.icon,
      module_id = EXCLUDED.module_id,
      permission_id = EXCLUDED.permission_id,
      order_index = EXCLUDED.order_index;

    -- Pending Contributions Sub-page
    DECLARE
      v_parent_nav_id UUID;
    BEGIN
      SELECT id INTO v_parent_nav_id FROM navigation_items WHERE key = 'admin_contributions';

      INSERT INTO navigation_items (
        key,
        label_key,
        href,
        icon,
        module_id,
        permission_id,
        parent_id,
        order_index,
        is_standalone,
        is_active,
        exact_match
      )
      VALUES (
        'pending_contributions',
        'navigation.pendingContributions',
        '/admin/contributions?status=pending',
        'Clock',
        v_admin_module_id,
        v_view_pending_perm_id,
        v_parent_nav_id,
        151,
        false,
        true,
        true
      )
      ON CONFLICT (key) DO UPDATE SET
        label_key = EXCLUDED.label_key,
        href = EXCLUDED.href,
        icon = EXCLUDED.icon,
        module_id = EXCLUDED.module_id,
        permission_id = EXCLUDED.permission_id,
        parent_id = EXCLUDED.parent_id,
        order_index = EXCLUDED.order_index;
    END;

    RAISE NOTICE 'Created/Updated navigation items';
  END;

  -- ============================================================================
  -- 4. ASSIGN PERMISSIONS TO ROLES
  -- ============================================================================

  -- Get role IDs
  DECLARE
    v_admin_role_id UUID;
    v_super_admin_role_id UUID;
    v_moderator_role_id UUID;
  BEGIN
    SELECT id INTO v_admin_role_id FROM roles WHERE name = 'admin';
    SELECT id INTO v_super_admin_role_id FROM roles WHERE name = 'super_admin';
    SELECT id INTO v_moderator_role_id FROM roles WHERE name = 'moderator';

    -- Create moderator role if it doesn't exist
    IF v_moderator_role_id IS NULL THEN
      INSERT INTO roles (name, display_name, description)
      VALUES (
        'moderator',
        'Moderator',
        'Can moderate contributions and content'
      )
      RETURNING id INTO v_moderator_role_id;
      
      RAISE NOTICE 'Created Moderator role: %', v_moderator_role_id;
    END IF;

    -- Assign all contribution management permissions to super_admin
    IF v_super_admin_role_id IS NOT NULL THEN
      INSERT INTO role_permissions (role_id, permission_id)
      SELECT v_super_admin_role_id, id
      FROM permissions
      WHERE name IN (
        'view:all_contributions',
        'approve:contributions',
        'reject:contributions',
        'moderate:contributions',
        'view:pending_contributions'
      )
      ON CONFLICT (role_id, permission_id) DO NOTHING;
      
      RAISE NOTICE 'Assigned contribution permissions to super_admin';
    END IF;

    -- Assign all contribution management permissions to admin
    IF v_admin_role_id IS NOT NULL THEN
      INSERT INTO role_permissions (role_id, permission_id)
      SELECT v_admin_role_id, id
      FROM permissions
      WHERE name IN (
        'view:all_contributions',
        'approve:contributions',
        'reject:contributions',
        'moderate:contributions',
        'view:pending_contributions'
      )
      ON CONFLICT (role_id, permission_id) DO NOTHING;
      
      RAISE NOTICE 'Assigned contribution permissions to admin';
    END IF;

    -- Assign moderation permissions to moderator
    IF v_moderator_role_id IS NOT NULL THEN
      INSERT INTO role_permissions (role_id, permission_id)
      SELECT v_moderator_role_id, id
      FROM permissions
      WHERE name IN (
        'view:all_contributions',
        'approve:contributions',
        'reject:contributions',
        'view:pending_contributions'
      )
      ON CONFLICT (role_id, permission_id) DO NOTHING;
      
      RAISE NOTICE 'Assigned contribution permissions to moderator';
    END IF;
  END;

  RAISE NOTICE '✅ Admin Contributions RBAC setup complete!';
END $$;

-- ============================================================================
-- 5. VERIFICATION QUERY
-- ============================================================================

-- Show created permissions
SELECT 
  p.name,
  p.display_name,
  pm.name as module,
  p.resource,
  p.action
FROM permissions p
LEFT JOIN permission_modules pm ON p.module_id = pm.id
WHERE p.name LIKE '%contributions%'
ORDER BY p.name;

-- Show navigation items
SELECT 
  ni.key,
  ni.label_key,
  ni.href,
  ni.icon,
  pm.name as module,
  p.name as required_permission
FROM navigation_items ni
LEFT JOIN permission_modules pm ON ni.module_id = pm.id
LEFT JOIN permissions p ON ni.permission_id = p.id
WHERE ni.key IN ('admin_contributions', 'pending_contributions')
ORDER BY ni.order_index;

-- Show role assignments
SELECT 
  r.name as role,
  r.display_name as role_display,
  COUNT(DISTINCT rp.permission_id) as permission_count
FROM roles r
LEFT JOIN role_permissions rp ON r.id = rp.role_id
LEFT JOIN permissions p ON rp.permission_id = p.id
WHERE p.name LIKE '%contributions%'
GROUP BY r.id, r.name, r.display_name
ORDER BY r.name;

