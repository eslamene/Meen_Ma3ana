import { NextRequest, NextResponse } from 'next/server'
import { createGetHandler, ApiHandlerContext } from '@/lib/utils/api-wrapper'
import { ApiError } from '@/lib/utils/api-errors'

async function getHandler(request: NextRequest, context: ApiHandlerContext) {
  const { supabase, logger } = context

    const { data, error } = await supabase
      .from('sponsorships')
      .select(`
        id,
        sponsor_id,
        case_id,
        amount,
        status,
        terms,
        start_date,
        end_date,
        created_at,
        sponsor:users!sponsorships_sponsor_id_fkey(
          first_name,
          last_name,
          email
        ),
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
      .order('created_at', { ascending: false })

    if (error) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error fetching sponsorships:', error)
      throw new ApiError('INTERNAL_SERVER_ERROR', 'Failed to fetch sponsorship requests', 500)
    }

    // Transform the data to match the expected interface
    interface SponsorshipItem {
      sponsor?: unknown
      case?: unknown
      [key: string]: unknown
    }
    const transformedData = ((data || []) as Array<SponsorshipItem>).map((item) => {
      const sponsor = Array.isArray(item.sponsor) ? item.sponsor[0] : item.sponsor
      const caseData = Array.isArray(item.case) ? item.case[0] : item.case
      return {
        id: item.id,
        sponsor_id: item.sponsor_id,
        case_id: item.case_id,
        amount: typeof item.amount === 'string' || typeof item.amount === 'number' ? parseFloat(String(item.amount)) : 0,
        status: item.status,
        terms: item.terms || '',
        start_date: item.start_date,
        end_date: item.end_date,
        created_at: item.created_at,
        sponsor: {
          first_name: sponsor?.first_name || '',
          last_name: sponsor?.last_name || '',
          email: sponsor?.email || '',
          company_name: sponsor?.company_name || ''
        },
        case: {
          title: caseData?.title_en || caseData?.title_ar || '',
          description: caseData?.description_en || caseData?.description_ar || '',
          target_amount: parseFloat(caseData?.target_amount || '0'),
          current_amount: parseFloat(caseData?.current_amount || '0'),
          status: caseData?.status || ''
        }
      }
    })

    return NextResponse.json({ sponsorships: transformedData })
}

export const GET = createGetHandler(getHandler, { 
  requireAdmin: true, 
  loggerContext: 'api/admin/sponsorships' 
})

