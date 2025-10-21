import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function testGuestRBACQuery() {
  console.log('🧪 Testing Guest RBAC Query Fix...\n')

  try {
    // Test the exact query that was failing
    console.log('1. Testing visitor role lookup...')
    const { data: visitorRole, error: roleError } = await supabase
      .from('roles')
      .select('id, name, display_name')
      .eq('name', 'visitor')
      .single()

    if (roleError) {
      console.log('❌ Visitor role query failed:', roleError.message)
      return
    }

    console.log('✅ Visitor role found:', visitorRole.display_name)
    console.log('   ID:', visitorRole.id)

    // Test the permissions query
    console.log('\n2. Testing visitor permissions query...')
    const { data: rolePermissions, error: permError } = await supabase
      .from('role_permissions')
      .select(`
        permissions(name, display_name)
      `)
      .eq('role_id', visitorRole.id)

    if (permError) {
      console.log('❌ Permissions query failed:', permError.message)
      return
    }

    console.log(`✅ Found ${rolePermissions.length} visitor permissions:`)
    rolePermissions.forEach(rp => {
      console.log(`   🔑 ${rp.permissions.display_name} (${rp.permissions.name})`)
    })

    // Test the mapping logic
    console.log('\n3. Testing permission mapping...')
    const permissions = rolePermissions?.map(rp => rp.permissions.name) || []
    console.log('Mapped permissions array:', permissions)

    // Test permission checks
    console.log('\n4. Testing permission checks...')
    const testPermissions = ['cases:view_public', 'content:view_public', 'admin:dashboard']
    
    testPermissions.forEach(testPerm => {
      const hasPermission = permissions.includes(testPerm)
      const status = hasPermission ? '✅ ALLOWED' : '❌ DENIED'
      console.log(`   ${status} ${testPerm}`)
    })

    console.log('\n🎉 Guest RBAC Query Test Complete!')
    console.log('The useGuestRBAC hook should now work correctly.')

  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

testGuestRBACQuery()
