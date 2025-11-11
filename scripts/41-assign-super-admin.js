/**
 * Assign Super Admin Role to User
 * 
 * This script assigns the super_admin role to a specific user
 * Usage: node scripts/assign-super-admin.js <email>
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

dotenv.config({ path: join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables:')
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗')
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✓' : '✗')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function assignSuperAdmin(email, userId) {
  console.log(`🔐 Assigning super_admin role to user...\n`)
  console.log(`   Email: ${email}`)
  console.log(`   User ID: ${userId}\n`)
  
  try {
    // Step 1: Get the super_admin role ID
    console.log('📋 Step 1: Finding super_admin role...')
    const { data: superAdminRole, error: roleError } = await supabase
      .from('admin_roles')
      .select('id, name, display_name')
      .eq('name', 'super_admin')
      .eq('is_active', true)
      .single()
    
    if (roleError || !superAdminRole) {
      console.error('❌ Error finding super_admin role:', roleError?.message)
      console.error('   Make sure the super_admin role exists in admin_roles table')
      process.exit(1)
    }
    
    console.log(`   ✓ Found super_admin role:`)
    console.log(`     ID: ${superAdminRole.id}`)
    console.log(`     Name: ${superAdminRole.name}`)
    console.log(`     Display: ${superAdminRole.display_name}\n`)
    
    // Step 2: Check if user exists
    console.log('📋 Step 2: Verifying user exists...')
    const { data: authUser, error: userError } = await supabase.auth.admin.getUserById(userId)
    
    if (userError || !authUser.user) {
      console.error('❌ Error finding user:', userError?.message)
      console.error(`   User ID: ${userId}`)
      process.exit(1)
    }
    
    console.log(`   ✓ User found:`)
    console.log(`     Email: ${authUser.user.email}`)
    console.log(`     ID: ${authUser.user.id}\n`)
    
    // Step 3: Check if app user record exists
    console.log('📋 Step 3: Checking app user record...')
    const { data: appUser, error: appUserError } = await supabase
      .from('users')
      .select('id, email, role')
      .eq('id', userId)
      .single()
    
    if (appUserError && appUserError.code !== 'PGRST116') {
      console.error('❌ Error checking app user:', appUserError.message)
      process.exit(1)
    }
    
    if (!appUser) {
      console.log('   ⚠️  App user record not found, creating...')
      const { error: createAppUserError } = await supabase
        .from('users')
        .insert({
          id: userId,
          email: authUser.user.email,
          role: 'donor', // Will be overridden by super_admin role
          first_name: authUser.user.user_metadata?.first_name || 'Admin',
          is_active: true,
          email_verified: true,
          language: 'en',
        })
      
      if (createAppUserError) {
        console.error('❌ Error creating app user:', createAppUserError.message)
        process.exit(1)
      }
      console.log('   ✓ App user record created\n')
    } else {
      console.log(`   ✓ App user record exists:`)
      console.log(`     Email: ${appUser.email}`)
      console.log(`     Current role: ${appUser.role}\n`)
    }
    
    // Step 4: Assign super_admin role
    console.log('📋 Step 4: Assigning super_admin role...')
    const { data: roleAssignment, error: assignError } = await supabase
      .from('admin_user_roles')
      .upsert({
        user_id: userId,
        role_id: superAdminRole.id,
        is_active: true,
        assigned_at: new Date().toISOString(),
        assigned_by: userId, // Self-assigned
      }, {
        onConflict: 'user_id,role_id'
      })
      .select()
      .single()
    
    if (assignError) {
      console.error('❌ Error assigning role:', assignError.message)
      console.error('   Details:', assignError.details)
      console.error('   Hint:', assignError.hint)
      process.exit(1)
    }
    
    console.log(`   ✓ Super admin role assigned successfully!\n`)
    
    // Step 5: Verify assignment
    console.log('📋 Step 5: Verifying role assignment...')
    const { data: userRoles, error: verifyError } = await supabase
      .from('admin_user_roles')
      .select(`
        id,
        is_active,
        assigned_at,
        admin_roles (
          id,
          name,
          display_name
        )
      `)
      .eq('user_id', userId)
      .eq('is_active', true)
    
    if (verifyError) {
      console.error('⚠️  Error verifying roles:', verifyError.message)
    } else {
      console.log(`   ✓ User has ${userRoles?.length || 0} active role(s):`)
      userRoles?.forEach((ur) => {
        const role = Array.isArray(ur.admin_roles) ? ur.admin_roles[0] : ur.admin_roles
        console.log(`     - ${role?.name} (${role?.display_name})`)
      })
    }
    
    console.log('\n✅ Success! User is now a super admin.')
    console.log(`\n📧 User: ${email}`)
    console.log(`🆔 User ID: ${userId}`)
    console.log(`👑 Role: super_admin\n`)
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
    process.exit(1)
  }
}

// Get email and userId from command line or use defaults
const email = process.argv[2] || 'eslam.ene@gmail.com'
const userId = process.argv[3] || '7bd26647-a87d-4340-876d-c97e1082f8e1'

if (!email || !userId) {
  console.error('Usage: node scripts/assign-super-admin.js <email> <userId>')
  console.error('Or use defaults: node scripts/assign-super-admin.js')
  process.exit(1)
}

assignSuperAdmin(email, userId)
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error)
    process.exit(1)
  })

