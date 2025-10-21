-- Add permission modules for better organization

-- Create modules table
CREATE TABLE IF NOT EXISTS permission_modules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  color VARCHAR(20),
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add module_id to permissions table
ALTER TABLE permissions ADD COLUMN IF NOT EXISTS module_id UUID REFERENCES permission_modules(id) ON DELETE SET NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_permissions_module_id ON permissions(module_id);

-- Insert permission modules
INSERT INTO permission_modules (name, display_name, description, icon, color, sort_order) VALUES
  ('admin', 'Administration', 'System administration and configuration', 'Settings', 'red', 1),
  ('cases', 'Case Management', 'Managing charity cases and requests', 'Heart', 'blue', 2),
  ('contributions', 'Contributions', 'Donation and contribution management', 'DollarSign', 'green', 3),
  ('users', 'User Management', 'User accounts and profile management', 'Users', 'purple', 4),
  ('notifications', 'Notifications', 'System notifications and messaging', 'Bell', 'yellow', 5),
  ('reports', 'Reports & Analytics', 'Data analysis and reporting tools', 'BarChart3', 'indigo', 6),
  ('files', 'File Management', 'File upload and document management', 'FileText', 'gray', 7),
  ('payments', 'Payment Processing', 'Payment and transaction management', 'CreditCard', 'emerald', 8),
  ('profile', 'Profile & Settings', 'Personal profile and account settings', 'User', 'orange', 9)
ON CONFLICT (name) DO NOTHING;

-- Update existing permissions to assign them to modules
UPDATE permissions SET module_id = (SELECT id FROM permission_modules WHERE name = 'admin') 
WHERE resource = 'admin' OR resource = 'rbac';

UPDATE permissions SET module_id = (SELECT id FROM permission_modules WHERE name = 'cases') 
WHERE resource = 'cases';

UPDATE permissions SET module_id = (SELECT id FROM permission_modules WHERE name = 'contributions') 
WHERE resource = 'contributions';

UPDATE permissions SET module_id = (SELECT id FROM permission_modules WHERE name = 'users') 
WHERE resource = 'users';

UPDATE permissions SET module_id = (SELECT id FROM permission_modules WHERE name = 'notifications') 
WHERE resource = 'notifications';

UPDATE permissions SET module_id = (SELECT id FROM permission_modules WHERE name = 'files') 
WHERE resource = 'files';

UPDATE permissions SET module_id = (SELECT id FROM permission_modules WHERE name = 'profile') 
WHERE resource = 'profile';

-- Add some additional permissions for completeness
INSERT INTO permissions (name, display_name, description, resource, action, module_id, is_system) VALUES
  ('reports:view', 'View Reports', 'Access system reports and analytics', 'reports', 'view', 
   (SELECT id FROM permission_modules WHERE name = 'reports'), true),
  ('reports:export', 'Export Reports', 'Export reports and data', 'reports', 'export', 
   (SELECT id FROM permission_modules WHERE name = 'reports'), true),
  ('payments:view', 'View Payments', 'View payment transactions', 'payments', 'view', 
   (SELECT id FROM permission_modules WHERE name = 'payments'), true),
  ('payments:process', 'Process Payments', 'Process payment transactions', 'payments', 'process', 
   (SELECT id FROM permission_modules WHERE name = 'payments'), true),
  ('files:view', 'View Files', 'View uploaded files and documents', 'files', 'view', 
   (SELECT id FROM permission_modules WHERE name = 'files'), true),
  ('files:delete', 'Delete Files', 'Remove files from system', 'files', 'delete', 
   (SELECT id FROM permission_modules WHERE name = 'files'), true)
ON CONFLICT (name) DO NOTHING;
