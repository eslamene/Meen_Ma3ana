require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Permission mapping to fix missing resource/action fields
const permissionMappings = {
  // Admin permissions
  'admin:dashboard': { resource: 'admin', action: 'dashboard' },
  'admin:analytics': { resource: 'admin', action: 'analytics' },
  'admin:users': { resource: 'admin', action: 'users' },
  'admin:rbac': { resource: 'admin', action: 'rbac' },
  
  // Case permissions
  'cases:create': { resource: 'cases', action: 'create' },
  'cases:read': { resource: 'cases', action: 'read' },
  'cases:update': { resource: 'cases', action: 'update' },
  'cases:delete': { resource: 'cases', action: 'delete' },
  'cases:publish': { resource: 'cases', action: 'publish' },
  'cases:view_public': { resource: 'cases', action: 'view_public' },
  
  // Contribution permissions
  'contributions:create': { resource: 'contributions', action: 'create' },
  'contributions:read': { resource: 'contributions', action: 'read' },
  'contributions:update': { resource: 'contributions', action: 'update' },
  'contributions:approve': { resource: 'contributions', action: 'approve' },
  'contributions:refund': { resource: 'contributions', action: 'refund' },
  
  // User permissions
  'users:read': { resource: 'users', action: 'read' },
  'users:update': { resource: 'users', action: 'update' },
  'users:delete': { resource: 'users', action: 'delete' },
  'users:manage': { resource: 'users', action: 'manage' },
  
  // Profile permissions
  'profile:read': { resource: 'profile', action: 'read' },
  'profile:update': { resource: 'profile', action: 'update' },
  
  // Notification permissions
  'notifications:read': { resource: 'notifications', action: 'read' },
  'notifications:manage': { resource: 'notifications', action: 'manage' },
  
  // RBAC permissions
  'rbac:roles:manage': { resource: 'rbac', action: 'roles_manage' },
  'rbac:permissions:manage': { resource: 'rbac', action: 'permissions_manage' },
  'rbac:users:manage': { resource: 'rbac', action: 'users_manage' },
  
  // File permissions
  'files:view': { resource: 'files', action: 'view' },
  'files:upload': { resource: 'files', action: 'upload' },
  'files:delete': { resource: 'files', action: 'delete' },
  'files:manage': { resource: 'files', action: 'manage' },
  
  // Payment permissions
  'payments:view': { resource: 'payments', action: 'view' },
  'payments:process': { resource: 'payments', action: 'process' },
  'payments:refund': { resource: 'payments', action: 'refund' },
  
  // Report permissions
  'reports:view': { resource: 'reports', action: 'view' },
  'reports:export': { resource: 'reports', action: 'export' },
  'reports:create': { resource: 'reports', action: 'create' }
};

async function fixPermissionsFields() {
  try {
    console.log('🔧 Fixing permissions with missing resource/action fields...');
    
    // Get all permissions
    const { data: permissions, error } = await supabase
      .from('permissions')
      .select('id, name, display_name, resource, action');
    
    if (error) throw error;
    
    console.log(`Found ${permissions.length} permissions to check`);
    
    let fixedCount = 0;
    let skippedCount = 0;
    
    for (const permission of permissions) {
      const hasResource = permission.resource && permission.resource.trim() !== '';
      const hasAction = permission.action && permission.action.trim() !== '';
      
      // Check if permission needs fixing
      if (!hasResource || !hasAction) {
        console.log(`\n❌ Permission needs fixing: ${permission.name}`);
        console.log(`   Resource: ${permission.resource || 'MISSING'}`);
        console.log(`   Action: ${permission.action || 'MISSING'}`);
        
        // Try to find mapping
        const mapping = permissionMappings[permission.name];
        
        if (mapping) {
          // Update the permission
          const { error: updateError } = await supabase
            .from('permissions')
            .update({
              resource: mapping.resource,
              action: mapping.action
            })
            .eq('id', permission.id);
          
          if (updateError) {
            console.error(`   ❌ Failed to update: ${updateError.message}`);
          } else {
            console.log(`   ✅ Fixed: resource="${mapping.resource}", action="${mapping.action}"`);
            fixedCount++;
          }
        } else {
          // Try to extract from permission name
          const parts = permission.name.split(':');
          if (parts.length >= 2) {
            const resource = parts[0];
            const action = parts.slice(1).join('_');
            
            const { error: updateError } = await supabase
              .from('permissions')
              .update({
                resource: resource,
                action: action
              })
              .eq('id', permission.id);
            
            if (updateError) {
              console.error(`   ❌ Failed to auto-fix: ${updateError.message}`);
            } else {
              console.log(`   ✅ Auto-fixed: resource="${resource}", action="${action}"`);
              fixedCount++;
            }
          } else {
            console.log(`   ⚠️  Cannot auto-fix permission: ${permission.name}`);
            skippedCount++;
          }
        }
      } else {
        // Permission is already correct
        console.log(`✅ ${permission.name} - OK`);
      }
    }
    
    console.log(`\n🎉 Permissions fix complete!`);
    console.log(`   Fixed: ${fixedCount}`);
    console.log(`   Skipped: ${skippedCount}`);
    console.log(`   Total: ${permissions.length}`);
    
    // Verify all permissions now have resource and action
    const { data: verifyPermissions, error: verifyError } = await supabase
      .from('permissions')
      .select('name, resource, action')
      .or('resource.is.null,action.is.null,resource.eq.,action.eq.');
    
    if (verifyError) throw verifyError;
    
    if (verifyPermissions.length === 0) {
      console.log('\n✅ All permissions now have resource and action fields!');
    } else {
      console.log(`\n⚠️  Still ${verifyPermissions.length} permissions with missing fields:`);
      verifyPermissions.forEach(p => {
        console.log(`   - ${p.name}: resource="${p.resource || 'MISSING'}", action="${p.action || 'MISSING'}"`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error fixing permissions:', error);
  }
}

fixPermissionsFields();
