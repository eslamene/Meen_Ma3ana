import { NextRequest, NextResponse } from 'next/server'
import { createPatchHandlerWithParams, ApiHandlerContext } from '@/lib/utils/api-wrapper'
import { ApiError } from '@/lib/utils/api-errors'

async function patchHandler(
  request: NextRequest,
  context: ApiHandlerContext,
  params: { id: string; fileId: string }
) {
  const { supabase, logger } = context
  const { id: caseId, fileId } = params

    const body = await request.json()
    const { originalName, description, category, isPublic } = body

    logger.info('Update file request', { caseId, fileId, originalName, description, category, isPublic })

    // Clean up fileId (remove any prefixes from old system)
    const cleanFileId = fileId.replace('case-image-', '')
    logger.info('Updating case_files with ID', { cleanFileId })
    
    // First, check if the file exists
    const { data: existingFile, error: fetchError } = await supabase
      .from('case_files')
      .select('*')
      .eq('id', cleanFileId)
      .eq('case_id', caseId)
      .single()

    logger.info('Existing file check', { existingFile, fetchError })

    if (fetchError || !existingFile) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'File not found', { cleanFileId, caseId, fetchError })
      throw new ApiError('NOT_FOUND', fetchError?.message || 'File does not exist or does not belong to this case', 404)
    }
    
    // Update unified case_files table
    const updateData: Record<string, string | boolean> = {}

    // Update filename fields if provided
    if (originalName !== undefined) {
      updateData.filename = originalName
      updateData.original_filename = originalName
    }
    
    // Add optional fields
    if (description !== undefined) updateData.description = description
    if (category !== undefined) updateData.category = category
    if (isPublic !== undefined) updateData.is_public = isPublic

    logger.info('Update data:', updateData)
    
    // Make sure we have something to update
    if (Object.keys(updateData).length === 0) {
      throw new ApiError('VALIDATION_ERROR', 'Request body must contain at least one field to update', 400)
    }

    const { data: updatedFile, error: updateError } = await supabase
      .from('case_files')
      .update(updateData)
      .eq('id', cleanFileId)
      .eq('case_id', caseId)
      .select()
      .single()

    if (updateError) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error updating file', { error: updateError })
      throw new ApiError('INTERNAL_SERVER_ERROR', `Failed to update file: ${updateError.message}`, 500)
    }

    logger.info('File updated successfully', { updatedFile })
    return NextResponse.json({ success: true, file: updatedFile })
}

export const PATCH = createPatchHandlerWithParams(patchHandler, { 
  requireAuth: true, 
  loggerContext: 'api/cases/[id]/files/[fileId]' 
})

