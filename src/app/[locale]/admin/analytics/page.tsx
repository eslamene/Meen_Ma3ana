'use client'

import { useTranslations } from 'next-intl'
import { useState, useEffect, useCallback } from 'react'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import PermissionGuard from '@/components/auth/PermissionGuard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  DollarSign, 
  Target, 
  Calendar,
  Download,
  RefreshCw,
  Filter,
  Activity,
  Award,
  FileText,
  PieChart,
  LineChart
} from 'lucide-react'

interface DashboardMetrics {
  totalCases: number
  activeCases: number
  completedCases: number
  totalContributions: number
  totalAmount: number
  averageContribution: number
  totalSponsorships: number
  activeSponsorships: number
  totalUsers: number
  newUsers: number
  activeUsers: number
  totalProjects: number
  activeProjects: number
  completionRate: number
  successRate: number
  pendingApprovals: number
}

interface RecentActivity {
  id: string
  type: 'contribution' | 'sponsorship' | 'case' | 'project' | 'user'
  title: string
  description: string
  amount?: number
  status: string
  timestamp: string
  user?: string
}

export default function AdminAnalyticsPage() {
  const t = useTranslations('admin')
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState('last30Days')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [refreshInterval, setRefreshInterval] = useState(30)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Fetch real data from API
  const fetchData = useCallback(async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) {
      setIsRefreshing(true)
    } else {
      setLoading(true)
    }
    
    try {
      // Build query parameters
      const params = new URLSearchParams({
        dateRange,
        ...(dateRange === 'customRange' && customStartDate && { startDate: customStartDate }),
        ...(dateRange === 'customRange' && customEndDate && { endDate: customEndDate })
      })

      const response = await fetch(`/api/admin/analytics?${params}`)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.details || errorData.error || 'Failed to fetch analytics data'
        throw new Error(errorMessage)
      }

      const data = await response.json()
      
      setMetrics(data.metrics)
      setRecentActivity(data.recentActivity)
    } catch (error) {
      console.error('Error fetching analytics data:', error)
      // Fallback to empty data on error
      setMetrics({
        totalCases: 0,
        activeCases: 0,
        completedCases: 0,
        totalContributions: 0,
        totalAmount: 0,
        averageContribution: 0,
        totalSponsorships: 0,
        activeSponsorships: 0,
        totalUsers: 0,
        newUsers: 0,
        activeUsers: 0,
        totalProjects: 0,
        activeProjects: 0,
        completionRate: 0,
        successRate: 0,
        pendingApprovals: 0
      })
      setRecentActivity([])
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }, [dateRange, customStartDate, customEndDate])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      console.log('Auto-refreshing analytics data...')
      fetchData(true) // Use refresh indicator for auto-refresh
    }, refreshInterval * 1000)

    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval, fetchData])

  const formatCurrency = (amount: number) => {
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

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'contribution':
        return <DollarSign className="h-4 w-4" />
      case 'sponsorship':
        return <Award className="h-4 w-4" />
      case 'case':
        return <Target className="h-4 w-4" />
      case 'project':
        return <Calendar className="h-4 w-4" />
      case 'user':
        return <Users className="h-4 w-4" />
      default:
        return <Activity className="h-4 w-4" />
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { variant: 'secondary' as const, text: 'Pending' },
      approved: { variant: 'default' as const, text: 'Approved' },
      rejected: { variant: 'destructive' as const, text: 'Rejected' },
      completed: { variant: 'default' as const, text: 'Completed' },
      active: { variant: 'default' as const, text: 'Active' }
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending

    return (
      <Badge variant={config.variant}>
        {config.text}
      </Badge>
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleExport = (_format: 'csv' | 'pdf' | 'excel') => {
    console.log(`Exporting data in ${_format} format...`)
    // Implementation for export functionality
  }

  const handleRefresh = () => {
    fetchData(true) // Use refresh indicator for manual refresh
  }

  // Skeleton loading component
  const AnalyticsSkeleton = () => (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Header Skeleton */}
          <div className="mb-8">
            <div className="flex justify-between items-center">
              <div>
                <Skeleton className="h-8 w-64 mb-2" />
                <Skeleton className="h-4 w-96" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-10 w-24" />
                <Skeleton className="h-10 w-32" />
              </div>
            </div>
          </div>

          {/* Filters Skeleton */}
          <Card className="mb-6">
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            </CardContent>
          </Card>

          {/* Metrics Cards Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-4" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16 mb-2" />
                  <Skeleton className="h-3 w-20" />
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Tabs Skeleton */}
          <div className="space-y-6">
            <div className="flex space-x-1 bg-muted p-1 rounded-lg w-fit">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-8 w-24" />
              ))}
            </div>
            
            {/* Content Skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {[1, 2].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-6 w-32" />
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-4 w-12" />
                      </div>
                      <Skeleton className="h-2 w-full" />
                      <div className="flex justify-between">
                        <Skeleton className="h-3 w-20" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  if (loading) {
    return (
      <ProtectedRoute>
        <PermissionGuard permission="admin:analytics">
          <AnalyticsSkeleton />
        </PermissionGuard>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <PermissionGuard permission="admin:analytics">
        <div className="min-h-screen bg-gray-50">
          <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
            <div className="px-4 py-6 sm:px-0">
              {/* Header */}
              <div className="mb-8">
                <div className="flex justify-between items-center">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900">
                      {t('dashboard.title')}
                    </h1>
                    <p className="text-gray-600 mt-2">
                      {t('dashboard.description')}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={handleRefresh}
                      disabled={loading || isRefreshing}
                    >
                      <RefreshCw className={`h-4 w-4 mr-2 ${(loading || isRefreshing) ? 'animate-spin' : ''}`} />
                      {isRefreshing ? 'Refreshing...' : t('dashboard.refresh')}
                    </Button>
                    <Button variant="outline">
                      <Download className="h-4 w-4 mr-2" />
                      {t('dashboard.exportCSV')}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Filters */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Filter className="h-5 w-5" />
                    {t('dashboard.dateRange')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <Label htmlFor="dateRange">{t('dashboard.dateRange')}</Label>
                      <Select value={dateRange} onValueChange={setDateRange}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="last7Days">{t('dashboard.last7Days')}</SelectItem>
                          <SelectItem value="last30Days">{t('dashboard.last30Days')}</SelectItem>
                          <SelectItem value="last90Days">{t('dashboard.last90Days')}</SelectItem>
                          <SelectItem value="lastYear">{t('dashboard.lastYear')}</SelectItem>
                          <SelectItem value="customRange">{t('dashboard.customRange')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {dateRange === 'customRange' && (
                      <>
                        <div>
                          <Label htmlFor="startDate">{t('dashboard.startDate')}</Label>
                          <Input
                            type="date"
                            value={customStartDate}
                            onChange={(e) => setCustomStartDate(e.target.value)}
                          />
                        </div>
                        <div>
                          <Label htmlFor="endDate">{t('dashboard.endDate')}</Label>
                          <Input
                            type="date"
                            value={customEndDate}
                            onChange={(e) => setCustomEndDate(e.target.value)}
                          />
                        </div>
                      </>
                    )}

                    <div className="flex items-end">
                      <Button className="w-full">
                        {t('dashboard.applyFilter')}
                      </Button>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="autoRefresh"
                        checked={autoRefresh}
                        onChange={(e) => setAutoRefresh(e.target.checked)}
                      />
                      <Label htmlFor="autoRefresh">{t('dashboard.autoRefresh')}</Label>
                    </div>
                    
                    {autoRefresh && (
                      <div className="flex items-center gap-2">
                        <Label htmlFor="refreshInterval">{t('dashboard.refreshInterval')}</Label>
                        <Select value={refreshInterval.toString()} onValueChange={(value) => setRefreshInterval(parseInt(value))}>
                          <SelectTrigger className="w-24">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="30">30s</SelectItem>
                            <SelectItem value="60">1m</SelectItem>
                            <SelectItem value="300">5m</SelectItem>
                            <SelectItem value="600">10m</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      {t('metrics.totalCases')}
                    </CardTitle>
                    <Target className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{metrics?.totalCases}</div>
                    <p className="text-xs text-muted-foreground">
                      {metrics?.activeCases} {t('metrics.activeCases').toLowerCase()}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      {t('metrics.totalContributions')}
                    </CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{metrics?.totalContributions}</div>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(metrics?.totalAmount || 0)} {t('metrics.totalAmount').toLowerCase()}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      {t('metrics.totalSponsorships')}
                    </CardTitle>
                    <Award className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{metrics?.totalSponsorships}</div>
                    <p className="text-xs text-muted-foreground">
                      {metrics?.activeSponsorships} {t('metrics.activeSponsorships').toLowerCase()}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      {t('metrics.totalUsers')}
                    </CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{metrics?.totalUsers}</div>
                    <p className="text-xs text-muted-foreground">
                      {metrics?.newUsers} {t('metrics.newUsers').toLowerCase()} this month
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Charts and Activity */}
              <Tabs defaultValue="overview" className="space-y-6">
                <TabsList>
                  <TabsTrigger value="overview">{t('dashboard.overview')}</TabsTrigger>
                  <TabsTrigger value="charts">{t('dashboard.dataVisualization')}</TabsTrigger>
                  <TabsTrigger value="activity">{t('dashboard.recentActivity')}</TabsTrigger>
                  <TabsTrigger value="reports">{t('reports.title')}</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Additional Metrics */}
                    <Card>
                      <CardHeader>
                        <CardTitle>{t('metrics.caseProgress')}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="flex justify-between">
                            <span>{t('metrics.completionRate')}</span>
                            <span className="font-bold">{metrics?.completionRate}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full" 
                              style={{ width: `${metrics?.completionRate}%` }}
                            ></div>
                          </div>
                          <div className="flex justify-between text-sm text-gray-600">
                            <span>{t('metrics.activeCases')}: {metrics?.activeCases}</span>
                            <span>{t('metrics.completedCases')}: {metrics?.completedCases}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>{t('metrics.projectProgress')}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="flex justify-between">
                            <span>{t('metrics.successRate')}</span>
                            <span className="font-bold">{metrics?.successRate}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-green-600 h-2 rounded-full" 
                              style={{ width: `${metrics?.successRate}%` }}
                            ></div>
                          </div>
                          <div className="flex justify-between text-sm text-gray-600">
                            <span>{t('metrics.activeProjects')}: {metrics?.activeProjects}</span>
                            <span>{t('metrics.totalProjects')}: {metrics?.totalProjects}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="charts" className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <BarChart3 className="h-5 w-5" />
                          {t('charts.contributionChart')}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-64 flex items-center justify-center text-gray-500">
                          <div className="text-center">
                            <BarChart3 className="h-12 w-12 mx-auto mb-2" />
                            <p>{t('charts.contributionChart')}</p>
                            <p className="text-sm">Chart implementation would go here</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <LineChart className="h-5 w-5" />
                          {t('charts.sponsorshipChart')}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-64 flex items-center justify-center text-gray-500">
                          <div className="text-center">
                            <LineChart className="h-12 w-12 mx-auto mb-2" />
                            <p>{t('charts.sponsorshipChart')}</p>
                            <p className="text-sm">Chart implementation would go here</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <PieChart className="h-5 w-5" />
                          {t('charts.categoryDistribution')}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-64 flex items-center justify-center text-gray-500">
                          <div className="text-center">
                            <PieChart className="h-12 w-12 mx-auto mb-2" />
                            <p>{t('charts.categoryDistribution')}</p>
                            <p className="text-sm">Chart implementation would go here</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <TrendingUp className="h-5 w-5" />
                          {t('charts.userGrowthChart')}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-64 flex items-center justify-center text-gray-500">
                          <div className="text-center">
                            <TrendingUp className="h-12 w-12 mx-auto mb-2" />
                            <p>{t('charts.userGrowthChart')}</p>
                            <p className="text-sm">Chart implementation would go here</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="activity" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>{t('dashboard.recentActivity')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {recentActivity.map((activity) => (
                          <div key={activity.id} className="flex items-center gap-4 p-4 border rounded-lg">
                            <div className="flex-shrink-0">
                              {getActivityIcon(activity.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900">
                                {activity.title}
                              </p>
                              <p className="text-sm text-gray-500">
                                {activity.description}
                              </p>
                              {activity.user && (
                                <p className="text-xs text-gray-400">
                                  {activity.user}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {activity.amount && (
                                <span className="text-sm font-medium text-green-600">
                                  {formatCurrency(activity.amount)}
                                </span>
                              )}
                              {getStatusBadge(activity.status)}
                            </div>
                            <div className="text-xs text-gray-400">
                              {formatDate(activity.timestamp)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="reports" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        {t('reports.generateReport')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="reportType">{t('reports.reportType')}</Label>
                            <Select>
                              <SelectTrigger>
                                <SelectValue placeholder={t('reports.reportType')} />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="contribution">{t('reports.contributionReport')}</SelectItem>
                                <SelectItem value="sponsorship">{t('reports.sponsorshipReport')}</SelectItem>
                                <SelectItem value="case">{t('reports.caseReport')}</SelectItem>
                                <SelectItem value="project">{t('reports.projectReport')}</SelectItem>
                                <SelectItem value="user">{t('reports.userReport')}</SelectItem>
                                <SelectItem value="financial">{t('reports.financialReport')}</SelectItem>
                                <SelectItem value="comprehensive">{t('reports.comprehensiveReport')}</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label htmlFor="reportPeriod">{t('reports.reportPeriod')}</Label>
                            <Select>
                              <SelectTrigger>
                                <SelectValue placeholder={t('reports.reportPeriod')} />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="last7Days">{t('dashboard.last7Days')}</SelectItem>
                                <SelectItem value="last30Days">{t('dashboard.last30Days')}</SelectItem>
                                <SelectItem value="last90Days">{t('dashboard.last90Days')}</SelectItem>
                                <SelectItem value="lastYear">{t('dashboard.lastYear')}</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label htmlFor="format">{t('reports.format')}</Label>
                            <Select>
                              <SelectTrigger>
                                <SelectValue placeholder={t('reports.format')} />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pdf">{t('reports.pdf')}</SelectItem>
                                <SelectItem value="csv">{t('reports.csv')}</SelectItem>
                                <SelectItem value="excel">{t('reports.excel')}</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div className="flex items-center space-x-2">
                            <input type="checkbox" id="includeCharts" />
                            <Label htmlFor="includeCharts">{t('reports.includeCharts')}</Label>
                          </div>

                          <div className="flex items-center space-x-2">
                            <input type="checkbox" id="includeDetails" />
                            <Label htmlFor="includeDetails">{t('reports.includeDetails')}</Label>
                          </div>

                          <div className="pt-4">
                            <Button className="w-full">
                              <Download className="h-4 w-4 mr-2" />
                              {t('reports.generateReport')}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </PermissionGuard>
    </ProtectedRoute>
  )
} 