import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string; fileId: string }> }
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

    console.log('Update file request:', { caseId, fileId, originalName, description, category, isPublic })

    // Clean up fileId (remove any prefixes from old system)
    const cleanFileId = fileId.replace('case-image-', '')
    console.log('Updating case_files with ID:', cleanFileId)
    
    // First, check if the file exists
    const { data: existingFile, error: fetchError } = await supabase
      .from('case_files')
      .select('*')
      .eq('id', cleanFileId)
      .eq('case_id', caseId)
      .single()

    console.log('Existing file check:', { existingFile, fetchError })

    if (fetchError || !existingFile) {
      console.error('File not found:', { cleanFileId, caseId, fetchError })
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

    console.log('Update data:', updateData)
    
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
      console.error('Error updating file:', updateError)
      return NextResponse.json({ 
        error: 'Failed to update file', 
        details: updateError.message,
        code: updateError.code
      }, { status: 500 })
    }

    console.log('File updated successfully:', updatedFile)
    return NextResponse.json({ success: true, file: updatedFile })

  } catch (error) {
    console.error('Caught error in PATCH handler:', error)
    console.error('Error stack:', (error as Error)?.stack)
    console.error('Error message:', (error as Error)?.message)
    return NextResponse.json({ 
      error: 'Internal server error',
      message: (error as Error)?.message || 'Unknown error',
      details: String(error)
    }, { status: 500 })
  }
}

