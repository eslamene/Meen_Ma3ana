import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { env } from '@/config/env'
import { createGetHandlerWithParams, createPostHandlerWithParams, createDeleteHandlerWithParams, ApiHandlerContext } from '@/lib/utils/api-wrapper'
import { ApiError } from '@/lib/utils/api-errors'
import { db } from '@/lib/db'
import { batchUploads, batchUploadItems, cases, contributions } from '@/drizzle/schema'
import { eq, and } from 'drizzle-orm'

interface NicknameMapping {
  nickname: string
  user_id: string
}

/**
 * GET /api/admin/cases/batch-upload/[batchId]
 * Get batch upload details including all items
 */
async function getHandler(
  request: NextRequest,
  context: ApiHandlerContext,
  params: { batchId: string }
) {
  const { logger } = context
  const { batchId } = params

  try {
    if (!env.SUPABASE_SERVICE_ROLE_KEY) {
      logger.error('SUPABASE_SERVICE_ROLE_KEY is required for batch operations')
      throw new ApiError('CONFIGURATION_ERROR', 'Service configuration error', 500)
    }

    const serviceRoleClient = createClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Fetch batch upload
    const { data: batch, error: batchError } = await serviceRoleClient
      .from('batch_uploads')
      .select('*')
      .eq('id', batchId)
      .single()

    if (batchError) {
      logger.error('Error fetching batch upload:', {
        error: batchError,
        message: batchError.message,
        code: batchError.code,
        details: batchError.details,
        hint: batchError.hint,
        batchId
      })
      throw new ApiError('NOT_FOUND', `Batch upload not found: ${batchError.message}`, 404)
    }

    if (!batch) {
      throw new ApiError('NOT_FOUND', 'Batch upload not found', 404)
    }

  // Fetch batch items
  const { data: items, error: itemsError } = await serviceRoleClient
    .from('batch_upload_items')
    .select('*')
    .eq('batch_id', batchId)
    .order('row_number', { ascending: true })

  if (itemsError) {
    logger.error('Error fetching batch items:', {
      error: itemsError,
      message: itemsError.message,
      code: itemsError.code,
      details: itemsError.details,
      hint: itemsError.hint,
      batchId
    })
    throw new ApiError('INTERNAL_SERVER_ERROR', `Failed to fetch batch items: ${itemsError.message}`, 500)
  }

  // Get unique nicknames for mapping (handle both snake_case and camelCase)
  const uniqueNicknames = Array.from(
    new Set(
      items?.map(item => 
        item.contributor_nickname || 
        (item as any).contributorNickname || 
        ''
      ).filter(Boolean) || []
    )
  )

    // Helper to safely get field value (handle both snake_case and camelCase)
    const getField = (item: any, field: string) => {
      return item[field] || item[field.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())] || null
    }

    return NextResponse.json({
      success: true,
      data: {
        batch,
        items: items || [],
        unique_nicknames: uniqueNicknames,
        summary: {
          total: items?.length || 0,
          pending: items?.filter(i => getField(i, 'status') === 'pending').length || 0,
          mapped: items?.filter(i => getField(i, 'status') === 'mapped' || getField(i, 'user_id')).length || 0,
          case_created: items?.filter(i => getField(i, 'status') === 'case_created' || getField(i, 'case_id')).length || 0,
          contribution_created: items?.filter(i => getField(i, 'status') === 'contribution_created' || getField(i, 'contribution_id')).length || 0,
          failed: items?.filter(i => getField(i, 'status') === 'failed').length || 0
        }
      }
    })
  } catch (error) {
    logger.error('Unexpected error in getHandler:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      batchId
    })
    
    if (error instanceof ApiError) {
      throw error
    }
    
    throw new ApiError(
      'INTERNAL_SERVER_ERROR',
      `An unexpected error occurred: ${error instanceof Error ? error.message : 'Unknown error'}`,
      500
    )
  }
}

/**
 * POST /api/admin/cases/batch-upload/[batchId]/map-nicknames
 * Map contributor nicknames to users
 */
