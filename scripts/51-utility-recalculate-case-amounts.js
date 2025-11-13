/**
 * Script to recalculate current_amount for all cases based on approved contributions
 * Run this to fix cases where current_amount doesn't match actual approved contributions
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
  console.error('Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function recalculateCaseAmounts() {
  console.log('🔄 Starting case amount recalculation...\n')

  try {
    // Get all cases
    const { data: cases, error: casesError } = await supabase
      .from('cases')
      .select('id, title_en, title_ar, current_amount, target_amount')

    if (casesError) {
      console.error('❌ Error fetching cases:', casesError)
      return
    }

    console.log(`📊 Found ${cases.length} cases to process\n`)

    let updatedCount = 0
    let totalDifference = 0

    for (const caseItem of cases) {
      try {
        // Get all approved contributions for this case
        // Check both: contributions.status = 'approved' AND approval_status.status = 'approved'
        const { data: contributions, error: contribError } = await supabase
          .from('contributions')
          .select(`
            id,
            amount,
            status,
            contribution_approval_status!inner(status)
          `)
          .eq('case_id', caseItem.id)

        if (contribError) {
          console.error(`❌ Error fetching contributions for case ${caseItem.id}:`, contribError)
          continue
        }

        // Filter to only approved contributions
        const approvedContributions = contributions?.filter(contrib => {
          // Check if contribution has approved status
          const approvalStatus = contrib.contribution_approval_status
          const isApproved = Array.isArray(approvalStatus) 
            ? approvalStatus.some(s => s.status === 'approved')
            : approvalStatus?.status === 'approved'
          
          // Also check the main status field
          return isApproved || contrib.status === 'approved'
        }) || []

        // Calculate total approved amount
        const totalApproved = approvedContributions.reduce((sum, contrib) => {
          return sum + parseFloat(contrib.amount || '0')
        }, 0)

        const currentAmount = parseFloat(caseItem.current_amount || '0')
        const difference = Math.abs(totalApproved - currentAmount)

        if (difference > 0.01) {
          // Update the case
          const { error: updateError } = await supabase
            .from('cases')
            .update({
              current_amount: totalApproved.toString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', caseItem.id)

          if (updateError) {
            console.error(`❌ Error updating case ${caseItem.id}:`, updateError)
          } else {
            updatedCount++
            totalDifference += difference
            const title = caseItem.title_en || caseItem.title_ar || caseItem.id
            console.log(`✅ Updated: ${title}`)
            console.log(`   Old: EGP ${currentAmount.toLocaleString()} → New: EGP ${totalApproved.toLocaleString()}`)
            console.log(`   Approved contributions: ${approvedContributions.length}\n`)
          }
        }
      } catch (error) {
        console.error(`❌ Error processing case ${caseItem.id}:`, error)
      }
    }

    console.log('\n📈 Summary:')
    console.log(`   Cases processed: ${cases.length}`)
    console.log(`   Cases updated: ${updatedCount}`)
    console.log(`   Total difference corrected: EGP ${totalDifference.toLocaleString()}`)
    console.log('\n✅ Recalculation complete!')

  } catch (error) {
    console.error('❌ Fatal error:', error)
    process.exit(1)
  }
}

// Run the script
recalculateCaseAmounts()
  .then(() => {
    console.log('\n✨ Done!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Script failed:', error)
    process.exit(1)
  })

