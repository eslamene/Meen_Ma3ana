import { NextRequest, NextResponse } from 'next/server'
import { withApiHandler, ApiHandlerContext } from '@/lib/utils/api-wrapper'

async function handler(request: NextRequest, context: ApiHandlerContext) {
  const { supabase, logger, user } = context
  
  try {

    // Fetch user profile data
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error fetching user profile:', profileError)
      return NextResponse.json(
        { error: 'Failed to fetch user profile' },
        { status: 500 }
      )
    }

    // Fetch contribution history with case information (left join to include contributions without cases)
    const { data: contributions, error: contributionsError } = await supabase
      .from('contributions')
      .select('id, amount, created_at, case_id, status, cases(title_en, title_ar, status)')
      .eq('donor_id', user.id)
      .in('status', ['pending', 'approved', 'rejected'])
      .order('created_at', { ascending: false })

    if (contributionsError) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error fetching contributions:', contributionsError)
      return NextResponse.json(
        { error: 'Failed to fetch contributions' },
        { status: 500 }
      )
    }

    // Calculate statistics
    let stats = {
      totalContributions: 0,
      totalAmount: 0,
      activeCases: 0,
      completedCases: 0,
      averageContribution: 0,
      lastContribution: null as string | null,
      latestContribution: null as {
        id: string
        amount: number | null
        created_at: string
        case_id: string | null
        status: string
        cases: {
          title_en?: string
          title_ar?: string
          status: string
        } | null
      } | null
    }

    if (contributions && contributions.length > 0) {
      // Helper function to safely parse amount, defaulting to 0 for null/undefined/invalid
      const parseAmount = (amount: unknown): number => {
        if (amount === null || amount === undefined) {
          return 0
        }
        if (typeof amount === 'string') {
          const parsed = parseFloat(amount)
          return isNaN(parsed) ? 0 : parsed
        }
        if (typeof amount === 'number') {
          return isNaN(amount) ? 0 : amount
        }
        return 0
      }

      // Helper function to validate case object shape
      const isValidCaseObject = (caseObj: unknown): caseObj is { title_en?: string; title_ar?: string; status: string } => {
        if (!caseObj || typeof caseObj !== 'object') {
          return false
        }
        const obj = caseObj as Record<string, unknown>
        // Must have at least status property and either title_en or title_ar
        return typeof obj.status === 'string' && (typeof obj.title_en === 'string' || typeof obj.title_ar === 'string')
      }

      // Helper function to extract valid case object from various forms
      const extractCaseObject = (cases: unknown): { title_en?: string; title_ar?: string; status: string } | null => {
        if (!cases) {
          return null
        }
        
        // Handle array form
        if (Array.isArray(cases)) {
          const firstCase = cases[0]
          return isValidCaseObject(firstCase) ? firstCase : null
        }
        
        // Handle object form
        if (typeof cases === 'object') {
          return isValidCaseObject(cases) ? cases : null
        }
        
        // Invalid type
        return null
      }

      const totalAmount = contributions.reduce((sum, c) => sum + parseAmount(c.amount), 0)
      
      // Get unique cases and their statuses
      const uniqueCases = new Map()
      contributions.forEach((c) => {
        if (!uniqueCases.has(c.case_id)) {
          const caseData = extractCaseObject(c.cases)
          // Only add to uniqueCases if we have a valid case object
          if (caseData) {
            uniqueCases.set(c.case_id, caseData)
          }
        }
      })
      
      const activeCases = Array.from(uniqueCases.values()).filter((c) => c.status === 'published').length
      const completedCases = Array.from(uniqueCases.values()).filter((c) => c.status === 'closed').length
      const lastContribution = contributions[0]?.created_at || null

      // Normalize the latest contribution
      const latestContributionData = contributions[0]
      const normalizedLatestContribution = latestContributionData ? {
        id: latestContributionData.id,
        amount: latestContributionData.amount,
        created_at: latestContributionData.created_at,
        case_id: latestContributionData.case_id,
        status: latestContributionData.status,
        cases: extractCaseObject(latestContributionData.cases)
      } : null

      stats = {
        totalContributions: contributions.length,
        totalAmount,
        activeCases,
        completedCases,
        averageContribution: totalAmount / contributions.length,
        lastContribution,
        latestContribution: normalizedLatestContribution
      }
    }

    return NextResponse.json({
      user: userProfile,
      stats
    })
  } catch (error) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error in profile stats API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const GET = withApiHandler(handler, { requireAuth: true, loggerContext: 'api/profile/stats' })

