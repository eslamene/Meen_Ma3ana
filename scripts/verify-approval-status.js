const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function verifyApprovalStatus() {
  try {
    console.log('🔍 Verifying contribution_approval_status table...')
    
    // Check if table exists
    const { data: tableInfo, error: tableError } = await supabase
      .from('contribution_approval_status')
      .select('*')
      .limit(1)
    
    if (tableError) {
      console.error('❌ Table does not exist or error accessing it:', tableError)
      return
    }
    
    console.log('✅ Table exists and is accessible!')
    
    // Get count of approval status records
    const { count: approvalCount, error: countError } = await supabase
      .from('contribution_approval_status')
      .select('*', { count: 'exact', head: true })
    
    if (countError) {
      console.error('❌ Error counting records:', countError)
      return
    }
    
    console.log(`📊 Found ${approvalCount} approval status records`)
    
    // Get count of contributions
    const { count: contributionCount, error: contributionError } = await supabase
      .from('contributions')
      .select('*', { count: 'exact', head: true })
    
    if (contributionError) {
      console.error('❌ Error counting contributions:', contributionError)
      return
    }
    
    console.log(`📊 Found ${contributionCount} total contributions`)
    
    // Check if all contributions have approval status
    if (approvalCount >= contributionCount) {
      console.log('✅ All contributions have approval status records!')
    } else {
      console.log(`⚠️  ${contributionCount - approvalCount} contributions are missing approval status records`)
    }
    
    // Show sample data
    const { data: sampleData, error: sampleError } = await supabase
      .from('contribution_approval_status')
      .select(`
        id,
        contribution_id,
        status,
        resubmission_count,
        created_at,
        contributions:contribution_id(amount, status)
      `)
      .limit(5)
    
    if (sampleError) {
      console.error('❌ Error fetching sample data:', sampleError)
      return
    }
    
    console.log('\n📋 Sample approval status records:')
    sampleData?.forEach((record, index) => {
      console.log(`${index + 1}. Contribution: ${record.contribution_id}`)
      console.log(`   Status: ${record.status}`)
      console.log(`   Resubmissions: ${record.resubmission_count}`)
      console.log(`   Created: ${record.created_at}`)
      if (record.contributions) {
        console.log(`   Amount: ${record.contributions.amount}`)
      }
      console.log('')
    })
    
    console.log('🎉 Verification completed successfully!')
    
  } catch (error) {
    console.error('❌ Verification failed:', error)
  }
}

verifyApprovalStatus() 