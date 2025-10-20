import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { db } from '@/lib/db'
import { cases, contributions, sponsorships, users, projects, projectCycles } from '@/drizzle/schema'
import { eq, and, gte, lte, desc, sql, count, sum, avg } from 'drizzle-orm'

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

    // Fetch metrics
    const [
      totalCases,
      activeCases,
      completedCases,
      totalContributions,
      totalContributionsAmount,
      avgContribution,
      totalSponsorships,
      activeSponsorships,
      totalUsers,
      newUsers,
      totalProjects,
      activeProjects,
      pendingApprovals
    ] = await Promise.all([
      // Total cases
      db.select({ count: count() }).from(cases),
      
      // Active cases (published)
      db.select({ count: count() }).from(cases).where(eq(cases.status, 'published')),
      
      // Completed cases (closed)
      db.select({ count: count() }).from(cases).where(eq(cases.status, 'closed')),
      
      // Total contributions
      db.select({ count: count() }).from(contributions),
      
      // Total contributions amount
      db.select({ total: sum(contributions.amount) }).from(contributions),
      
      // Average contribution
      db.select({ avg: avg(contributions.amount) }).from(contributions),
      
      // Total sponsorships
      db.select({ count: count() }).from(sponsorships),
      
      // Active sponsorships
      db.select({ count: count() }).from(sponsorships).where(eq(sponsorships.status, 'approved')),
      
      // Total users
      db.select({ count: count() }).from(users),
      
      // New users (last 30 days)
      db.select({ count: count() }).from(users).where(gte(users.created_at, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))),
      
      // Total projects
      db.select({ count: count() }).from(projects),
      
      // Active projects (published)
      db.select({ count: count() }).from(projects).where(eq(projects.status, 'active')),
      
      // Pending approvals (contributions + sponsorships)
      Promise.all([
        db.select({ count: count() }).from(contributions).where(eq(contributions.status, 'pending')),
        db.select({ count: count() }).from(sponsorships).where(eq(sponsorships.status, 'pending'))
      ]).then(([contribPending, sponsorPending]) => ({
        count: (contribPending[0]?.count || 0) + (sponsorPending[0]?.count || 0)
      }))
    ])

    // Calculate completion rate
    const completionRate = totalCases[0]?.count ? 
      Math.round((completedCases[0]?.count || 0) / totalCases[0].count * 100) : 0

    // Calculate success rate (active projects / total projects)
    const successRate = totalProjects[0]?.count ? 
      Math.round((activeProjects[0]?.count || 0) / totalProjects[0].count * 100) : 0

    // Fetch recent activity
    const recentActivity = await Promise.all([
      // Recent contributions
      db.select({
        id: contributions.id,
        type: sql`'contribution'`,
        title: sql`'New Contribution'`,
        description: sql`CONCAT('Contribution to Case #', cases.id, ' - ', cases.title)`,
        amount: contributions.amount,
        status: contributions.status,
        timestamp: contributions.created_at,
        user: users.email
      })
      .from(contributions)
      .leftJoin(cases, eq(contributions.case_id, cases.id))
      .leftJoin(users, eq(contributions.donor_id, users.id))
      .orderBy(desc(contributions.created_at))
      .limit(5),

      // Recent sponsorships
      db.select({
        id: sponsorships.id,
        type: sql`'sponsorship'`,
        title: sql`'Sponsorship Request'`,
        description: sql`CONCAT('Sponsorship for Case #', cases.id, ' - ', cases.title)`,
        amount: sponsorships.amount,
        status: sponsorships.status,
        timestamp: sponsorships.created_at,
        user: users.email
      })
      .from(sponsorships)
      .leftJoin(cases, eq(sponsorships.case_id, cases.id))
      .leftJoin(users, eq(sponsorships.sponsor_id, users.id))
      .orderBy(desc(sponsorships.created_at))
      .limit(5),

      // Recent cases
      db.select({
        id: cases.id,
        type: sql`'case'`,
        title: sql`'Case Status Update'`,
        description: sql`CONCAT('Case #', cases.id, ' - ', cases.title, ' ', cases.status)`,
        status: cases.status,
        timestamp: cases.created_at
      })
      .from(cases)
      .orderBy(desc(cases.created_at))
      .limit(5),

      // Recent users
      db.select({
        id: users.id,
        type: sql`'user'`,
        title: sql`'New User Registration'`,
        description: sql`CONCAT('New user registered: ', users.email)`,
        status: sql`'active'`,
        timestamp: users.created_at,
        user: users.email
      })
      .from(users)
      .orderBy(desc(users.created_at))
      .limit(5)
    ])

    // Combine and sort recent activity
    const allActivity = [
      ...recentActivity[0].map(item => ({ ...item, type: 'contribution' as const })),
      ...recentActivity[1].map(item => ({ ...item, type: 'sponsorship' as const })),
      ...recentActivity[2].map(item => ({ ...item, type: 'case' as const })),
      ...recentActivity[3].map(item => ({ ...item, type: 'user' as const }))
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 10)

    // Prepare metrics response
    const metrics = {
      totalCases: totalCases[0]?.count || 0,
      activeCases: activeCases[0]?.count || 0,
      completedCases: completedCases[0]?.count || 0,
      totalContributions: totalContributions[0]?.count || 0,
      totalAmount: parseFloat(totalContributionsAmount[0]?.total || '0'),
      averageContribution: parseFloat(avgContribution[0]?.avg || '0'),
      totalSponsorships: totalSponsorships[0]?.count || 0,
      activeSponsorships: activeSponsorships[0]?.count || 0,
      totalUsers: totalUsers[0]?.count || 0,
      newUsers: newUsers[0]?.count || 0,
      activeUsers: totalUsers[0]?.count || 0, // Simplified for now
      totalProjects: totalProjects[0]?.count || 0,
      activeProjects: activeProjects[0]?.count || 0,
      completionRate,
      successRate,
      pendingApprovals: pendingApprovals.count || 0
    }

    return NextResponse.json({
      metrics,
      recentActivity: allActivity,
      dateRange: {
        from: fromDate.toISOString(),
        to: toDate.toISOString()
      }
    })

  } catch (error) {
    console.error('Analytics API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 