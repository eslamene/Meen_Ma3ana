'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter, useParams } from 'next/navigation'
import type { LucideIcon } from 'lucide-react'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import PermissionGuard from '@/components/auth/PermissionGuard'
import Container from '@/components/layout/Container'
import { useLayout } from '@/components/layout/LayoutProvider'
import { useAdmin } from '@/lib/admin/hooks'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
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
  LayoutDashboard,
  RefreshCw,
  Loader2,
} from 'lucide-react'

import { defaultLogger as logger } from '@/lib/logger'

interface StatCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  iconWrapClassName: string
  iconClassName: string
  loading: boolean
}

function StatCard({ title, value, icon: Icon, iconWrapClassName, iconClassName, loading }: StatCardProps) {
  return (
    <Card className="border-border/80 shadow-sm transition-shadow hover:shadow-md">
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-xs font-medium text-muted-foreground sm:text-sm">{title}</p>
            {loading ? (
              <Skeleton className="h-8 w-16 sm:h-9 sm:w-24" />
            ) : (
              <p className="truncate text-xl font-bold tabular-nums text-foreground sm:text-2xl">{value}</p>
            )}
          </div>
          <div
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-full sm:h-11 sm:w-11',
              iconWrapClassName
            )}
          >
            <Icon className={cn('h-5 w-5 sm:h-6 sm:w-6', iconClassName)} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

interface AdminQuickActionsSectionProps {
  router: ReturnType<typeof useRouter>
  params: { locale?: string }
}

