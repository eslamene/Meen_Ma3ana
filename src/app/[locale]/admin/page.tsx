'use client'

import React from 'react'
import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter, useParams } from 'next/navigation'
import ProtectedRoute from '../../../components/auth/ProtectedRoute'
import PermissionGuard from '../../../components/auth/PermissionGuard'
import { usePermissions } from '../../../lib/hooks/usePermissions'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card'
import { Button } from '../../../components/ui/button'
import { Badge } from '../../../components/ui/badge'
import { 
  Users, 
  Heart, 
  DollarSign, 
  Target, 
  Activity, 
  BarChart3, 
  Settings,
  Eye,
  CheckCircle,
  Clock,
  XCircle,
  UserCheck,
  Shield,
  ArrowRight
} from 'lucide-react'
import { createClient } from '../../../lib/supabase/client'
import { useSimpleRBAC } from '../../../lib/hooks/useSimpleRBAC'

// Admin Quick Actions Component
interface AdminQuickActionsSectionProps {
  router: ReturnType<typeof useRouter>
  params: { locale?: string }
  t: (key: string) => string
}

function AdminQuickActionsSection({ router, params }: AdminQuickActionsSectionProps) {
  const { hasPermission } = useSimpleRBAC()
  
  // Define all possible admin actions with their permissions
  const allActions = [
    {
      id: 'manage-cases',
      title: 'Manage Cases',
      description: 'Create, edit, and monitor donation cases',
      icon: Target,
      color: 'from-blue-500 to-indigo-600',
      permission: 'cases:update',
      action: () => router.push(`/${params.locale}/admin/cases`),
      buttonText: 'View Cases'
    },
    {
      id: 'review-contributions',
      title: 'Review Contributions',
      description: 'Approve, reject, and manage donations',
      icon: Heart,
      color: 'from-green-500 to-emerald-600',
      permission: 'contributions:approve',
      action: () => router.push(`/${params.locale}/admin/contributions`),
      buttonText: 'View Contributions'
    },
    {
      id: 'view-analytics',
      title: 'View Analytics',
      description: 'Track performance and insights',
      icon: BarChart3,
      color: 'from-purple-500 to-violet-600',
      permission: 'admin:analytics',
      action: () => router.push(`/${params.locale}/admin/analytics`),
      buttonText: 'View Reports'
    },
    {
      id: 'manage-sponsorships',
      title: 'Manage Sponsorships',
      description: 'Handle sponsorship requests and approvals',
      icon: UserCheck,
      color: 'from-red-500 to-rose-600',
      permission: 'admin:dashboard', // Using general admin permission for sponsorships
      action: () => router.push(`/${params.locale}/admin/sponsorships`),
      buttonText: 'View Sponsorships'
    }
  ]
  
  // Filter actions based on permissions
  const visibleActions = allActions.filter(action => 
    hasPermission(action.permission)
  )
  
  // Don't render if no actions are visible
  if (visibleActions.length === 0) {
    return null
  }
  
  return (
    <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-800">
          <Settings className="h-4 w-4 text-blue-600" />
          Quick Actions
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          {visibleActions.map((action) => (
            <button
              key={action.id}
              onClick={action.action}
              className={`group w-full flex items-center gap-4 p-4 rounded-lg bg-gradient-to-r ${action.color} text-white transition-all duration-200 hover:shadow-md hover:scale-[1.02]`}
            >
              <div className="flex-shrink-0">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm">
                  <action.icon className="h-5 w-5" />
                </div>
              </div>
              <div className="flex-1 text-left">
                <h3 className="font-medium text-base mb-1">{action.title}</h3>
                <p className="text-sm opacity-90 leading-tight">{action.description}</p>
              </div>
              <div className="flex-shrink-0 flex items-center gap-2">
                <span className="text-sm font-medium">{action.buttonText}</span>
                <ArrowRight className="h-4 w-4 opacity-60 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
              </div>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// Role display function
const getRoleDisplayName = (role: string) => {
  switch (role) {
    case 'admin':
      return 'Administrator'
    case 'moderator':
      return 'Moderator'
    case 'sponsor':
      return 'Sponsor'
    case 'volunteer':
      return 'Volunteer'
    case 'donor':
      return 'Donor'
    default:
      return 'User'
  }
}

interface SystemStats {
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

export default function AdminPage() {
  const t = useTranslations('admin')
  const router = useRouter()
  const params = useParams()
  const { userRole } = usePermissions()
  const [stats, setStats] = useState<SystemStats>({
    totalUsers: 0,
    totalContributions: 0,
    totalAmount: 0,
    activeCases: 0,
    completedCases: 0,
    pendingContributions: 0,
    approvedContributions: 0,
    rejectedContributions: 0,
    totalProjects: 0,
    recentActivity: []
  })
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  const fetchSystemStats = useCallback(async () => {
    try {
      setLoading(true)
      
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
      
      // Contribution type for admin dashboard
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

      setStats({
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
      })
    } catch (error) {
      console.error('Error fetching system stats:', error)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchSystemStats()
  }, [fetchSystemStats])

  const formatAmount = (amount: number) => {
    return `EGP ${amount.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    })}`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle className="h-3 w-3 mr-1" />
            Approved
          </Badge>
        )
      case 'rejected':
        return (
          <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">
            <XCircle className="h-3 w-3 mr-1" />
            Rejected
          </Badge>
        )
      case 'pending':
        return (
          <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="bg-gray-100 text-gray-800 border-gray-200">
            {status}
          </Badge>
        )
    }
  }

  return (
    <ProtectedRoute>
      <PermissionGuard permission="view:admin_dashboard">
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
          <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-4xl font-bold text-gray-900 mb-2">
                    System Administration
                  </h1>
                  <p className="text-lg text-gray-600">
                    Welcome back, Administrator. Here&apos;s your system overview.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">
                    <Shield className="h-3 w-3 mr-1" />
                    {getRoleDisplayName(userRole || '')}
                  </Badge>
                </div>
              </div>
            </div>

            {/* System Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Users</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {loading ? '...' : stats.totalUsers}
                      </p>
                    </div>
                    <div className="p-3 bg-blue-100 rounded-full">
                      <Users className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Contributions</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {loading ? '...' : stats.totalContributions}
                      </p>
                    </div>
                    <div className="p-3 bg-green-100 rounded-full">
                      <Heart className="h-6 w-6 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Amount</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {loading ? '...' : formatAmount(stats.totalAmount)}
                      </p>
                    </div>
                    <div className="p-3 bg-emerald-100 rounded-full">
                      <DollarSign className="h-6 w-6 text-emerald-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Active Cases</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {loading ? '...' : stats.activeCases}
                      </p>
                    </div>
                    <div className="p-3 bg-yellow-100 rounded-full">
                      <Activity className="h-6 w-6 text-yellow-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Additional Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Completed Cases</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {loading ? '...' : stats.completedCases}
                      </p>
                    </div>
                    <div className="p-3 bg-purple-100 rounded-full">
                      <Target className="h-6 w-6 text-purple-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Pending Reviews</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {loading ? '...' : stats.pendingContributions}
                      </p>
                    </div>
                    <div className="p-3 bg-orange-100 rounded-full">
                      <Clock className="h-6 w-6 text-orange-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Approved</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {loading ? '...' : stats.approvedContributions}
                      </p>
                    </div>
                    <div className="p-3 bg-green-100 rounded-full">
                      <CheckCircle className="h-6 w-6 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Rejected</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {loading ? '...' : stats.rejectedContributions}
                      </p>
                    </div>
                    <div className="p-3 bg-red-100 rounded-full">
                      <XCircle className="h-6 w-6 text-red-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions - Dynamic Layout */}
            <AdminQuickActionsSection 
              router={router}
              params={params}
              t={t}
            />

            {/* Recent Activity */}
            <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-blue-600" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="text-gray-600 mt-2">Loading recent activity...</p>
                  </div>
                ) : stats.recentActivity.length > 0 ? (
                  <div className="space-y-4">
                    {stats.recentActivity.map((activity) => (
                      <div key={activity.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-100 rounded-full">
                            <Heart className="h-4 w-4 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">
                              New contribution: {formatAmount(activity.amount)}
                            </p>
                            <p className="text-sm text-gray-600">
                              {formatDate(activity.date)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(activity.status)}
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => router.push(`/${params.locale}/admin/contributions?contribution=${activity.id}`)}
                            className="border-2 border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-all duration-200"
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            View
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No recent activity</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </PermissionGuard>
    </ProtectedRoute>
  )
} 