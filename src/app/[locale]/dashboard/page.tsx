'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter, useParams } from 'next/navigation'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { useAuth } from '@/components/auth/AuthProvider'
import { usePermissions } from '@/lib/hooks/usePermissions'
import PermissionGuard from '@/components/auth/PermissionGuard'
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
  Users,
  Activity,
  ArrowRight,
  Plus,
  Eye,
  RefreshCw,
  Info
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useSimpleRBAC } from '@/lib/hooks/useSimpleRBAC'

// Dynamic Quick Actions Component
interface QuickActionsSectionProps {
  quickActions: Array<{
    title: string
    description: string
    icon: any
    color: string
    hoverColor: string
    permission: string
    action: () => void
  }>
  t: (key: string) => string
}

function QuickActionsSection({ quickActions, t }: QuickActionsSectionProps) {
  const { hasPermission } = useSimpleRBAC()
  
  // Filter actions based on permissions
  const visibleActions = quickActions.filter(action => 
    hasPermission(action.permission)
  )
  
  // Don't render the section if no actions are visible
  if (visibleActions.length === 0) {
    return null
  }
  
  return (
    <Card className="mb-6 bg-white/90 backdrop-blur-sm border-0 shadow-lg">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-800">
          <TrendingUp className="h-4 w-4 text-blue-600" />
          {t('quickActions')}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          {visibleActions.map((action, index) => (
            <button
              key={index}
              onClick={action.action}
              className={`group w-full flex items-center gap-4 p-4 rounded-lg bg-gradient-to-r ${action.color} hover:${action.hoverColor} text-white transition-all duration-200 hover:shadow-md`}
            >
              <div className="flex-shrink-0">
                <action.icon className="h-5 w-5" />
              </div>
              <div className="flex-1 text-left">
                <h3 className="font-medium text-base mb-1">{action.title}</h3>
                <p className="text-sm opacity-90 leading-tight">{action.description}</p>
              </div>
              <div className="flex-shrink-0">
                <ArrowRight className="h-4 w-4 opacity-60 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
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

const getRoleDescription = (role: string) => {
  switch (role) {
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
  const { userRole } = usePermissions()
  const [stats, setStats] = useState<DashboardStats>({
    totalContributions: 0,
    totalAmount: 0,
    activeCases: 0,
    completedCases: 0
  })
  const [loading, setLoading] = useState(true)
  const [refreshingRole, setRefreshingRole] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    fetchDashboardStats()
  }, [])

  const fetchDashboardStats = async () => {
    try {
      setLoading(true)
      const { data: { user: authUser } } = await supabase.auth.getUser()
      
      if (!authUser) return

      // Fetch user's contributions
      const { data: contributions } = await supabase
        .from('contributions')
        .select('amount, status')
        .eq('donor_id', authUser.id)

      // Fetch cases (for admin users)
      const { data: cases } = await supabase
        .from('cases')
        .select('status')
        .eq('created_by', authUser.id)

      if (contributions) {
        const totalContributions = contributions.length
        const totalAmount = contributions.reduce((sum, c) => sum + (c.amount || 0), 0)
        const activeCases = cases?.filter(c => c.status === 'active').length || 0
        const completedCases = cases?.filter(c => c.status === 'completed').length || 0

        setStats({
          totalContributions,
          totalAmount,
          activeCases,
          completedCases
        })
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatAmount = (amount: number) => {
    return `EGP ${amount.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    })}`
  }

  const refreshUserRole = async () => {
    try {
      setRefreshingRole(true)
      
      const response = await fetch('/api/refresh-role', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (data.success) {
        console.log('Role refreshed successfully:', data.role)
        // Force a page refresh to update the UI
        window.location.reload()
      } else {
        console.error('Failed to refresh role:', data.message)
      }
    } catch (error) {
      console.error('Error refreshing role:', error)
    } finally {
      setRefreshingRole(false)
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'moderator':
        return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'donor':
        return 'bg-blue-100 text-blue-800 border-blue-200'
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
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-4xl font-bold text-gray-900 mb-2">
                  {t('welcome')}
                </h1>
                <p className="text-lg text-gray-600">
                  Welcome back, {user?.email}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className={getRoleColor(userRole)}>
                  <Shield className="h-3 w-3 mr-1" />
                  {getRoleDisplayName(userRole)}
                </Badge>
                <Button
                  variant="outline"
                  onClick={refreshUserRole}
                  disabled={refreshingRole}
                  className="border-blue-200 text-blue-700 hover:bg-blue-50"
                  title="Refresh role from database"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${refreshingRole ? 'animate-spin' : ''}`} />
                  {refreshingRole ? 'Refreshing...' : 'Refresh Role'}
                </Button>
                <Button
                  variant="outline"
                  onClick={signOut}
                  className="border-red-200 text-red-700 hover:bg-red-50"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  {t('signOut')}
                </Button>
              </div>
            </div>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Contributions</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {loading ? '...' : stats.totalContributions}
                    </p>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-full">
                    <Heart className="h-6 w-6 text-blue-600" />
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
                  <div className="p-3 bg-green-100 rounded-full">
                    <DollarSign className="h-6 w-6 text-green-600" />
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
          </div>

          {/* Quick Actions - Dynamic Layout */}
          <QuickActionsSection 
            quickActions={quickActions}
            t={t}
          />

          {/* User Information */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* User Profile Card */}
            <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-800">
                  <User className="h-5 w-5 text-blue-600" />
                  {t('userInfo')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-600">Email</span>
                  <span className="text-sm text-gray-900 font-mono">{user?.email}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-600">User ID</span>
                  <span className="text-xs text-gray-500 font-mono truncate max-w-32">
                    {user?.id}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-600">Role</span>
                  <Badge variant="outline" className={getRoleColor(userRole)}>
                    {getRoleDisplayName(userRole)}
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-600">Last Sign In</span>
                  <span className="text-sm text-gray-900">
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
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-800">
                  <Shield className="h-5 w-5 text-purple-600" />
                  {t('roleInfo')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg border border-purple-100">
                    <h3 className="font-semibold text-purple-900 mb-2">
                      {getRoleDisplayName(userRole)}
                    </h3>
                    <p className="text-sm text-purple-700">
                      {getRoleDescription(userRole)}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium text-gray-900">Permissions:</h4>
                    <div className="space-y-1">
                      <PermissionGuard allowedPermissions={["contributions:create"]}>
                        <div className="flex items-center gap-2 text-sm text-green-600">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          Create contributions
                        </div>
                      </PermissionGuard>
                      <PermissionGuard allowedPermissions={["cases:create"]}>
                        <div className="flex items-center gap-2 text-sm text-green-600">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          Create cases
                        </div>
                      </PermissionGuard>
                      <PermissionGuard allowedPermissions={["admin:dashboard"]}>
                        <div className="flex items-center gap-2 text-sm text-green-600">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          Admin access
                        </div>
                      </PermissionGuard>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-800">
                  <Calendar className="h-5 w-5 text-green-600" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                    <div className="p-2 bg-blue-100 rounded-full">
                      <Heart className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Contribution made</p>
                      <p className="text-xs text-gray-500">2 hours ago</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                    <div className="p-2 bg-green-100 rounded-full">
                      <Target className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Case sponsored</p>
                      <p className="text-xs text-gray-500">1 day ago</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
                    <div className="p-2 bg-purple-100 rounded-full">
                      <Eye className="h-4 w-4 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Profile updated</p>
                      <p className="text-xs text-gray-500">3 days ago</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Role-specific sections */}
          <div className="mt-8 space-y-6">
            <PermissionGuard allowedPermissions={["contributions:read"]}>
              <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-800">
                    <Heart className="h-5 w-5 text-blue-600" />
                    {t('myContributions')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ContributionHistory />
                </CardContent>
              </Card>
            </PermissionGuard>

            <PermissionGuard allowedPermissions={["sponsorships:read"]}>
              <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-800">
                    <Target className="h-5 w-5 text-green-600" />
                    {t('mySponsorships')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">{t('sponsorshipsPlaceholder')}</p>
                </CardContent>
              </Card>
            </PermissionGuard>

            <PermissionGuard allowedPermissions={["admin:analytics"]}>
              <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-800">
                    <BarChart3 className="h-5 w-5 text-purple-600" />
                    {t('adminReports')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">{t('reportsPlaceholder')}</p>
                </CardContent>
              </Card>
            </PermissionGuard>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
} 