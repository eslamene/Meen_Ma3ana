/**
 * Check Contribution Totals
 * 
 * This script checks the total contributions in the database vs CSV
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

async function checkTotals() {
  console.log('📊 Checking Contribution Totals...\n')
  
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
  
  // Read CSV and calculate totals
  const csvPath = join(__dirname, '..', 'docs', 'cases', 'contributions.csv')
  const csvContent = fs.readFileSync(csvPath, 'utf-8')
  const lines = csvContent.split('\n').filter(line => line.trim())
  const headers = parseCSVLine(lines[0])
  
  const amountIdx = headers.indexOf('Amount')
  const contributorIdIdx = headers.indexOf('ContributorID')
  
  let csvTotal = 0
  let csvImported = 0
  let csvSkipped = 0
  let csvImportedCount = 0
  let csvSkippedCount = 0
  
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    if (values.length <= amountIdx || values.length <= contributorIdIdx) continue
    
    const amountStr = values[amountIdx]?.replace(/[,"]/g, '').trim() || '0'
    const contributorIdStr = values[contributorIdIdx]?.trim() || '0'
    
    const amount = parseFloat(amountStr)
    if (isNaN(amount) || amount <= 0) continue
    
    csvTotal += amount
    
    if (contributorIdStr === '100' || contributorIdStr === '') {
      csvSkipped += amount
      csvSkippedCount++
    } else {
      csvImported += amount
      csvImportedCount++
    }
  }
  
  console.log('📋 CSV Totals:')
  console.log(`   Total contributions: ${lines.length - 1}`)
  console.log(`   Total amount: ${csvTotal.toLocaleString()} EGP`)
  console.log(`   To import: ${csvImportedCount} contributions = ${csvImported.toLocaleString()} EGP`)
  console.log(`   Skipped (ID=100): ${csvSkippedCount} contributions = ${csvSkipped.toLocaleString()} EGP\n`)
  
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
  
  console.log('📊 Comparison:')
  console.log(`   CSV (total including unknown): ${csvTotal.toLocaleString()} EGP`)
  console.log(`   CSV (to import, excluding ID=100): ${csvImported.toLocaleString()} EGP`)
  console.log(`   DB (approved): ${dbApprovedTotal.toLocaleString()} EGP`)
  console.log(`   Difference (CSV total vs DB): ${(csvTotal - dbApprovedTotal).toLocaleString()} EGP`)
  console.log(`   Difference (CSV imported vs DB): ${(csvImported - dbApprovedTotal).toLocaleString()} EGP\n`)
  
  if (Math.abs(csvTotal - dbApprovedTotal) > 1) {
    console.log('⚠️  Mismatch detected!')
    if (csvTotal > dbApprovedTotal) {
      console.log(`   CSV has ${(csvTotal - dbApprovedTotal).toLocaleString()} EGP more than database`)
    } else {
      console.log(`   Database has ${(dbApprovedTotal - csvTotal).toLocaleString()} EGP more than CSV`)
    }
    console.log(`   CSV total (including unknown): ${csvTotal.toLocaleString()} EGP`)
    console.log(`   CSV imported (excluding ID=100): ${csvImported.toLocaleString()} EGP`)
    console.log(`   CSV skipped (ID=100): ${csvSkipped.toLocaleString()} EGP`)
    console.log(`   Database total: ${dbApprovedTotal.toLocaleString()} EGP\n`)
  } else {
    console.log('✅ CSV total matches database!\n')
  }
}

checkTotals()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error:', error)
    process.exit(1)
  })

