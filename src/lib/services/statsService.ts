/**
 * Stats Service
 * Handles statistics aggregation for admin dashboard and reports
 * Server-side only - accepts Supabase client as parameter
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { defaultLogger } from '@/lib/logger'

export interface ContributionWithApproval {
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

export interface AdminDashboardStats {
  totalUsers: number
  totalContributions: number
  totalAmount: number
  activeCases: number
  completedCases: number
  underReviewCases: number
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

export class StatsService {
  /**
   * Get admin dashboard statistics
   * @param supabase - Supabase client (server-side only)
   */
  static async getDashboardStats(supabase: SupabaseClient): Promise<AdminDashboardStats> {
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
      defaultLogger.error('Error fetching users:', usersResult.error)
    }
    if (contributionsResult.error) {
      defaultLogger.error('Error fetching contributions:', contributionsResult.error)
    }
    if (casesResult.error) {
      defaultLogger.error('Error fetching cases:', casesResult.error)
    }
    if (projectsResult.error) {
      defaultLogger.error('Error fetching projects:', projectsResult.error)
    }

    const users = usersResult.data || []
    const contributions = (contributionsResult.data || []) as ContributionWithApproval[]
    const cases = casesResult.data || []
    const projects = projectsResult.data || []

    // Calculate statistics based on approval status
    const totalUsers = users.length
    const totalContributions = contributions.length
    
    // Calculate total amount from approved contributions only
    // If approval_status join failed, use all contributions (fallback)
    const totalAmount = contributions.reduce((sum, c) => {
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
    
    // Case statuses: 'draft', 'submitted', 'published', 'closed', 'under_review', 'completed'
    // Active cases = published cases
    // Completed cases = cases with status 'completed'
    // Under Review = draft cases (cases that need review before publishing)
    const activeCases = cases.filter(c => c.status === 'published').length
    const completedCases = cases.filter(c => c.status === 'completed').length
    const underReviewCases = cases.filter(c => c.status === 'draft').length
  
    // Calculate contribution counts based on approval status
    // If approval_status join failed, use contribution status as fallback
    const pendingContributions = contributions.filter((c) => {
      if (c.approval_status !== undefined && c.approval_status !== null) {
        const approvalStatus = Array.isArray(c.approval_status) 
          ? c.approval_status[0]?.status 
          : c.approval_status?.status || 'pending'
        return approvalStatus === 'pending'
      }
      // Fallback: use contribution status
      return c.status === 'pending'
    }).length
    
    const approvedContributions = contributions.filter((c) => {
      if (c.approval_status !== undefined && c.approval_status !== null) {
        const approvalStatus = Array.isArray(c.approval_status) 
          ? c.approval_status[0]?.status 
          : c.approval_status?.status || 'pending'
        return approvalStatus === 'approved'
      }
      // Fallback: use contribution status
      return c.status === 'approved' || c.status === 'completed'
    }).length
    
    const rejectedContributions = contributions.filter((c) => {
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
      .filter((c) => {
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
      .map((c) => ({
        id: c.id,
        type: 'contribution',
        status: c.status,
        amount: parseFloat(String(c.amount || 0)),
        date: c.created_at
      }))

    return {
      totalUsers,
      totalContributions,
      totalAmount,
      activeCases,
      completedCases,
      underReviewCases,
      pendingContributions,
      approvedContributions,
      rejectedContributions,
      totalProjects,
      recentActivity
    }
  }
}

