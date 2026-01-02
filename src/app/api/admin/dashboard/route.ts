import { NextRequest, NextResponse } from 'next/server'
import { createGetHandler } from '@/lib/utils/api-wrapper'
import type { ApiResponse } from '@/types/api'

interface ContributionWithApproval {
  id: string
  amount: number
  status: string
  created_at: string
  approval_status?: {
    status: 'pending' | 'approved' | 'rejected' | 'acknowledged'
  } | Array<{
    status: 'pending' | 'approved' | 'rejected' | 'acknowledged'
  }>
}

interface AdminDashboardStats {
  totalUsers: number
  totalContributions: number
  totalAmount: number
  activeCases: number
  completedCases: number
  pendingContributions: number
  approvedContributions: number
  rejectedContributions: number
  totalProjects: number
  recentActivity: Array<{
    id: string
    type: string
    status: string
    amount: number
    date: string
  }>
}

export const GET = createGetHandler(
  async (request, { user, supabase, logger }) => {
    try {
      // Fetch all system-wide statistics
      const [
        usersResult,
        contributionsResult,
        casesResult,
        projectsResult
      ] = await Promise.all([
        supabase.from('users').select('id, created_at, role'),
        // Try to get approval status, but fallback to just contributions if join fails
        supabase.from('contributions').select(`
          id, 
          amount, 
          status, 
          created_at,
          approval_status:contribution_approval_status!contribution_id(status)
        `).limit(10000), // Add limit to prevent timeout
        supabase.from('cases').select('id, status, created_at'),
        supabase.from('projects').select('id, created_at')
      ])

      // Check for errors
      if (usersResult.error) {
        logger.error('Error fetching users:', usersResult.error)
      }
      if (contributionsResult.error) {
        logger.error('Error fetching contributions:', contributionsResult.error)
      }
      if (casesResult.error) {
        logger.error('Error fetching cases:', casesResult.error)
      }
      if (projectsResult.error) {
        logger.error('Error fetching projects:', projectsResult.error)
      }

      const users = usersResult.data || []
      const contributions = contributionsResult.data || []
      const cases = casesResult.data || []
      const projects = projectsResult.data || []

      // Calculate statistics based on approval status
      const totalUsers = users.length
      const totalContributions = contributions.length
      
      // Calculate total amount from approved contributions only
      // If approval_status join failed, use all contributions (fallback)
      const totalAmount = contributions.reduce((sum, c: ContributionWithApproval) => {
        // Check if approval_status exists (join succeeded)
        if (c.approval_status !== undefined && c.approval_status !== null) {
          const approvalStatus = Array.isArray(c.approval_status) 
            ? c.approval_status[0]?.status 
            : c.approval_status?.status || 'pending'
          return approvalStatus === 'approved' ? sum + parseFloat(String(c.amount || 0)) : sum
        }
        // Fallback: if no approval_status, count all contributions
        return sum + parseFloat(String(c.amount || 0))
      }, 0)
      
      // Case statuses: 'draft', 'submitted', 'published', 'closed', 'under_review'
      // Active cases = published cases
      // Completed cases = closed cases
      const activeCases = cases.filter(c => c.status === 'published').length
      const completedCases = cases.filter(c => c.status === 'closed').length
    
      // Calculate contribution counts based on approval status
      // If approval_status join failed, use contribution status as fallback
      const pendingContributions = contributions.filter((c: ContributionWithApproval) => {
        if (c.approval_status !== undefined && c.approval_status !== null) {
          const approvalStatus = Array.isArray(c.approval_status) 
            ? c.approval_status[0]?.status 
            : c.approval_status?.status || 'pending'
          return approvalStatus === 'pending'
        }
        // Fallback: use contribution status
        return c.status === 'pending'
      }).length
      
      const approvedContributions = contributions.filter((c: ContributionWithApproval) => {
        if (c.approval_status !== undefined && c.approval_status !== null) {
          const approvalStatus = Array.isArray(c.approval_status) 
            ? c.approval_status[0]?.status 
            : c.approval_status?.status || 'pending'
          return approvalStatus === 'approved'
        }
        // Fallback: use contribution status
        return c.status === 'approved' || c.status === 'completed'
      }).length
      
      const rejectedContributions = contributions.filter((c: ContributionWithApproval) => {
        if (c.approval_status !== undefined && c.approval_status !== null) {
          const approvalStatus = Array.isArray(c.approval_status) 
            ? c.approval_status[0]?.status 
            : c.approval_status?.status || 'pending'
          return approvalStatus === 'rejected'
        }
        // Fallback: use contribution status
        return c.status === 'rejected'
      }).length
      
      const totalProjects = projects.length

      // Get recent activity (last 10 approved contributions)
      const recentActivity = contributions
        .filter((c: ContributionWithApproval) => {
          if (c.approval_status !== undefined && c.approval_status !== null) {
            const approvalStatus = Array.isArray(c.approval_status) 
              ? c.approval_status[0]?.status 
              : c.approval_status?.status || 'pending'
            return approvalStatus === 'approved'
          }
          // Fallback: use contribution status
          return c.status === 'approved' || c.status === 'completed'
        })
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 10)
        .map((c: ContributionWithApproval) => ({
          id: c.id,
          type: 'contribution',
          status: c.status,
          amount: parseFloat(String(c.amount || 0)),
          date: c.created_at
        }))

      logger.info('Dashboard stats calculated', {
        totalUsers,
        totalContributions,
        totalAmount,
        activeCases,
        completedCases
      })

      return NextResponse.json({
        data: {
          totalUsers,
          totalContributions,
          totalAmount,
          activeCases,
          completedCases,
          pendingContributions,
          approvedContributions,
          rejectedContributions,
          totalProjects,
          recentActivity
        }
      })
    } catch (error) {
      logger.error('Error calculating dashboard stats:', { error })
      throw error
    }
  },
  { requireAuth: true, requireAdmin: true, loggerContext: 'api/admin/dashboard' }
)

