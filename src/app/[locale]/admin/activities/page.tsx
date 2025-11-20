'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter, useParams } from 'next/navigation'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import PermissionGuard from '@/components/auth/PermissionGuard'
import Container from '@/components/layout/Container'
import { useLayout } from '@/components/layout/LayoutProvider'
import DetailPageHeader from '@/components/crud/DetailPageHeader'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import {
  Activity,
  Search,
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Eye,
  User,
  Globe,
  Clock,
  AlertCircle,
  CheckCircle,
  Info,
  XCircle,
  FileText,
  Shield,
  Loader2,
  Edit,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface ActivityLog {
  id: string
  user_id?: string
  session_id?: string
  activity_type: 'page_view' | 'api_call' | 'user_action' | 'data_change' | 'auth_event' | 'system_event' | 'error'
  category?: string
  action: string
  resource_type?: string
  resource_id?: string
  resource_path?: string
  method?: string
  status_code?: number
  ip_address?: string
  user_agent?: string
  referer?: string
  details?: Record<string, unknown>
  metadata?: Record<string, unknown>
  severity?: 'info' | 'warning' | 'error' | 'critical'
  created_at: string
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

export default function AdminActivitiesPage() {
  const router = useRouter()
  const params = useParams()
  const locale = params.locale as string
  const t = useTranslations('admin')
  const { containerVariant } = useLayout()

  const [activities, setActivities] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false,
  })

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [activityTypeFilter, setActivityTypeFilter] = useState<string>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [severityFilter, setSeverityFilter] = useState<string>('all')
  const [userTypeFilter, setUserTypeFilter] = useState<string>('all') // 'all', 'authenticated', 'visitor'
  const [selectedActivity, setSelectedActivity] = useState<ActivityLog | null>(null)
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false)

  const fetchActivities = useCallback(async () => {
    try {
      setLoading(true)
      
      const params = new URLSearchParams({
        limit: pagination.limit.toString(),
        offset: ((pagination.page - 1) * pagination.limit).toString(),
      })

      if (searchTerm) {
        params.append('search', searchTerm)
      }
      if (activityTypeFilter !== 'all') {
        params.append('activity_type', activityTypeFilter)
      }
      if (categoryFilter !== 'all') {
        params.append('category', categoryFilter)
      }
      if (severityFilter !== 'all') {
        params.append('severity', severityFilter)
      }
      if (userTypeFilter === 'visitor') {
        // For visitors, we need to filter by user_id being NULL
        // This will be handled by the API
        params.append('user_id', 'null')
      } else if (userTypeFilter === 'authenticated') {
        // For authenticated, we need user_id to NOT be null
        // This will be handled by the API
        params.append('user_id', 'not_null')
      }

      const response = await fetch(`/api/activity/logs?${params.toString()}`)
      
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          toast.error('Unauthorized', { description: 'You do not have permission to view activities.' })
          return
        }
        throw new Error(`Failed to fetch activities: ${response.statusText}`)
      }

      const data = await response.json()
      
      setActivities(data.logs || [])
      
      // Calculate pagination from response
      const total = data.total || data.count || 0
      const totalPages = Math.ceil(total / pagination.limit)
      
      setPagination(prev => ({
        ...prev,
        total,
        totalPages,
        hasNextPage: pagination.page < totalPages,
        hasPrevPage: pagination.page > 1,
      }))
    } catch (error) {
      console.error('Error fetching activities:', error)
      toast.error('Error', { description: 'Failed to fetch activities' })
    } finally {
      setLoading(false)
    }
  }, [pagination.page, pagination.limit, searchTerm, activityTypeFilter, categoryFilter, severityFilter, userTypeFilter])

  useEffect(() => {
    fetchActivities()
  }, [fetchActivities])

  // Reset to page 1 when filters change
  useEffect(() => {
    setPagination(prev => ({ ...prev, page: 1 }))
  }, [searchTerm, activityTypeFilter, categoryFilter, severityFilter, userTypeFilter])

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const getActivityTypeIcon = (type: string) => {
    switch (type) {
      case 'page_view':
        return <Eye className="h-4 w-4" />
      case 'api_call':
        return <FileText className="h-4 w-4" />
      case 'user_action':
        return <User className="h-4 w-4" />
      case 'data_change':
        return <Edit className="h-4 w-4" />
      case 'auth_event':
        return <Shield className="h-4 w-4" />
      case 'system_event':
        return <Activity className="h-4 w-4" />
      case 'error':
        return <AlertCircle className="h-4 w-4" />
      default:
        return <Info className="h-4 w-4" />
    }
  }

  const getSeverityBadge = (severity?: string) => {
    switch (severity) {
      case 'critical':
        return <Badge variant="destructive">Critical</Badge>
      case 'error':
        return <Badge className="bg-red-500">Error</Badge>
      case 'warning':
        return <Badge className="bg-yellow-500">Warning</Badge>
      case 'info':
      default:
        return <Badge variant="outline">Info</Badge>
    }
  }

  const getActivityTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      page_view: 'bg-blue-100 text-blue-800',
      api_call: 'bg-purple-100 text-purple-800',
      user_action: 'bg-green-100 text-green-800',
      data_change: 'bg-orange-100 text-orange-800',
      auth_event: 'bg-indigo-100 text-indigo-800',
      system_event: 'bg-gray-100 text-gray-800',
      error: 'bg-red-100 text-red-800',
    }
    return (
      <Badge className={colors[type] || 'bg-gray-100 text-gray-800'}>
        {type.replace('_', ' ')}
      </Badge>
    )
  }

  const formatDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true })
    } catch {
      return dateString
    }
  }

  const getPageNumbers = () => {
    const pages: (number | string)[] = []
    const totalPages = pagination.totalPages
    const currentPage = pagination.page

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      pages.push(1)
      if (currentPage > 3) pages.push('...')
      
      const start = Math.max(2, currentPage - 1)
      const end = Math.min(totalPages - 1, currentPage + 1)
      
      for (let i = start; i <= end; i++) {
        pages.push(i)
      }
      
      if (currentPage < totalPages - 2) pages.push('...')
      pages.push(totalPages)
    }

    return pages
  }

  return (
    <ProtectedRoute>
      <PermissionGuard permissions={['admin:dashboard']} fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <Card className="max-w-md w-full">
            <CardContent className="p-6 text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
              <p className="text-gray-600 mb-4">You don&apos;t have permission to view activity logs.</p>
            </CardContent>
          </Card>
        </div>
      }>
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-50">
          <Container variant={containerVariant} className="py-6 sm:py-8 lg:py-10">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <DetailPageHeader
                backUrl={`/${locale}/admin`}
                icon={Activity}
                title="Activity Logs"
                description="Monitor all site activities including page views, API calls, user actions, and system events"
              />
              <Button
                onClick={() => fetchActivities()}
                variant="outline"
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Total Activities</p>
                      <p className="text-2xl font-bold">{pagination.total.toLocaleString()}</p>
                    </div>
                    <Activity className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Page Views</p>
                      <p className="text-2xl font-bold">
                        {activities.filter(a => a.activity_type === 'page_view').length}
                      </p>
                    </div>
                    <Eye className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">API Calls</p>
                      <p className="text-2xl font-bold">
                        {activities.filter(a => a.activity_type === 'api_call').length}
                      </p>
                    </div>
                    <FileText className="h-8 w-8 text-purple-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Errors</p>
                      <p className="text-2xl font-bold">
                        {activities.filter(a => a.severity === 'error' || a.severity === 'critical').length}
                      </p>
                    </div>
                    <AlertCircle className="h-8 w-8 text-red-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Filters */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Filters
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div className="lg:col-span-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search activities..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <Select value={activityTypeFilter} onValueChange={setActivityTypeFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Activity Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="page_view">Page Views</SelectItem>
                      <SelectItem value="api_call">API Calls</SelectItem>
                      <SelectItem value="user_action">User Actions</SelectItem>
                      <SelectItem value="data_change">Data Changes</SelectItem>
                      <SelectItem value="auth_event">Auth Events</SelectItem>
                      <SelectItem value="system_event">System Events</SelectItem>
                      <SelectItem value="error">Errors</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      <SelectItem value="navigation">Navigation</SelectItem>
                      <SelectItem value="authentication">Authentication</SelectItem>
                      <SelectItem value="data">Data</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="system">System</SelectItem>
                      <SelectItem value="security">Security</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={userTypeFilter} onValueChange={setUserTypeFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="User Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Users</SelectItem>
                      <SelectItem value="authenticated">Authenticated</SelectItem>
                      <SelectItem value="visitor">Visitors</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Activities Table */}
            <Card>
              <CardHeader>
                <CardTitle>Activity Logs</CardTitle>
                <CardDescription>
                  Showing {activities.length} of {pagination.total} activities
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                  </div>
                ) : activities.length === 0 ? (
                  <div className="text-center py-12">
                    <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No activities found</p>
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Time</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Action</TableHead>
                            <TableHead>User</TableHead>
                            <TableHead>Resource</TableHead>
                            <TableHead>Severity</TableHead>
                            <TableHead>Details</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {activities.map((activity) => (
                            <TableRow key={activity.id}>
                              <TableCell className="whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  <Clock className="h-4 w-4 text-gray-400" />
                                  <span className="text-sm">{formatDate(activity.created_at)}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  {getActivityTypeIcon(activity.activity_type)}
                                  {getActivityTypeBadge(activity.activity_type)}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="max-w-xs">
                                  <p className="text-sm font-medium truncate">{activity.action}</p>
                                  {activity.category && (
                                    <p className="text-xs text-gray-500">{activity.category}</p>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                {activity.user_id ? (
                                  <div className="flex items-center gap-2">
                                    <User className="h-4 w-4 text-blue-500" />
                                    <span className="text-sm text-blue-600">User</span>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <Globe className="h-4 w-4 text-gray-500" />
                                    <span className="text-sm text-gray-600">Visitor</span>
                                  </div>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="max-w-xs">
                                  {activity.resource_path && (
                                    <p className="text-sm truncate" title={activity.resource_path}>
                                      {activity.resource_path}
                                    </p>
                                  )}
                                  {activity.resource_type && (
                                    <p className="text-xs text-gray-500">{activity.resource_type}</p>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                {getSeverityBadge(activity.severity)}
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedActivity(activity)
                                    setDetailsDialogOpen(true)
                                  }}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Pagination */}
                    {pagination.totalPages > 1 && (
                      <div className="flex items-center justify-between mt-6 pt-4 border-t">
                        <div className="text-sm text-gray-600">
                          Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                          {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                          {pagination.total} activities
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePageChange(pagination.page - 1)}
                            disabled={!pagination.hasPrevPage || loading}
                          >
                            <ChevronLeft className="h-4 w-4" />
                            Previous
                          </Button>
                          
                          <div className="flex items-center gap-1">
                            {getPageNumbers().map((page, index) => (
                              <React.Fragment key={index}>
                                {page === '...' ? (
                                  <span className="px-2">...</span>
                                ) : (
                                  <Button
                                    variant={pagination.page === page ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => handlePageChange(page as number)}
                                    disabled={loading}
                                  >
                                    {page}
                                  </Button>
                                )}
                              </React.Fragment>
                            ))}
                          </div>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePageChange(pagination.page + 1)}
                            disabled={!pagination.hasNextPage || loading}
                          >
                            Next
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Activity Details Dialog */}
            <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Activity Details</DialogTitle>
                  <DialogDescription>
                    Complete information about this activity
                  </DialogDescription>
                </DialogHeader>
                {selectedActivity && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-gray-500">Activity Type</p>
                        <p className="text-sm">{selectedActivity.activity_type}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Action</p>
                        <p className="text-sm">{selectedActivity.action}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Category</p>
                        <p className="text-sm">{selectedActivity.category || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Severity</p>
                        <div className="mt-1">{getSeverityBadge(selectedActivity.severity)}</div>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">User Type</p>
                        <p className="text-sm">
                          {selectedActivity.user_id ? 'Authenticated User' : 'Visitor'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Session ID</p>
                        <p className="text-sm font-mono text-xs truncate">
                          {selectedActivity.session_id || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Resource Path</p>
                        <p className="text-sm break-all">{selectedActivity.resource_path || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Resource Type</p>
                        <p className="text-sm">{selectedActivity.resource_type || 'N/A'}</p>
                      </div>
                      {selectedActivity.method && (
                        <div>
                          <p className="text-sm font-medium text-gray-500">HTTP Method</p>
                          <p className="text-sm">{selectedActivity.method}</p>
                        </div>
                      )}
                      {selectedActivity.status_code && (
                        <div>
                          <p className="text-sm font-medium text-gray-500">Status Code</p>
                          <p className="text-sm">{selectedActivity.status_code}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-gray-500">IP Address</p>
                        <p className="text-sm font-mono text-xs">{selectedActivity.ip_address || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Timestamp</p>
                        <p className="text-sm">{new Date(selectedActivity.created_at).toLocaleString()}</p>
                      </div>
                    </div>
                    
                    {selectedActivity.user_agent && (
                      <div>
                        <p className="text-sm font-medium text-gray-500 mb-1">User Agent</p>
                        <p className="text-sm break-all bg-gray-50 p-2 rounded">{selectedActivity.user_agent}</p>
                      </div>
                    )}
                    
                    {selectedActivity.referer && (
                      <div>
                        <p className="text-sm font-medium text-gray-500 mb-1">Referer</p>
                        <p className="text-sm break-all">{selectedActivity.referer}</p>
                      </div>
                    )}
                    
                    {(selectedActivity.details && Object.keys(selectedActivity.details).length > 0) && (
                      <div>
                        <p className="text-sm font-medium text-gray-500 mb-1">Details</p>
                        <pre className="text-xs bg-gray-50 p-3 rounded overflow-x-auto">
                          {JSON.stringify(selectedActivity.details, null, 2)}
                        </pre>
                      </div>
                    )}
                    
                    {(selectedActivity.metadata && Object.keys(selectedActivity.metadata).length > 0) && (
                      <div>
                        <p className="text-sm font-medium text-gray-500 mb-1">Metadata</p>
                        <pre className="text-xs bg-gray-50 p-3 rounded overflow-x-auto">
                          {JSON.stringify(selectedActivity.metadata, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </Container>
        </div>
      </PermissionGuard>
    </ProtectedRoute>
  )
}

