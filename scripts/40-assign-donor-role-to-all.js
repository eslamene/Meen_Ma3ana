/**
 * Assign Donor Role to All Users
 * 
 * This script assigns the donor role to all users who don't have it.
 * Useful after importing users when the trigger didn't assign roles.
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
  console.error('❌ Missing environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Fetch all users with pagination
async function getAllAuthUsers() {
  const allUsers = []
  let page = 1
  const perPage = 1000
  
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage
    })
    
    if (error) {
      console.error(`   ⚠️  Error fetching users page ${page}:`, error.message)
      break
    }
    
    if (!data?.users || data.users.length === 0) {
      break
    }
    
    allUsers.push(...data.users)
    
    if (data.users.length < perPage) {
      break
    }
    
    page++
  }
  
  return allUsers
}

async function assignDonorRoleToAllUsers() {
  console.log('🔐 Assigning donor role to all users...\n')
  
  try {
    // Step 1: Get donor role ID
    console.log('📋 Step 1: Finding donor role...')
    const { data: donorRole, error: roleError } = await supabase
      .from('admin_roles')
      .select('id, name, display_name')
      .eq('name', 'donor')
      .eq('is_active', true)
      .single()
    
    if (roleError || !donorRole) {
      console.error('❌ Donor role not found:', roleError?.message)
      process.exit(1)
    }
    
    console.log(`   ✓ Found donor role: ${donorRole.display_name} (ID: ${donorRole.id})\n`)
    
    // Step 2: Fetch all users
    console.log('📋 Step 2: Fetching all users...')
    const allUsers = await getAllAuthUsers()
    console.log(`   ✓ Found ${allUsers.length} total users\n`)
    
    // Step 3: Get users who already have donor role
    console.log('📋 Step 3: Checking existing role assignments...')
    const { data: existingRoles, error: rolesError } = await supabase
      .from('admin_user_roles')
      .select('user_id')
      .eq('role_id', donorRole.id)
      .eq('is_active', true)
    
    if (rolesError) {
      console.error('❌ Error fetching existing roles:', rolesError.message)
      process.exit(1)
    }
    
    const usersWithDonorRole = new Set(existingRoles?.map(r => r.user_id) || [])
    console.log(`   ✓ ${usersWithDonorRole.size} users already have donor role\n`)
    
    // Step 4: Find users who need the donor role
    const usersNeedingRole = allUsers.filter(user => !usersWithDonorRole.has(user.id))
    console.log(`📋 Step 4: Assigning donor role to ${usersNeedingRole.length} users...\n`)
    
    if (usersNeedingRole.length === 0) {
      console.log('✅ All users already have the donor role!\n')
      return
    }
    
    // Step 5: Assign role to each user
    let successCount = 0
    let errorCount = 0
    const errors = []
    
    for (let i = 0; i < usersNeedingRole.length; i++) {
      const user = usersNeedingRole[i]
      const progress = `[${i + 1}/${usersNeedingRole.length}]`
      
      try {
        // Ensure app user record exists
        const { data: appUser } = await supabase
          .from('users')
          .select('id')
          .eq('id', user.id)
          .single()
        
        if (!appUser) {
          // Create app user record
          const { error: createError } = await supabase
            .from('users')
            .insert({
              id: user.id,
              email: user.email,
              role: 'donor',
              first_name: user.user_metadata?.first_name || user.user_metadata?.contributor_name || 'Contributor',
              is_active: true,
              email_verified: user.email_confirmed_at ? true : false,
              language: 'ar',
            })
          
          if (createError && createError.code !== '23505') { // Ignore duplicate key errors
            console.error(`   ${progress} ⚠️  Could not create app user for ${user.email}:`, createError.message)
          }
        }
        
        // Assign donor role
        const { error: assignError } = await supabase
          .from('admin_user_roles')
          .upsert({
            user_id: user.id,
            role_id: donorRole.id,
            is_active: true,
            assigned_at: new Date().toISOString(),
            assigned_by: user.id, // Self-assigned
          }, {
            onConflict: 'user_id,role_id'
          })
        
        if (assignError) {
          errorCount++
          errors.push({ email: user.email, error: assignError.message })
          console.error(`   ${progress} ❌ Failed: ${user.email} - ${assignError.message}`)
        } else {
          successCount++
          if ((i + 1) % 10 === 0 || i === usersNeedingRole.length - 1) {
            console.log(`   ${progress} ✓ Assigned to ${successCount} users...`)
          }
        }
        
        // Small delay to avoid rate limits
        if (i < usersNeedingRole.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
        
      } catch (error) {
        errorCount++
        errors.push({ email: user.email, error: error.message })
        console.error(`   ${progress} ❌ Error: ${user.email} - ${error.message}`)
      }
    }
    
    // Step 6: Summary
    console.log('\n' + '='.repeat(60))
    console.log('📊 ASSIGNMENT SUMMARY')
    console.log('='.repeat(60))
    console.log(`✅ Successfully assigned: ${successCount} users`)
    console.log(`❌ Failed: ${errorCount} users`)
    console.log(`📋 Total users: ${allUsers.length}`)
    console.log(`👑 Users with donor role: ${usersWithDonorRole.size + successCount}`)
    
    if (errors.length > 0) {
      console.log('\n⚠️  Errors:')
      errors.forEach(({ email, error }) => {
        console.log(`   - ${email}: ${error}`)
      })
    }
    
    console.log('\n✅ Done!\n')
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
    process.exit(1)
  }
}

assignDonorRoleToAllUsers()
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error)
    process.exit(1)
  })

