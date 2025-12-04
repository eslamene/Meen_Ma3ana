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
  ArrowRight,
  LayoutDashboard
} from 'lucide-react'
import { theme, brandColors } from '@/lib/theme'

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
      color: theme.gradients.primary,
      hoverColor: `linear-gradient(135deg, ${brandColors.meen[600]} 0%, ${brandColors.meen[700]} 100%)`,
      permission: 'cases:update',
      action: () => router.push(`/${params.locale}/case-management/cases`),
      buttonText: 'View Cases'
    },
    {
      id: 'review-contributions',
      title: 'Review Contributions',
      description: 'Approve, reject, and manage donations',
      icon: Heart,
      color: theme.gradients.brand,
      hoverColor: `linear-gradient(135deg, ${brandColors.meen[600]} 0%, ${brandColors.ma3ana[600]} 100%)`,
      permission: 'contributions:approve',
      action: () => router.push(`/${params.locale}/case-management/contributions`),
      buttonText: 'View Contributions'
    },
    {
      id: 'view-analytics',
      title: 'View Analytics',
      description: 'Track performance and insights',
      icon: BarChart3,
      color: theme.gradients.secondary,
      hoverColor: `linear-gradient(135deg, ${brandColors.ma3ana[600]} 0%, ${brandColors.ma3ana[700]} 100%)`,
      permission: 'admin:analytics',
      action: () => router.push(`/${params.locale}/case-management/analytics`),
      buttonText: 'View Reports'
    },
    {
      id: 'manage-sponsorships',
      title: 'Manage Sponsorships',
      description: 'Handle sponsorship requests and approvals',
      icon: UserCheck,
      color: theme.gradients.brandReverse,
      hoverColor: `linear-gradient(135deg, ${brandColors.ma3ana[600]} 0%, ${brandColors.meen[600]} 100%)`,
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
    <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg mb-6" style={{ boxShadow: theme.shadows.primary }}>
      <CardHeader className="pb-3 px-4 sm:px-6 pt-4 sm:pt-6">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg font-semibold text-gray-800">
          <Settings className="h-4 w-4 text-meen" />
          Quick Actions
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 px-4 sm:px-6 pb-4 sm:pb-6">
        <div className="space-y-2 sm:space-y-3">
          {visibleActions.map((action) => (
            <button
              key={action.id}
              onClick={action.action}
              style={{
                background: action.color,
                boxShadow: theme.shadows.primary
              }}
              className="group w-full flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg text-white transition-all duration-200 hover:shadow-lg hover:scale-[1.01] sm:hover:scale-[1.02]"
              onMouseEnter={(e) => {
                e.currentTarget.style.background = action.hoverColor || action.color
                e.currentTarget.style.boxShadow = theme.shadows.primary
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = action.color
                e.currentTarget.style.boxShadow = theme.shadows.primary
              }}
            >
              <div className="flex-shrink-0">
                <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm">
                  <action.icon className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
              </div>
              <div className="flex-1 text-left min-w-0">
                <h3 className="font-medium text-sm sm:text-base mb-0.5 sm:mb-1 truncate">{action.title}</h3>
                <p className="text-xs sm:text-sm opacity-90 leading-tight line-clamp-2">{action.description}</p>
              </div>
              <div className="flex-shrink-0 flex items-center gap-2 hidden sm:flex">
                <span className="text-xs sm:text-sm font-medium">{action.buttonText}</span>
                <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 opacity-60 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
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
  const tNav = useTranslations('navigation')
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
        <div className="min-h-screen" style={{ background: theme.gradients.brandSubtle }}>
          <Container variant={containerVariant} className="py-4 sm:py-6 lg:py-8">
            {/* Enhanced Header */}
            <div className="mb-6 sm:mb-8">
              <div className="bg-gradient-to-r from-white via-indigo-50/30 to-white rounded-xl border border-gray-200/60 shadow-sm p-4 sm:p-6">
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className="relative shrink-0">
                    <div className="p-3 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl shadow-lg">
                      <LayoutDashboard className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-indigo-400 rounded-full border-2 border-white"></div>
                  </div>

                  {/* Title and Description */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-2 flex-wrap">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent">
                          {t('title') || 'System Administration'}
                        </h1>
                        <Badge variant="outline" className="bg-ma3ana-100 text-ma3ana-800 border-ma3ana-200 text-xs font-semibold">
                          <Shield className="h-3 w-3 mr-1" />
                          {userRoleDisplayName}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-sm sm:text-base text-gray-600">
                      Welcome back, Administrator. Here&apos;s your system overview.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* System Statistics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
              <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300" style={{ boxShadow: theme.shadows.primary }}>
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Total Users</p>
                      <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">
                        {loading ? '...' : stats.totalUsers}
                      </p>
                    </div>
                    <div className="p-2 sm:p-3 rounded-full flex-shrink-0 ml-2" style={{ backgroundColor: brandColors.meen[100] }}>
                      <Users className="h-5 w-5 sm:h-6 sm:w-6" style={{ color: brandColors.meen[600] }} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300" style={{ boxShadow: theme.shadows.primary }}>
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Total Contributions</p>
                      <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">
                        {loading ? '...' : stats.totalContributions}
                      </p>
                    </div>
                    <div className="p-2 sm:p-3 rounded-full flex-shrink-0 ml-2" style={{ backgroundColor: brandColors.ma3ana[100] }}>
                      <Heart className="h-5 w-5 sm:h-6 sm:w-6" style={{ color: brandColors.ma3ana[600] }} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300" style={{ boxShadow: theme.shadows.primary }}>
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Total Amount</p>
                      <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1 truncate">
                        {loading ? '...' : formatAmount(stats.totalAmount)}
                      </p>
                    </div>
                    <div className="p-2 sm:p-3 rounded-full flex-shrink-0 ml-2" style={{ background: theme.gradients.brandSubtle }}>
                      <DollarSign className="h-5 w-5 sm:h-6 sm:w-6" style={{ color: brandColors.meen[600] }} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300" style={{ boxShadow: theme.shadows.primary }}>
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Active Cases</p>
                      <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">
                        {loading ? '...' : stats.activeCases}
                      </p>
                    </div>
                    <div className="p-2 sm:p-3 rounded-full flex-shrink-0 ml-2" style={{ background: theme.gradients.brandSubtle }}>
                      <Activity className="h-5 w-5 sm:h-6 sm:w-6" style={{ color: brandColors.meen[600] }} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Additional Statistics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
              <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300" style={{ boxShadow: theme.shadows.secondary }}>
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Completed Cases</p>
                      <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">
                        {loading ? '...' : stats.completedCases}
                      </p>
                    </div>
                    <div className="p-2 sm:p-3 rounded-full flex-shrink-0 ml-2" style={{ backgroundColor: brandColors.ma3ana[100] }}>
                      <Target className="h-5 w-5 sm:h-6 sm:w-6" style={{ color: brandColors.ma3ana[600] }} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300" style={{ boxShadow: theme.shadows.primary }}>
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Pending Reviews</p>
                      <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">
                        {loading ? '...' : stats.pendingContributions}
                      </p>
                    </div>
                    <div className="p-2 sm:p-3 rounded-full flex-shrink-0 ml-2" style={{ backgroundColor: brandColors.ma3ana[100] }}>
                      <Clock className="h-5 w-5 sm:h-6 sm:w-6" style={{ color: brandColors.ma3ana[600] }} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300" style={{ boxShadow: theme.shadows.primary }}>
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Approved</p>
                      <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">
                        {loading ? '...' : stats.approvedContributions}
                      </p>
                    </div>
                    <div className="p-2 sm:p-3 rounded-full flex-shrink-0 ml-2" style={{ backgroundColor: brandColors.meen[100] }}>
                      <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6" style={{ color: brandColors.meen[600] }} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300" style={{ boxShadow: theme.shadows.secondary }}>
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Rejected</p>
                      <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">
                        {loading ? '...' : stats.rejectedContributions}
                      </p>
                    </div>
                    <div className="p-2 sm:p-3 rounded-full flex-shrink-0 ml-2" style={{ backgroundColor: brandColors.ma3ana[100] }}>
                      <XCircle className="h-5 w-5 sm:h-6 sm:w-6" style={{ color: brandColors.ma3ana[600] }} />
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
            <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg" style={{ boxShadow: theme.shadows.primary }}>
              <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Activity className="h-4 w-4 sm:h-5 sm:w-5 text-meen" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto" style={{ borderColor: brandColors.meen[600] }}></div>
                    <p className="text-gray-600 mt-2 text-sm sm:text-base">Loading recent activity...</p>
                  </div>
                ) : stats.recentActivity.length > 0 ? (
                  <div className="space-y-3 sm:space-y-4">
                    {stats.recentActivity.map((activity) => (
                      <div key={activity.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 sm:p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="p-2 rounded-full flex-shrink-0" style={{ backgroundColor: brandColors.ma3ana[100] }}>
                            <Heart className="h-4 w-4" style={{ color: brandColors.ma3ana[600] }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 text-sm sm:text-base truncate">
                              New contribution: {formatAmount(activity.amount)}
                            </p>
                            <p className="text-xs sm:text-sm text-gray-600">
                              {formatDate(activity.date)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {getStatusBadge(activity.status)}
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => router.push(`/${params.locale}/case-management/contributions?contribution=${activity.id}`)}
                            className="border-2 border-gray-200 hover:border-meen hover:bg-meen-50 transition-all duration-200"
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            <span className="hidden sm:inline">View</span>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Activity className="h-10 w-10 sm:h-12 sm:w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 text-sm sm:text-base">No recent activity</p>
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