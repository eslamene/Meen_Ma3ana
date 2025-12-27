-- Add Beneficiary CRUD permissions
INSERT INTO permissions (name, display_name, description, resource, action, module_id) VALUES
-- Beneficiary List/View permissions
('view:beneficiaries', 'View Beneficiaries', 'View the list of all beneficiaries', 'beneficiaries', 'view', (SELECT id FROM permission_modules WHERE name = 'beneficiaries')),
('view:own_beneficiaries', 'View Own Beneficiaries', 'View beneficiaries created by the user', 'beneficiaries', 'view_own', (SELECT id FROM permission_modules WHERE name = 'beneficiaries')),

-- Beneficiary Create permissions
('create:beneficiaries', 'Create Beneficiaries', 'Create new beneficiary profiles', 'beneficiaries', 'create', (SELECT id FROM permission_modules WHERE name = 'beneficiaries')),

-- Beneficiary Update permissions
('update:beneficiaries', 'Update Beneficiaries', 'Update beneficiary information', 'beneficiaries', 'update', (SELECT id FROM permission_modules WHERE name = 'beneficiaries')),
('update:own_beneficiaries', 'Update Own Beneficiaries', 'Update beneficiaries created by the user', 'beneficiaries', 'update_own', (SELECT id FROM permission_modules WHERE name = 'beneficiaries')),

-- Beneficiary Delete permissions
('delete:beneficiaries', 'Delete Beneficiaries', 'Delete beneficiary profiles', 'beneficiaries', 'delete', (SELECT id FROM permission_modules WHERE name = 'beneficiaries')),
('delete:own_beneficiaries', 'Delete Own Beneficiaries', 'Delete beneficiaries created by the user', 'beneficiaries', 'delete_own', (SELECT id FROM permission_modules WHERE name = 'beneficiaries')),

-- Beneficiary Document permissions
('view:beneficiary_documents', 'View Beneficiary Documents', 'View beneficiary documents and files', 'beneficiary_documents', 'view', (SELECT id FROM permission_modules WHERE name = 'beneficiaries')),
('upload:beneficiary_documents', 'Upload Beneficiary Documents', 'Upload documents for beneficiaries', 'beneficiary_documents', 'create', (SELECT id FROM permission_modules WHERE name = 'beneficiaries')),
('update:beneficiary_documents', 'Update Beneficiary Documents', 'Update beneficiary document information', 'beneficiary_documents', 'update', (SELECT id FROM permission_modules WHERE name = 'beneficiaries')),
('delete:beneficiary_documents', 'Delete Beneficiary Documents', 'Delete beneficiary documents', 'beneficiary_documents', 'delete', (SELECT id FROM permission_modules WHERE name = 'beneficiaries')),

-- Beneficiary Search permissions
('search:beneficiaries', 'Search Beneficiaries', 'Search and filter beneficiaries', 'beneficiaries', 'search', (SELECT id FROM permission_modules WHERE name = 'beneficiaries')),

-- Beneficiary Export permissions
('export:beneficiaries', 'Export Beneficiaries', 'Export beneficiary data', 'beneficiaries', 'export', (SELECT id FROM permission_modules WHERE name = 'beneficiaries'))

ON CONFLICT (name) DO NOTHING;

-- Create beneficiaries module if it doesn't exist
INSERT INTO permission_modules (name, display_name, description, icon, order_index) VALUES
('beneficiaries', 'Beneficiaries', 'Manage beneficiary profiles and documents', 'users', 3)
ON CONFLICT (name) DO NOTHING;

-- Assign all beneficiary permissions to super_admin role
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
    r.id as role_id,
    p.id as permission_id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'super_admin' 
AND p.name IN (
    'view:beneficiaries',
    'view:own_beneficiaries',
    'create:beneficiaries',
    'update:beneficiaries',
    'update:own_beneficiaries',
    'delete:beneficiaries',
    'delete:own_beneficiaries',
    'view:beneficiary_documents',
    'upload:beneficiary_documents',
    'update:beneficiary_documents',
    'delete:beneficiary_documents',
    'search:beneficiaries',
    'export:beneficiaries'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Assign all beneficiary permissions to admin role
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
    r.id as role_id,
    p.id as permission_id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'admin' 
AND p.name IN (
    'view:beneficiaries',
    'view:own_beneficiaries',
    'create:beneficiaries',
    'update:beneficiaries',
    'update:own_beneficiaries',
    'delete:beneficiaries',
    'delete:own_beneficiaries',
    'view:beneficiary_documents',
    'upload:beneficiary_documents',
    'update:beneficiary_documents',
    'delete:beneficiary_documents',
    'search:beneficiaries',
    'export:beneficiaries'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Assign limited beneficiary permissions to moderator role
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
    r.id as role_id,
    p.id as permission_id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'moderator' 
AND p.name IN (
    'view:beneficiaries',
    'view:own_beneficiaries',
    'create:beneficiaries',
    'update:own_beneficiaries',
    'view:beneficiary_documents',
    'upload:beneficiary_documents',
    'search:beneficiaries'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Assign view-only permissions to donor role
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
    r.id as role_id,
    p.id as permission_id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'donor' 
AND p.name IN (
    'view:own_beneficiaries',
    'view:beneficiary_documents'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Note: Navigation is built dynamically from permission_modules table
-- No separate navigation_items table needed - the system uses RBAC modules
