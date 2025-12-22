/**
 * Find Extra Contributions
 * 
 * Compares database contributions with CSV to find extras
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

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

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

async function findExtras() {
  console.log('🔍 Finding extra contributions...\n')
  
  // Read CSV
  const csvPath = join(__dirname, '..', 'docs', 'cases', 'contributions.csv')
  const csvContent = fs.readFileSync(csvPath, 'utf-8')
  const lines = csvContent.split('\n').filter(l => l.trim())
  const headers = parseCSVLine(lines[0])
  
  const idIdx = headers.indexOf('ID')
  const amountIdx = headers.indexOf('Amount')
  const descIdx = headers.indexOf('Description')
  
  // Build CSV map: caseId:amount -> count
  const csvMap = new Map()
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    if (values.length <= amountIdx) continue
    
    const caseId = values[idIdx]?.trim()
    const amountStr = values[amountIdx]?.replace(/[,"]/g, '').trim()
    const amount = parseFloat(amountStr)
    
    if (caseId && !isNaN(amount)) {
      const key = `${caseId}:${amount}`
      csvMap.set(key, (csvMap.get(key) || 0) + 1)
    }
  }
  
  console.log(`📋 CSV: ${lines.length - 1} contributions\n`)
  
  // Get DB contributions
  const { data: dbContribs } = await supabase
    .from('contributions')
    .select(`
      id,
      amount,
      case_id,
      created_at,
      cases (
        title_ar,
        id
      )
    `)
    .order('created_at', { ascending: false })
  
  console.log(`💾 Database: ${dbContribs?.length || 0} contributions\n`)
  
  // Group DB contributions by case title and amount
  const dbGroups = new Map()
  dbContribs?.forEach(c => {
    const caseTitle = Array.isArray(c.cases) ? c.cases[0]?.title_ar : c.cases?.title_ar
    const amount = parseFloat(c.amount || 0)
    const key = `${caseTitle}:${amount}`
    
    if (!dbGroups.has(key)) {
      dbGroups.set(key, [])
    }
    dbGroups.get(key).push(c)
  })
  
  // Find extras
  console.log('🔍 Checking for extra contributions...\n')
  let extraCount = 0
  let extraAmount = 0
  
  dbGroups.forEach((group, key) => {
    const [caseTitle, amount] = key.split(':')
    const dbCount = group.length
    
    // Try to find matching CSV entries
    // Since we don't have case IDs in DB, we'll check by amount patterns
    let csvCount = 0
    csvMap.forEach((count, csvKey) => {
      const [, csvAmount] = csvKey.split(':')
      if (parseFloat(csvAmount) === parseFloat(amount)) {
        csvCount += count
      }
    })
    
    if (dbCount > csvCount) {
      const extra = dbCount - csvCount
      extraCount += extra
      extraAmount += extra * parseFloat(amount)
      
      console.log(`⚠️  Extra: "${caseTitle}" - ${amount} EGP`)
      console.log(`   CSV: ${csvCount}, DB: ${dbCount}, Extra: ${extra}`)
      group.forEach(c => {
        console.log(`   - ${c.id} (${c.created_at})`)
      })
      console.log()
    }
  })
  
  console.log('='.repeat(60))
  console.log('📊 SUMMARY')
  console.log('='.repeat(60))
  console.log(`Extra contributions: ${extraCount}`)
  console.log(`Extra amount: ${extraAmount.toLocaleString()} EGP`)
  console.log('='.repeat(60) + '\n')
}

findExtras()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Error:', err)
    process.exit(1)
  })

