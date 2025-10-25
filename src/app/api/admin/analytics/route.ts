import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { db } from '@/lib/db'
import { cases, contributions, sponsorships, users, projects, projectCycles } from '@/drizzle/schema'
import { eq, and, gte, lte, desc, sql, count, sum, avg } from 'drizzle-orm'

// Simple in-memory cache for analytics data
const analyticsCache = new Map<string, { data: any; timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {
              // The `setAll` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
        },
      }
    )
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    if (user.user_metadata?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const dateRange = searchParams.get('dateRange') || 'last30Days'
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    
    // Create cache key based on parameters
    const cacheKey = `analytics_${dateRange}_${startDate}_${endDate}_${user.id}`
    
    // Check cache first
    const cachedData = analyticsCache.get(cacheKey)
    if (cachedData && Date.now() - cachedData.timestamp < CACHE_TTL) {
      console.log('📊 Returning cached analytics data')
      return NextResponse.json(cachedData.data)
    }

    // Calculate date range
    let fromDate: Date
    let toDate: Date = new Date()

    switch (dateRange) {
      case 'last7Days':
        fromDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        break
      case 'last30Days':
        fromDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        break
      case 'last90Days':
        fromDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
        break
      case 'lastYear':
        fromDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
        break
      case 'customRange':
        if (startDate && endDate) {
          fromDate = new Date(startDate)
          toDate = new Date(endDate)
        } else {
          fromDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        }
        break
      default:
        fromDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    }

    // Optimized metrics queries - combine related queries to reduce database round trips
    const [
      caseMetrics,
      contributionMetrics,
      sponsorshipMetrics,
      userMetrics,
      projectMetrics
    ] = await Promise.all([
      // Combined case metrics in a single query
      db.select({
        total: count(),
        published: count(sql`CASE WHEN ${cases.status} = 'published' THEN 1 END`),
        closed: count(sql`CASE WHEN ${cases.status} = 'closed' THEN 1 END`),
        completed: count(sql`CASE WHEN ${cases.status} = 'completed' THEN 1 END`)
      }).from(cases),
      
      // Combined contribution metrics in a single query
      db.select({
        total: count(),
        totalAmount: sum(contributions.amount),
        avgAmount: avg(contributions.amount),
        pending: count(sql`CASE WHEN ${contributions.status} = 'pending' THEN 1 END`),
        approved: count(sql`CASE WHEN ${contributions.status} = 'approved' THEN 1 END`)
      }).from(contributions),
      
      // Combined sponsorship metrics in a single query
      db.select({
        total: count(),
        approved: count(sql`CASE WHEN ${sponsorships.status} = 'approved' THEN 1 END`),
        pending: count(sql`CASE WHEN ${sponsorships.status} = 'pending' THEN 1 END`)
      }).from(sponsorships),
      
      // Combined user metrics in a single query
      db.select({
        total: count(),
        newUsers: count(sql`CASE WHEN ${users.created_at} >= ${new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)} THEN 1 END`)
      }).from(users),
      
      // Combined project metrics in a single query
      db.select({
        total: count(),
        active: count(sql`CASE WHEN ${projects.status} = 'active' THEN 1 END`)
      }).from(projects)
    ])

    // Calculate completion rate
    const completionRate = caseMetrics[0]?.total ? 
      Math.round(((caseMetrics[0]?.closed || 0) + (caseMetrics[0]?.completed || 0)) / caseMetrics[0].total * 100) : 0

    // Calculate success rate (active projects / total projects)
    const successRate = projectMetrics[0]?.total ? 
      Math.round((projectMetrics[0]?.active || 0) / projectMetrics[0].total * 100) : 0

    // Optimized recent activity - use a single UNION query for better performance
    const recentActivity = await db.execute(sql`
      (
        SELECT 
          ${contributions.id} as id,
          'contribution' as type,
          'New Contribution' as title,
          CONCAT('Contribution to Case - ', COALESCE(${cases.title}, 'Unknown Case')) as description,
          ${contributions.amount} as amount,
          ${contributions.status} as status,
          ${contributions.created_at} as timestamp,
          ${users.email} as user
        FROM ${contributions}
        LEFT JOIN ${cases} ON ${contributions.case_id} = ${cases.id}
        LEFT JOIN ${users} ON ${contributions.donor_id} = ${users.id}
        WHERE ${contributions.created_at} >= ${fromDate}
        ORDER BY ${contributions.created_at} DESC
        LIMIT 3
      )
      UNION ALL
      (
        SELECT 
          ${sponsorships.id} as id,
          'sponsorship' as type,
          'Sponsorship Request' as title,
          CONCAT('Sponsorship for Case - ', COALESCE(${cases.title}, 'Unknown Case')) as description,
          ${sponsorships.amount} as amount,
          ${sponsorships.status} as status,
          ${sponsorships.created_at} as timestamp,
          ${users.email} as user
        FROM ${sponsorships}
        LEFT JOIN ${cases} ON ${sponsorships.case_id} = ${cases.id}
        LEFT JOIN ${users} ON ${sponsorships.sponsor_id} = ${users.id}
        WHERE ${sponsorships.created_at} >= ${fromDate}
        ORDER BY ${sponsorships.created_at} DESC
        LIMIT 3
      )
      UNION ALL
      (
        SELECT 
          ${cases.id} as id,
          'case' as type,
          'Case Status Update' as title,
          CONCAT('Case - ', ${cases.title}, ' (', ${cases.status}, ')') as description,
          NULL as amount,
          ${cases.status} as status,
          ${cases.created_at} as timestamp,
          NULL as user
        FROM ${cases}
        WHERE ${cases.created_at} >= ${fromDate}
        ORDER BY ${cases.created_at} DESC
        LIMIT 2
      )
      UNION ALL
      (
        SELECT 
          ${users.id} as id,
          'user' as type,
          'New User Registration' as title,
          CONCAT('New user registered: ', ${users.email}) as description,
          NULL as amount,
          'active' as status,
          ${users.created_at} as timestamp,
          ${users.email} as user
        FROM ${users}
        WHERE ${users.created_at} >= ${fromDate}
        ORDER BY ${users.created_at} DESC
        LIMIT 2
      )
      ORDER BY timestamp DESC
      LIMIT 10
    `)

    // Recent activity is already sorted and limited by the UNION query
    const allActivity = recentActivity.rows || []

    // Prepare metrics response using optimized data
    const metrics = {
      totalCases: caseMetrics[0]?.total || 0,
      activeCases: caseMetrics[0]?.published || 0,
      completedCases: (caseMetrics[0]?.closed || 0) + (caseMetrics[0]?.completed || 0),
      totalContributions: contributionMetrics[0]?.total || 0,
      totalAmount: parseFloat(contributionMetrics[0]?.totalAmount || '0'),
      averageContribution: parseFloat(contributionMetrics[0]?.avgAmount || '0'),
      totalSponsorships: sponsorshipMetrics[0]?.total || 0,
      activeSponsorships: sponsorshipMetrics[0]?.approved || 0,
      totalUsers: userMetrics[0]?.total || 0,
      newUsers: userMetrics[0]?.newUsers || 0,
      activeUsers: userMetrics[0]?.total || 0, // Simplified for now
      totalProjects: projectMetrics[0]?.total || 0,
      activeProjects: projectMetrics[0]?.active || 0,
      completionRate,
      successRate,
      pendingApprovals: (contributionMetrics[0]?.pending || 0) + (sponsorshipMetrics[0]?.pending || 0)
    }

    const responseData = {
      metrics,
      recentActivity: allActivity,
      dateRange: {
        from: fromDate.toISOString(),
        to: toDate.toISOString()
      }
    }
    
    // Cache the response
    analyticsCache.set(cacheKey, {
      data: responseData,
      timestamp: Date.now()
    })
    
    // Clean up old cache entries (simple cleanup)
    if (analyticsCache.size > 100) {
      const oldestKey = analyticsCache.keys().next().value
      analyticsCache.delete(oldestKey)
    }
    
    console.log('📊 Analytics data computed and cached')
    return NextResponse.json(responseData)

  } catch (error) {
    console.error('Analytics API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 