async function mapNicknamesHandler(
  request: NextRequest,
  context: ApiHandlerContext,
  params: { batchId: string },
  body?: any
) {
  const { logger, user } = context
  const { batchId } = params

  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    logger.error('SUPABASE_SERVICE_ROLE_KEY is required for batch operations')
    throw new ApiError('CONFIGURATION_ERROR', 'Service configuration error', 500)
  }

  const serviceRoleClient = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )

  // Use body passed from postHandler, or parse if not provided
  const requestBody = body || await request.json()
  const mappings: NicknameMapping[] = requestBody.mappings || []

  if (!Array.isArray(mappings) || mappings.length === 0) {
    throw new ApiError('VALIDATION_ERROR', 'Mappings array is required', 400)
  }

  // Verify batch exists
  const { data: batch, error: batchError } = await serviceRoleClient
    .from('batch_uploads')
    .select('*')
    .eq('id', batchId)
    .single()

  if (batchError || !batch) {
    throw new ApiError('NOT_FOUND', 'Batch upload not found', 404)
  }

  if (batch.status !== 'pending') {
    throw new ApiError('VALIDATION_ERROR', 'Can only map nicknames for pending batches', 400)
  }

  // Update items with user mappings
  let updatedCount = 0
  const errors: string[] = []

  for (const mapping of mappings) {
    if (!mapping.nickname) {
      errors.push(`Invalid mapping: nickname is required`)
      continue
    }

    // If user_id is null, clear the mapping
    if (!mapping.user_id) {
      const { error: updateError } = await serviceRoleClient
        .from('batch_upload_items')
        .update({
          user_id: null,
          status: 'pending',
          updated_at: new Date().toISOString()
        })
        .eq('batch_id', batchId)
        .eq('contributor_nickname', mapping.nickname)

      if (updateError) {
        errors.push(`Failed to clear mapping for nickname ${mapping.nickname}: ${updateError.message}`)
      } else {
        updatedCount++
      }
      continue
    }

    // Verify user exists
    const { data: userData } = await serviceRoleClient
      .from('users')
      .select('id')
      .eq('id', mapping.user_id)
      .single()

    if (!userData) {
      errors.push(`User not found: ${mapping.user_id}`)
      continue
    }

    // Update all items with this nickname
    const { error: updateError } = await serviceRoleClient
      .from('batch_upload_items')
      .update({
        user_id: mapping.user_id,
        status: 'mapped',
        updated_at: new Date().toISOString()
      })
      .eq('batch_id', batchId)
      .eq('contributor_nickname', mapping.nickname)

    if (updateError) {
      errors.push(`Failed to update items for nickname ${mapping.nickname}: ${updateError.message}`)
    } else {
      updatedCount++
    }
  }

  return NextResponse.json({
    success: true,
    updated_count: updatedCount,
    errors: errors.length > 0 ? errors : undefined,
    message: `Mapped ${updatedCount} nickname(s)${errors.length > 0 ? `. ${errors.length} error(s) occurred.` : ''}`
  })
}

/**
 * POST /api/admin/cases/batch-upload/[batchId]/process
 * Process the batch: create cases and contributions
 */
