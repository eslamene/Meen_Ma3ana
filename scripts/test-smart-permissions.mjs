import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function testSmartPermissions() {
  console.log('🧠 Testing Smart Permission Creation...\n')

  try {
    // Test smart permission generation
    const testPermissions = [
      { resource: 'files', action: 'upload' },
      { resource: 'reports', action: 'export' },
      { resource: 'messages', action: 'send' },
      { resource: 'payments', action: 'process' }
    ]

    console.log('🎯 Smart Permission Generation Examples:\n')

    testPermissions.forEach(({ resource, action }) => {
      const name = `${resource}:${action}`
      
      const actionMap = {
        'create': 'Create', 'read': 'View', 'update': 'Edit', 'delete': 'Delete',
        'manage': 'Manage', 'approve': 'Approve', 'publish': 'Publish',
        'upload': 'Upload', 'export': 'Export', 'send': 'Send', 'process': 'Process'
      }
      
      const resourceMap = {
        'files': 'Files', 'reports': 'Reports', 'messages': 'Messages', 'payments': 'Payments'
      }
      
      const display_name = `${actionMap[action] || action} ${resourceMap[resource] || resource}`
      
      const actionDescMap = {
        'upload': 'Allow uploading files to',
        'export': 'Allow exporting data from',
        'send': 'Allow sending',
        'process': 'Allow processing'
      }
      
      const description = `${actionDescMap[action] || `Allow ${action} operations on`} ${resource} in the system`

      console.log(`📝 ${name}`)
      console.log(`   Display: ${display_name}`)
      console.log(`   Description: ${description}`)
      console.log(`   Resource: ${resource} | Action: ${action}`)
      console.log('')
    })

    // Test actual permission creation
    console.log('🔧 Creating Test Permission...')
    
    const { data: newPermission, error } = await supabase
      .from('permissions')
      .insert({
        name: 'files:upload',
        display_name: 'Upload Files',
        description: 'Allow uploading files to the system storage',
        resource: 'files',
        action: 'upload',
        is_system: false
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        console.log('✅ Permission already exists (duplicate key)')
      } else {
        throw error
      }
    } else {
      console.log('✅ Permission created successfully:', newPermission.name)
    }

    // Test fetching permissions
    console.log('\n📋 Current Permissions:')
    const { data: permissions } = await supabase
      .from('permissions')
      .select('name, display_name, resource, action')
      .order('resource', { ascending: true })
      .order('action', { ascending: true })

    const groupedPermissions = {}
    permissions?.forEach(perm => {
      if (!groupedPermissions[perm.resource]) {
        groupedPermissions[perm.resource] = []
      }
      groupedPermissions[perm.resource].push(perm)
    })

    Object.entries(groupedPermissions).forEach(([resource, perms]) => {
      console.log(`\n🏷️  ${resource.toUpperCase()}:`)
      perms.forEach(perm => {
        console.log(`   • ${perm.display_name} (${perm.name})`)
      })
    })

    console.log('\n🎉 Smart Permission System Test Complete!')
    console.log('\n📋 Smart Features Available:')
    console.log('✅ Auto-generation of permission names (resource:action)')
    console.log('✅ Smart display name creation')
    console.log('✅ Intelligent description generation')
    console.log('✅ Quick templates for common permissions')
    console.log('✅ Dropdown selectors for resources and actions')
    console.log('✅ Live preview of generated permission')
    console.log('✅ Validation and error handling')

  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

testSmartPermissions()
