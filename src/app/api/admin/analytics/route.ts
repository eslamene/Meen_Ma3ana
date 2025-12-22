import { NextRequest, NextResponse } from 'next/server'
import { createGetHandler, ApiHandlerContext } from '@/lib/utils/api-wrapper'
import { ApiError } from '@/lib/utils/api-errors'
import { db } from '@/lib/db'
import { cases, contributions, sponsorships, users, projects, projectCycles } from '@/drizzle/schema'
import { eq, and, gte, lte, desc, sql, count, sum, avg } from 'drizzle-orm'
import { env } from '@/config/env'

// Disable in-memory cache in production to avoid cross-user data leakage
const ENABLE_CACHE = env.NODE_ENV === 'development'

async function getHandler(request: NextRequest, context: ApiHandlerContext) {
  const { logger } = context

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const dateRange = searchParams.get('dateRange') || 'last30Days'
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    
    // Skip cache in production to avoid cross-user data leakage
    if (!ENABLE_CACHE) {
      // Cache disabled in production - proceed with fresh data
    }

    // Calculate date range
    let fromDate: Date
    let toDate: Date = new Date()
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

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
      userMetricsTotal,
      userMetricsNew,
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
      
      // Total users count
      db.select({
        total: count()
      }).from(users),
      
      // New users count (last 30 days)
      db.select({
        newUsers: count()
      })
        .from(users)
        .where(gte(users.created_at, thirtyDaysAgo)),
      
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

    // Fetch recent activity using separate queries and combine them
    const [recentContributions, recentSponsorships, recentCases, recentUsers] = await Promise.all([
      // Recent contributions
      db.select({
        id: contributions.id,
        amount: contributions.amount,
        status: contributions.status,
        timestamp: contributions.created_at,
        caseTitleEn: cases.title_en,
        caseTitleAr: cases.title_ar,
        userEmail: users.email
      })
        .from(contributions)
        .leftJoin(cases, eq(contributions.case_id, cases.id))
        .leftJoin(users, eq(contributions.donor_id, users.id))
        .where(gte(contributions.created_at, fromDate))
        .orderBy(desc(contributions.created_at))
        .limit(3),
      
      // Recent sponsorships
      db.select({
        id: sponsorships.id,
        amount: sponsorships.amount,
        status: sponsorships.status,
        timestamp: sponsorships.created_at,
        caseTitleEn: cases.title_en,
        caseTitleAr: cases.title_ar,
        userEmail: users.email
      })
        .from(sponsorships)
        .leftJoin(cases, eq(sponsorships.case_id, cases.id))
        .leftJoin(users, eq(sponsorships.sponsor_id, users.id))
        .where(gte(sponsorships.created_at, fromDate))
        .orderBy(desc(sponsorships.created_at))
        .limit(3),
      
      // Recent cases
      db.select({
        id: cases.id,
        status: cases.status,
        timestamp: cases.created_at,
        titleEn: cases.title_en,
        titleAr: cases.title_ar
      })
        .from(cases)
        .where(gte(cases.created_at, fromDate))
        .orderBy(desc(cases.created_at))
        .limit(2),
      
      // Recent users
      db.select({
        id: users.id,
        timestamp: users.created_at,
        email: users.email
      })
        .from(users)
        .where(gte(users.created_at, fromDate))
        .orderBy(desc(users.created_at))
        .limit(2)
    ])

    // Combine and sort all activities by timestamp
    const allActivity = [
      ...recentContributions.map(c => ({
        id: c.id,
        type: 'contribution' as const,
        title: 'New Contribution',
        description: `Contribution to Case - ${c.caseTitleEn || c.caseTitleAr || 'Unknown Case'}`,
        amount: c.amount ? Number(c.amount) : undefined,
        status: c.status,
        timestamp: c.timestamp.toISOString(),
        user: c.userEmail || undefined
      })),
      ...recentSponsorships.map(s => ({
        id: s.id,
        type: 'sponsorship' as const,
        title: 'Sponsorship Request',
        description: `Sponsorship for Case - ${s.caseTitleEn || s.caseTitleAr || 'Unknown Case'}`,
        amount: s.amount ? Number(s.amount) : undefined,
        status: s.status,
        timestamp: s.timestamp.toISOString(),
        user: s.userEmail || undefined
      })),
      ...recentCases.map(c => ({
        id: c.id,
        type: 'case' as const,
        title: 'Case Status Update',
        description: `Case - ${c.titleEn || c.titleAr || 'Untitled'} (${c.status})`,
        amount: undefined,
        status: c.status,
        timestamp: c.timestamp.toISOString(),
        user: undefined
      })),
      ...recentUsers.map(u => ({
        id: u.id,
        type: 'user' as const,
        title: 'New User Registration',
        description: `New user registered: ${u.email}`,
        amount: undefined,
        status: 'active',
        timestamp: u.timestamp.toISOString(),
        user: u.email || undefined
      }))
    ]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10)

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
      totalUsers: userMetricsTotal[0]?.total || 0,
      newUsers: userMetricsNew[0]?.newUsers || 0,
      activeUsers: userMetricsTotal[0]?.total || 0, // Simplified for now
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
    
    logger.info('📊 Analytics data computed')
    return NextResponse.json(responseData)
}

export const GET = createGetHandler(getHandler, { 
  requireAdmin: true, 
  loggerContext: 'api/admin/analytics' 
}) 