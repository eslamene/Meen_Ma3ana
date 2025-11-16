'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter, useParams } from 'next/navigation'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { useAuth } from '@/components/auth/AuthProvider'
import { useAdmin } from '@/lib/admin/hooks'
import PermissionGuard from '@/components/auth/PermissionGuard'
import Container from '@/components/layout/Container'
import { useLayout } from '@/components/layout/LayoutProvider'
import ContributionHistory from '@/components/profile/ContributionHistory'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  User, 
  LogOut, 
  Shield, 
  TrendingUp, 
  Heart, 
  Target, 
  Settings, 
  BarChart3, 
  Calendar,
  DollarSign,
  Activity,
  ArrowRight,
  Plus,
  Eye,
  RefreshCw
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// Dynamic Quick Actions Component
interface QuickActionsSectionProps {
  quickActions: Array<{
    title: string
    description: string
    icon: LucideIcon
    color: string
    hoverColor: string
    permission: string
    action: () => void
  }>
  t: (key: string) => string
}

function QuickActionsSection({ quickActions, t }: QuickActionsSectionProps) {
  const { hasPermission } = useAdmin()
  
  // Filter actions based on permissions
  const visibleActions = quickActions.filter(action => 
    hasPermission(action.permission)
  )
  
  // Don't render the section if no actions are visible
  if (visibleActions.length === 0) {
    return null
  }
  
  return (
    <Card className="mb-6 sm:mb-8 bg-white/90 backdrop-blur-sm border-0 shadow-lg">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg font-semibold text-gray-800">
          <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
          {t('quickActions')}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2 sm:space-y-3">
          {visibleActions.map((action, index) => (
            <button
              key={index}
              onClick={action.action}
              className={`group w-full flex items-center gap-2 sm:gap-4 p-3 sm:p-4 rounded-lg bg-gradient-to-r ${action.color} hover:${action.hoverColor} text-white transition-all duration-200 hover:shadow-md`}
            >
              <div className="flex-shrink-0">
                {(() => {
                  const Icon = action.icon
                  return <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                })()}
              </div>
              <div className="flex-1 text-left min-w-0">
                <h3 className="font-medium text-sm sm:text-base mb-0.5 sm:mb-1 truncate">{action.title}</h3>
                <p className="text-xs sm:text-sm opacity-90 leading-tight line-clamp-2">{action.description}</p>
              </div>
              <div className="flex-shrink-0">
                <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 opacity-60 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
              </div>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// Role display functions
const getRoleDisplayName = (role: string) => {
  switch (role) {
    case 'super_admin':
      return 'Super Administrator'
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
    case 'visitor':
      return 'Visitor'
    default:
      return 'User'
  }
}

const getRoleDescription = (role: string) => {
  switch (role) {
    case 'super_admin':
      return 'Full system access with system management privileges'
    case 'admin':
      return 'Full system access with all administrative privileges'
    case 'moderator':
      return 'Can manage cases and contributions with approval rights'
    case 'sponsor':
      return 'Can create sponsorship requests and support cases'
    case 'volunteer':
      return 'Can help with case management and project updates'
    case 'donor':
      return 'Can make contributions and view cases'
    case 'visitor':
      return 'Unauthenticated user with limited access'
    default:
      return 'Basic user access'
  }
}

interface DashboardStats {
  totalContributions: number
  totalAmount: number
  activeCases: number
  completedCases: number
}

export default function DashboardPage() {
  const t = useTranslations('dashboard')
  const router = useRouter()
  const params = useParams()
  const { user, signOut } = useAuth()
  const { roles, loading: rolesLoading, refresh: refreshAdminData } = useAdmin()
  const { containerVariant } = useLayout()
  
  // Debug: Log roles to help diagnose issues
  useEffect(() => {
    if (!rolesLoading && roles.length > 0) {
      console.log('User roles:', roles.map(r => ({ name: r.name, level: r.level, display_name: r.display_name })))
      console.log('Primary role (highest level):', roles.sort((a, b) => (b.level || 0) - (a.level || 0))[0]?.name)
    } else if (!rolesLoading && roles.length === 0) {
      console.warn('No roles found for user. User ID:', user?.id)
      console.warn('This might indicate the user needs roles assigned in /rbac/users')
    }
  }, [roles, rolesLoading, user?.id])
  
  // Get primary role (highest level role, or first if levels are equal)
  const userRole = roles.length > 0 
    ? roles.sort((a, b) => (b.level || 0) - (a.level || 0))[0].name 
    : null
  const [stats, setStats] = useState<DashboardStats>({
    totalContributions: 0,
    totalAmount: 0,
    activeCases: 0,
    completedCases: 0
  })
  const [loading, setLoading] = useState(true)
  const [refreshingRole, setRefreshingRole] = useState(false)

  const fetchDashboardStats = useCallback(async () => {
    try {
      setLoading(true)
      const supabase = createClient()
      const { data: { user: authUser } } = await supabase.auth.getUser()
      
      if (!authUser) return

      // Fetch dashboard statistics from API
      const response = await fetch('/api/dashboard/stats')
      
      if (!response.ok) {
        if (response.status === 401) {
          // User not authenticated, redirect to login
          return
        }
        throw new Error(`Failed to fetch dashboard stats: ${response.statusText}`)
      }

      const data = await response.json()
      
      if (data.stats) {
        setStats({
          totalContributions: data.stats.totalContributions || 0,
          totalAmount: data.stats.totalAmount || 0,
          activeCases: data.stats.activeCases || 0,
          completedCases: data.stats.completedCases || 0
        })
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDashboardStats()
  }, [fetchDashboardStats])

  const formatAmount = (amount: number) => {
    return `EGP ${amount.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    })}`
  }

  const refreshUserRole = async () => {
    try {
      setRefreshingRole(true)
      // Refresh admin data from the hook
      await refreshAdminData()
      console.log('Roles refreshed. Current roles:', roles.map(r => ({ name: r.name, level: r.level })))
    } catch (error) {
      console.error('Error refreshing role:', error)
    } finally {
      setRefreshingRole(false)
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'bg-gradient-to-r from-red-100 to-orange-100 text-red-900 border-red-300 font-semibold'
      case 'admin':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'moderator':
        return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'donor':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'sponsor':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'visitor':
        return 'bg-gray-100 text-gray-600 border-gray-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const quickActions = [
    {
      title: t('makeContribution'),
      description: 'Support a case with your contribution',
      icon: Heart,
      color: 'from-blue-500 to-indigo-600',
      hoverColor: 'from-blue-600 to-indigo-700',
      permission: 'contributions:create',
      action: () => router.push(`/${params.locale}/cases`)
    },
    {
      title: t('sponsorCase'),
      description: 'Become a sponsor for a case',
      icon: Target,
      color: 'from-green-500 to-emerald-600',
      hoverColor: 'from-green-600 to-emerald-700',
      permission: 'sponsorships:create',
      action: () => router.push(`/${params.locale}/sponsor/apply`)
    },
    {
      title: t('createCase'),
      description: 'Create a new case for support',
      icon: Plus,
      color: 'from-purple-500 to-violet-600',
      hoverColor: 'from-purple-600 to-violet-700',
      permission: 'cases:create',
      action: () => router.push(`/${params.locale}/cases/create`)
    },
    {
      title: t('adminPanel'),
      description: 'Access administrative tools',
      icon: Settings,
      color: 'from-red-500 to-rose-600',
      hoverColor: 'from-red-600 to-rose-700',
      permission: 'admin:dashboard',
      action: () => router.push(`/${params.locale}/admin`)
    }
  ]

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
        <Container variant={containerVariant} className="py-4 sm:py-6 lg:py-8">
          {/* Header */}
          <div className="mb-6 sm:mb-8">
            <div className="flex flex-col gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
                  {t('welcome')}
                </h1>
                <p className="text-base sm:text-lg text-gray-600 break-words">
                  Welcome back, {user?.email}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <Badge variant="outline" className={`${getRoleColor(userRole || '')} text-xs sm:text-sm`}>
                  <Shield className="h-3 w-3 mr-1" />
                  <span className="hidden min-[375px]:inline">{getRoleDisplayName(userRole || '')}</span>
                  <span className="min-[375px]:hidden">{getRoleDisplayName(userRole || '').split(' ')[0]}</span>
                </Badge>
                <Button
                  variant="outline"
                  onClick={refreshUserRole}
                  disabled={refreshingRole}
                  className="border-blue-200 text-blue-700 hover:bg-blue-50 px-2 sm:px-3"
                  title="Refresh role from database"
                >
                  <RefreshCw className={`h-3 w-3 sm:h-4 sm:w-4 ${refreshingRole ? 'animate-spin' : ''}`} />
                </Button>
                <Button
                  variant="outline"
                  onClick={signOut}
                  className="border-red-200 text-red-700 hover:bg-red-50 px-2 sm:px-3"
                  title={t('signOut')}
                >
                  <LogOut className="h-3 w-3 sm:h-4 sm:w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
            <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Total Contributions</p>
                    <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">
                      {loading ? '...' : stats.totalContributions}
                    </p>
                  </div>
                  <div className="p-2 sm:p-3 bg-blue-100 rounded-full flex-shrink-0 ml-2">
                    <Heart className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Total Amount</p>
                    <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">
                      {loading ? '...' : formatAmount(stats.totalAmount)}
                    </p>
                  </div>
                  <div className="p-2 sm:p-3 bg-green-100 rounded-full flex-shrink-0 ml-2">
                    <DollarSign className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Active Cases</p>
                    <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">
                      {loading ? '...' : stats.activeCases}
                    </p>
                  </div>
                  <div className="p-2 sm:p-3 bg-yellow-100 rounded-full flex-shrink-0 ml-2">
                    <Activity className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Completed Cases</p>
                    <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">
                      {loading ? '...' : stats.completedCases}
                    </p>
                  </div>
                  <div className="p-2 sm:p-3 bg-purple-100 rounded-full flex-shrink-0 ml-2">
                    <Target className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions - Dynamic Layout */}
          <QuickActionsSection 
            quickActions={quickActions}
            t={t}
          />

          {/* User Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
            {/* User Profile Card */}
            <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg font-semibold text-gray-800">
                  <User className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                  {t('userInfo')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-0 p-2 sm:p-3 bg-gray-50 rounded-lg">
                  <span className="text-xs sm:text-sm font-medium text-gray-600">Email</span>
                  <span className="text-xs sm:text-sm text-gray-900 font-mono break-all sm:break-normal sm:text-right">{user?.email}</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-0 p-2 sm:p-3 bg-gray-50 rounded-lg">
                  <span className="text-xs sm:text-sm font-medium text-gray-600">User ID</span>
                  <span className="text-xs text-gray-500 font-mono truncate max-w-full sm:max-w-32 text-right">
                    {user?.id}
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-0 p-2 sm:p-3 bg-gray-50 rounded-lg">
                  <span className="text-xs sm:text-sm font-medium text-gray-600">Role</span>
                  <Badge variant="outline" className={`${getRoleColor(userRole || '')} text-xs w-fit sm:w-auto`}>
                    {getRoleDisplayName(userRole || '')}
                  </Badge>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-0 p-2 sm:p-3 bg-gray-50 rounded-lg">
                  <span className="text-xs sm:text-sm font-medium text-gray-600">Last Sign In</span>
                  <span className="text-xs sm:text-sm text-gray-900 text-right">
                    {user?.last_sign_in_at 
                      ? new Date(user.last_sign_in_at).toLocaleDateString()
                      : t('unknown')
                    }
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Role Information */}
            <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg font-semibold text-gray-800">
                  <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
                  {t('roleInfo')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 sm:space-y-4">
                  <div className="p-3 sm:p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg border border-purple-100">
                    <h3 className="font-semibold text-sm sm:text-base text-purple-900 mb-1 sm:mb-2">
                      {getRoleDisplayName(userRole || '')}
                    </h3>
                    <p className="text-xs sm:text-sm text-purple-700">
                      {getRoleDescription(userRole || '')}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm sm:text-base text-gray-900">Permissions:</h4>
                    <div className="space-y-1">
                      <PermissionGuard permissions={["contributions:create"]}>
                        <div className="flex items-center gap-2 text-xs sm:text-sm text-green-600">
                          <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
                          <span>Create contributions</span>
                        </div>
                      </PermissionGuard>
                      <PermissionGuard permissions={["cases:create"]}>
                        <div className="flex items-center gap-2 text-xs sm:text-sm text-green-600">
                          <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
                          <span>Create cases</span>
                        </div>
                      </PermissionGuard>
                      <PermissionGuard permissions={["admin:dashboard"]}>
                        <div className="flex items-center gap-2 text-xs sm:text-sm text-green-600">
                          <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
                          <span>Admin access</span>
                        </div>
                      </PermissionGuard>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg md:col-span-2 lg:col-span-1">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg font-semibold text-gray-800">
                  <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 sm:space-y-3">
                  <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-blue-50 rounded-lg">
                    <div className="p-1.5 sm:p-2 bg-blue-100 rounded-full flex-shrink-0">
                      <Heart className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">Contribution made</p>
                      <p className="text-xs text-gray-500">2 hours ago</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-green-50 rounded-lg">
                    <div className="p-1.5 sm:p-2 bg-green-100 rounded-full flex-shrink-0">
                      <Target className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">Case sponsored</p>
                      <p className="text-xs text-gray-500">1 day ago</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-purple-50 rounded-lg">
                    <div className="p-1.5 sm:p-2 bg-purple-100 rounded-full flex-shrink-0">
                      <Eye className="h-3 w-3 sm:h-4 sm:w-4 text-purple-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">Profile updated</p>
                      <p className="text-xs text-gray-500">3 days ago</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Role-specific sections */}
          <div className="mt-6 sm:mt-8 space-y-4 sm:space-y-6">
            <PermissionGuard permissions={["contributions:read"]}>
              <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg font-semibold text-gray-800">
                    <Heart className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                    {t('myContributions')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ContributionHistory />
                </CardContent>
              </Card>
            </PermissionGuard>

            <PermissionGuard permissions={["sponsorships:read"]}>
              <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg font-semibold text-gray-800">
                    <Target className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                    {t('mySponsorships')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">{t('sponsorshipsPlaceholder')}</p>
                </CardContent>
              </Card>
            </PermissionGuard>

            <PermissionGuard permissions={["admin:analytics"]}>
              <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg font-semibold text-gray-800">
                    <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
                    {t('adminReports')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">{t('reportsPlaceholder')}</p>
                </CardContent>
              </Card>
            </PermissionGuard>
          </div>
        </Container>
      </div>
    </ProtectedRoute>
  )
} 