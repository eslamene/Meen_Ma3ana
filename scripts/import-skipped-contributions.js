/**
 * Import Skipped Contributions (ContributorID = 0)
 * 
 * This script imports contributions that were skipped because ContributorID = 0.
 * These will be assigned to a special "Unknown Contributor" user.
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import fs from 'fs'

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

// Parse CSV line properly handling commas in Arabic text
function parseCSVLine(line) {
  const parts = []
  let current = ''
  let inQuotes = false
  
  for (let j = 0; j < line.length; j++) {
    const char = line[j]
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      parts.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  parts.push(current.trim())
  return parts
}

// Helper function to parse date from CSV format (DD/MM/YYYY)
function parseDate(dateStr) {
  if (!dateStr || dateStr.trim() === '') {
    return null
  }
  
  const parts = dateStr.trim().split('/')
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10)
    const month = parseInt(parts[1], 10) - 1
    const year = parseInt(parts[2], 10)
    
    if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
      const date = new Date(year, month, day)
      if (date.getFullYear() === year && date.getMonth() === month && date.getDate() === day) {
        return date
      }
    }
  }
  
  return null
}

function dateStrToISO(dateStr) {
  const parsed = parseDate(dateStr)
  if (parsed) {
    return parsed.toISOString()
  }
  return null
}

async function importSkippedContributions() {
  console.log('📥 Importing skipped contributions (ContributorID = 0)...\n')
  
  // Step 1: Create or get "Unknown Contributor" user
  console.log('👤 Step 1: Creating "Unknown Contributor" user...')
  const unknownEmail = 'unknown@contributor.meenma3ana.local'
  
  // Check if user exists
  const { data: existingUsers } = await supabase.auth.admin.listUsers()
  let unknownUserId = existingUsers?.users?.find(u => u.email === unknownEmail)?.id
  
  if (!unknownUserId) {
    // Create user
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: unknownEmail,
      password: Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12),
      email_confirm: true,
      user_metadata: {
        contributor_id: 0,
        contributor_name: 'Unknown Contributor',
        created_by_import: true,
        import_date: new Date().toISOString()
      }
    })
    
    if (authError) {
      console.error('❌ Error creating unknown user:', authError.message)
      process.exit(1)
    }
    
    unknownUserId = authUser.user.id
    
    // Create app user record
    await supabase
      .from('users')
      .upsert({
        id: unknownUserId,
        email: unknownEmail,
        role: 'donor',
        first_name: 'Unknown',
        last_name: 'Contributor',
        is_active: true,
        email_verified: true,
        language: 'ar',
      }, { onConflict: 'id' })
    
    console.log(`   ✓ Created unknown contributor user: ${unknownEmail}\n`)
  } else {
    console.log(`   ✓ Unknown contributor user already exists\n`)
  }
  
  // Step 2: Read CSV and find skipped contributions
  console.log('📋 Step 2: Reading CSV file...')
  const csvPath = join(__dirname, '..', 'docs', 'cases', 'contributions.csv')
  const csvContent = fs.readFileSync(csvPath, 'utf-8')
  const lines = csvContent.split('\n').filter(line => line.trim())
  const headers = parseCSVLine(lines[0])
  
  const idIdx = headers.indexOf('ID')
  const descIdx = headers.indexOf('Description')
  const contributorIdx = headers.indexOf('Contributor')
  const contributorIdIdx = headers.indexOf('ContributorID')
  const amountIdx = headers.indexOf('Amount')
  const monthIdx = headers.indexOf('Month')
  
  const skippedContributions = []
  const caseIdMap = new Map() // old case ID -> new case UUID
  
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    if (!values[idIdx] || values[idIdx].trim() === '') continue
    
    const contributorIdStr = values[contributorIdIdx]?.trim() || '0'
    if (contributorIdStr !== '0' && contributorIdStr !== '') continue
    
    const caseId = values[idIdx].trim()
    const titleAr = values[descIdx]?.trim() || ''
    const amountStr = values[amountIdx]?.replace(/[,"]/g, '').trim() || '0'
    const monthStr = values[monthIdx]?.trim() || ''
    
    const amount = parseFloat(amountStr)
    if (isNaN(amount) || amount <= 0) continue
    
    skippedContributions.push({
      caseId,
      titleAr,
      amount,
      month: monthStr,
    })
  }
  
  console.log(`   ✓ Found ${skippedContributions.length} skipped contributions\n`)
  
  if (skippedContributions.length === 0) {
    console.log('✅ No skipped contributions to import\n')
    return
  }
  
  // Step 3: Get case mappings (old ID -> new UUID)
  console.log('📂 Step 3: Mapping case IDs...')
  const { data: allCases } = await supabase
    .from('cases')
    .select('id, title_ar')
  
  // Try to match cases by title (since we don't have old IDs stored)
  // This is approximate - we'll match by Arabic title
  const titleToCaseId = new Map()
  allCases?.forEach(c => {
    if (c.title_ar) {
      titleToCaseId.set(c.title_ar.trim(), c.id)
    }
  })
  
  let matchedCases = 0
  skippedContributions.forEach(contrib => {
    const caseId = titleToCaseId.get(contrib.titleAr.trim())
    if (caseId) {
      caseIdMap.set(contrib.caseId, caseId)
      matchedCases++
    }
  })
  
  console.log(`   ✓ Matched ${matchedCases} cases by title\n`)
  
  // Step 4: Get payment method
  console.log('💳 Step 4: Getting payment method...')
  const { data: paymentMethod } = await supabase
    .from('payment_methods')
    .select('id')
    .eq('code', 'cash')
    .eq('is_active', true)
    .single()
  
  if (!paymentMethod) {
    const { data: anyPM } = await supabase
      .from('payment_methods')
      .select('id')
      .eq('is_active', true)
      .limit(1)
      .single()
    
    if (!anyPM) {
      console.error('❌ No payment methods found')
      process.exit(1)
    }
    var paymentMethodId = anyPM.id
  } else {
    var paymentMethodId = paymentMethod.id
  }
  
  console.log(`   ✓ Payment method ID: ${paymentMethodId}\n`)
  
  // Step 5: Import contributions
  console.log('💰 Step 5: Importing contributions...')
  
  const contributionsToInsert = []
  let importedCount = 0
  let skippedCount = 0
  
  for (const contrib of skippedContributions) {
    const caseId = caseIdMap.get(contrib.caseId)
    
    if (!caseId) {
      skippedCount++
      console.warn(`   ⚠️  Skipping: Case "${contrib.titleAr}" not found`)
      continue
    }
    
    const contribDate = contrib.month ? dateStrToISO(contrib.month) : null
    
    contributionsToInsert.push({
      type: 'donation',
      amount: contrib.amount.toString(),
      payment_method_id: paymentMethodId,
      status: 'approved',
      anonymous: true, // Mark as anonymous since contributor is unknown
      donor_id: unknownUserId,
      case_id: caseId,
      created_at: contribDate || new Date().toISOString(),
      updated_at: contribDate || new Date().toISOString(),
    })
    
    importedCount++
  }
  
  if (contributionsToInsert.length > 0) {
    // Insert in batches
    const batchSize = 100
    let inserted = 0
    
    for (let i = 0; i < contributionsToInsert.length; i += batchSize) {
      const batch = contributionsToInsert.slice(i, i + batchSize)
      const { error } = await supabase
        .from('contributions')
        .insert(batch)
      
      if (error) {
        console.error(`   ❌ Error inserting batch ${Math.floor(i / batchSize) + 1}:`, error.message)
      } else {
        inserted += batch.length
        console.log(`   ✓ Inserted batch ${Math.floor(i / batchSize) + 1} (${inserted}/${contributionsToInsert.length})`)
      }
    }
    
    console.log(`\n✅ Imported ${inserted} contributions`)
  }
  
  if (skippedCount > 0) {
    console.log(`⚠️  Skipped ${skippedCount} contributions (cases not found)`)
  }
  
  // Step 6: Create approval statuses
  console.log('\n✅ Step 6: Creating approval statuses...')
  const { data: newContribs } = await supabase
    .from('contributions')
    .select('id')
    .eq('donor_id', unknownUserId)
    .eq('status', 'approved')
  
  if (newContribs && newContribs.length > 0) {
    const approvalStatuses = newContribs.map(contrib => ({
      contribution_id: contrib.id,
      status: 'approved',
      admin_id: unknownUserId,
    }))
    
    const batchSize = 100
    for (let i = 0; i < approvalStatuses.length; i += batchSize) {
      const batch = approvalStatuses.slice(i, i + batchSize)
      await supabase
        .from('contribution_approval_status')
        .insert(batch)
    }
    
    console.log(`   ✓ Created ${approvalStatuses.length} approval statuses\n`)
  }
  
  // Step 6.5: Create notifications
  console.log('📬 Step 6.5: Creating notifications...')
  
  // Get admin users
  const { data: adminRoles } = await supabase
    .from('admin_user_roles')
    .select('user_id, admin_roles!inner(name)')
    .eq('is_active', true)
    .in('admin_roles.name', ['admin', 'super_admin'])
  
  const adminUserIds = [...new Set(adminRoles?.map(r => r.user_id) || [])]
  
  // Fetch contributions with case data
  const { data: contribsWithCases } = await supabase
    .from('contributions')
    .select(`
      id,
      amount,
      donor_id,
      case_id,
      created_at,
      cases (
        title_en,
        title_ar
      )
    `)
    .eq('donor_id', unknownUserId)
    .eq('status', 'approved')
  
  if (contribsWithCases && contribsWithCases.length > 0) {
    const notificationsToInsert = []
    
    for (const contrib of contribsWithCases) {
      const amount = parseFloat(contrib.amount || '0')
      const caseData = Array.isArray(contrib.cases) ? contrib.cases[0] : contrib.cases
      const caseTitle = caseData?.title_en || caseData?.title_ar || 'Unknown Case'
      
      // Admin notifications
      for (const adminId of adminUserIds) {
        notificationsToInsert.push({
          type: 'contribution_pending',
          recipient_id: adminId,
          title: 'New Contribution Submitted',
          message: `A new contribution of ${amount.toLocaleString()} EGP has been submitted for case: ${caseTitle}`,
          data: {
            contribution_id: contrib.id,
            case_id: contrib.case_id,
            amount: amount
          },
          read: false,
          created_at: contrib.created_at
        })
      }
      
      // Donor notification (for unknown contributor)
      if (contrib.donor_id) {
        notificationsToInsert.push({
          type: 'contribution_approved',
          recipient_id: contrib.donor_id,
          title: 'Contribution Approved',
          message: `Your contribution of ${amount.toLocaleString()} EGP for "${caseTitle}" has been approved. Thank you for your generosity!`,
          data: {
            contribution_id: contrib.id,
            amount: amount,
            case_title: caseTitle
          },
          read: false,
          created_at: contrib.created_at
        })
      }
    }
    
    const batchSize = 100
    let notifInserted = 0
    for (let i = 0; i < notificationsToInsert.length; i += batchSize) {
      const batch = notificationsToInsert.slice(i, i + batchSize)
      const { error: notifError } = await supabase
        .from('notifications')
        .insert(batch)
      
      if (notifError) {
        console.error(`   ⚠️  Error inserting notification batch ${Math.floor(i / batchSize) + 1}:`, notifError.message)
      } else {
        notifInserted += batch.length
      }
    }
    
    console.log(`   ✓ Created ${notifInserted} notifications\n`)
  }
  
  // Step 7: Summary
  console.log('='.repeat(60))
  console.log('📊 IMPORT SUMMARY')
  console.log('='.repeat(60))
  console.log(`✅ Imported: ${importedCount} contributions`)
  console.log(`⚠️  Skipped: ${skippedCount} contributions (cases not found)`)
  console.log(`💰 Total amount: ${skippedContributions.reduce((sum, c) => sum + c.amount, 0).toLocaleString()} EGP`)
  console.log('='.repeat(60) + '\n')
}

importSkippedContributions()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error:', error)
    process.exit(1)
  })

