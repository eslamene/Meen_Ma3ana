import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { categoryDetectionRules } from '@/drizzle/schema'
import { eq, and, desc } from 'drizzle-orm'
import { createPatchHandlerWithParams, createGetHandlerWithParams, ApiHandlerContext } from '@/lib/utils/api-wrapper'
import { ApiError } from '@/lib/utils/api-errors'
import { isValidUUID } from '@/lib/utils/uuid'
import { CaseLifecycleService } from '@/lib/case-lifecycle'

async function patchHandler(
  request: NextRequest,
  context: ApiHandlerContext,
  params: { id: string }
) {
  const { supabase, user, logger } = context
  const { id } = params
  const body = await request.json()

    // Build update object dynamically based on what's provided
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    // Handle image URLs - store in case_files table (legacy support)
    // Note: New code should save directly to case_files during upload
    if (body.images && Array.isArray(body.images)) {
      // First, delete existing photo files for this case (only photos category)
      await supabase
        .from('case_files')
        .delete()
        .eq('case_id', id)
        .eq('category', 'photos')

      // Insert new images as case_files records
      const imageRecords = body.images.map((imageUrl: string, index: number) => {
        const fileName = imageUrl.split('/').pop()?.split('?')[0] || 'image.jpg'
        // Extract file path from URL if it contains storage path
        const storagePathMatch = imageUrl.match(/case-files\/(.+)/)
        const filePath = storagePathMatch ? `case-files/${storagePathMatch[1]}` : null
        
        return {
          case_id: id,
          filename: fileName,
          original_filename: fileName,
          file_url: imageUrl,
          file_path: filePath,
          file_type: 'image/jpeg', // Default, could be improved by detecting from URL or file
          file_size: 0, // Unknown from URL alone
          category: 'photos',
          is_primary: index === 0, // First image is primary
          display_order: index,
          is_public: false,
          uploaded_by: user.id
        }
      })

      const { error: imagesError } = await supabase
        .from('case_files')
        .insert(imageRecords)

      if (imagesError) {
        logger.logStableError('INTERNAL_SERVER_ERROR', 'Error inserting case files', { error: imagesError })
        throw new ApiError('INTERNAL_SERVER_ERROR', `Failed to save images: ${imagesError.message}`, 500)
      }
    }

    // Handle status changes separately using CaseLifecycleService to ensure proper notifications
    let statusChanged = false
    let statusChangeError: string | null = null
    if (body.status !== undefined) {
      // Always get current status from database first (don't trust request body)
      const { data: currentCase } = await supabase
        .from('cases')
        .select('status')
        .eq('id', id)
        .single()

      if (currentCase) {
        // Normalize UI statuses to database statuses
        const statusMapping: Record<string, string> = {
          'completed': 'closed',
          'cancelled': 'closed',
          'active': 'published',
        }
        const normalizedNewStatus = statusMapping[body.status] || body.status
        const normalizedCurrentStatus = statusMapping[currentCase.status] || currentCase.status
        
        // Only attempt status change if it's actually different
        if (normalizedCurrentStatus !== normalizedNewStatus) {
          logger.info('Status change detected, using CaseLifecycleService', {
            caseId: id,
            fromStatus: currentCase.status, // Log actual DB status
            normalizedFromStatus: normalizedCurrentStatus,
            toStatus: body.status, // Log UI status
            normalizedToStatus: normalizedNewStatus,
            userId: user.id
          })
          
          // Use CaseLifecycleService for status changes to ensure proper push notifications
          // Pass the normalized status
          const statusResult = await CaseLifecycleService.changeCaseStatus({
            caseId: id,
            newStatus: normalizedNewStatus as any,
            changedBy: user.id,
            changeReason: 'Case updated via API',
            systemTriggered: false,
          })

          if (!statusResult.success) {
            // Log the error but don't fail the entire request - allow other fields to be updated
            logger.logStableError('INTERNAL_SERVER_ERROR', 'Error changing case status', { 
              error: statusResult.error,
              caseId: id,
              fromStatus: currentCase.status,
              toStatus: body.status,
              userId: user.id
            })
            statusChangeError = statusResult.error || 'Failed to change case status'
            // Don't throw - allow other updates to proceed
          } else {
            statusChanged = true
          }
        }
        // If status is the same, no need to do anything
      }
    }

    // Handle other fields if provided (excluding status if it was already changed via lifecycle service)
    if (body.title_en !== undefined) updateData.title_en = body.title_en
    if (body.title_ar !== undefined) updateData.title_ar = body.title_ar
    if (body.description_en !== undefined) updateData.description_en = body.description_en
    if (body.description_ar !== undefined) updateData.description_ar = body.description_ar
    // Legacy support - map old fields to new structure
    if (body.title !== undefined && body.title_en === undefined) updateData.title_en = body.title
    if (body.description !== undefined && body.description_en === undefined) updateData.description_en = body.description
    if (body.targetAmount !== undefined) updateData.target_amount = parseFloat(body.targetAmount)
    // Only include status in updateData if it wasn't changed via lifecycle service
    // Also skip if status change was attempted but failed (to prevent bypassing validation)
    if (body.status !== undefined && !statusChanged && !statusChangeError) {
      // Status is the same as current, so it's safe to include (though it won't change anything)
      updateData.status = body.status
    }
    if (body.priority !== undefined) updateData.priority = body.priority
    if (body.location !== undefined) updateData.location = body.location
    if (body.beneficiaryName !== undefined) updateData.beneficiary_name = body.beneficiaryName
    if (body.beneficiaryContact !== undefined) updateData.beneficiary_contact = body.beneficiaryContact
    if (body.category_id !== undefined) updateData.category_id = body.category_id

    // Update the case only if there are fields to update (excluding status if it was handled separately)
    if (Object.keys(updateData).length > 1) { // More than just updated_at
      const { error: updateError } = await supabase
        .from('cases')
        .update(updateData)
        .eq('id', id)

      if (updateError) {
        logger.logStableError('INTERNAL_SERVER_ERROR', 'Error updating case', { error: updateError })
        throw new ApiError('INTERNAL_SERVER_ERROR', `Failed to update case: ${updateError.message}`, 500)
      }

      // Send push notifications to contributing users when a case is updated (but not for status changes, which are handled by lifecycle service)
      if (!statusChanged) {
        try {
          // Get case details for notification
          const { data: caseData } = await supabase
            .from('cases')
            .select('title_en, title_ar')
            .eq('id', id)
            .single()

          if (caseData) {
            // Get contributing users
            const { caseNotificationService } = await import('@/lib/notifications/case-notifications')
            const contributorUserIds = await caseNotificationService.getContributingUsers(id)

            if (contributorUserIds.length > 0) {
              const { fcmNotificationService } = await import('@/lib/notifications/fcm-notifications')
              await fcmNotificationService.notifyCaseUpdated(
                id,
                caseData.title_en || '',
                caseData.title_ar || undefined,
                'Case has been updated',
                contributorUserIds
              )
            }
          }
        } catch (notificationError) {
          logger.logStableError('INTERNAL_SERVER_ERROR', 'Error sending push notifications for case update:', notificationError)
          // Don't fail the request if push notification fails
        }
      }
    }

    // Return response with status change error if applicable
    if (statusChangeError) {
      return NextResponse.json({
        message: 'Case updated successfully, but status change failed',
        error: statusChangeError,
        statusChangeFailed: true
      }, { status: 200 }) // Return 200 but include error info
    }

    return NextResponse.json({
      message: 'Case updated successfully'
    })
}

