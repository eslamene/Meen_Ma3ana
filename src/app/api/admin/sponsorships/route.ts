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

    // Check if user is admin
    const { data: adminRoles } = await supabase
      .from('admin_user_roles')
      .select('admin_roles!inner(name)')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .in('admin_roles.name', ['admin', 'super_admin'])
      .limit(1)

    const isAdmin = (adminRoles?.length || 0) > 0

    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

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
          title,
          description,
          target_amount,
          current_amount,
          status
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error fetching sponsorships:', error)
      return NextResponse.json(
        { error: 'Failed to fetch sponsorship requests' },
        { status: 500 }
      )
    }

    // Transform the data to match the expected interface
    const transformedData = ((data || []) as any[]).map((item) => {
      const sponsor = Array.isArray(item.sponsor) ? item.sponsor[0] : item.sponsor
      const caseData = Array.isArray(item.case) ? item.case[0] : item.case
      return {
        id: item.id,
        sponsor_id: item.sponsor_id,
        case_id: item.case_id,
        amount: parseFloat(item.amount),
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
          title: caseData?.title || '',
          description: caseData?.description || '',
          target_amount: parseFloat(caseData?.target_amount || '0'),
          current_amount: parseFloat(caseData?.current_amount || '0'),
          status: caseData?.status || ''
        }
      }
    })

    return NextResponse.json({ sponsorships: transformedData })
  } catch (error) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error in admin sponsorships API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

