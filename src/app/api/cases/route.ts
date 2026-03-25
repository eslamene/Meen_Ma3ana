import { NextRequest, NextResponse } from 'next/server'
import { createGetHandler, ApiHandlerContext } from '@/lib/utils/api-wrapper'
import { ApiError } from '@/lib/utils/api-errors'
import { CaseService } from '@/lib/services/caseService'

const MAX_LIMIT = 100

async function getHandler(request: NextRequest, context: ApiHandlerContext) {
  const { supabase, logger } = context
  const { searchParams } = new URL(request.url)

  const limit = Math.min(
    Math.max(parseInt(searchParams.get('limit') || '50', 10), 1),
    MAX_LIMIT
  )
  const page = Math.max(parseInt(searchParams.get('page') || '1', 10), 1)
  const status = searchParams.get('status') || 'published'

  let result: Awaited<ReturnType<typeof CaseService.getCases>>
  try {
    result = await CaseService.getCases(supabase, { status, limit, page, sortBy: 'created_at', sortOrder: 'desc' })
  } catch (e) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error listing cases', { error: e })
    throw new ApiError('INTERNAL_SERVER_ERROR', 'Failed to list cases', 500)
  }

  const cases = result.cases.map((c) => ({
    id: c.id,
    title: c.title_en || c.title_ar || '',
    description: c.description_en || c.description_ar || '',
    target_amount: parseFloat(String(c.target_amount ?? '0')) || 0,
    current_amount: parseFloat(String(c.current_amount ?? '0')) || 0,
    status: c.status,
    category_id: c.category_id,
  }))

  return NextResponse.json({
    cases,
    pagination: result.pagination,
  })
}

export const GET = createGetHandler(getHandler, {
  requireAuth: false,
  loggerContext: 'api/cases',
})