async function getHandler(
  request: NextRequest,
  context: ApiHandlerContext,
  params: { id: string }
) {
  const { supabase, logger } = context
  const { id } = params
  
  // Validate UUID format before making database queries
  if (!isValidUUID(id)) {
    throw new ApiError('NOT_FOUND', 'Invalid case ID format', 404)
  }

    const { data: caseData, error } = await supabase
      .from('cases')
      .select(`
        id,
        title_en,
        title_ar,
        description_en,
        description_ar,
        target_amount,
        current_amount,
        status,
        type,
        priority,
        location,
        beneficiary_name,
        beneficiary_contact,
        created_at,
        updated_at,
        created_by,
        category_id,
        case_categories(name, icon, color)
      `)
      .eq('id', id)
      .single()

    if (error) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error fetching case', { error })
      throw new ApiError('NOT_FOUND', 'Case not found', 404)
    }

    // Fetch category detection rules if case has a category and filter by matches
    let detectionRules: string[] = []
    if (caseData.category_id) {
      try {
        const rules = await db
          .select({
            keyword: categoryDetectionRules.keyword,
            priority: categoryDetectionRules.priority,
          })
          .from(categoryDetectionRules)
          .where(
            and(
              eq(categoryDetectionRules.category_id, caseData.category_id),
              eq(categoryDetectionRules.is_active, true)
            )
          )
          .orderBy(desc(categoryDetectionRules.priority), desc(categoryDetectionRules.created_at))

        // Combine title and description for matching
        const titleEn = (caseData.title_en || '').toLowerCase()
        const titleAr = (caseData.title_ar || '').toLowerCase()
        const descriptionEn = (caseData.description_en || '').toLowerCase()
        const descriptionAr = (caseData.description_ar || '').toLowerCase()
        const searchText = `${titleEn} ${titleAr} ${descriptionEn} ${descriptionAr}`

        // Filter rules to only include keywords that match the case title or description
        const matchedKeywords = rules
          .filter(rule => {
            const keywordLower = rule.keyword.toLowerCase()
            return searchText.includes(keywordLower)
          })
          .slice(0, 20) // Limit to top 20 matched keywords by priority
          .map(r => r.keyword)

        detectionRules = matchedKeywords
      } catch (rulesError) {
        // Log but don't fail the request if rules fetch fails
        logger.logStableError('INTERNAL_SERVER_ERROR', 'Error fetching detection rules:', rulesError)
      }
    }

    return NextResponse.json({ 
      case: {
        ...caseData,
        detectionRules // Return matched keywords as array
      }
    })
}

export const GET = createGetHandlerWithParams(getHandler, { 
  requireAuth: false, // Public endpoint
  loggerContext: 'api/cases/[id]' 
})

export const PATCH = createPatchHandlerWithParams(patchHandler, { 
  requireAuth: true, 
  loggerContext: 'api/cases/[id]' 
})

