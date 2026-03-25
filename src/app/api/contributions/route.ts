import { NextRequest, NextResponse } from 'next/server'
import { createGetHandler } from '@/lib/utils/api-wrapper'
import { createApiError } from '@/lib/utils/api-errors'

export const GET = createGetHandler(
  async (request: NextRequest, { user, supabase, logger }) => {
    const { searchParams } = new URL(request.url)
    const page = Number(searchParams.get('page') || '1')
    const limit = Number(searchParams.get('limit') || '10')
    const status = searchParams.get('status') || undefined
    const search = searchParams.get('search') || undefined

    const safePage = Number.isFinite(page) && page > 0 ? page : 1
    const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(limit, 100) : 10
    const offset = (safePage - 1) * safeLimit

    try {
      const { ContributionService } = await import('@/lib/services/contributionService')
      const result = await ContributionService.getContributions(supabase, {
        userId: user.id,
        isAdmin: false,
        page: safePage,
        limit: safeLimit,
        offset,
        status,
        search,
      })

      return NextResponse.json({
        contributions: result.contributions || [],
        pagination: result.pagination,
      })
    } catch (serviceError) {
      logger.error('ContributionService failed, using fallback query', serviceError, {
        area: 'contributions',
        operation: 'GET /api/contributions',
        mode: 'fallback',
      })

      // Fallback: minimal query for dashboard/profile usage.
      // Avoid complex joins/RPC dependencies so endpoint remains resilient.
      let fallbackQuery = supabase
        .from('contributions')
        .select('id, amount, status, notes, created_at, updated_at, case_id, cases:case_id(title_en, title_ar)', { count: 'exact' })
        .eq('donor_id', user.id)
        .order('created_at', { ascending: false })
        .range(offset, offset + safeLimit - 1)

      if (status && status !== 'all') {
        fallbackQuery = fallbackQuery.eq('status', status)
      }

      const { data: rows, error: fallbackError, count } = await fallbackQuery

      if (fallbackError) {
        logger.error('Fallback contributions query failed', fallbackError, {
          area: 'contributions',
          operation: 'GET /api/contributions',
        })
        throw createApiError.internalError('Failed to fetch contributions')
      }

      const contributions = (rows || []).map((r: any) => ({
        id: r.id,
        amount: typeof r.amount === 'string' ? Number(r.amount) : (r.amount ?? 0),
        status: r.status ?? 'pending',
        notes: r.notes ?? null,
        message: r.notes ?? null,
        caseId: r.case_id ?? null,
        caseTitle: Array.isArray(r.cases)
          ? (r.cases[0]?.title_en || r.cases[0]?.title_ar || '')
          : (r.cases?.title_en || r.cases?.title_ar || ''),
        createdAt: r.created_at ?? null,
        updatedAt: r.updated_at ?? null,
      }))

      return NextResponse.json({
        contributions,
        pagination: {
          page: safePage,
          limit: safeLimit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / safeLimit),
          hasNextPage: safePage < Math.ceil((count || 0) / safeLimit),
          hasPreviousPage: safePage > 1,
        },
      })
    }
  },
  { requireAuth: true, loggerContext: 'api/contributions' }
)

