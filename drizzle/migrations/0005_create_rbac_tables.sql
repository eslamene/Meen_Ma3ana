-- Create RBAC tables for role-based access control

-- Create roles table
CREATE TABLE IF NOT EXISTS roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create permissions table
CREATE TABLE IF NOT EXISTS permissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  display_name VARCHAR(150) NOT NULL,
  description TEXT,
  resource VARCHAR(50) NOT NULL,
  action VARCHAR(50) NOT NULL,
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create role_permissions junction table
CREATE TABLE IF NOT EXISTS role_permissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(role_id, permission_id)
);

-- Create user_roles table (extends the existing users)
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  assigned_by UUID,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  UNIQUE(user_id, role_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON role_permissions(permission_id);
CREATE INDEX IF NOT EXISTS idx_permissions_resource_action ON permissions(resource, action);

-- Insert initial roles
INSERT INTO roles (name, display_name, description, is_system) VALUES
  ('admin', 'Administrator', 'Full system access with all permissions', true),
  ('moderator', 'Moderator', 'Can manage cases and contributions but not system settings', true),
  ('donor', 'Donor', 'Regular user who can donate and view cases', true),
  ('beneficiary', 'Beneficiary', 'Can create and manage their own cases', false)
ON CONFLICT (name) DO NOTHING;

-- Insert initial permissions
INSERT INTO permissions (name, display_name, description, resource, action, is_system) VALUES
  -- Admin permissions
  ('admin:dashboard', 'Access Admin Dashboard', 'View admin dashboard and analytics', 'admin', 'read', true),
  ('admin:analytics', 'View Analytics', 'Access system analytics and reports', 'admin', 'analytics', true),
  ('admin:users', 'Manage Users', 'Create, update, and delete users', 'users', 'manage', true),
  ('admin:rbac', 'Manage RBAC', 'Configure roles and permissions', 'rbac', 'manage', true),
  
  -- Case permissions
  ('cases:create', 'Create Cases', 'Create new charity cases', 'cases', 'create', true),
  ('cases:read', 'View Cases', 'View case details and listings', 'cases', 'read', true),
  ('cases:update', 'Edit Cases', 'Modify existing cases', 'cases', 'update', true),
  ('cases:delete', 'Delete Cases', 'Remove cases from system', 'cases', 'delete', true),
  ('cases:publish', 'Publish Cases', 'Change case status to published', 'cases', 'publish', true),
  
  -- Contribution permissions
  ('contributions:create', 'Make Contributions', 'Donate to cases', 'contributions', 'create', true),
  ('contributions:read', 'View Contributions', 'View contribution history and details', 'contributions', 'read', true),
  ('contributions:approve', 'Approve Contributions', 'Approve or reject contributions', 'contributions', 'approve', true),
  ('contributions:refund', 'Process Refunds', 'Issue refunds for contributions', 'contributions', 'refund', true),
  
  -- User permissions
  ('users:read', 'View Users', 'View user profiles and information', 'users', 'read', true),
  ('users:update', 'Edit Users', 'Modify user information', 'users', 'update', true),
  ('users:delete', 'Delete Users', 'Remove users from system', 'users', 'delete', true),
  
  -- Profile permissions
  ('profile:read', 'View Own Profile', 'View own profile information', 'profile', 'read', true),
  ('profile:update', 'Edit Own Profile', 'Modify own profile information', 'profile', 'update', true),
  
  -- Notification permissions
  ('notifications:read', 'View Notifications', 'View system notifications', 'notifications', 'read', true),
  ('notifications:manage', 'Manage Notifications', 'Create and send notifications', 'notifications', 'manage', true)
ON CONFLICT (name) DO NOTHING;

-- Create role-permission mappings
WITH role_permission_mappings AS (
  SELECT 
    r.id as role_id,
    p.id as permission_id
  FROM roles r
  CROSS JOIN permissions p
  WHERE 
    (r.name = 'admin') OR
    (r.name = 'moderator' AND p.name IN (
      'admin:dashboard', 'admin:analytics',
      'cases:create', 'cases:read', 'cases:update', 'cases:publish',
      'contributions:read', 'contributions:approve',
      'users:read',
      'profile:read', 'profile:update',
      'notifications:read'
    )) OR
    (r.name = 'donor' AND p.name IN (
      'cases:read',
      'contributions:create', 'contributions:read',
      'profile:read', 'profile:update',
      'notifications:read'
    )) OR
    (r.name = 'beneficiary' AND p.name IN (
      'cases:create', 'cases:read', 'cases:update',
      'contributions:read',
      'profile:read', 'profile:update',
      'notifications:read'
    ))
)
INSERT INTO role_permissions (role_id, permission_id)
SELECT role_id, permission_id FROM role_permission_mappings
ON CONFLICT (role_id, permission_id) DO NOTHING;
