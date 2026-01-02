#!/usr/bin/env node

/**
 * Delete Cases from a Specific Date
 * 
 * This script deletes cases created on a specific date (default: yesterday).
 * It also handles related contributions and other dependent data.
 * 
 * Usage: 
 *   node scripts/admin/75-delete-cases-from-date.js [date]
 *   node scripts/admin/75-delete-cases-from-date.js 2025-01-15
 *   node scripts/admin/75-delete-cases-from-date.js yesterday
 *   node scripts/admin/75-delete-cases-from-date.js today
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import readline from 'readline'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

dotenv.config({ path: join(__dirname, '../../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:')
  console.error('   - NEXT_PUBLIC_SUPABASE_URL')
  console.error('   - SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

function getDateRange(dateInput) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  let targetDate
  
  if (!dateInput || dateInput.toLowerCase() === 'yesterday') {
    targetDate = new Date(today)
    targetDate.setDate(targetDate.getDate() - 1)
  } else if (dateInput.toLowerCase() === 'today') {
    targetDate = new Date(today)
  } else {
    // Parse date string (YYYY-MM-DD)
    targetDate = new Date(dateInput)
    if (isNaN(targetDate.getTime())) {
      console.error(`❌ Invalid date format: ${dateInput}`)
      console.error('   Use format: YYYY-MM-DD (e.g., 2025-01-15)')
      process.exit(1)
    }
    targetDate.setHours(0, 0, 0, 0)
  }
  
  const startDate = new Date(targetDate)
  startDate.setHours(0, 0, 0, 0)
  
  const endDate = new Date(targetDate)
  endDate.setHours(23, 59, 59, 999)
  
  return { startDate, endDate, targetDate }
}

function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })
  
  return new Promise(resolve => {
    rl.question(query, answer => {
      rl.close()
      resolve(answer)
    })
  })
}

async function deleteCasesFromDate(dateInput) {
  try {
    const { startDate, endDate, targetDate } = getDateRange(dateInput)
    
    console.log(`🔍 Finding cases created on: ${targetDate.toISOString().split('T')[0]}\n`)
    
    // 1. Find all cases created on the target date
    const { data: cases, error: casesError } = await supabase
      .from('cases')
      .select('id, title_ar, title_en, created_at, current_amount, status')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .order('created_at', { ascending: true })
    
    if (casesError) {
      console.error('❌ Error fetching cases:', casesError)
      process.exit(1)
    }
    
    if (!cases || cases.length === 0) {
      console.log('✅ No cases found for the specified date.')
      process.exit(0)
    }
    
    console.log(`📋 Found ${cases.length} case(s) created on ${targetDate.toISOString().split('T')[0]}:\n`)
    
    // Show preview
    cases.forEach((case_, index) => {
      console.log(`   ${index + 1}. ${case_.title_ar || case_.title_en || 'Untitled'}`)
      console.log(`      ID: ${case_.id}`)
      console.log(`      Status: ${case_.status}`)
      console.log(`      Current Amount: ${case_.current_amount || 0}`)
      console.log(`      Created: ${new Date(case_.created_at).toLocaleString()}`)
      console.log('')
    })
    
    // 2. Count related data
    const caseIds = cases.map(c => c.id)
    
    // Count contributions
    const { data: contributions, error: contribError } = await supabase
      .from('contributions')
      .select('id, amount, case_id')
      .in('case_id', caseIds)
    
    // Count batch_upload_items references
    const { data: batchItems, error: batchItemsError } = await supabase
      .from('batch_upload_items')
      .select('id, case_id')
      .in('case_id', caseIds)
    
    if (contribError) {
      console.error('⚠️  Error fetching contributions:', contribError)
    }
    if (batchItemsError) {
      console.error('⚠️  Error fetching batch_upload_items:', batchItemsError)
    }
    
    const totalContributions = contributions?.length || 0
    const totalAmount = contributions?.reduce((sum, c) => sum + parseFloat(c.amount || 0), 0) || 0
    const totalBatchItems = batchItems?.length || 0
    
    console.log(`📊 Related data:`)
    console.log(`   - Contributions: ${totalContributions}`)
    console.log(`   - Total contribution amount: ${totalAmount.toLocaleString()}`)
    console.log(`   - Batch upload items references: ${totalBatchItems}\n`)
    
    // 3. Ask for confirmation
    console.log('⚠️  WARNING: This will permanently delete:')
    console.log(`   - ${cases.length} case(s)`)
    console.log(`   - ${contributions?.length || 0} contribution(s)`)
    console.log(`   - Clear ${batchItems?.length || 0} batch_upload_items reference(s)`)
    console.log(`   - All related data (images, files, updates, etc.)\n`)
    
    const answer = await askQuestion('Are you sure you want to proceed? (yes/no): ')
    
    if (answer.toLowerCase() !== 'yes') {
      console.log('❌ Deletion cancelled.')
      process.exit(0)
    }
    
    // 4. Clear batch_upload_items references first (due to foreign key constraints)
    console.log(`\n🔄 Clearing batch_upload_items references...`)
    const { error: clearBatchItemsError } = await supabase
      .from('batch_upload_items')
      .update({ case_id: null })
      .in('case_id', caseIds)
    
    if (clearBatchItemsError) {
      console.error('❌ Error clearing batch_upload_items:', clearBatchItemsError)
      process.exit(1)
    }
    console.log(`✅ Cleared batch_upload_items references\n`)
    
    // 5. Delete contributions (due to foreign key constraints)
    if (contributions && contributions.length > 0) {
      console.log(`🗑️  Deleting ${contributions.length} contribution(s)...`)
      const { error: deleteContribError } = await supabase
        .from('contributions')
        .delete()
        .in('case_id', caseIds)
      
      if (deleteContribError) {
        console.error('❌ Error deleting contributions:', deleteContribError)
        process.exit(1)
      }
      console.log(`✅ Deleted ${contributions.length} contribution(s)\n`)
    }
    
    // 6. Delete cases
    console.log(`🗑️  Deleting ${cases.length} case(s)...`)
    const { error: deleteCasesError } = await supabase
      .from('cases')
      .delete()
      .in('id', caseIds)
    
    if (deleteCasesError) {
      console.error('❌ Error deleting cases:', deleteCasesError)
      process.exit(1)
    }
    console.log(`✅ Deleted ${cases.length} case(s)\n`)
    
    console.log('✅ Deletion completed successfully!')
    console.log('\n📝 Summary:')
    console.log(`   - Cases deleted: ${cases.length}`)
    console.log(`   - Contributions deleted: ${contributions?.length || 0}`)
    console.log(`   - Date: ${targetDate.toISOString().split('T')[0]}`)
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
    process.exit(1)
  }
}

// Get date from command line (default: yesterday)
const dateInput = process.argv[2] || 'yesterday'

deleteCasesFromDate(dateInput)

