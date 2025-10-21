import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function testRBACSystem() {
  console.log('🔍 Testing RBAC System...\n')

  try {
    // Test 1: Check if tables exist
    console.log('1. Checking RBAC tables...')
    
    const { data: roles, error: rolesError } = await supabase
      .from('roles')
      .select('*')
      .limit(5)
    
    if (rolesError) {
      console.log('❌ Roles table not found:', rolesError.message)
      return
    }
    
    console.log(`✅ Found ${roles.length} roles:`)
    roles.forEach(role => {
      console.log(`   - ${role.display_name} (${role.name})`)
    })

    // Test 2: Check permissions
    console.log('\n2. Checking permissions...')
    
    const { data: permissions, error: permissionsError } = await supabase
      .from('permissions')
      .select('*')
      .limit(10)
    
    if (permissionsError) {
      console.log('❌ Permissions table error:', permissionsError.message)
      return
    }
    
    console.log(`✅ Found ${permissions.length} permissions (showing first 10):`)
    permissions.forEach(perm => {
      console.log(`   - ${perm.display_name} (${perm.name})`)
    })

    // Test 3: Check role-permission mappings
    console.log('\n3. Checking role-permission mappings...')
    
    const { data: mappings, error: mappingsError } = await supabase
      .from('role_permissions')
      .select(`
        roles(name, display_name),
        permissions(name, display_name)
      `)
      .limit(10)
    
    if (mappingsError) {
      console.log('❌ Role-permissions mapping error:', mappingsError.message)
      return
    }
    
    console.log(`✅ Found ${mappings.length} role-permission mappings (showing first 10):`)
    mappings.forEach(mapping => {
      console.log(`   - ${mapping.roles.display_name} → ${mapping.permissions.display_name}`)
    })

    // Test 4: Check users table
    console.log('\n4. Checking users...')
    
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers()
    
    if (usersError) {
      console.log('❌ Users error:', usersError.message)
      return
    }
    
    console.log(`✅ Found ${users.users.length} users:`)
    users.users.forEach(user => {
      console.log(`   - ${user.email} (ID: ${user.id.substring(0, 8)}...)`)
    })

    // Test 5: Check user roles
    console.log('\n5. Checking user role assignments...')
    
    const { data: userRoles, error: userRolesError } = await supabase
      .from('user_roles')
      .select(`
        user_id,
        roles(name, display_name)
      `)
    
    if (userRolesError) {
      console.log('❌ User roles error:', userRolesError.message)
    } else {
      console.log(`✅ Found ${userRoles.length} user role assignments:`)
      userRoles.forEach(ur => {
        const userId = ur.user_id.substring(0, 8)
        console.log(`   - User ${userId}... → ${ur.roles.display_name}`)
      })
    }

    console.log('\n🎉 RBAC System Test Complete!')
    console.log('\n📋 Next Steps:')
    console.log('1. Visit http://localhost:3000/en/admin/rbac to manage roles')
    console.log('2. Assign admin role to your user using the SQL queries provided')
    console.log('3. Test case creation restrictions for non-admin users')

  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

testRBACSystem()
