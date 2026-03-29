'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter, useParams } from 'next/navigation'
import type { LucideIcon } from 'lucide-react'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import PermissionGuard from '@/components/auth/PermissionGuard'
import Container from '@/components/layout/Container'
import { useLayout } from '@/components/layout/LayoutProvider'
import { useAdmin } from '@/lib/admin/hooks'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import { cn } from '@/lib/utils'
import {
  Target,
  Heart,
  BarChart3,
  UserCheck,
  Users,
  Upload,
  Plus,
  LayoutDashboard,
  Shield,
  ArrowRight,
  ExternalLink,
  Activity,
  CheckCircle,
  Clock,
  XCircle,
  Eye,
  Loader2,
  RefreshCw,
  DollarSign,
} from 'lucide-react'
import { defaultLogger as logger } from '@/lib/logger'

interface HubLink {
  id: string
  title: string
  description: string
  icon: LucideIcon
  href: string
  permission: string
}

interface DashboardStats {
  totalContributions: number
  totalAmount: number
  activeCases: number
  pendingContributions: number
  recentActivity: Array<{
    id: string
    type: string
    status: string
    amount: number
    date: string
  }>
}

interface StatCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  loading: boolean
}

function StatCard({ title, value, icon: Icon, loading }: StatCardProps) {
  return (
    <Card className="border-border/80 shadow-sm transition-shadow hover:shadow-md">
      <CardContent className="flex items-center justify-between gap-3 p-4 sm:p-5">
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-xs font-medium text-muted-foreground">{title}</p>
          {loading ? (
            <Skeleton className="h-7 w-20 sm:h-8 sm:w-24" />
          ) : (
            <p className="truncate text-lg font-bold tabular-nums text-foreground sm:text-xl">{value}</p>
          )}
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted sm:h-11 sm:w-11">
          <Icon className="h-5 w-5 text-foreground sm:h-6 sm:w-6" />
        </div>
      </CardContent>
    </Card>
  )
}

