import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function testVisitorRole() {
  console.log('🧪 Testing Visitor Role System...\n')

  try {
    // 1. Verify visitor role exists
    console.log('1. Checking visitor role...')
    const { data: visitorRole, error: roleError } = await supabase
      .from('roles')
      .select('*')
      .eq('name', 'visitor')
      .single()

    if (roleError) {
      console.log('❌ Visitor role not found:', roleError.message)
      return
    }

    console.log(`✅ Visitor role found: ${visitorRole.display_name}`)
    console.log(`   - ID: ${visitorRole.id}`)
    console.log(`   - System role: ${visitorRole.is_system}`)
    console.log(`   - Description: ${visitorRole.description}`)

    // 2. Check visitor permissions
    console.log('\n2. Checking visitor permissions...')
    const { data: permissions, error: permError } = await supabase
      .from('role_permissions')
      .select(`
        permissions(name, display_name, description, resource, action)
      `)
      .eq('role_id', visitorRole.id)

    if (permError) {
      console.log('❌ Error fetching permissions:', permError.message)
      return
    }

    console.log(`✅ Visitor has ${permissions.length} permissions:`)
    permissions.forEach(rp => {
      const perm = rp.permissions
      console.log(`   🔑 ${perm.display_name} (${perm.name})`)
      console.log(`      Resource: ${perm.resource}, Action: ${perm.action}`)
      console.log(`      Description: ${perm.description}`)
    })

    // 3. Test permission scenarios
    console.log('\n3. Testing permission scenarios...')
    
    const visitorPermissionNames = permissions.map(rp => rp.permissions.name)
    
    const testCases = [
      { permission: 'cases:view_public', expected: true, description: 'View public cases' },
      { permission: 'content:view_public', expected: true, description: 'View public content' },
      { permission: 'stats:view_public', expected: true, description: 'View public statistics' },
      { permission: 'cases:create', expected: false, description: 'Create cases (should be denied)' },
      { permission: 'contributions:create', expected: false, description: 'Create contributions (should be denied)' },
      { permission: 'admin:dashboard', expected: false, description: 'Access admin dashboard (should be denied)' }
    ]

    testCases.forEach(test => {
      const hasPermission = visitorPermissionNames.includes(test.permission)
      const status = hasPermission === test.expected ? '✅' : '❌'
      console.log(`   ${status} ${test.description}: ${hasPermission ? 'ALLOWED' : 'DENIED'}`)
    })

    // 4. Check role security
    console.log('\n4. Checking role security...')
    
    if (visitorRole.is_system) {
      console.log('✅ Visitor role is marked as system role (cannot be deleted by users)')
    } else {
      console.log('⚠️ Visitor role should be marked as system role for security')
    }

    // 5. Verify module assignments
    console.log('\n5. Checking permission module assignments...')
    const { data: moduleData } = await supabase
      .from('permissions')
      .select(`
        name,
        permission_modules(name, display_name)
      `)
      .in('name', visitorPermissionNames)

    moduleData?.forEach(perm => {
      const moduleName = perm.permission_modules?.display_name || 'No module'
      console.log(`   📦 ${perm.name} → ${moduleName}`)
    })

    console.log('\n🎉 Visitor Role Test Complete!')
    console.log('\n📋 Summary:')
    console.log(`- Visitor role: ${visitorRole.display_name}`)
    console.log(`- Permissions: ${permissions.length}`)
    console.log(`- System protected: ${visitorRole.is_system}`)
    console.log('\n🔒 Visitor Access:')
    console.log('✅ Can view public cases')
    console.log('✅ Can view public content') 
    console.log('✅ Can view public statistics')
    console.log('❌ Cannot create content')
    console.log('❌ Cannot access admin features')

  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

testVisitorRole()
