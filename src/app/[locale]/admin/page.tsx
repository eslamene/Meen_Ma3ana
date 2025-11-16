'use client'

import React from 'react'
import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter, useParams } from 'next/navigation'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import PermissionGuard from '@/components/auth/PermissionGuard'
import Container from '@/components/layout/Container'
import { useLayout } from '@/components/layout/LayoutProvider'
import { useAdmin } from '@/lib/admin/hooks'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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

// Admin Quick Actions Component
interface AdminQuickActionsSectionProps {
  router: ReturnType<typeof useRouter>
  params: { locale?: string }
  t: (key: string) => string
}

function AdminQuickActionsSection({ router, params }: AdminQuickActionsSectionProps) {
  const { hasPermission } = useAdmin()
  
  // Define all possible admin actions with their permissions
  const allActions = [
    {
      id: 'manage-cases',
      title: 'Manage Cases',
      description: 'Create, edit, and monitor donation cases',
      icon: Target,
      color: 'from-blue-500 to-indigo-600',
      permission: 'cases:update',
      action: () => router.push(`/${params.locale}/case-management/cases`),
      buttonText: 'View Cases'
    },
    {
      id: 'review-contributions',
      title: 'Review Contributions',
      description: 'Approve, reject, and manage donations',
      icon: Heart,
      color: 'from-green-500 to-emerald-600',
      permission: 'contributions:approve',
      action: () => router.push(`/${params.locale}/case-management/contributions`),
      buttonText: 'View Contributions'
    },
    {
      id: 'view-analytics',
      title: 'View Analytics',
      description: 'Track performance and insights',
      icon: BarChart3,
      color: 'from-purple-500 to-violet-600',
      permission: 'admin:analytics',
      action: () => router.push(`/${params.locale}/case-management/analytics`),
      buttonText: 'View Reports'
    },
    {
      id: 'manage-sponsorships',
      title: 'Manage Sponsorships',
      description: 'Handle sponsorship requests and approvals',
      icon: UserCheck,
      color: 'from-red-500 to-rose-600',
      permission: 'admin:dashboard', // Using general admin permission for sponsorships
      action: () => router.push(`/${params.locale}/case-management/sponsorships`),
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
  const { roles } = useAdmin()
  const { containerVariant } = useLayout()
  // Get primary role (first role or highest level)
  const primaryRole = roles.length > 0 ? roles[0] : null
  const userRoleDisplayName = primaryRole?.display_name || 'User'
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

  const fetchSystemStats = useCallback(async () => {
    try {
      setLoading(true)
      
      const response = await fetch('/api/admin/dashboard')
      
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          console.error('Unauthorized or forbidden access to admin dashboard')
          return
        }
        throw new Error(`Failed to fetch system stats: ${response.statusText}`)
      }

      const data = await response.json()
      setStats({
        totalUsers: data.totalUsers || 0,
        totalContributions: data.totalContributions || 0,
        totalAmount: data.totalAmount || 0,
        activeCases: data.activeCases || 0,
        completedCases: data.completedCases || 0,
        pendingContributions: data.pendingContributions || 0,
        approvedContributions: data.approvedContributions || 0,
        rejectedContributions: data.rejectedContributions || 0,
        totalProjects: data.totalProjects || 0,
        recentActivity: data.recentActivity || []
      })
    } catch (error) {
      console.error('Error fetching system stats:', error)
    } finally {
      setLoading(false)
    }
  }, [])

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
      <PermissionGuard permission="admin:dashboard">
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
          <Container variant={containerVariant} className="py-8">
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
                    {userRoleDisplayName}
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
                            onClick={() => router.push(`/${params.locale}/case-management/contributions?contribution=${activity.id}`)}
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
        </Container>
      </div>
      </PermissionGuard>
    </ProtectedRoute>
  )
} 