import { NextRequest, NextResponse } from 'next/server'
import { createGetHandler, ApiHandlerContext } from '@/lib/utils/api-wrapper'
import { ApiError } from '@/lib/utils/api-errors'

async function getHandler(request: NextRequest, context: ApiHandlerContext) {
  const { supabase, logger } = context

  try {
    const { SponsorshipService } = await import('@/lib/services/sponsorshipService')
    const sponsorships = await SponsorshipService.getAll(supabase)

    // Transform to match expected format
    const transformedData = sponsorships.map((item) => ({
      id: item.id,
      sponsor_id: item.sponsor_id,
      case_id: item.case_id,
      amount: item.amount,
      status: item.status,
      terms: item.terms || '',
      start_date: item.start_date,
      end_date: item.end_date,
      created_at: item.created_at,
      sponsor: {
        first_name: item.sponsor?.first_name || '',
        last_name: item.sponsor?.last_name || '',
        email: item.sponsor?.email || '',
        company_name: item.sponsor?.company_name || ''
      },
      case: {
        title: item.case?.title_en || item.case?.title_ar || '',
        description: item.case?.description_en || item.case?.description_ar || '',
        target_amount: parseFloat(item.case?.target_amount || '0'),
        current_amount: parseFloat(item.case?.current_amount || '0'),
        status: item.case?.status || ''
      }
    }))

    return NextResponse.json({ sponsorships: transformedData })
  } catch (error) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error fetching sponsorships:', error)
    throw new ApiError('INTERNAL_SERVER_ERROR', error instanceof Error ? error.message : 'Failed to fetch sponsorship requests', 500)
  }
}

export const GET = createGetHandler(getHandler, { 
  requireAdmin: true, 
  loggerContext: 'api/admin/sponsorships' 
})

