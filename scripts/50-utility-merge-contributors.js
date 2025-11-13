/**
 * Utility script to merge contributor accounts and reassign contributions
 * 
 * This script helps when:
 * - Multiple user accounts were created for the same contributor
 * - You want to consolidate contributions under one account
 * - You want to reassign contributions from one contributor to another
 * 
 * Usage:
 *   node scripts/merge-contributors.js --from=<userId> --to=<userId>
 *   node scripts/merge-contributors.js --list-duplicates
 *   node scripts/merge-contributors.js --merge-by-name
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:')
  console.error('   - NEXT_PUBLIC_SUPABASE_URL')
  console.error('   - SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

// Create Supabase admin client
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// List all contributors with their contribution counts
async function listAllContributors() {
  console.log('\n📋 Listing all contributors...\n')
  
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, email, first_name, last_name, role, created_at')
    .eq('role', 'donor')
    .order('first_name')
  
  if (usersError) {
    console.error('❌ Error fetching users:', usersError)
    return []
  }
  
  // Get contribution counts for each user
  const contributorsWithCounts = []
  
  for (const user of users) {
    const { count } = await supabase
      .from('contributions')
      .select('*', { count: 'exact', head: true })
      .eq('donor_id', user.id)
    
    contributorsWithCounts.push({
      ...user,
      contributionCount: count || 0
    })
  }
  
  // Sort by contribution count (descending)
  contributorsWithCounts.sort((a, b) => b.contributionCount - a.contributionCount)
  
  console.log('Contributors (sorted by contribution count):\n')
  console.log('ID'.padEnd(40) + 'Name'.padEnd(30) + 'Email'.padEnd(40) + 'Contributions')
  console.log('-'.repeat(120))
  
  contributorsWithCounts.forEach(user => {
    const name = (user.first_name || '').padEnd(30)
    const email = (user.email || '').padEnd(40)
    const count = user.contributionCount.toString().padStart(5)
    console.log(`${user.id} ${name} ${email} ${count}`)
  })
  
  console.log(`\nTotal contributors: ${contributorsWithCounts.length}`)
  console.log(`Total contributions: ${contributorsWithCounts.reduce((sum, u) => sum + u.contributionCount, 0)}`)
  
  return contributorsWithCounts
}

// Find potential duplicate contributors (same or similar names)
async function findDuplicates() {
  console.log('\n🔍 Searching for duplicate contributors...\n')
  
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, email, first_name, last_name')
    .eq('role', 'donor')
    .order('first_name')
  
  if (usersError) {
    console.error('❌ Error fetching users:', usersError)
    return []
  }
  
  // Group by similar names (case-insensitive, trimmed)
  const nameGroups = new Map()
  
  users.forEach(user => {
    const name = (user.first_name || '').trim().toLowerCase()
    if (!name) return
    
    if (!nameGroups.has(name)) {
      nameGroups.set(name, [])
    }
    nameGroups.get(name).push(user)
  })
  
  // Find groups with multiple users
  const duplicates = []
  for (const [name, userList] of nameGroups.entries()) {
    if (userList.length > 1) {
      duplicates.push({ name, users: userList })
    }
  }
  
  if (duplicates.length === 0) {
    console.log('✅ No exact duplicate names found\n')
    return []
  }
  
  console.log(`Found ${duplicates.length} duplicate name groups:\n`)
  
  for (const [index, group] of duplicates.entries()) {
    console.log(`${index + 1}. "${group.name}" (${group.users.length} accounts):`)
    
    for (const user of group.users) {
      const { count } = await supabase
        .from('contributions')
        .select('*', { count: 'exact', head: true })
        .eq('donor_id', user.id)
      
      console.log(`   - ${user.id}`)
      console.log(`     Email: ${user.email}`)
      console.log(`     Contributions: ${count || 0}`)
    }
    console.log()
  }
  
  return duplicates
}

// Merge contributions from one user to another
async function mergeContributors(fromUserId, toUserId, deleteSource = false) {
  console.log(`\n🔄 Merging contributions from ${fromUserId} to ${toUserId}...\n`)
  
  // Verify users exist
  const { data: fromUser, error: fromError } = await supabase
    .from('users')
    .select('id, email, first_name')
    .eq('id', fromUserId)
    .single()
  
  if (fromError || !fromUser) {
    console.error(`❌ Source user not found: ${fromUserId}`)
    return false
  }
  
  const { data: toUser, error: toError } = await supabase
    .from('users')
    .select('id, email, first_name')
    .eq('id', toUserId)
    .single()
  
  if (toError || !toUser) {
    console.error(`❌ Target user not found: ${toUserId}`)
    return false
  }
  
  console.log(`Source: ${fromUser.first_name} (${fromUser.email})`)
  console.log(`Target: ${toUser.first_name} (${toUser.email})`)
  
  // Get contributions from source user
  const { data: contributions, error: contribError } = await supabase
    .from('contributions')
    .select('id, amount, case_id, created_at')
    .eq('donor_id', fromUserId)
  
  if (contribError) {
    console.error('❌ Error fetching contributions:', contribError)
    return false
  }
  
  if (!contributions || contributions.length === 0) {
    console.log('ℹ️  No contributions to merge')
    
    if (deleteSource) {
      await deleteUser(fromUserId)
    }
    
    return true
  }
  
  console.log(`\nFound ${contributions.length} contributions to reassign\n`)
  
  // Update contributions
  const { error: updateError } = await supabase
    .from('contributions')
    .update({ donor_id: toUserId })
    .eq('donor_id', fromUserId)
  
  if (updateError) {
    console.error('❌ Error updating contributions:', updateError)
    return false
  }
  
  console.log(`✅ Reassigned ${contributions.length} contributions`)
  
  // Update approval statuses
  const { error: approvalError } = await supabase
    .from('contribution_approval_status')
    .update({ admin_id: toUserId })
    .eq('admin_id', fromUserId)
  
  // Update case amounts (recalculate)
  const caseIds = [...new Set(contributions.map(c => c.case_id).filter(Boolean))]
  
  for (const caseId of caseIds) {
    const { data: caseContributions } = await supabase
      .from('contributions')
      .select('amount')
      .eq('case_id', caseId)
      .eq('status', 'approved')
    
    if (caseContributions) {
      const totalAmount = caseContributions.reduce((sum, c) => sum + parseFloat(c.amount || '0'), 0)
      
      await supabase
        .from('cases')
        .update({ current_amount: totalAmount.toString() })
        .eq('id', caseId)
    }
  }
  
  console.log('✅ Updated case amounts')
  
  // Delete source user if requested
  if (deleteSource) {
    await deleteUser(fromUserId)
  }
  
  return true
}

// Delete a user account (auth + app user)
async function deleteUser(userId) {
  console.log(`\n🗑️  Deleting user ${userId}...\n`)
  
  // Delete auth user
  const { error: authError } = await supabase.auth.admin.deleteUser(userId)
  
  if (authError) {
    console.error('⚠️  Error deleting auth user:', authError.message)
    // Continue anyway - might already be deleted
  } else {
    console.log('✅ Deleted auth user')
  }
  
  // Delete app user
  const { error: appError } = await supabase
    .from('users')
    .delete()
    .eq('id', userId)
  
  if (appError) {
    console.error('⚠️  Error deleting app user:', appError.message)
    return false
  }
  
  console.log('✅ Deleted app user record')
  return true
}

// Merge contributors with the same name automatically
async function mergeByName() {
  console.log('\n🔄 Merging contributors with duplicate names...\n')
  
  const duplicates = await findDuplicates()
  
  if (duplicates.length === 0) {
    console.log('✅ No duplicates to merge\n')
    return
  }
  
  let mergedCount = 0
  
  for (const group of duplicates) {
    // Sort by contribution count (keep the one with most contributions)
    const usersWithCounts = []
    
    for (const user of group.users) {
      const { count } = await supabase
        .from('contributions')
        .select('*', { count: 'exact', head: true })
        .eq('donor_id', user.id)
      
      usersWithCounts.push({ ...user, count: count || 0 })
    }
    
    usersWithCounts.sort((a, b) => b.count - a.count)
    
    // Keep the first one (most contributions), merge others into it
    const targetUser = usersWithCounts[0]
    const sourceUsers = usersWithCounts.slice(1)
    
    console.log(`\nMerging "${group.name}":`)
    console.log(`  Keeping: ${targetUser.email} (${targetUser.count} contributions)`)
    
    for (const sourceUser of sourceUsers) {
      console.log(`  Merging: ${sourceUser.email} (${sourceUser.count} contributions)`)
      
      const success = await mergeContributors(sourceUser.id, targetUser.id, true)
      
      if (success) {
        mergedCount++
        console.log(`  ✅ Merged successfully`)
      } else {
        console.log(`  ❌ Merge failed`)
      }
    }
  }
  
  console.log(`\n✅ Merged ${mergedCount} duplicate accounts\n`)
}

// Main function
async function main() {
  const args = process.argv.slice(2)
  
  if (args.includes('--list') || args.includes('--list-all')) {
    await listAllContributors()
  } else if (args.includes('--list-duplicates')) {
    await findDuplicates()
  } else if (args.includes('--merge-by-name')) {
    const confirm = args.includes('--confirm')
    if (!confirm) {
      console.log('⚠️  This will merge all duplicate contributors!')
      console.log('   Run with --confirm flag to proceed')
      console.log('   Example: node scripts/merge-contributors.js --merge-by-name --confirm')
      process.exit(0)
    }
    await mergeByName()
  } else {
    // Parse --from and --to arguments
    const fromArg = args.find(arg => arg.startsWith('--from='))
    const toArg = args.find(arg => arg.startsWith('--to='))
    const deleteSource = args.includes('--delete-source')
    
    if (!fromArg || !toArg) {
      console.log('Usage:')
      console.log('  List all contributors:')
      console.log('    node scripts/merge-contributors.js --list')
      console.log('')
      console.log('  Find duplicates:')
      console.log('    node scripts/merge-contributors.js --list-duplicates')
      console.log('')
      console.log('  Merge specific contributors:')
      console.log('    node scripts/merge-contributors.js --from=<userId> --to=<userId>')
      console.log('    node scripts/merge-contributors.js --from=<userId> --to=<userId> --delete-source')
      console.log('')
      console.log('  Merge all duplicates automatically:')
      console.log('    node scripts/merge-contributors.js --merge-by-name --confirm')
      process.exit(0)
    }
    
    const fromUserId = fromArg.split('=')[1]
    const toUserId = toArg.split('=')[1]
    
    const success = await mergeContributors(fromUserId, toUserId, deleteSource)
    
    if (success) {
      console.log('\n✅ Merge completed successfully!\n')
    } else {
      console.log('\n❌ Merge failed!\n')
      process.exit(1)
    }
  }
}

// Run
main()
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Error:', error)
    process.exit(1)
  })

