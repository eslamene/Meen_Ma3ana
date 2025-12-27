-- Fix ambiguous column reference in get_user_menu_items function
-- The subquery uses 'id' without table qualification, causing ambiguity

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
    ORDER BY mi.sort_order, mi.label;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

