import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function testDonorPermissions() {
  console.log('🔍 Testing Donor Role Security...\n')

  try {
    // Get donor role
    const { data: donorRole, error: roleError } = await supabase
      .from('roles')
      .select('id, name, display_name')
      .eq('name', 'donor')
      .single()

    if (roleError || !donorRole) {
      console.log('❌ Donor role not found:', roleError?.message)
      return
    }

    console.log(`✅ Found donor role: ${donorRole.display_name} (ID: ${donorRole.id})`)

    // Get donor permissions
    const { data: rolePermissions, error: permError } = await supabase
      .from('role_permissions')
      .select(`
        permissions(name, display_name, resource, action)
      `)
      .eq('role_id', donorRole.id)

    if (permError) {
      console.log('❌ Error fetching permissions:', permError.message)
      return
    }

    console.log(`\n📋 Donor has ${rolePermissions.length} permissions:`)
    rolePermissions.forEach(rp => {
      const perm = rp.permissions
      console.log(`   🔑 ${perm.display_name} (${perm.name})`)
    })

    // Check for dangerous admin permissions
    const dangerousPermissions = [
      'admin:dashboard',
      'admin:analytics', 
      'admin:rbac',
      'admin:users',
      'cases:update',
      'cases:delete',
      'cases:create',
      'contributions:approve'
    ]

    const foundDangerous = rolePermissions.filter(rp => 
      dangerousPermissions.includes(rp.permissions.name)
    )

    if (foundDangerous.length > 0) {
      console.log(`\n🚨 SECURITY ISSUE: Donor has ${foundDangerous.length} admin permissions:`)
      foundDangerous.forEach(rp => {
        console.log(`   ⚠️  ${rp.permissions.display_name} (${rp.permissions.name})`)
      })
      console.log('\n🔧 Recommended actions:')
      console.log('1. Remove these permissions from the donor role')
      console.log('2. Verify admin pages have proper permission guards')
      console.log('3. Test with a donor user account')
    } else {
      console.log(`\n✅ SECURITY OK: Donor doesn't have admin permissions`)
      console.log('\n🔒 Donor should only have:')
      console.log('   - contributions:create (make donations)')
      console.log('   - contributions:read (view own donations)')
      console.log('   - cases:read (view cases)')
      console.log('   - profile:update (update own profile)')
    }

    // Test specific user permissions
    console.log('\n👤 Testing specific donor user...')
    const { data: users } = await supabase.auth.admin.listUsers()
    const donorUser = users.users.find(u => u.email === 'eslam.info@gmail.com')
    
    if (donorUser) {
      const { data: userRoles } = await supabase
        .from('user_roles')
        .select('roles(name, display_name)')
        .eq('user_id', donorUser.id)
      
      console.log(`   📧 ${donorUser.email}`)
      console.log(`   🎭 Roles: ${userRoles.map(ur => ur.roles.display_name).join(', ')}`)
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

testDonorPermissions()
