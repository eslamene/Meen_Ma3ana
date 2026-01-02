#!/usr/bin/env node

/**
 * Rollback Batch Upload
 * 
 * This script rolls back a batch upload by:
 * 1. Deleting all contributions created from the batch
 * 2. Deleting all cases created from the batch
 * 3. Resetting batch_upload_items status
 * 4. Resetting batch_uploads status
 * 
 * Usage: node scripts/admin/74-rollback-batch-upload.js <batchId>
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

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

async function rollbackBatch(batchId) {
  try {
    console.log(`🔄 Rolling back batch upload: ${batchId}\n`)

    // 1. Fetch batch details
    const { data: batch, error: batchError } = await supabase
      .from('batch_uploads')
      .select('*')
      .eq('id', batchId)
      .single()

    if (batchError || !batch) {
      console.error(`❌ Batch not found: ${batchId}`)
      process.exit(1)
    }

    console.log(`📋 Batch: ${batch.name || batchId}`)
    console.log(`   Status: ${batch.status}`)
    console.log(`   Total items: ${batch.total_items}\n`)

    // 2. Fetch all items
    const { data: items, error: itemsError } = await supabase
      .from('batch_upload_items')
      .select('*')
      .eq('batch_id', batchId)

    if (itemsError) {
      console.error('❌ Error fetching batch items:', itemsError)
      process.exit(1)
    }

    console.log(`📦 Found ${items?.length || 0} items\n`)

    // 3. Delete contributions by batch_id (more reliable than using items)
    console.log(`🗑️  Finding contributions created by this batch...`)
    const { data: contributions, error: contribFetchError } = await supabase
      .from('contributions')
      .select('id')
      .eq('batch_id', batchId)

    if (contribFetchError) {
      console.error('❌ Error fetching contributions:', contribFetchError)
      process.exit(1)
    }

    const contributionIds = contributions?.map(c => c.id) || []

    if (contributionIds.length > 0) {
      console.log(`🗑️  Deleting ${contributionIds.length} contributions...`)
      const { error: contribError } = await supabase
        .from('contributions')
        .delete()
        .eq('batch_id', batchId)

      if (contribError) {
        console.error('❌ Error deleting contributions:', contribError)
        process.exit(1)
      }
      console.log(`✅ Deleted ${contributionIds.length} contributions\n`)
    } else {
      console.log('ℹ️  No contributions to delete\n')
    }

    // 4. Delete cases by batch_id (more reliable than using items)
    console.log(`🗑️  Finding cases created by this batch...`)
    const { data: cases, error: casesFetchError } = await supabase
      .from('cases')
      .select('id')
      .eq('batch_id', batchId)

    if (casesFetchError) {
      console.error('❌ Error fetching cases:', casesFetchError)
      process.exit(1)
    }

    const caseIds = cases?.map(c => c.id) || []

    if (caseIds.length > 0) {
      console.log(`🗑️  Deleting ${caseIds.length} cases...`)
      const { error: caseError } = await supabase
        .from('cases')
        .delete()
        .eq('batch_id', batchId)

      if (caseError) {
        console.error('❌ Error deleting cases:', caseError)
        process.exit(1)
      }
      console.log(`✅ Deleted ${caseIds.length} cases\n`)
    } else {
      console.log('ℹ️  No cases to delete\n')
    }

    // 5. Reset batch_upload_items status
    console.log('🔄 Resetting batch_upload_items status...')
    const { error: itemsResetError } = await supabase
      .from('batch_upload_items')
      .update({
        status: 'pending',
        case_id: null,
        contribution_id: null,
        user_id: null,
        error_message: null,
        updated_at: new Date().toISOString()
      })
      .eq('batch_id', batchId)

    if (itemsResetError) {
      console.error('❌ Error resetting items:', itemsResetError)
      process.exit(1)
    }
    console.log('✅ Reset all items to pending status\n')

    // 6. Reset batch_uploads status
    console.log('🔄 Resetting batch_uploads status...')
    const { error: batchResetError } = await supabase
      .from('batch_uploads')
      .update({
        status: 'pending',
        processed_items: 0,
        successful_items: 0,
        failed_items: 0,
        error_summary: null,
        completed_at: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', batchId)

    if (batchResetError) {
      console.error('❌ Error resetting batch:', batchResetError)
      process.exit(1)
    }
    console.log('✅ Reset batch to pending status\n')

    console.log('✅ Rollback completed successfully!')
    console.log('\n📝 Summary:')
    console.log(`   - Contributions deleted: ${contributionIds.length}`)
    console.log(`   - Cases deleted: ${uniqueCaseIds.length}`)
    console.log(`   - Items reset: ${items?.length || 0}`)
    console.log(`   - Batch status: pending`)

  } catch (error) {
    console.error('❌ Unexpected error:', error)
    process.exit(1)
  }
}

// Get batch ID from command line
const batchId = process.argv[2]

if (!batchId) {
  console.error('❌ Usage: node scripts/admin/74-rollback-batch-upload.js <batchId>')
  process.exit(1)
}

rollbackBatch(batchId)

