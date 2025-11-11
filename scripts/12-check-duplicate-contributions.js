/**
 * Check for Duplicate Contributions
 * 
 * Identifies duplicate contributions and helps determine their source
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

async function checkDuplicates() {
  console.log('🔍 Checking for duplicate contributions...\n')
  
  // Get all contributions with details
  const { data: contributions, error } = await supabase
    .from('contributions')
    .select(`
      id,
      amount,
      donor_id,
      case_id,
      created_at,
      status,
      anonymous,
      cases (
        title_ar,
        title_en
      ),
      users (
        email,
        first_name
      )
    `)
    .order('created_at', { ascending: true })
  
  if (error) {
    console.error('❌ Error fetching contributions:', error.message)
    process.exit(1)
  }
  
  console.log(`📊 Total contributions: ${contributions?.length || 0}\n`)
  
  // Group by case_id, amount, donor_id, and created_at (within same day)
  const groups = new Map()
  
  contributions?.forEach(contrib => {
    const date = new Date(contrib.created_at)
    const dateKey = date.toISOString().split('T')[0] // YYYY-MM-DD
    
    const key = `${contrib.case_id}:${contrib.amount}:${contrib.donor_id}:${dateKey}`
    
    if (!groups.has(key)) {
      groups.set(key, [])
    }
    groups.get(key).push(contrib)
  })
  
  // Find duplicates
  const duplicates = []
  groups.forEach((group, key) => {
    if (group.length > 1) {
      duplicates.push({
        key,
        count: group.length,
        contributions: group
      })
    }
  })
  
  if (duplicates.length === 0) {
    console.log('✅ No exact duplicates found\n')
  } else {
    console.log(`⚠️  Found ${duplicates.length} groups of potential duplicates:\n`)
    
    duplicates.forEach((dup, idx) => {
      const [caseId, amount, donorId, date] = dup.key.split(':')
      const contrib = dup.contributions[0]
      const caseTitle = Array.isArray(contrib.cases) ? contrib.cases[0]?.title_ar : contrib.cases?.title_ar
      const donorEmail = Array.isArray(contrib.users) ? contrib.users[0]?.email : contrib.users?.email
      
      console.log(`${idx + 1}. Group: ${dup.count} contributions`)
      console.log(`   Case: ${caseTitle || caseId}`)
      console.log(`   Amount: ${amount} EGP`)
      console.log(`   Donor: ${donorEmail || donorId}`)
      console.log(`   Date: ${date}`)
      console.log(`   Contribution IDs:`)
      dup.contributions.forEach(c => {
        console.log(`     - ${c.id} (created: ${c.created_at})`)
      })
      console.log()
    })
  }
  
  // Check for contributions created today (might be from recent import)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const recentContribs = contributions?.filter(c => {
    const created = new Date(c.created_at)
    return created >= today
  }) || []
  
  if (recentContribs.length > 0) {
    console.log(`📅 Contributions created today: ${recentContribs.length}\n`)
    recentContribs.forEach(c => {
      const caseTitle = Array.isArray(c.cases) ? c.cases[0]?.title_ar : c.cases?.title_ar
      console.log(`   - ${c.id}: ${c.amount} EGP for "${caseTitle}" (${c.created_at})`)
    })
    console.log()
  }
  
  // Summary
  console.log('='.repeat(60))
  console.log('📊 SUMMARY')
  console.log('='.repeat(60))
  console.log(`Total contributions: ${contributions?.length || 0}`)
  console.log(`Duplicate groups: ${duplicates.length}`)
  console.log(`Total duplicates: ${duplicates.reduce((sum, d) => sum + d.count - 1, 0)}`)
  console.log(`Contributions created today: ${recentContribs.length}`)
  console.log('='.repeat(60) + '\n')
}

checkDuplicates()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error:', error)
    process.exit(1)
  })

