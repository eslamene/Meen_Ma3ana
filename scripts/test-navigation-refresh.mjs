import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function testNavigationRefresh() {
  console.log('🧪 Testing Navigation Refresh Mechanism...\n')

  try {
    // Test 1: Check if we can find a test user
    console.log('1. Finding test users...')
    const { data: users, error: usersError } = await supabase
      .from('user_roles')
      .select(`
        user_id,
        roles(name, display_name)
      `)
      .limit(3)

    if (usersError) {
      console.log('❌ Error fetching users:', usersError.message)
      return
    }

    console.log(`✅ Found ${users.length} users with roles:`)
    users.forEach(user => {
      console.log(`   👤 User: ${user.user_id}`)
      console.log(`   🎭 Role: ${user.roles.display_name} (${user.roles.name})`)
    })

    // Test 2: Check available roles for switching
    console.log('\n2. Available roles for testing...')
    const { data: roles, error: rolesError } = await supabase
      .from('roles')
      .select('id, name, display_name')
      .eq('is_system', false)

    if (rolesError) {
      console.log('❌ Error fetching roles:', rolesError.message)
      return
    }

    console.log(`✅ Found ${roles.length} non-system roles:`)
    roles.forEach(role => {
      console.log(`   🎭 ${role.display_name} (${role.name})`)
    })

    // Test 3: Check permissions for each role
    console.log('\n3. Testing permission differences...')
    for (const role of roles.slice(0, 2)) { // Test first 2 roles
      const { data: permissions, error: permError } = await supabase
        .from('role_permissions')
        .select(`
          permissions(name, display_name)
        `)
        .eq('role_id', role.id)

      if (permError) {
        console.log(`❌ Error fetching permissions for ${role.name}:`, permError.message)
        continue
      }

      console.log(`\n   🎭 ${role.display_name} permissions:`)
      const navRelevantPerms = permissions.filter(p => 
        p.permissions.name.includes('admin') || 
        p.permissions.name.includes('cases') ||
        p.permissions.name.includes('contributions')
      )
      
      navRelevantPerms.forEach(p => {
        console.log(`      🔑 ${p.permissions.display_name}`)
      })
    }

    console.log('\n🎯 NAVIGATION REFRESH TEST INSTRUCTIONS:')
    console.log('1. 🔐 Login as a user with limited permissions (e.g., donor)')
    console.log('2. 👀 Note which navigation items are visible')
    console.log('3. 🛠️  Go to /admin/rbac and change the user\'s role')
    console.log('4. 🔄 Navigate back to the main page')
    console.log('5. ✅ Navigation should automatically update with new permissions')
    console.log('\n📋 REFRESH MECHANISMS IMPLEMENTED:')
    console.log('   • Window focus event (when returning from RBAC page)')
    console.log('   • Custom rbac-updated event (immediate refresh)')
    console.log('   • LocalStorage change detection (cross-tab updates)')
    console.log('   • Auth state change refresh')

    console.log('\n🎉 Navigation refresh test setup complete!')

  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

testNavigationRefresh()
