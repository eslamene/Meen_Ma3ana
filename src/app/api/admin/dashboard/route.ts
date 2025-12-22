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

    // Fetch all system-wide statistics
    const [
      { data: users },
      { data: contributions },
      { data: cases },
      { data: projects }
    ] = await Promise.all([
      supabase.from('users').select('id, created_at, role'),
      supabase.from('contributions').select(`
        id, 
        amount, 
        status, 
        created_at,
        approval_status:contribution_approval_status!contribution_id(status)
      `),
      supabase.from('cases').select('id, status, created_at'),
      supabase.from('projects').select('id, created_at')
    ])

    // Calculate statistics based on approval status
    const totalUsers = users?.length || 0
    const totalContributions = contributions?.length || 0
    
    // Calculate total amount from approved contributions only
    const totalAmount = contributions?.reduce((sum, c: ContributionWithApproval) => {
      const approvalStatus = Array.isArray(c.approval_status) 
        ? c.approval_status[0]?.status 
        : c.approval_status?.status || 'pending'
      return approvalStatus === 'approved' ? sum + (c.amount || 0) : sum
    }, 0) || 0
    
    const activeCases = cases?.filter(c => c.status === 'active').length || 0
    const completedCases = cases?.filter(c => c.status === 'completed').length || 0
    
    // Calculate contribution counts based on approval status
    const pendingContributions = contributions?.filter((c: ContributionWithApproval) => {
      const approvalStatus = Array.isArray(c.approval_status) 
        ? c.approval_status[0]?.status 
        : c.approval_status?.status || 'pending'
      return approvalStatus === 'pending'
    }).length || 0
    
    const approvedContributions = contributions?.filter((c: ContributionWithApproval) => {
      const approvalStatus = Array.isArray(c.approval_status) 
        ? c.approval_status[0]?.status 
        : c.approval_status?.status || 'pending'
      return approvalStatus === 'approved'
    }).length || 0
    
    const rejectedContributions = contributions?.filter((c: ContributionWithApproval) => {
      const approvalStatus = Array.isArray(c.approval_status) 
        ? c.approval_status[0]?.status 
        : c.approval_status?.status || 'pending'
      return approvalStatus === 'rejected'
    }).length || 0
    
    const totalProjects = projects?.length || 0

    // Get recent activity (last 10 approved contributions)
    const recentActivity = contributions
      ?.filter((c: ContributionWithApproval) => {
        const approvalStatus = Array.isArray(c.approval_status) 
          ? c.approval_status[0]?.status 
          : c.approval_status?.status || 'pending'
        return approvalStatus === 'approved'
      })
      .slice(0, 10)
      .map((c: ContributionWithApproval) => ({
        id: c.id,
        type: 'contribution',
        status: c.status,
        amount: c.amount,
        date: c.created_at
      })) || []

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
  },
  { requireAuth: true, requireAdmin: true, loggerContext: 'api/admin/dashboard' }
)

