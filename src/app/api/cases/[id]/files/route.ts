import { NextRequest, NextResponse } from 'next/server'
import { createGetHandlerWithParams, ApiHandlerContext } from '@/lib/utils/api-wrapper'
import { ApiError } from '@/lib/utils/api-errors'

async function getHandler(
  request: NextRequest,
  context: ApiHandlerContext,
  params: { id: string }
) {
  const { supabase, logger } = context
  const { id } = params

  // Fetch all files for the case
  const { data: filesData, error: filesError } = await supabase
    .from('case_files')
    .select('*')
    .eq('case_id', id)
    .order('display_order', { ascending: true })

  if (filesError) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error fetching case files', { error: filesError })
    throw new ApiError('INTERNAL_SERVER_ERROR', 'Failed to fetch case files', 500)
  }

  // Map database fields to match the CaseFile interface
  const files = (filesData || []).map((file) => ({
    id: file.id,
    filename: file.filename,
    original_filename: file.original_filename,
    file_url: file.file_url,
    file_path: file.file_path,
    file_type: file.file_type,
    file_size: file.file_size,
    category: file.category,
    description: file.description,
    is_public: file.is_public,
    is_primary: file.is_primary,
    display_order: file.display_order,
    created_at: file.created_at,
    uploaded_by: file.uploaded_by
  }))

  return NextResponse.json({ files })
}

export const GET = createGetHandlerWithParams(getHandler, { 
  requireAuth: false, // Public endpoint
  loggerContext: 'api/cases/[id]/files' 
})

