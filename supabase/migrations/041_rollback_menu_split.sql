-- =====================================================
-- Rollback: Restore menu items to direct children of /admin
-- This undoes the Case Management and System Management grouping
-- =====================================================

DO $$
DECLARE
    admin_parent_id UUID;
    case_mgmt_parent_id UUID;
    system_mgmt_parent_id UUID;
BEGIN
    -- Get admin parent menu item ID
    SELECT id INTO admin_parent_id FROM admin_menu_items WHERE href = '/admin' AND parent_id IS NULL LIMIT 1;
    
    -- Get Case Management and System Management parent IDs
    SELECT id INTO case_mgmt_parent_id 
    FROM admin_menu_items 
    WHERE href = '/admin/case-management' AND parent_id = admin_parent_id 
    LIMIT 1;
    
    SELECT id INTO system_mgmt_parent_id 
    FROM admin_menu_items 
    WHERE href = '/admin/system-management' AND parent_id = admin_parent_id 
    LIMIT 1;
    
    -- Only proceed if admin parent exists
    IF admin_parent_id IS NOT NULL THEN
        -- Move all children back to admin parent
        
        -- Case Management children
        IF case_mgmt_parent_id IS NOT NULL THEN
            UPDATE admin_menu_items
            SET parent_id = admin_parent_id, updated_at = NOW()
            WHERE parent_id = case_mgmt_parent_id;
            
            -- Delete Case Management parent
            DELETE FROM admin_menu_items WHERE id = case_mgmt_parent_id;
        END IF;
        
        -- System Management children
        IF system_mgmt_parent_id IS NOT NULL THEN
            UPDATE admin_menu_items
            SET parent_id = admin_parent_id, updated_at = NOW()
            WHERE parent_id = system_mgmt_parent_id;
            
            -- Delete System Management parent
            DELETE FROM admin_menu_items WHERE id = system_mgmt_parent_id;
        END IF;
    END IF;
END $$;

