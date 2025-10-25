require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixRBACNavigation() {
  try {
    console.log('🔧 Fixing RBAC Navigation...');
    
    // 1. Get admin role
    const { data: adminRole, error: roleError } = await supabase
      .from('roles')
      .select('id, name')
      .eq('name', 'admin')
      .single();
    
    if (roleError) throw roleError;
    console.log('✅ Found admin role:', adminRole.id);
    
    // 2. Get all RBAC-related permissions
    const { data: rbacPermissions, error: permError } = await supabase
      .from('permissions')
      .select('id, name, display_name')
      .or('resource.eq.rbac,name.ilike.admin:rbac%,name.ilike.rbac:%');
    
    if (permError) throw permError;
    console.log('✅ Found RBAC permissions:', rbacPermissions.length);
    
    // 3. Assign all RBAC permissions to admin role
    for (const permission of rbacPermissions) {
      const { error: assignError } = await supabase
        .from('role_permissions')
        .upsert({
          role_id: adminRole.id,
          permission_id: permission.id
        }, {
          onConflict: 'role_id,permission_id',
          ignoreDuplicates: true
        });
      
      if (assignError && !assignError.message.includes('duplicate')) {
        console.error('❌ Error assigning', permission.name, ':', assignError.message);
      } else {
        console.log('✅ Assigned', permission.name);
      }
    }
    
    // 4. Check if admin user exists and assign admin role
    const { data: users } = await supabase.auth.admin.listUsers();
    const adminUser = users.users.find(u => u.email === 'admin@meenma3ana.com');
    
    if (adminUser) {
      console.log('✅ Found admin user:', adminUser.email);
      
      // Assign admin role to admin user
      const { error: userRoleError } = await supabase
        .from('user_roles')
        .upsert({
          user_id: adminUser.id,
          role_id: adminRole.id,
          is_active: true
        }, {
          onConflict: 'user_id,role_id',
          ignoreDuplicates: true
        });
      
      if (userRoleError && !userRoleError.message.includes('duplicate')) {
        console.error('❌ Error assigning admin role to user:', userRoleError.message);
      } else {
        console.log('✅ Admin role assigned to admin user');
      }
    } else {
      console.log('⚠️  Admin user not found. Please create one or login with an existing admin user.');
    }
    
    // 5. Verify RBAC module exists and is active
    const { data: rbacModule, error: moduleError } = await supabase
      .from('permission_modules')
      .select('*')
      .eq('name', 'rbac')
      .single();
    
    if (moduleError) {
      console.log('❌ RBAC module not found:', moduleError.message);
    } else {
      console.log('✅ RBAC module exists:', rbacModule.display_name);
      console.log('   - Active:', rbacModule.is_active);
      console.log('   - Sort order:', rbacModule.sort_order);
    }
    
    console.log('\n🎉 RBAC Navigation fix complete!');
    console.log('\n📋 Next steps:');
    console.log('1. Login as admin@meenma3ana.com (password: admin123)');
    console.log('2. Refresh the page to see RBAC Management in navigation');
    console.log('3. The RBAC module should appear in the sidebar');
    
  } catch (error) {
    console.error('❌ Error fixing RBAC navigation:', error);
  }
}

fixRBACNavigation();