export default function CaseManagementOverviewPage() {
  const tNav = useTranslations('navigation')
  const tCases = useTranslations('cases')
  const tCommon = useTranslations('common')
  const tReports = useTranslations('admin.reports')
  const tContrib = useTranslations('admin.contributions')
  const tBenef = useTranslations('beneficiaries')
  const tAdminStorage = useTranslations('admin.storage')
  const router = useRouter()
  const params = useParams()
  const { roles, hasPermission } = useAdmin()
  const { containerVariant } = useLayout()

  const locale = (params.locale as string) ?? 'en'
  const primaryRole = roles.length > 0 ? roles[0] : null
  const userRoleDisplayName = primaryRole?.display_name || 'User'

  const [stats, setStats] = useState<DashboardStats>({
    totalContributions: 0,
    totalAmount: 0,
    activeCases: 0,
    pendingContributions: 0,
    recentActivity: [],
  })
  const [loading, setLoading] = useState(true)

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/dashboard')
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          logger.error('Unauthorized or forbidden access to admin dashboard')
          return
        }
        throw new Error(`Failed to fetch dashboard: ${response.statusText}`)
      }
      const responseData = await response.json()
      const data = responseData.data || responseData
      setStats({
        totalContributions: data.totalContributions || 0,
        totalAmount: data.totalAmount || 0,
        activeCases: data.activeCases || 0,
        pendingContributions: data.pendingContributions || 0,
        recentActivity: data.recentActivity || [],
      })
    } catch (error) {
      logger.error('Error fetching case-management dashboard:', { error })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDashboard()
  }, [fetchDashboard])

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
          <Badge
            variant="outline"
            className="border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"
          >
            <CheckCircle className="mr-1 h-3 w-3" />
            {tContrib('approved')}
          </Badge>
        )
      case 'rejected':
        return (
          <Badge
            variant="outline"
            className="border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"
          >
            <XCircle className="mr-1 h-3 w-3" />
            {tContrib('rejected')}
          </Badge>
        )
      case 'pending':
        return (
          <Badge
            variant="outline"
            className="border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100"
          >
            <Clock className="mr-1 h-3 w-3" />
            {tContrib('pending')}
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

  const links: HubLink[] = [
    {
      id: 'cases',
      title: 'Cases',
      description: 'Create, edit, publish, and monitor donation cases',
      icon: Target,
      href: `/${locale}/case-management/cases`,
      permission: 'cases:manage',
    },
    {
      id: 'contributions',
      title: 'Contributions',
      description: 'Review, approve, and manage donations',
      icon: Heart,
      href: `/${locale}/case-management/contributions`,
      permission: 'contributions:manage',
    },
    {
      id: 'analytics',
      title: 'Analytics',
      description: 'Reports and performance metrics',
      icon: BarChart3,
      href: `/${locale}/case-management/analytics`,
      permission: 'admin:analytics',
    },
    {
      id: 'sponsorships',
      title: 'Sponsorships',
      description: 'Sponsorship requests and approvals',
      icon: UserCheck,
      href: `/${locale}/case-management/sponsorships`,
      permission: 'admin:dashboard',
    },
    {
      id: 'beneficiaries',
      title: 'Beneficiaries',
      description: 'Beneficiary records and bulk tools',
      icon: Users,
      href: `/${locale}/case-management/beneficiaries`,
      permission: 'cases:manage',
    },
    {
      id: 'batch-upload',
      title: 'Batch upload',
      description: 'Import cases from spreadsheets',
      icon: Upload,
      href: `/${locale}/case-management/batch-upload`,
      permission: 'cases:manage',
    },
    {
      id: 'create-case',
      title: 'New case',
      description: 'Start the case creation wizard',
      icon: Plus,
      href: `/${locale}/case-management/create`,
      permission: 'cases:manage',
    },
  ]

  const visible = links.filter((l) => hasPermission(l.permission))
  const openContribution = (id: string) =>
    router.push(`/${locale}/case-management/contributions?contribution=${id}`)

  const workspacesSection = (
    <section aria-label="Workspaces" className="min-w-0">
      <h2 className="mb-3 px-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">
        {tNav('caseManagement')}
      </h2>
      {visible.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="py-14 text-center text-sm text-muted-foreground">
            No case-management areas are available for your role.
          </CardContent>
        </Card>
      ) : (
        <div className="grid min-w-0 grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
          {visible.map((item) => (
            <Card
              key={item.id}
              className="min-w-0 border-border/80 shadow-sm transition-shadow hover:shadow-md"
            >
              <CardHeader className="space-y-1 pb-2">
                <div className="flex min-w-0 items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted">
                    <item.icon className="h-4 w-4 text-foreground" />
                  </div>
                  <CardTitle className="truncate text-base font-semibold">{item.title}</CardTitle>
                </div>
                <CardDescription className="line-clamp-3 text-sm">{item.description}</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full justify-between gap-2"
                  onClick={() => router.push(item.href)}
                >
                  Open
                  <ArrowRight className="h-4 w-4 opacity-70" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  )

  const activitySection = (
    <Card className="h-full min-w-0 overflow-hidden border-border/80 shadow-sm">
      <CardHeader className="space-y-1 border-b border-border/60 bg-muted/20 px-4 py-4 sm:px-5">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
            <Activity className="h-4 w-4 text-foreground" />
          </span>
          {tCases('recentActivity')}
        </CardTitle>
        <CardDescription className="text-sm">{tReports('contributorDetails')}</CardDescription>
      </CardHeader>
      <CardContent className="max-h-[65vh] overflow-y-auto p-3 sm:max-h-[min(36rem,calc(100vh-10rem))] sm:p-4 lg:max-h-none">
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-14">
            <Loader2 className="h-9 w-9 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{tCommon('loading')}</p>
          </div>
        ) : stats.recentActivity.length > 0 ? (
          <>
            <ul className="space-y-2 md:hidden" aria-label="Recent contributions">
              {stats.recentActivity.map((activity) => (
                <li key={activity.id}>
                  <button
                    type="button"
                    onClick={() => openContribution(activity.id)}
                    className={cn(
                      'flex w-full flex-col gap-2 rounded-xl border border-border/80 bg-card p-3 text-left',
                      'shadow-sm transition-[box-shadow,transform] active:scale-[0.99]',
                      'hover:shadow-md touch-manipulation'
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold tabular-nums text-foreground">
                        {formatAmount(activity.amount)}
                      </span>
                      {statusBadge(activity.status)}
                    </div>
                    <p className="text-xs text-muted-foreground">{formatDate(activity.date)}</p>
                    <span className="text-xs font-medium text-primary">{tCommon('view')}</span>
                  </button>
                </li>
              ))}
            </ul>
            <div className="hidden overflow-x-auto rounded-xl border md:block">
              <Table className="min-w-[520px]">
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[40%]">{tContrib('amount')}</TableHead>
                    <TableHead>{tCommon('date')}</TableHead>
                    <TableHead>{tContrib('status')}</TableHead>
                    <TableHead className="w-12 p-2 text-right" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.recentActivity.map((activity) => (
                    <TableRow key={activity.id} className="group">
                      <TableCell className="font-medium">
                        <div className="flex min-w-0 items-center gap-2">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                            <Heart className="h-3.5 w-3.5 text-foreground" />
                          </div>
                          <span className="truncate">{formatAmount(activity.amount)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground sm:text-sm">
                        {formatDate(activity.date)}
                      </TableCell>
                      <TableCell>{statusBadge(activity.status)}</TableCell>
                      <TableCell className="p-2 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-9 w-9 rounded-full p-0"
                          onClick={() => openContribution(activity.id)}
                        >
                          <Eye className="h-4 w-4" />
                          <span className="sr-only">{tCommon('view')}</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-muted/30 py-12 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
              <Activity className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-semibold text-foreground">No recent activity</p>
            <p className="mt-1 max-w-xs px-4 text-xs text-muted-foreground">
              Contributions will show here as they are recorded.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )

  return (
    <ProtectedRoute>
      <PermissionGuard permission="admin:dashboard">
        <div className="min-h-screen bg-background">
          <Container variant={containerVariant} className="py-6 sm:py-8">
            <Card className="mb-6 border-border shadow-sm sm:mb-8">
              <CardHeader className="flex flex-col gap-4 space-y-0 pb-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 gap-3 sm:gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm sm:h-14 sm:w-14">
                    <LayoutDashboard className="h-6 w-6 sm:h-7 sm:w-7" />
                  </div>
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <CardTitle className="text-2xl font-bold tracking-tight sm:text-3xl">
                        {tNav('caseManagement') || 'Case management'}
                      </CardTitle>
                      <Badge variant="secondary" className="gap-1 font-semibold">
                        <Shield className="h-3 w-3" />
                        {userRoleDisplayName}
                      </Badge>
                    </div>
                    <CardDescription className="text-base">
                      Run day-to-day donation operations in one place. Open the admin panel for system
                      settings and org-wide tools.
                    </CardDescription>
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    disabled={loading}
                    onClick={() => fetchDashboard()}
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                    {tAdminStorage('refresh')}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => router.push(`/${locale}/admin`)}
                  >
                    <ExternalLink className="h-4 w-4" />
                    {tNav('admin')}
                  </Button>
                </div>
              </CardHeader>
            </Card>

            {!loading && stats.pendingContributions > 0 && hasPermission('contributions:manage') && (
              <Card className="mb-6 border-amber-200/80 bg-amber-50/40 dark:border-amber-900/40 dark:bg-amber-950/15">
                <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-background shadow-sm">
                      <Clock className="h-5 w-5 text-amber-700 dark:text-amber-300" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">
                        {stats.pendingContributions}{' '}
                        {stats.pendingContributions === 1
                          ? tReports('contribution')
                          : tReports('contributions')}{' '}
                        {tContrib('pending').toLowerCase()}
                      </p>
                      <p className="text-sm text-muted-foreground">{tContrib('description')}</p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    className="w-full shrink-0 sm:w-auto"
                    onClick={() => router.push(`/${locale}/case-management/contributions`)}
                  >
                    {tContrib('title')}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            )}

            <section aria-label="Key metrics" className="mb-6">
              <div className="mb-2 flex items-center justify-between px-1">
                <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  {tReports('overallStatistics')}
                </h2>
                <span className="text-[10px] text-muted-foreground sm:hidden">{tCommon('actions')}</span>
              </div>
              <div
                className={cn(
                  'flex gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none]',
                  'snap-x snap-mandatory sm:grid sm:grid-cols-2 sm:gap-3 sm:overflow-visible sm:snap-none xl:grid-cols-4',
                  '[&::-webkit-scrollbar]:hidden'
                )}
              >
                <StatCard
                  title={tBenef('activeCases')}
                  value={stats.activeCases}
                  icon={Activity}
                  loading={loading}
                />
                <StatCard
                  title={tNav('pendingContributions')}
                  value={stats.pendingContributions}
                  icon={Clock}
                  loading={loading}
                />
                <StatCard
                  title={tReports('totalContributions')}
                  value={stats.totalContributions}
                  icon={Heart}
                  loading={loading}
                />
                <StatCard
                  title={tReports('totalAmount')}
                  value={formatAmount(stats.totalAmount)}
                  icon={DollarSign}
                  loading={loading}
                />
              </div>
            </section>

            <div className="flex flex-col gap-5 lg:hidden">
              {activitySection}
              {workspacesSection}
            </div>

            <div className="hidden min-w-0 lg:block">
              <ResizablePanelGroup direction="horizontal" className="min-h-[620px] rounded-lg border">
                <ResizablePanel defaultSize={64} minSize="420px">
                  <div className="h-full min-w-0 overflow-auto p-4">{workspacesSection}</div>
                </ResizablePanel>
                <ResizableHandle withHandle />
                <ResizablePanel defaultSize={36} minSize="360px">
                  <div className="h-full min-w-0 p-4">{activitySection}</div>
                </ResizablePanel>
              </ResizablePanelGroup>
            </div>
          </Container>
        </div>
      </PermissionGuard>
    </ProtectedRoute>
  )
}
