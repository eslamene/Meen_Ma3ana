import { NextRequest, NextResponse } from 'next/server'
import { createGetHandler, ApiHandlerContext } from '@/lib/utils/api-wrapper'
import { ApiError } from '@/lib/utils/api-errors'

async function handler(request: NextRequest, context: ApiHandlerContext) {
  const { supabase, logger, user } = context

  // Fetch user's sponsorships with case info
  const { data: sponsorships, error: sponsorshipsError } = await supabase
    .from('sponsorships')
    .select(`
      id,
      case_id,
      amount,
      status,
      start_date,
      end_date,
      created_at,
      case:cases(
        title_en,
        title_ar,
        description_en,
        description_ar,
        target_amount,
        current_amount,
        status
      )
    `)
    .eq('sponsor_id', user.id)
    .order('created_at', { ascending: false })

  if (sponsorshipsError) {
    logger.error('Error fetching sponsorships:', sponsorshipsError)
    throw new ApiError('INTERNAL_SERVER_ERROR', 'Failed to fetch sponsorships', 500)
  }

  // Transform the data to match the expected interface
  interface SponsorshipItem {
    id: string
    case_id: string
    amount: number | string
    status: string
    start_date: string | null
    end_date: string | null
    created_at: string
    case?: Array<{ title_en?: string; title_ar?: string; description_en?: string; description_ar?: string; target_amount?: number | string; current_amount?: number | string; status?: string }> | { title_en?: string; title_ar?: string; description_en?: string; description_ar?: string; target_amount?: number | string; current_amount?: number | string; status?: string }
  }
  const transformedData = (sponsorships || []).map((item: SponsorshipItem) => {
    // Normalize case - handle both array and single object cases
    const caseData = Array.isArray(item.case)
      ? item.case[0]
      : item.case

    return {
      id: item.id,
      case_id: item.case_id,
      amount: parseFloat(String(item.amount)),
      status: item.status,
      start_date: item.start_date,
      end_date: item.end_date,
      created_at: item.created_at,
      case: {
        title: caseData?.title_en || caseData?.title_ar || '',
        description: caseData?.description_en || caseData?.description_ar || '',
        target_amount: parseFloat(String(caseData?.target_amount || '0')),
        current_amount: parseFloat(String(caseData?.current_amount || '0')),
        status: caseData?.status || ''
      }
    }
  })

  return NextResponse.json({ sponsorships: transformedData })
}

export const GET = createGetHandler(handler, { requireAuth: true, loggerContext: 'api/sponsor/dashboard' })

