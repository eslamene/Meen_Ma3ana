-- =====================================================
-- Fix get_user_menu_items to include parent items when children are accessible
-- This ensures that if a user has permission for any child, the parent is also shown
-- =====================================================

CREATE OR REPLACE FUNCTION get_user_menu_items(user_id UUID)
RETURNS TABLE (
    id UUID,
    parent_id UUID,
    label VARCHAR,
    label_ar VARCHAR,
    href VARCHAR,
    icon VARCHAR,
    description TEXT,
    sort_order INTEGER
) AS $$
BEGIN
    RETURN QUERY
    WITH accessible_items AS (
        -- Get all menu items the user has direct permission for
        SELECT 
            mi.id,
            mi.parent_id,
            mi.label,
            mi.label_ar,
            mi.href,
            mi.icon,
            mi.description,
            mi.sort_order
        FROM admin_menu_items mi
        WHERE mi.is_active = true
        AND (
            mi.permission_id IS NULL -- Public menu items
            OR user_has_permission(user_id, (SELECT name FROM admin_permissions WHERE admin_permissions.id = mi.permission_id))
        )
    ),
    accessible_parents AS (
        -- Get all parent items that have accessible children
        SELECT DISTINCT
            p.id,
            p.parent_id,
            p.label,
            p.label_ar,
            p.href,
            p.icon,
            p.description,
            p.sort_order
        FROM admin_menu_items p
        INNER JOIN accessible_items c ON c.parent_id = p.id
        WHERE p.is_active = true
    ),
    all_accessible AS (
        -- Combine accessible items and their parents
        SELECT * FROM accessible_items
        UNION
        SELECT * FROM accessible_parents
    )
    SELECT 
        a.id,
        a.parent_id,
        a.label,
        a.label_ar,
        a.href,
        a.icon,
        a.description,
        a.sort_order
    FROM all_accessible a
    ORDER BY a.sort_order, a.label;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

