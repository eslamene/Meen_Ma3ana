import { NextRequest, NextResponse } from 'next/server'
import { withApiHandler, ApiHandlerContext } from '@/lib/utils/api-wrapper'

async function handler(request: NextRequest, context: ApiHandlerContext) {
  const { supabase, logger } = context
  
  try {
    // Parse query parameters for filtering and pagination
    const { searchParams } = new URL(request.url)
    const statusParams = searchParams.getAll('status')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '10', 10)
    const sortBy = searchParams.get('sortBy') || 'created_at_desc'

    const { CaseService } = await import('@/lib/services/caseService')
    const result = await CaseService.getCasesWithStats(supabase, {
      status: statusParams,
      search,
      page,
      limit,
      sortBy
    })

    return NextResponse.json(result)
  } catch (error) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error in admin cases stats API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const GET = withApiHandler(handler, { requireAuth: true, requireAdmin: true, loggerContext: 'api/admin/cases/stats' })

