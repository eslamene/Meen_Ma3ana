import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Logger } from '@/lib/logger'
import { getCorrelationId } from '@/lib/correlation'

export async function GET(request: NextRequest) {
  const correlationId = getCorrelationId(request)
  const logger = new Logger(correlationId)
  
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

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
          title,
          description,
          target_amount,
          current_amount,
          status
        )
      `)
      .eq('sponsor_id', user.id)
      .order('created_at', { ascending: false })

    if (sponsorshipsError) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error fetching sponsorships:', sponsorshipsError)
      return NextResponse.json(
        { error: 'Failed to fetch sponsorships' },
        { status: 500 }
      )
    }

    // Transform the data to match the expected interface
    const transformedData = (sponsorships || []).map((item: any) => {
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
          title: caseData?.title || '',
          description: caseData?.description || '',
          target_amount: parseFloat(String(caseData?.target_amount || '0')),
          current_amount: parseFloat(String(caseData?.current_amount || '0')),
          status: caseData?.status || ''
        }
      }
    })

    return NextResponse.json({ sponsorships: transformedData })
  } catch (error) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error in sponsor dashboard API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