async function processHandler(
  request: NextRequest,
  context: ApiHandlerContext,
  params: { batchId: string }
) {
  const { logger, user } = context
  const { batchId } = params

  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    logger.error('SUPABASE_SERVICE_ROLE_KEY is required for batch operations')
    throw new ApiError('CONFIGURATION_ERROR', 'Service configuration error', 500)
  }

  const serviceRoleClient = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )

  // Verify batch exists and is ready
  const { data: batch, error: batchError } = await serviceRoleClient
    .from('batch_uploads')
    .select('*')
    .eq('id', batchId)
    .single()

  if (batchError || !batch) {
    throw new ApiError('NOT_FOUND', 'Batch upload not found', 404)
  }

  if (batch.status === 'processing') {
    throw new ApiError('VALIDATION_ERROR', 'Batch is already being processed', 400)
  }

  if (batch.status === 'completed') {
    throw new ApiError('VALIDATION_ERROR', 'Batch has already been processed', 400)
  }

  // Update batch status to processing
  await serviceRoleClient
    .from('batch_uploads')
    .update({ status: 'processing', updated_at: new Date().toISOString() })
    .eq('id', batchId)

  // Fetch all items
  const { data: items, error: itemsError } = await serviceRoleClient
    .from('batch_upload_items')
    .select('*')
    .eq('batch_id', batchId)
    .order('row_number', { ascending: true })

  if (itemsError || !items || items.length === 0) {
    await serviceRoleClient
      .from('batch_uploads')
      .update({ status: 'failed', error_summary: { message: 'No items found' } })
      .eq('id', batchId)
    throw new ApiError('VALIDATION_ERROR', 'No items found in batch', 400)
  }

  // Validate that all items are mapped (have user_id)
  const unmappedItems = items.filter(item => !item.user_id || item.status === 'pending')
  if (unmappedItems.length > 0) {
    await serviceRoleClient
      .from('batch_uploads')
      .update({ status: 'pending', updated_at: new Date().toISOString() })
      .eq('id', batchId)
    throw new ApiError(
      'VALIDATION_ERROR',
      `Cannot process batch: ${unmappedItems.length} item(s) are not mapped. Please map all contributors before processing.`,
      400
    )
  }

  // Group items by case_number
  const casesMap = new Map<string, typeof items>()
  for (const item of items) {
    if (!item.case_number) continue
    if (!casesMap.has(item.case_number)) {
      casesMap.set(item.case_number, [])
    }
    casesMap.get(item.case_number)!.push(item)
  }

  let processedItems = 0
  let successfulItems = 0
  let failedItems = 0
  const errors: Array<{ item_id: string; error: string }> = []

  // Get default payment method (cash)
  const { data: paymentMethods } = await serviceRoleClient
    .from('payment_methods')
    .select('id')
    .eq('code', 'cash')
    .limit(1)

  const paymentMethodId = paymentMethods?.[0]?.id

  if (!paymentMethodId) {
    throw new ApiError('CONFIGURATION_ERROR', 'Default payment method (cash) not found', 500)
  }

  // Process each case
  for (const [caseNumber, caseItems] of casesMap.entries()) {
    try {
      // Get first item for case details
      const firstItem = caseItems[0]
      if (!firstItem) continue

      // Check if case already exists for this batch
      let caseId = firstItem.case_id

      if (!caseId) {
        // Create case
        const { data: newCase, error: caseError } = await serviceRoleClient
          .from('cases')
          .insert({
            title_ar: firstItem.case_title,
            title_en: firstItem.case_title, // Use Arabic as fallback
            description_ar: `Case imported from batch upload - Month ${firstItem.month}`,
            description_en: `Case imported from batch upload - Month ${firstItem.month}`,
            type: 'one-time',
            priority: 'medium',
            target_amount: caseItems.reduce((sum, item) => sum + parseFloat(String(item.amount || 0)), 0),
            current_amount: 0,
            status: 'draft',
            created_by: user.id,
            batch_id: batchId // Track which batch created this case
          })
          .select()
          .single()

        if (caseError || !newCase) {
          throw new Error(`Failed to create case: ${caseError?.message || 'Unknown error'}`)
        }

        caseId = newCase.id

        // Update all items with case_id
        await serviceRoleClient
          .from('batch_upload_items')
          .update({
            case_id: caseId,
            status: 'case_created',
            updated_at: new Date().toISOString()
          })
          .eq('batch_id', batchId)
          .eq('case_number', caseNumber)
      }

      // Create contributions for each item
      for (const item of caseItems) {
        try {
          if (!item.user_id) {
            errors.push({ item_id: item.id, error: 'No user mapped for this contribution' })
            failedItems++
            continue
          }

          const { data: contribution, error: contribError } = await serviceRoleClient
            .from('contributions')
            .insert({
              type: 'donation',
              amount: String(item.amount),
              payment_method_id: paymentMethodId,
              status: 'pending',
              donor_id: item.user_id,
              case_id: caseId,
              batch_id: batchId, // Track which batch created this contribution
              notes: `Imported from batch upload - Month ${item.month}`
            })
            .select()
            .single()

          if (contribError || !contribution) {
            throw new Error(`Failed to create contribution: ${contribError?.message || 'Unknown error'}`)
          }

          // Update item with contribution_id
          await serviceRoleClient
            .from('batch_upload_items')
            .update({
              contribution_id: contribution.id,
              status: 'contribution_created',
              updated_at: new Date().toISOString()
            })
            .eq('id', item.id)

          successfulItems++
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error'
          errors.push({ item_id: item.id, error: errorMsg })
          
          await serviceRoleClient
            .from('batch_upload_items')
            .update({
              status: 'failed',
              error_message: errorMsg,
              updated_at: new Date().toISOString()
            })
            .eq('id', item.id)

          failedItems++
        }

        processedItems++
      }

      // Update case current_amount
      const totalAmount = caseItems
        .filter(item => item.contribution_id)
        .reduce((sum, item) => sum + parseFloat(String(item.amount || 0)), 0)

      if (caseId && totalAmount > 0) {
        await serviceRoleClient
          .from('cases')
          .update({ current_amount: String(totalAmount) })
          .eq('id', caseId)
      }

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      logger.error(`Error processing case ${caseNumber}:`, error)
      
      // Mark all items in this case as failed
      for (const item of caseItems) {
        errors.push({ item_id: item.id, error: `Case creation failed: ${errorMsg}` })
        await serviceRoleClient
          .from('batch_upload_items')
          .update({
            status: 'failed',
            error_message: errorMsg,
            updated_at: new Date().toISOString()
          })
          .eq('id', item.id)
        failedItems++
        processedItems++
      }
    }
  }

  // Update batch status
  const finalStatus = failedItems === 0 ? 'completed' : (successfulItems > 0 ? 'completed' : 'failed')
  
  await serviceRoleClient
    .from('batch_uploads')
    .update({
      status: finalStatus,
      processed_items: processedItems,
      successful_items: successfulItems,
      failed_items: failedItems,
      error_summary: errors.length > 0 ? { errors, total_errors: errors.length } : null,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', batchId)

  return NextResponse.json({
    success: true,
    processed_items: processedItems,
    successful_items: successfulItems,
    failed_items: failedItems,
    errors: errors.length > 0 ? errors : undefined,
    message: `Processed ${processedItems} items. ${successfulItems} successful, ${failedItems} failed.`
  })
}

export const GET = createGetHandlerWithParams(getHandler, { 
  requireAuth: true,
  requirePermissions: ['cases:batch_upload']
})

/**
 * POST /api/admin/cases/batch-upload/[batchId]
 * Handle batch actions: map-nicknames or process
 */
async function postHandler(
  request: NextRequest,
  context: ApiHandlerContext,
  params: { batchId: string }
) {
  const body = await request.json()
  const { action } = body

  if (action === 'map-nicknames') {
    return mapNicknamesHandler(request, context, params, body)
  } else if (action === 'process') {
    return processHandler(request, context, params)
  } else {
    throw new ApiError('VALIDATION_ERROR', 'Invalid action. Use action: "map-nicknames" or "process"', 400)
  }
}

export const POST = createPostHandlerWithParams(postHandler, { 
  requireAuth: true,
  requirePermissions: ['cases:batch_upload']
})

/**
 * DELETE /api/admin/cases/batch-upload/[batchId]
 * Delete a batch upload and all associated data (rollback)
 */
async function deleteHandler(
  request: NextRequest,
  context: ApiHandlerContext,
  params: { batchId: string }
) {
  const { supabase, logger } = context
  const { batchId } = params

  // Use service role client for admin operations
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    logger.error('SUPABASE_SERVICE_ROLE_KEY is required for batch operations')
    throw new ApiError('CONFIGURATION_ERROR', 'Service configuration error', 500)
  }

  const serviceRoleClient = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  )

  try {
    logger.info(`Deleting batch upload: ${batchId}`)

    // 1. Fetch batch details
    const { data: batch, error: batchError } = await serviceRoleClient
      .from('batch_uploads')
      .select('*')
      .eq('id', batchId)
      .single()

    if (batchError || !batch) {
      logger.error('Batch not found:', batchError)
      throw new ApiError('NOT_FOUND', `Batch upload with ID ${batchId} not found`, 404)
    }

    logger.info(`Batch found: ${batch.name || batchId}, Status: ${batch.status}`)

    // 2. Delete contributions by batch_id
    const { data: contributions, error: contribFetchError } = await serviceRoleClient
      .from('contributions')
      .select('id')
      .eq('batch_id', batchId)

    if (contribFetchError) {
      logger.error('Error fetching contributions:', contribFetchError)
      throw new ApiError('INTERNAL_SERVER_ERROR', 'Failed to fetch contributions', 500)
    }

    const contributionIds = contributions?.map(c => c.id) || []

    if (contributionIds.length > 0) {
      logger.info(`Deleting ${contributionIds.length} contributions...`)
      const { error: contribError } = await serviceRoleClient
        .from('contributions')
        .delete()
        .eq('batch_id', batchId)

      if (contribError) {
        logger.error('Error deleting contributions:', contribError)
        throw new ApiError('INTERNAL_SERVER_ERROR', 'Failed to delete contributions', 500)
      }
      logger.info(`Deleted ${contributionIds.length} contributions`)
    }

    // 3. Delete cases by batch_id
    const { data: casesData, error: casesFetchError } = await serviceRoleClient
      .from('cases')
      .select('id')
      .eq('batch_id', batchId)

    if (casesFetchError) {
      logger.error('Error fetching cases:', casesFetchError)
      throw new ApiError('INTERNAL_SERVER_ERROR', 'Failed to fetch cases', 500)
    }

    const caseIds = casesData?.map(c => c.id) || []

    if (caseIds.length > 0) {
      logger.info(`Deleting ${caseIds.length} cases...`)
      const { error: caseError } = await serviceRoleClient
        .from('cases')
        .delete()
        .eq('batch_id', batchId)

      if (caseError) {
        logger.error('Error deleting cases:', caseError)
        throw new ApiError('INTERNAL_SERVER_ERROR', 'Failed to delete cases', 500)
      }
      logger.info(`Deleted ${caseIds.length} cases`)
    }

    // 4. Clear batch_upload_items references (set case_id, contribution_id, user_id to null)
    logger.info('Clearing batch_upload_items references...')
    const { error: itemsResetError } = await serviceRoleClient
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
      logger.error('Error resetting items:', itemsResetError)
      throw new ApiError('INTERNAL_SERVER_ERROR', 'Failed to reset batch items', 500)
    }

    // 5. Delete batch_upload_items (CASCADE should handle this, but explicit is better)
    logger.info('Deleting batch_upload_items...')
    const { error: deleteItemsError } = await serviceRoleClient
      .from('batch_upload_items')
      .delete()
      .eq('batch_id', batchId)

    if (deleteItemsError) {
      logger.error('Error deleting batch items:', deleteItemsError)
      throw new ApiError('INTERNAL_SERVER_ERROR', 'Failed to delete batch items', 500)
    }

    // 6. Delete batch_uploads record
    logger.info('Deleting batch_uploads record...')
    const { error: deleteBatchError } = await serviceRoleClient
      .from('batch_uploads')
      .delete()
      .eq('id', batchId)

    if (deleteBatchError) {
      logger.error('Error deleting batch:', deleteBatchError)
      throw new ApiError('INTERNAL_SERVER_ERROR', 'Failed to delete batch upload', 500)
    }

    logger.info(`Successfully deleted batch upload: ${batchId}`)

    return NextResponse.json({
      success: true,
      message: `Batch upload deleted successfully. Removed ${caseIds.length} cases and ${contributionIds.length} contributions.`,
      deleted: {
        cases: caseIds.length,
        contributions: contributionIds.length
      }
    })

  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    logger.error('Unexpected error deleting batch:', error)
    throw new ApiError('INTERNAL_SERVER_ERROR', 'An unexpected error occurred during batch deletion', 500)
  }
}

export const DELETE = createDeleteHandlerWithParams(deleteHandler, {
  requireAuth: true,
  requirePermissions: ['cases:batch_upload']
})

