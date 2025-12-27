-- Create payment_methods:manage permission and assign to admin roles
-- This migration creates the payment methods management permission

-- Insert payment methods permission if it doesn't exist
INSERT INTO admin_permissions (name, display_name, display_name_ar, description, description_ar, resource, action, is_system) VALUES
('payment_methods:manage', 'Manage Payment Methods', 'إدارة طرق الدفع', 'Full payment methods management', 'إدارة كاملة لطرق الدفع', 'payment_methods', 'manage', true)
ON CONFLICT (name) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    display_name_ar = EXCLUDED.display_name_ar,
    description = EXCLUDED.description,
    description_ar = EXCLUDED.description_ar,
    resource = EXCLUDED.resource,
    action = EXCLUDED.action,
    updated_at = NOW();

-- Assign payment_methods:manage permission to admin and super_admin roles
DO $$
DECLARE
    payment_methods_permission_id UUID;
    admin_role_id UUID;
    super_admin_role_id UUID;
BEGIN
    -- Get permission ID
    SELECT id INTO payment_methods_permission_id 
    FROM admin_permissions 
    WHERE name = 'payment_methods:manage' 
    LIMIT 1;
    
    -- Get admin role IDs
    SELECT id INTO admin_role_id FROM admin_roles WHERE name = 'admin' LIMIT 1;
    SELECT id INTO super_admin_role_id FROM admin_roles WHERE name = 'super_admin' LIMIT 1;
    
    -- Assign to admin role
    IF payment_methods_permission_id IS NOT NULL AND admin_role_id IS NOT NULL THEN
        INSERT INTO admin_role_permissions (role_id, permission_id)
        VALUES (admin_role_id, payment_methods_permission_id)
        ON CONFLICT (role_id, permission_id) DO NOTHING;
    END IF;
    
    -- Assign to super_admin role
    IF payment_methods_permission_id IS NOT NULL AND super_admin_role_id IS NOT NULL THEN
        INSERT INTO admin_role_permissions (role_id, permission_id)
        VALUES (super_admin_role_id, payment_methods_permission_id)
        ON CONFLICT (role_id, permission_id) DO NOTHING;
    END IF;
END $$;

-- Update payment methods menu item to use the new permission
DO $$
DECLARE
    admin_parent_id UUID;
    payment_methods_permission_id UUID;
BEGIN
    -- Get admin parent menu item ID
    SELECT id INTO admin_parent_id FROM admin_menu_items WHERE href = '/admin' AND parent_id IS NULL LIMIT 1;
    
    -- Get payment_methods:manage permission ID
    SELECT id INTO payment_methods_permission_id FROM admin_permissions WHERE name = 'payment_methods:manage' LIMIT 1;
    
    -- Only proceed if both exist
    IF admin_parent_id IS NOT NULL AND payment_methods_permission_id IS NOT NULL THEN
        -- Update existing menu item if it exists
        UPDATE admin_menu_items
        SET
            permission_id = payment_methods_permission_id,
            updated_at = NOW()
        WHERE href = '/admin/payment-methods' 
        AND parent_id = admin_parent_id;
    END IF;
END $$;

