import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function createVisitorRole() {
  console.log('🔄 Creating visitor role and permissions...')
  
  try {
    // 1. Create visitor role
    console.log('1. Creating visitor role...')
    const { data: visitorRole, error: roleError } = await supabase
      .from('roles')
      .insert({
        name: 'visitor',
        display_name: 'Visitor',
        description: 'Unauthenticated user with limited read-only access to public content',
        is_system: true
      })
      .select()
      .single()
    
    if (roleError) {
      if (roleError.code === '23505') { // Unique constraint violation
        console.log('ℹ️ Visitor role already exists, fetching existing...')
        const { data: existingRole } = await supabase
          .from('roles')
          .select('*')
          .eq('name', 'visitor')
          .single()
        console.log('✅ Found existing visitor role:', existingRole.display_name)
        return existingRole
      } else {
        throw roleError
      }
    }
    
    console.log('✅ Visitor role created:', visitorRole.display_name)
    
    // 2. Get the cases module ID
    const { data: casesModule } = await supabase
      .from('permission_modules')
      .select('id')
      .eq('name', 'cases')
      .single()
    
    const { data: reportsModule } = await supabase
      .from('permission_modules')
      .select('id')
      .eq('name', 'reports')
      .single()
    
    // 3. Create visitor permissions
    console.log('2. Creating visitor permissions...')
    const visitorPermissions = [
      {
        name: 'cases:view_public',
        display_name: 'View Public Cases',
        description: 'View published cases that are marked as public',
        resource: 'cases',
        action: 'view_public',
        module_id: casesModule?.id
      },
      {
        name: 'content:view_public',
        display_name: 'View Public Content',
        description: 'Access public pages and content without authentication',
        resource: 'content',
        action: 'view_public',
        module_id: casesModule?.id
      },
      {
        name: 'stats:view_public',
        display_name: 'View Public Statistics',
        description: 'View general platform statistics and metrics',
        resource: 'stats',
        action: 'view_public',
        module_id: reportsModule?.id
      }
    ]
    
    const { data: createdPermissions, error: permError } = await supabase
      .from('permissions')
      .insert(visitorPermissions)
      .select()
    
    if (permError) {
      console.log('⚠️ Some permissions may already exist:', permError.message)
      // Try to get existing permissions
      const { data: existingPermissions } = await supabase
        .from('permissions')
        .select('*')
        .in('name', visitorPermissions.map(p => p.name))
      
      console.log(`✅ Found ${existingPermissions?.length || 0} existing visitor permissions`)
    } else {
      console.log(`✅ Created ${createdPermissions.length} visitor permissions`)
    }
    
    // 4. Assign permissions to visitor role
    console.log('3. Assigning permissions to visitor role...')
    const { data: allVisitorPermissions } = await supabase
      .from('permissions')
      .select('id')
      .in('name', visitorPermissions.map(p => p.name))
    
    const rolePermissions = allVisitorPermissions.map(perm => ({
      role_id: visitorRole.id,
      permission_id: perm.id
    }))
    
    const { error: assignError } = await supabase
      .from('role_permissions')
      .insert(rolePermissions)
    
    if (assignError && assignError.code !== '23505') {
      throw assignError
    }
    
    console.log('✅ Permissions assigned to visitor role')
    
    // 5. Verify the setup
    console.log('4. Verifying visitor role setup...')
    const { data: finalPermissions } = await supabase
      .from('role_permissions')
      .select(`
        permissions(name, display_name)
      `)
      .eq('role_id', visitorRole.id)
    
    console.log(`✅ Visitor role has ${finalPermissions?.length || 0} permissions:`)
    finalPermissions?.forEach(rp => {
      console.log(`   🔑 ${rp.permissions.display_name} (${rp.permissions.name})`)
    })
    
    console.log('\n🎉 Visitor role setup complete!')
    
  } catch (error) {
    console.error('❌ Error creating visitor role:', error.message)
  }
}

createVisitorRole()