function AdminQuickActionsSection({ router, params }: AdminQuickActionsSectionProps) {
  const { hasPermission } = useAdmin()
  const locale = params.locale ?? 'en'

  const allActions = [
    {
      id: 'manage-cases',
      title: 'Manage Cases',
      description: 'Create, edit, and monitor donation cases',
      icon: Target,
      permission: 'cases:update',
      action: () => router.push(`/${locale}/case-management/cases`),
      buttonText: 'View Cases',
      className:
        'bg-gradient-to-br from-[var(--meen-600)] to-[var(--meen-800)] hover:from-[var(--meen-700)] hover:to-[var(--meen-900)]',
    },
    {
      id: 'review-contributions',
      title: 'Review Contributions',
      description: 'Approve, reject, and manage donations',
      icon: Heart,
      permission: 'contributions:approve',
      action: () => router.push(`/${locale}/case-management/contributions`),
      buttonText: 'View Contributions',
      className:
        'bg-gradient-to-br from-[var(--meen-500)] to-[var(--ma3ana-600)] hover:from-[var(--meen-600)] hover:to-[var(--ma3ana-700)]',
    },
    {
      id: 'view-analytics',
      title: 'View Analytics',
      description: 'Track performance and insights',
      icon: BarChart3,
      permission: 'admin:analytics',
      action: () => router.push(`/${locale}/case-management/analytics`),
      buttonText: 'View Reports',
      className:
        'bg-gradient-to-br from-[var(--ma3ana-500)] to-[var(--ma3ana-700)] hover:from-[var(--ma3ana-600)] hover:to-[var(--ma3ana-800)]',
    },
    {
      id: 'manage-sponsorships',
      title: 'Manage Sponsorships',
      description: 'Handle sponsorship requests and approvals',
      icon: UserCheck,
      permission: 'admin:dashboard',
      action: () => router.push(`/${locale}/case-management/sponsorships`),
      buttonText: 'View Sponsorships',
      className:
        'bg-gradient-to-br from-[var(--ma3ana-600)] to-[var(--meen-700)] hover:from-[var(--ma3ana-700)] hover:to-[var(--meen-800)]',
    },
  ]

  const visibleActions = allActions.filter((action) => hasPermission(action.permission))

  if (visibleActions.length === 0) return null

  return (
    <Card className="border-border/80 shadow-sm">
      <CardHeader className="space-y-1 px-4 pb-2 pt-4 sm:px-6 sm:pt-6">
        <CardTitle className="flex items-center gap-2 text-base font-semibold sm:text-lg">
          <Settings className="h-4 w-4 text-meen" />
          Quick Actions
        </CardTitle>
        <CardDescription>Jump to common admin workflows</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 px-4 pb-4 sm:px-6 sm:pb-6">
        {visibleActions.map((action) => (
          <Button
            key={action.id}
            type="button"
            variant="secondary"
            className={cn(
              'group h-auto w-full justify-start gap-3 border-0 p-3 text-left text-white shadow-sm sm:gap-4 sm:p-4',
              'transition-transform hover:scale-[1.01] hover:shadow-md active:scale-[0.99]',
              action.className
            )}
            onClick={action.action}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-white/20 sm:h-10 sm:w-10">
              <action.icon className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div className="min-w-0 flex-1 text-left">
              <div className="font-medium leading-tight">{action.title}</div>
              <p className="line-clamp-2 text-xs opacity-90 sm:text-sm">{action.description}</p>
            </div>
            <span className="hidden shrink-0 items-center gap-2 sm:flex">
              <span className="text-sm font-medium">{action.buttonText}</span>
              <ArrowRight className="h-4 w-4 opacity-70 transition-transform group-hover:translate-x-1" />
            </span>
          </Button>
        ))}
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
  const locale = (params.locale as string) ?? 'en'

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
    recentActivity: [],
  })
  const [loading, setLoading] = useState(true)

  const fetchSystemStats = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/dashboard')

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          logger.error('Unauthorized or forbidden access to admin dashboard')
          return
        }
        throw new Error(`Failed to fetch system stats: ${response.statusText}`)
      }

      const responseData = await response.json()
      const data = responseData.data || responseData
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
        recentActivity: data.recentActivity || [],
      })
    } catch (error) {
      logger.error('Error fetching system stats:', { error: error })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSystemStats()
  }, [fetchSystemStats])

  const formatAmount = (amount: number) =>
    `EGP ${amount.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

  const statusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
            <CheckCircle className="mr-1 h-3 w-3" />
            Approved
          </Badge>
        )
      case 'rejected':
        return (
          <Badge variant="outline" className="border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
            <XCircle className="mr-1 h-3 w-3" />
            Rejected
          </Badge>
        )
      case 'pending':
        return (
          <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
            <Clock className="mr-1 h-3 w-3" />
            Pending
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="text-muted-foreground">
            {status}
          </Badge>
        )
    }
  }

  return (
    <ProtectedRoute>
      <PermissionGuard permission="admin:dashboard">
        <div className="min-h-screen bg-gradient-to-b from-muted/50 via-background to-background">
          <Container variant={containerVariant} className="py-4 sm:py-6 lg:py-8">
            <Card className="mb-6 border-border/80 shadow-sm sm:mb-8">
              <CardHeader className="flex flex-col gap-4 space-y-0 pb-4 sm:flex-row sm:items-start sm:justify-between sm:pb-6">
                <div className="flex gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-md sm:h-14 sm:w-14">
                    <LayoutDashboard className="h-6 w-6 sm:h-7 sm:w-7" />
                  </div>
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <CardTitle className="text-2xl font-bold tracking-tight sm:text-3xl">
                        {t('title') || 'System Administration'}
                      </CardTitle>
                      <Badge variant="secondary" className="gap-1 font-semibold">
                        <Shield className="h-3 w-3" />
                        {userRoleDisplayName}
                      </Badge>
                    </div>
                    <CardDescription className="text-base">
                      Welcome back. Here&apos;s your system overview.
                    </CardDescription>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0 gap-2"
                  disabled={loading}
                  onClick={() => fetchSystemStats()}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  Refresh
                </Button>
              </CardHeader>
            </Card>

            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4 sm:mb-8">
              <StatCard
                title="Total Users"
                value={stats.totalUsers}
                icon={Users}
                loading={loading}
                iconWrapClassName="bg-[var(--meen-100)]"
                iconClassName="text-[var(--meen-700)]"
              />
              <StatCard
                title="Total Contributions"
                value={stats.totalContributions}
                icon={Heart}
                loading={loading}
                iconWrapClassName="bg-[var(--ma3ana-100)]"
                iconClassName="text-[var(--ma3ana-700)]"
              />
              <StatCard
                title="Total Amount"
                value={formatAmount(stats.totalAmount)}
                icon={DollarSign}
                loading={loading}
                iconWrapClassName="bg-muted"
                iconClassName="text-[var(--meen-700)]"
              />
              <StatCard
                title="Active Cases"
                value={stats.activeCases}
                icon={Activity}
                loading={loading}
                iconWrapClassName="bg-muted"
                iconClassName="text-[var(--meen-700)]"
              />
            </div>

            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4 sm:mb-8">
              <StatCard
                title="Completed Cases"
                value={stats.completedCases}
                icon={Target}
                loading={loading}
                iconWrapClassName="bg-[var(--ma3ana-100)]"
                iconClassName="text-[var(--ma3ana-700)]"
              />
              <StatCard
                title="Pending Reviews"
                value={stats.pendingContributions}
                icon={Clock}
                loading={loading}
                iconWrapClassName="bg-[var(--ma3ana-100)]"
                iconClassName="text-[var(--ma3ana-700)]"
              />
              <StatCard
                title="Approved"
                value={stats.approvedContributions}
                icon={CheckCircle}
                loading={loading}
                iconWrapClassName="bg-[var(--meen-100)]"
                iconClassName="text-[var(--meen-700)]"
              />
              <StatCard
                title="Rejected"
                value={stats.rejectedContributions}
                icon={XCircle}
                loading={loading}
                iconWrapClassName="bg-[var(--ma3ana-100)]"
                iconClassName="text-[var(--ma3ana-700)]"
              />
            </div>

            <div className="space-y-6 sm:space-y-8">
              <AdminQuickActionsSection router={router} params={{ locale }} />

              <Card className="border-border/80 shadow-sm">
                <CardHeader className="px-4 pb-2 pt-4 sm:px-6 sm:pt-6">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <Activity className="h-4 w-4 text-meen sm:h-5 sm:w-5" />
                    Recent Activity
                  </CardTitle>
                  <CardDescription>Latest contributions and statuses</CardDescription>
                </CardHeader>
                <CardContent className="px-4 pb-4 sm:px-6 sm:pb-6">
                  {loading ? (
                    <div className="flex flex-col items-center justify-center gap-2 py-10">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">Loading recent activity…</p>
                    </div>
                  ) : stats.recentActivity.length > 0 ? (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent">
                            <TableHead className="w-[40%]">Contribution</TableHead>
                            <TableHead className="hidden sm:table-cell">Date</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {stats.recentActivity.map((activity) => (
                            <TableRow key={activity.id}>
                              <TableCell className="font-medium">
                                <div className="flex items-center gap-2">
                                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--ma3ana-100)]">
                                    <Heart className="h-3.5 w-3.5 text-[var(--ma3ana-600)]" />
                                  </div>
                                  <span className="truncate">{formatAmount(activity.amount)}</span>
                                </div>
                                <p className="mt-1 text-xs text-muted-foreground sm:hidden">{formatDate(activity.date)}</p>
                              </TableCell>
                              <TableCell className="hidden text-muted-foreground sm:table-cell">
                                {formatDate(activity.date)}
                              </TableCell>
                              <TableCell>{statusBadge(activity.status)}</TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="gap-1"
                                  onClick={() =>
                                    router.push(
                                      `/${locale}/case-management/contributions?contribution=${activity.id}`
                                    )
                                  }
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                  <span className="hidden sm:inline">View</span>
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-muted/30 py-12 text-center">
                      <Activity className="mb-3 h-10 w-10 text-muted-foreground sm:h-12 sm:w-12" />
                      <p className="text-sm font-medium text-foreground">No recent activity</p>
                      <p className="mt-1 max-w-sm text-xs text-muted-foreground sm:text-sm">
                        New contributions will appear here once donors start giving.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

          </Container>
        </div>
      </PermissionGuard>
    </ProtectedRoute>
  )
}
