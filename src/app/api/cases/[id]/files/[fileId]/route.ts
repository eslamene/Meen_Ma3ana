import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

import { Logger } from '@/lib/logger'
import { getCorrelationId } from '@/lib/correlation'

export async function PATCH(
  request: NextRequest,
  context: {
  const correlationId = getCorrelationId(request)
  const logger = new Logger(correlationId)
 params: Promise<{ id: string; fileId: string }> }
) {
  try {
    const params = await context.params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: caseId, fileId } = params
    const body = await request.json()
    const { originalName, description, category, isPublic } = body

    logger.info('Update file request:', { caseId, fileId, originalName, description, category, isPublic })

    // Clean up fileId (remove any prefixes from old system)
    const cleanFileId = fileId.replace('case-image-', '')
    logger.info('Updating case_files with ID:', cleanFileId)
    
    // First, check if the file exists
    const { data: existingFile, error: fetchError } = await supabase
      .from('case_files')
      .select('*')
      .eq('id', cleanFileId)
      .eq('case_id', caseId)
      .single()

    logger.info('Existing file check:', { existingFile, fetchError })

    if (fetchError || !existingFile) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'File not found:', { cleanFileId, caseId, fetchError })
      return NextResponse.json({ 
        error: 'File not found', 
        details: fetchError?.message || 'File does not exist or does not belong to this case'
      }, { status: 404 })
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
      return NextResponse.json({ 
        error: 'No fields to update', 
        details: 'Request body must contain at least one field to update'
      }, { status: 400 })
    }

    const { data: updatedFile, error: updateError } = await supabase
      .from('case_files')
      .update(updateData)
      .eq('id', cleanFileId)
      .eq('case_id', caseId)
      .select()
      .single()

    if (updateError) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error updating file:', updateError)
      return NextResponse.json({ 
        error: 'Failed to update file', 
        details: updateError.message,
        code: updateError.code
      }, { status: 500 })
    }

    logger.info('File updated successfully:', updatedFile)
    return NextResponse.json({ success: true, file: updatedFile })

  } catch (error) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Caught error in PATCH handler:', error)
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error stack:', (error as Error)?.stack)
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error message:', (error as Error)?.message)
    return NextResponse.json({ 
      error: 'Internal server error',
      message: (error as Error)?.message || 'Unknown error',
      details: String(error)
    }, { status: 500 })
  }
}

