import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { RouteContext } from '@/types/next-api'

import { Logger } from '@/lib/logger'
import { getCorrelationId } from '@/lib/correlation'

export async function GET(
  request: NextRequest,
  context: RouteContext<{ id: string }>
) {
  const correlationId = getCorrelationId(request)
  const logger = new Logger(correlationId)
  try {
    const { id } = await context.params
    const supabase = await createClient()

    // Fetch all files for the case
    const { data: filesData, error: filesError } = await supabase
      .from('case_files')
      .select('*')
      .eq('case_id', id)
      .order('display_order', { ascending: true })

    if (filesError) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error fetching case files:', filesError)
      return NextResponse.json(
        { error: 'Failed to fetch case files' },
        { status: 500 }
      )
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
  } catch (error) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error in case files GET API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

