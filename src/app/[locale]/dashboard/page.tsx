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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  RefreshCw,
  Lock,
  History,
  CreditCard,
  CheckCircle2,
  XCircle,
  Edit,
  Bell
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { theme, brandColors } from '@/lib/theme'

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
          <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-meen" />
          {t('quickActions')}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2 sm:space-y-3">
          {visibleActions.map((action, index) => (
            <button
              key={index}
              onClick={action.action}
              style={{
                background: action.color,
                boxShadow: action.hoverColor ? 'none' : theme.shadows.primary
              }}
              className="group w-full flex items-center gap-2 sm:gap-4 p-3 sm:p-4 rounded-lg text-white transition-all duration-200 hover:shadow-lg hover:scale-[1.02]"
              onMouseEnter={(e) => {
                e.currentTarget.style.background = action.hoverColor || action.color
                e.currentTarget.style.boxShadow = theme.shadows.primary
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = action.color
                e.currentTarget.style.boxShadow = action.hoverColor ? 'none' : theme.shadows.primary
              }}
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
  const { roles, permissions, loading: rolesLoading, refresh: refreshAdminData } = useAdmin()
  const { containerVariant } = useLayout()
  
  // Removed debug console logs to reduce log noise
  
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
  const [recentTransactions, setRecentTransactions] = useState<Array<{
    id: string
    type: string
    title: string
    amount?: number
    status: string
    date: string
  }>>([])
  const [transactionsLoading, setTransactionsLoading] = useState(false)

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

  const fetchRecentTransactions = useCallback(async () => {
    try {
      setTransactionsLoading(true)
      const supabase = createClient()
      const { data: { user: authUser } } = await supabase.auth.getUser()
      
      if (!authUser) return

      // Fetch recent contributions
      const response = await fetch('/api/contributions?page=1&limit=5')
      
      if (response.ok) {
        const data = await response.json()
        const transactions = (data.contributions || []).map((c: any) => ({
          id: c.id,
          type: 'contribution',
          title: c.caseTitle || 'Contribution',
          amount: c.amount,
          status: c.status,
          date: c.createdAt || c.created_at
        }))
        setRecentTransactions(transactions)
      }
    } catch (error) {
      console.error('Error fetching recent transactions:', error)
    } finally {
      setTransactionsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRecentTransactions()
  }, [fetchRecentTransactions])

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
    } catch (error) {
      console.error('Error refreshing role:', error)
    } finally {
      setRefreshingRole(false)
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'bg-gradient-to-r from-ma3ana-100 to-ma3ana-200 text-ma3ana-900 border-ma3ana-300 font-semibold'
      case 'admin':
        return 'bg-ma3ana-100 text-ma3ana-800 border-ma3ana-200'
      case 'moderator':
        return 'bg-meen-100 text-meen-800 border-meen-200'
      case 'donor':
        return 'bg-meen-100 text-meen-800 border-meen-200'
      case 'sponsor':
        return 'bg-meen-100 text-meen-800 border-meen-200'
      case 'visitor':
        return 'bg-gray-100 text-gray-600 border-gray-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  // Use consistent color for all permissions
  const permissionColor = brandColors.meen[600]

  const quickActions = [
    {
      title: t('makeContribution'),
      description: 'Support a case with your contribution',
      icon: Heart,
      color: theme.gradients.primary,
      hoverColor: `linear-gradient(135deg, ${brandColors.meen[600]} 0%, ${brandColors.meen[700]} 100%)`,
      permission: 'contributions:create',
      action: () => router.push(`/${params.locale}/cases`)
    },
    {
      title: t('sponsorCase'),
      description: 'Become a sponsor for a case',
      icon: Target,
      color: theme.gradients.brand,
      hoverColor: `linear-gradient(135deg, ${brandColors.meen[600]} 0%, ${brandColors.ma3ana[600]} 100%)`,
      permission: 'sponsorships:create',
      action: () => router.push(`/${params.locale}/sponsor/apply`)
    },
    {
      title: t('createCase'),
      description: 'Create a new case for support',
      icon: Plus,
      color: theme.gradients.secondary,
      hoverColor: `linear-gradient(135deg, ${brandColors.ma3ana[600]} 0%, ${brandColors.ma3ana[700]} 100%)`,
      permission: 'cases:create',
      action: () => router.push(`/${params.locale}/case-management/create`)
    },
    {
      title: t('adminPanel'),
      description: 'Access administrative tools',
      icon: Settings,
      color: theme.gradients.brandReverse,
      hoverColor: `linear-gradient(135deg, ${brandColors.ma3ana[600]} 0%, ${brandColors.meen[600]} 100%)`,
      permission: 'admin:dashboard',
      action: () => router.push(`/${params.locale}/admin`)
    }
  ]

  return (
    <ProtectedRoute>
      <div className="min-h-screen" style={{ background: theme.gradients.brandSubtle }}>
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
                  className="border-meen-300 text-meen-700 hover:bg-meen-50 px-2 sm:px-3"
                  title="Refresh role from database"
                >
                  <RefreshCw className={`h-3 w-3 sm:h-4 sm:w-4 ${refreshingRole ? 'animate-spin' : ''}`} />
                </Button>
                <Button
                  variant="outline"
                  onClick={async () => {
                    await signOut()
                    router.push(`/${params.locale}/landing`)
                  }}
                  className="border-ma3ana-300 text-ma3ana-700 hover:bg-ma3ana-50 px-2 sm:px-3"
                  title={t('signOut')}
                >
                  <LogOut className="h-3 w-3 sm:h-4 sm:w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Tabbed Interface */}
          <Tabs defaultValue="overview" className="w-full">
            <TabsList variant="branded" className="w-full justify-start">
              <TabsTrigger value="overview" icon={BarChart3} tabIndex={0}>
                Overview
              </TabsTrigger>
              <TabsTrigger value="user-info" icon={User} tabIndex={1}>
                User Info
              </TabsTrigger>
              <TabsTrigger value="security" icon={Lock} tabIndex={0}>
                Security
              </TabsTrigger>
              <TabsTrigger value="history" icon={History} tabIndex={1}>
                History
              </TabsTrigger>
              <TabsTrigger value="settings" icon={Settings} tabIndex={0}>
                Settings
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              {/* Statistics Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
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
                        <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">
                          {loading ? '...' : formatAmount(stats.totalAmount)}
                        </p>
                      </div>
                      <div className="p-2 sm:p-3 rounded-full flex-shrink-0 ml-2" style={{ backgroundColor: brandColors.meen[100] }}>
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
              </div>

              {/* Quick Actions */}
              <QuickActionsSection 
                quickActions={quickActions}
                t={t}
              />

              {/* Recent Activity Summary */}
              <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg" style={{ boxShadow: theme.shadows.primary }}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg font-semibold text-gray-800">
                    <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-meen" />
                    Recent Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 sm:space-y-3">
                    <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg" style={{ backgroundColor: brandColors.ma3ana[50] }}>
                      <div className="p-1.5 sm:p-2 rounded-full flex-shrink-0" style={{ backgroundColor: brandColors.ma3ana[100] }}>
                        <Heart className="h-3 w-3 sm:h-4 sm:w-4" style={{ color: brandColors.ma3ana[600] }} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">Contribution made</p>
                        <p className="text-xs text-gray-500">2 hours ago</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg" style={{ background: theme.gradients.brandSubtle }}>
                      <div className="p-1.5 sm:p-2 rounded-full flex-shrink-0" style={{ backgroundColor: brandColors.meen[100] }}>
                        <Target className="h-3 w-3 sm:h-4 sm:w-4" style={{ color: brandColors.meen[600] }} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">Case sponsored</p>
                        <p className="text-xs text-gray-500">1 day ago</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg" style={{ backgroundColor: brandColors.meen[50] }}>
                      <div className="p-1.5 sm:p-2 rounded-full flex-shrink-0" style={{ backgroundColor: brandColors.meen[100] }}>
                        <Eye className="h-3 w-3 sm:h-4 sm:w-4" style={{ color: brandColors.meen[600] }} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">Profile updated</p>
                        <p className="text-xs text-gray-500">3 days ago</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* User Info Tab */}
            <TabsContent value="user-info" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                {/* User Profile Card */}
                <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg" style={{ boxShadow: theme.shadows.primary }}>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base sm:text-lg font-semibold text-gray-800">
                      <User className="h-4 w-4 sm:h-5 sm:w-5 text-meen" />
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
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-0 p-2 sm:p-3 bg-gray-50 rounded-lg">
                      <span className="text-xs sm:text-sm font-medium text-gray-600">Account Created</span>
                      <span className="text-xs sm:text-sm text-gray-900 text-right">
                        {user?.created_at 
                          ? new Date(user.created_at).toLocaleDateString()
                          : t('unknown')
                        }
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => router.push(`/${params.locale}/profile/edit`)}
                      className="w-full border-meen-300 text-meen-700 hover:bg-meen-50"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Profile
                    </Button>
                  </CardContent>
                </Card>

                {/* Role Information */}
                <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg" style={{ boxShadow: theme.shadows.primary }}>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base sm:text-lg font-semibold text-gray-800">
                      <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-ma3ana" />
                      {t('roleInfo')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 sm:space-y-4">
                      <div className="p-3 sm:p-4 rounded-lg border" style={{ background: theme.gradients.brandSubtle, borderColor: brandColors.meen[200] }}>
                        <h3 className="font-semibold text-sm sm:text-base mb-1 sm:mb-2" style={{ color: brandColors.meen[900] }}>
                          {getRoleDisplayName(userRole || '')}
                        </h3>
                        <p className="text-xs sm:text-sm" style={{ color: brandColors.meen[700] }}>
                          {getRoleDescription(userRole || '')}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm sm:text-base text-gray-900">
                          Permissions ({permissions.length}):
                        </h4>
                        {permissions.length > 0 ? (
                          <div className="space-y-1 max-h-48 overflow-y-auto">
                            {permissions.map((permission) => {
                              const displayName = permission.display_name || permission.name || 'Unknown Permission'
                              
                              return (
                                <div 
                                  key={permission.id} 
                                  className="flex items-center gap-2 text-xs sm:text-sm"
                                  style={{ color: permissionColor }}
                                >
                                  <div 
                                    className="w-2 h-2 rounded-full flex-shrink-0" 
                                    style={{ backgroundColor: permissionColor }}
                                  ></div>
                                  <span className="truncate">{displayName}</span>
                                </div>
                              )
                            })}
                          </div>
                        ) : (
                          <div className="text-xs sm:text-sm text-gray-500 italic">
                            No permissions assigned
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Security Tab */}
            <TabsContent value="security" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                {/* Password Management */}
                <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg" style={{ boxShadow: theme.shadows.primary }}>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base sm:text-lg font-semibold text-gray-800">
                      <Lock className="h-4 w-4 sm:h-5 sm:w-5 text-meen" />
                      Password Security
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-3 bg-meen-50 rounded-lg border border-meen-200">
                      <p className="text-sm text-meen-800 mb-2">
                        <strong>Password Requirements:</strong>
                      </p>
                      <ul className="text-xs text-meen-700 space-y-1 list-disc list-inside">
                        <li>Minimum 8 characters</li>
                        <li>At least one uppercase letter</li>
                        <li>At least one lowercase letter</li>
                        <li>At least one number</li>
                        <li>At least one special character</li>
                      </ul>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => router.push(`/${params.locale}/auth/forgot-password`)}
                      className="w-full border-meen-300 text-meen-700 hover:bg-meen-50"
                    >
                      <Lock className="h-4 w-4 mr-2" />
                      Change Password
                    </Button>
                  </CardContent>
                </Card>

                {/* Session Management */}
                <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg" style={{ boxShadow: theme.shadows.primary }}>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base sm:text-lg font-semibold text-gray-800">
                      <Activity className="h-4 w-4 sm:h-5 sm:w-5 text-ma3ana" />
                      Active Sessions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium text-gray-900">Current Session</p>
                        <Badge variant="outline" className="bg-meen-100 text-meen-800 border-meen-200">
                          Active
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-600">Device: {typeof window !== 'undefined' ? navigator.userAgent.split(' ')[0] : 'Unknown'}</p>
                      <p className="text-xs text-gray-600">Last activity: Just now</p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={async () => {
                        await signOut()
                        router.push(`/${params.locale}/landing`)
                      }}
                      className="w-full border-ma3ana-300 text-ma3ana-700 hover:bg-ma3ana-50"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Sign Out All Sessions
                    </Button>
                  </CardContent>
                </Card>

                {/* Security Settings */}
                <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg md:col-span-2" style={{ boxShadow: theme.shadows.primary }}>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base sm:text-lg font-semibold text-gray-800">
                      <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-ma3ana" />
                      Security Settings
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-medium text-gray-900">Email Verified</p>
                          {user?.email_confirmed_at ? (
                            <CheckCircle2 className="h-5 w-5 text-meen" />
                          ) : (
                            <XCircle className="h-5 w-5 text-ma3ana" />
                          )}
                        </div>
                        <p className="text-xs text-gray-600">
                          {user?.email_confirmed_at 
                            ? 'Your email has been verified'
                            : 'Please verify your email address'
                          }
                        </p>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-medium text-gray-900">Two-Factor Authentication</p>
                          <Badge variant="outline" className="bg-gray-100 text-gray-600 border-gray-200">
                            Not Enabled
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-600">Add an extra layer of security</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* History/Transactions Tab */}
            <TabsContent value="history" className="space-y-6">
              <PermissionGuard permissions={["contributions:read"]}>
                <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg" style={{ boxShadow: theme.shadows.primary }}>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base sm:text-lg font-semibold text-gray-800">
                      <CreditCard className="h-4 w-4 sm:h-5 sm:w-5 text-ma3ana" />
                      {t('myContributions')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ContributionHistory />
                  </CardContent>
                </Card>
              </PermissionGuard>

              <PermissionGuard permissions={["sponsorships:read"]}>
                <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg" style={{ boxShadow: theme.shadows.primary }}>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base sm:text-lg font-semibold text-gray-800">
                      <Target className="h-4 w-4 sm:h-5 sm:w-5 text-meen" />
                      {t('mySponsorships')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600">{t('sponsorshipsPlaceholder')}</p>
                  </CardContent>
                </Card>
              </PermissionGuard>

              {/* Activity History */}
              <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg" style={{ boxShadow: theme.shadows.primary }}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg font-semibold text-gray-800">
                    <History className="h-4 w-4 sm:h-5 sm:w-5 text-meen" />
                    Recent Transactions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {transactionsLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto" style={{ borderColor: brandColors.meen[600] }}></div>
                      <p className="text-gray-600 mt-2 text-sm">Loading transactions...</p>
                    </div>
                  ) : recentTransactions.length > 0 ? (
                    <div className="space-y-3">
                      {recentTransactions.map((transaction) => {
                        const getStatusBadge = (status: string) => {
                          switch (status) {
                            case 'approved':
                              return <Badge variant="outline" className="bg-meen-100 text-meen-800 border-meen-200">Approved</Badge>
                            case 'pending':
                              return <Badge variant="outline" className="bg-ma3ana-100 text-ma3ana-800 border-ma3ana-200">Pending</Badge>
                            case 'rejected':
                              return <Badge variant="outline" className="bg-ma3ana-100 text-ma3ana-800 border-ma3ana-200">Rejected</Badge>
                            default:
                              return <Badge variant="outline" className="bg-gray-100 text-gray-600 border-gray-200">{status}</Badge>
                          }
                        }

                        const getTimeAgo = (dateString: string) => {
                          const date = new Date(dateString)
                          const now = new Date()
                          const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
                          if (diffInHours < 1) return 'Just now'
                          if (diffInHours < 24) return `${diffInHours} hours ago`
                          const diffInDays = Math.floor(diffInHours / 24)
                          if (diffInDays < 7) return `${diffInDays} days ago`
                          return date.toLocaleDateString()
                        }

                        return (
                          <div 
                            key={transaction.id} 
                            className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                            onClick={() => router.push(`/${params.locale}/contributions/${transaction.id}`)}
                          >
                            <div className="p-2 rounded-full" style={{ backgroundColor: brandColors.ma3ana[100] }}>
                              <Heart className="h-4 w-4" style={{ color: brandColors.ma3ana[600] }} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{transaction.title}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <p className="text-xs text-gray-500">{getTimeAgo(transaction.date)}</p>
                                {transaction.amount && (
                                  <>
                                    <span className="text-xs text-gray-400">•</span>
                                    <p className="text-xs font-medium text-meen">{formatAmount(transaction.amount)}</p>
                                  </>
                                )}
                              </div>
                            </div>
                            {getStatusBadge(transaction.status)}
                          </div>
                        )
                      })}
                      <Button
                        variant="outline"
                        onClick={() => router.push(`/${params.locale}/contributions`)}
                        className="w-full border-meen-300 text-meen-700 hover:bg-meen-50 mt-4"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View All Transactions
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <History className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 mb-2">No transactions yet</p>
                      <p className="text-sm text-gray-500">Your transaction history will appear here</p>
                      <Button
                        variant="outline"
                        onClick={() => router.push(`/${params.locale}/cases`)}
                        className="mt-4 border-meen-300 text-meen-700 hover:bg-meen-50"
                      >
                        <Heart className="h-4 w-4 mr-2" />
                        Make Your First Contribution
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                {/* Notification Settings */}
                <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg" style={{ boxShadow: theme.shadows.primary }}>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base sm:text-lg font-semibold text-gray-800">
                      <Bell className="h-4 w-4 sm:h-5 sm:w-5 text-meen" />
                      Notifications
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="text-sm font-medium text-gray-900">Email Notifications</p>
                          <p className="text-xs text-gray-600">Receive updates via email</p>
                        </div>
                        <Badge variant="outline" className="bg-meen-100 text-meen-800 border-meen-200">
                          Enabled
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="text-sm font-medium text-gray-900">Contribution Updates</p>
                          <p className="text-xs text-gray-600">Get notified about your contributions</p>
                        </div>
                        <Badge variant="outline" className="bg-meen-100 text-meen-800 border-meen-200">
                          Enabled
                        </Badge>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => router.push(`/${params.locale}/notifications`)}
                      className="w-full border-meen-300 text-meen-700 hover:bg-meen-50"
                    >
                      <Bell className="h-4 w-4 mr-2" />
                      Manage Notifications
                    </Button>
                  </CardContent>
                </Card>

                {/* Preferences */}
                <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg" style={{ boxShadow: theme.shadows.primary }}>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base sm:text-lg font-semibold text-gray-800">
                      <Settings className="h-4 w-4 sm:h-5 sm:w-5 text-ma3ana" />
                      Preferences
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="text-sm font-medium text-gray-900">Language</p>
                          <p className="text-xs text-gray-600">Interface language</p>
                        </div>
                        <Badge variant="outline" className="bg-gray-100 text-gray-600 border-gray-200">
                          {params.locale?.toString().toUpperCase() || 'EN'}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="text-sm font-medium text-gray-900">Theme</p>
                          <p className="text-xs text-gray-600">Display preferences</p>
                        </div>
                        <Badge variant="outline" className="bg-gray-100 text-gray-600 border-gray-200">
                          Light
                        </Badge>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => router.push(`/${params.locale}/profile/edit`)}
                      className="w-full border-ma3ana-300 text-ma3ana-700 hover:bg-ma3ana-50"
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Edit Preferences
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* Admin Reports (if admin) */}
              <PermissionGuard permissions={["admin:analytics"]}>
                <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg" style={{ boxShadow: theme.shadows.secondary }}>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base sm:text-lg font-semibold text-gray-800">
                      <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-ma3ana" />
                      {t('adminReports')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 mb-4">{t('reportsPlaceholder')}</p>
                    <Button
                      variant="outline"
                      onClick={() => router.push(`/${params.locale}/case-management/analytics`)}
                      className="border-ma3ana-300 text-ma3ana-700 hover:bg-ma3ana-50"
                    >
                      <BarChart3 className="h-4 w-4 mr-2" />
                      View Analytics
                    </Button>
                  </CardContent>
                </Card>
              </PermissionGuard>
            </TabsContent>
          </Tabs>
        </Container>
      </div>
    </ProtectedRoute>
  )
} 