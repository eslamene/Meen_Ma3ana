const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkRBACData() {
  console.log('🔍 Checking RBAC data in database...\n')

  try {
    // Check roles
    console.log('📋 Checking roles...')
    const { data: roles, error: rolesError } = await supabase
      .from('rbac_roles')
      .select('*')
      .eq('is_active', true)
    
    if (rolesError) {
      console.error('❌ Error fetching roles:', rolesError.message)
    } else {
      console.log(`✅ Found ${roles.length} roles:`)
      roles.forEach(role => {
        console.log(`   - ${role.display_name} (${role.name}) - ${role.is_system ? 'System' : 'Custom'}`)
      })
    }

    // Check permissions
    console.log('\n🔑 Checking permissions...')
    const { data: permissions, error: permissionsError } = await supabase
      .from('rbac_permissions')
      .select('*')
      .eq('is_active', true)
    
    if (permissionsError) {
      console.error('❌ Error fetching permissions:', permissionsError.message)
    } else {
      console.log(`✅ Found ${permissions.length} permissions:`)
      permissions.forEach(permission => {
        console.log(`   - ${permission.display_name} (${permission.name})`)
      })
    }

    // Check user roles
    console.log('\n👥 Checking user role assignments...')
    const { data: userRoles, error: userRolesError } = await supabase
      .from('rbac_user_roles')
      .select(`
        id,
        user_id,
        is_active,
        assigned_at,
        rbac_roles(
          name,
          display_name
        )
      `)
      .eq('is_active', true)
    
    if (userRolesError) {
      console.error('❌ Error fetching user roles:', userRolesError.message)
    } else {
      console.log(`✅ Found ${userRoles.length} user role assignments:`)
      userRoles.forEach(ur => {
        console.log(`   - User ${ur.user_id} has role: ${ur.rbac_roles?.display_name} (${ur.rbac_roles?.name})`)
      })
    }

    // Check users
    console.log('\n👤 Checking users...')
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers()
    
    if (usersError) {
      console.error('❌ Error fetching users:', usersError.message)
    } else {
      console.log(`✅ Found ${users.users.length} users in auth system`)
    }

    // Summary
    console.log('\n📊 Summary:')
    console.log(`   - Roles: ${roles?.length || 0}`)
    console.log(`   - Permissions: ${permissions?.length || 0}`)
    console.log(`   - User Role Assignments: ${userRoles?.length || 0}`)
    console.log(`   - Total Users: ${users?.users?.length || 0}`)

    if ((roles?.length || 0) === 0) {
      console.log('\n⚠️  No roles found! You may need to:')
      console.log('   1. Run database migrations')
      console.log('   2. Seed initial data')
      console.log('   3. Check if you have admin permissions')
    }

  } catch (error) {
    console.error('❌ Error checking RBAC data:', error.message)
  }
}

checkRBACData()
