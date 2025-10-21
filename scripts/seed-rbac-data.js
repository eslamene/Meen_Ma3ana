require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Define initial roles
const initialRoles = [
  {
    name: 'admin',
    display_name: 'Administrator',
    description: 'Full system access with all permissions',
    is_system: true
  },
  {
    name: 'moderator',
    display_name: 'Moderator',
    description: 'Can manage cases and contributions but not system settings',
    is_system: true
  },
  {
    name: 'donor',
    display_name: 'Donor',
    description: 'Regular user who can donate and view cases',
    is_system: true
  },
  {
    name: 'beneficiary',
    display_name: 'Beneficiary',
    description: 'Can create and manage their own cases',
    is_system: false
  }
];

// Define initial permissions
const initialPermissions = [
  // Admin permissions
  { name: 'admin:dashboard', display_name: 'Access Admin Dashboard', description: 'View admin dashboard and analytics', resource: 'admin', action: 'read' },
  { name: 'admin:analytics', display_name: 'View Analytics', description: 'Access system analytics and reports', resource: 'admin', action: 'analytics' },
  { name: 'admin:users', display_name: 'Manage Users', description: 'Create, update, and delete users', resource: 'users', action: 'manage' },
  { name: 'admin:rbac', display_name: 'Manage RBAC', description: 'Configure roles and permissions', resource: 'rbac', action: 'manage' },
  
  // Case permissions
  { name: 'cases:create', display_name: 'Create Cases', description: 'Create new charity cases', resource: 'cases', action: 'create' },
  { name: 'cases:read', display_name: 'View Cases', description: 'View case details and listings', resource: 'cases', action: 'read' },
  { name: 'cases:update', display_name: 'Edit Cases', description: 'Modify existing cases', resource: 'cases', action: 'update' },
  { name: 'cases:delete', display_name: 'Delete Cases', description: 'Remove cases from system', resource: 'cases', action: 'delete' },
  { name: 'cases:publish', display_name: 'Publish Cases', description: 'Change case status to published', resource: 'cases', action: 'publish' },
  
  // Contribution permissions
  { name: 'contributions:create', display_name: 'Make Contributions', description: 'Donate to cases', resource: 'contributions', action: 'create' },
  { name: 'contributions:read', display_name: 'View Contributions', description: 'View contribution history and details', resource: 'contributions', action: 'read' },
  { name: 'contributions:approve', display_name: 'Approve Contributions', description: 'Approve or reject contributions', resource: 'contributions', action: 'approve' },
  { name: 'contributions:refund', display_name: 'Process Refunds', description: 'Issue refunds for contributions', resource: 'contributions', action: 'refund' },
  
  // User permissions
  { name: 'users:read', display_name: 'View Users', description: 'View user profiles and information', resource: 'users', action: 'read' },
  { name: 'users:update', display_name: 'Edit Users', description: 'Modify user information', resource: 'users', action: 'update' },
  { name: 'users:delete', display_name: 'Delete Users', description: 'Remove users from system', resource: 'users', action: 'delete' },
  
  // Profile permissions
  { name: 'profile:read', display_name: 'View Own Profile', description: 'View own profile information', resource: 'profile', action: 'read' },
  { name: 'profile:update', display_name: 'Edit Own Profile', description: 'Modify own profile information', resource: 'profile', action: 'update' },
  
  // Notification permissions
  { name: 'notifications:read', display_name: 'View Notifications', description: 'View system notifications', resource: 'notifications', action: 'read' },
  { name: 'notifications:manage', display_name: 'Manage Notifications', description: 'Create and send notifications', resource: 'notifications', action: 'manage' }
];

// Define role-permission mappings
const rolePermissionMappings = {
  admin: [
    'admin:dashboard', 'admin:analytics', 'admin:users', 'admin:rbac',
    'cases:create', 'cases:read', 'cases:update', 'cases:delete', 'cases:publish',
    'contributions:create', 'contributions:read', 'contributions:approve', 'contributions:refund',
    'users:read', 'users:update', 'users:delete',
    'profile:read', 'profile:update',
    'notifications:read', 'notifications:manage'
  ],
  moderator: [
    'admin:dashboard', 'admin:analytics',
    'cases:create', 'cases:read', 'cases:update', 'cases:publish',
    'contributions:read', 'contributions:approve',
    'users:read',
    'profile:read', 'profile:update',
    'notifications:read'
  ],
  donor: [
    'cases:read',
    'contributions:create', 'contributions:read',
    'profile:read', 'profile:update',
    'notifications:read'
  ],
  beneficiary: [
    'cases:create', 'cases:read', 'cases:update',
    'contributions:read',
    'profile:read', 'profile:update',
    'notifications:read'
  ]
};

async function seedRBACData() {
  try {
    console.log('Seeding RBAC data...');

    // Insert roles
    console.log('\nInserting roles...');
    for (const role of initialRoles) {
      const { data, error } = await supabase
        .from('roles')
        .upsert(role, { onConflict: 'name' })
        .select()
        .single();
      
      if (error) {
        console.error(`Error inserting role ${role.name}:`, error);
      } else {
        console.log(`✓ Role: ${role.display_name}`);
      }
    }

    // Insert permissions
    console.log('\nInserting permissions...');
    for (const permission of initialPermissions) {
      const { data, error } = await supabase
        .from('permissions')
        .upsert({ ...permission, is_system: true }, { onConflict: 'name' })
        .select()
        .single();
      
      if (error) {
        console.error(`Error inserting permission ${permission.name}:`, error);
      } else {
        console.log(`✓ Permission: ${permission.display_name}`);
      }
    }

    // Create role-permission mappings
    console.log('\nCreating role-permission mappings...');
    for (const [roleName, permissionNames] of Object.entries(rolePermissionMappings)) {
      // Get role ID
      const { data: roleData, error: roleError } = await supabase
        .from('roles')
        .select('id')
        .eq('name', roleName)
        .single();

      if (roleError) {
        console.error(`Error finding role ${roleName}:`, roleError);
        continue;
      }

      // Get permission IDs
      const { data: permissionsData, error: permissionsError } = await supabase
        .from('permissions')
        .select('id, name')
        .in('name', permissionNames);

      if (permissionsError) {
        console.error(`Error finding permissions for role ${roleName}:`, permissionsError);
        continue;
      }

      // Create role-permission associations
      for (const permission of permissionsData) {
        const { error: mappingError } = await supabase
          .from('role_permissions')
          .upsert({
            role_id: roleData.id,
            permission_id: permission.id
          }, { onConflict: 'role_id,permission_id' });

        if (mappingError) {
          console.error(`Error mapping ${roleName} to ${permission.name}:`, mappingError);
        }
      }
      
      console.log(`✓ Mapped ${permissionNames.length} permissions to ${roleName}`);
    }

    console.log('\n🎉 RBAC data seeded successfully!');
    
  } catch (error) {
    console.error('❌ Error seeding RBAC data:', error);
    process.exit(1);
  }
}

// Execute if run directly
if (require.main === module) {
  seedRBACData();
}

module.exports = { seedRBACData };
