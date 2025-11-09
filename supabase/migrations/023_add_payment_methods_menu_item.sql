-- Add Payment Methods menu item to admin menu
-- This migration adds a menu item for managing payment methods

DO $$
DECLARE
    admin_parent_id UUID;
    payment_methods_permission_id UUID;
BEGIN
    -- Get admin parent menu item ID
    SELECT id INTO admin_parent_id FROM admin_menu_items WHERE href = '/admin' AND parent_id IS NULL LIMIT 1;
    
    -- Get payment_methods:manage permission ID (preferred)
    SELECT id INTO payment_methods_permission_id FROM admin_permissions WHERE name = 'payment_methods:manage' LIMIT 1;
    
    -- Fallback to admin:dashboard if payment_methods:manage doesn't exist yet
    IF payment_methods_permission_id IS NULL THEN
        SELECT id INTO payment_methods_permission_id FROM admin_permissions WHERE name = 'admin:dashboard' LIMIT 1;
    END IF;
    
    -- Fallback to cases:manage if admin:dashboard doesn't exist
    IF payment_methods_permission_id IS NULL THEN
        SELECT id INTO payment_methods_permission_id FROM admin_permissions WHERE name = 'cases:manage' LIMIT 1;
    END IF;
    
    -- Only proceed if admin parent exists
    IF admin_parent_id IS NOT NULL THEN
        -- Check if menu item already exists
        IF NOT EXISTS (
            SELECT 1 FROM admin_menu_items 
            WHERE href = '/admin/payment-methods' 
            AND parent_id = admin_parent_id
        ) THEN
            -- Insert the Payment Methods menu item
            INSERT INTO admin_menu_items (parent_id, label, label_ar, href, icon, description, sort_order, permission_id)
            VALUES (
                admin_parent_id,
                'Payment Methods',
                'طرق الدفع',
                '/admin/payment-methods',
                'CreditCard',
                'Manage payment methods',
                9,
                payment_methods_permission_id
            );
        ELSE
            -- Update existing menu item
            UPDATE admin_menu_items
            SET
                label = 'Payment Methods',
                label_ar = 'طرق الدفع',
                description = 'Manage payment methods',
                icon = 'CreditCard',
                permission_id = payment_methods_permission_id,
                sort_order = 9,
                updated_at = NOW()
            WHERE href = '/admin/payment-methods' 
            AND parent_id = admin_parent_id;
        END IF;
    END IF;
END $$;

