/**
 * Step 3: Verify Import
 * 
 * This script verifies that the import was successful by comparing
 * CSV totals with database totals and checking for discrepancies.
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

// Parse CSV properly handling commas in Arabic text
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

async function verifyImport() {
  console.log('📊 Verifying Import...\n')
  
  // Read CSV
  const csvPath = join(__dirname, '..', 'docs', 'cases', 'contributions.csv')
  const csvContent = fs.readFileSync(csvPath, 'utf-8')
  const lines = csvContent.split('\n').filter(l => l.trim())
  const headers = parseCSVLine(lines[0])
  
  const amountIdx = headers.indexOf('Amount')
  const contributorIdIdx = headers.indexOf('ContributorID')
  
  let csvTotal = 0
  let csvCount = 0
  
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    if (values.length <= amountIdx) continue
    
    const amountStr = values[amountIdx]?.replace(/[,"]/g, '').trim() || '0'
    const amount = parseFloat(amountStr)
    
    if (!isNaN(amount) && amount > 0) {
      csvTotal += amount
      csvCount++
    }
  }
  
  console.log('📋 CSV Totals:')
  console.log(`   Total contributions: ${csvCount}`)
  console.log(`   Total amount: ${csvTotal.toLocaleString()} EGP\n`)
  
  // Get database totals
  const { data: allContribs, error: allError } = await supabase
    .from('contributions')
    .select('amount, status')
  
  if (allError) {
    console.error('❌ Error fetching contributions:', allError.message)
    process.exit(1)
  }
  
  const dbTotal = allContribs.reduce((sum, c) => {
    const amount = typeof c.amount === 'string' ? parseFloat(c.amount) : (c.amount || 0)
    return sum + amount
  }, 0)
  
  const approved = allContribs.filter(c => c.status === 'approved')
  const dbApprovedTotal = approved.reduce((sum, c) => {
    const amount = typeof c.amount === 'string' ? parseFloat(c.amount) : (c.amount || 0)
    return sum + amount
  }, 0)
  
  console.log('💾 Database Totals:')
  console.log(`   Total contributions: ${allContribs.length}`)
  console.log(`   Total amount (all): ${dbTotal.toLocaleString()} EGP`)
  console.log(`   Approved contributions: ${approved.length}`)
  console.log(`   Total amount (approved): ${dbApprovedTotal.toLocaleString()} EGP\n`)
  
  // Check notifications
  const { count: notifCount } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .in('type', ['contribution_pending', 'contribution_approved', 'contribution_rejected'])
  
  // Check approval statuses
  const { count: approvalCount } = await supabase
    .from('contribution_approval_status')
    .select('*', { count: 'exact', head: true })
  
  console.log('📬 Notifications:')
  console.log(`   Total contribution notifications: ${notifCount || 0}\n`)
  
  console.log('✅ Approval Statuses:')
  console.log(`   Total approval statuses: ${approvalCount || 0}\n`)
  
  // Comparison
  console.log('='.repeat(60))
  console.log('📊 VERIFICATION RESULTS')
  console.log('='.repeat(60))
  
  const amountMatch = Math.abs(csvTotal - dbApprovedTotal) < 1
  const countMatch = csvCount === allContribs.length
  
  if (amountMatch && countMatch) {
    console.log('✅ SUCCESS: All totals match!')
    console.log(`   CSV: ${csvTotal.toLocaleString()} EGP (${csvCount} contributions)`)
    console.log(`   DB:  ${dbApprovedTotal.toLocaleString()} EGP (${allContribs.length} contributions)`)
  } else {
    console.log('⚠️  MISMATCH DETECTED:')
    if (!amountMatch) {
      console.log(`   Amount difference: ${(csvTotal - dbApprovedTotal).toLocaleString()} EGP`)
    }
    if (!countMatch) {
      console.log(`   Count difference: ${csvCount - allContribs.length} contributions`)
    }
  }
  
  console.log(`\n📬 Notifications: ${notifCount || 0}`)
  console.log(`✅ Approval Statuses: ${approvalCount || 0}`)
  
  if (notifCount !== allContribs.length * 2) {
    console.log(`\n⚠️  Expected ${allContribs.length * 2} notifications (${allContribs.length} pending + ${allContribs.length} approved)`)
    console.log(`   Run: node scripts/backfill-contribution-notifications.js`)
  }
  
  console.log('='.repeat(60) + '\n')
}

verifyImport()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error:', error)
    process.exit(1)
  })

