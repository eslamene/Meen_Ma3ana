'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { 
  RefreshCw, 
  Calendar,
  User,
  Shield,
  AlertTriangle,
  Info,
  CheckCircle,
  XCircle
} from 'lucide-react'
import { PermissionChangeAudit, useAuditLog } from '@/lib/hooks/useAuditLog'
import { formatDistanceToNow } from 'date-fns'
import React from 'react'
import type { AuditLogEntry } from '@/lib/services/auditService'


import { defaultLogger as logger } from '@/lib/logger'

interface AuditLogViewerProps {
  className?: string
}

// Local type for role assignment audit entries (matches service return shape)
type RoleAssignmentAudit = {
  id: string
  user_id: string
  target_user_id: string
  role_name: string
  action: 'assign' | 'revoke'
  performed_by?: string
  created_at: Date
}

// Display type that augments base AuditLogEntry with optional fields present in some rows
type DisplayAudit = AuditLogEntry & {
  severity?: 'info' | 'warning' | 'error' | 'critical'
  category?: string
  table_name?: string
  record_id?: string
}

export default function AuditLogViewer({ className }: AuditLogViewerProps) {
  const { getAllAuditLogs, getRoleAssignmentAudit, getPermissionChangeAudit } = useAuditLog()
  
  const [auditLogs, setAuditLogs] = useState<DisplayAudit[]>([])
  const [roleAuditLogs, setRoleAuditLogs] = useState<RoleAssignmentAudit[]>([])
  const [permissionAuditLogs, setPermissionAuditLogs] = useState<PermissionChangeAudit[]>([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'all' | 'roles' | 'permissions'>('all')
  
  // Filters
  const [filters, setFilters] = useState({
    category: 'all',
    severity: 'all',
    action: 'all',
    search: ''
  })
  
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0
  })

  const loadAuditLogs = useCallback(async () => {
    setLoading(true)
    try {
      const offset = (pagination.page - 1) * pagination.limit
      
      if (activeTab === 'all') {
        const logs = await getAllAuditLogs({
          limit: pagination.limit,
          offset,
          category: filters.category === 'all' ? undefined : filters.category,
          severity: filters.severity === 'all' ? undefined : filters.severity,
          action: filters.action === 'all' ? undefined : filters.action
        })
        setAuditLogs(logs)
      } else if (activeTab === 'roles') {
        const logs = await getRoleAssignmentAudit({
          limit: pagination.limit,
          offset,
          action: filters.action === 'all' ? undefined : filters.action
        })
        setRoleAuditLogs(logs)
      } else if (activeTab === 'permissions') {
        const logs = await getPermissionChangeAudit({
          limit: pagination.limit,
          offset,
          action: filters.action === 'all' ? undefined : filters.action
        })
        setPermissionAuditLogs(logs)
      }
    } catch (error) {
      logger.error('Error loading audit logs:', { error: error })
    } finally {
      setLoading(false)
    }
  }, [activeTab, pagination.page, pagination.limit, filters, getAllAuditLogs, getRoleAssignmentAudit, getPermissionChangeAudit])

  useEffect(() => {
    loadAuditLogs()
  }, [loadAuditLogs])

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <XCircle className="h-4 w-4 text-red-600" />
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-500" />
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case 'info':
        return <Info className="h-4 w-4 text-blue-500" />
      default:
        return <CheckCircle className="h-4 w-4 text-green-500" />
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'error':
        return 'bg-red-50 text-red-700 border-red-100'
      case 'warning':
        return 'bg-yellow-50 text-yellow-700 border-yellow-100'
      case 'info':
        return 'bg-blue-50 text-blue-700 border-blue-100'
      default:
        return 'bg-green-50 text-green-700 border-green-100'
    }
  }

  const getActionColor = (action: string) => {
    switch (action) {
      case 'assign':
      case 'grant':
      case 'create':
        return 'bg-green-100 text-green-800'
      case 'revoke':
      case 'delete':
        return 'bg-red-100 text-red-800'
      case 'update':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const renderAllAuditLogs = () => (
    <div className="space-y-4">
      {auditLogs.map((log) => (
        <Card key={log.id} className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  {getSeverityIcon(log.severity || 'info')}
                  <Badge className={getSeverityColor(log.severity || 'info')}>
                    {log.severity || 'info'}
                  </Badge>
                  <Badge className={getActionColor(log.action)}>
                    {log.action}
                  </Badge>
                  <Badge variant="outline">
                    {log.table_name || log.resource_type}
                  </Badge>
                </div>
                <div className="text-sm text-gray-600 mb-2">
                  <span className="font-medium">Category:</span> {log.category || 'rbac'}
                  {(log.record_id || log.resource_id) && (
                    <>
                      <span className="mx-2">•</span>
                      <span className="font-medium">Record ID:</span> {log.record_id || log.resource_id}
                    </>
                  )}
                </div>
                {log.details && (
                  <div className="text-sm text-gray-700 bg-gray-50 p-2 rounded">
                    <pre className="whitespace-pre-wrap">{JSON.stringify(log.details, null, 2)}</pre>
                  </div>
                )}
              </div>
              <div className="text-right text-sm text-gray-500">
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {formatDistanceToNow(new Date(log.created_at || ''), { addSuffix: true })}
                </div>
                {log.user_id && (
                  <div className="flex items-center gap-1 mt-1">
                    <User className="h-3 w-3" />
                    {log.user_id}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )

  const renderRoleAuditLogs = () => (
    <div className="space-y-4">
      {roleAuditLogs.map((log) => (
        <Card key={log.id} className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="h-4 w-4 text-green-600" />
                  <Badge className={getActionColor(log.action)}>
                    {log.action}
                  </Badge>
                  <Badge className={getSeverityColor('info')}>
                    {'info'}
                  </Badge>
                </div>
                <div className="text-sm text-gray-600 mb-2">
                  <span className="font-medium">Role:</span> {log.role_name}
                  <span className="mx-2">•</span>
                  <span className="font-medium">Target User:</span> {log.target_user_id}
                </div>
              </div>
              <div className="text-right text-sm text-gray-500">
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                </div>
                <div className="flex items-center gap-1 mt-1">
                  <User className="h-3 w-3" />
                  {log.performed_by}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )

  const renderPermissionAuditLogs = () => (
    <div className="space-y-4">
      {permissionAuditLogs.map((log) => (
        <Card key={log.id} className="border-l-4 border-l-purple-500">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="h-4 w-4 text-purple-600" />
                  <Badge className={getActionColor(log.action)}>
                    {log.action}
                  </Badge>
                  <Badge className={getSeverityColor('info')}>
                    {'info'}
                  </Badge>
                </div>
                <div className="text-sm text-gray-600 mb-2">
                  <span className="font-medium">Role:</span> {log.role_name}
                  <span className="mx-2">•</span>
                  <span className="font-medium">Permission:</span> {log.permission_name}
                </div>
              </div>
              <div className="text-right text-sm text-gray-500">
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                </div>
                <div className="flex items-center gap-1 mt-1">
                  <User className="h-3 w-3" />
                  {log.performed_by}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                RBAC Audit Logs
              </CardTitle>
              <CardDescription>
                Monitor all role and permission changes in the system
              </CardDescription>
            </div>
            <Button onClick={loadAuditLogs} disabled={loading} variant="outline" size="sm">
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Tabs */}
          <div className="flex space-x-1 mb-6">
            <Button
              variant={activeTab === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('all')}
            >
              All Logs
            </Button>
            <Button
              variant={activeTab === 'roles' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('roles')}
            >
              Role Changes
            </Button>
            <Button
              variant={activeTab === 'permissions' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('permissions')}
            >
              Permission Changes
            </Button>
          </div>

          {/* Filters */}
          <div className="flex gap-4 mb-6">
            <div className="flex-1">
              <Input
                placeholder="Search logs..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="w-full"
              />
            </div>
            <Select
              value={filters.category}
              onValueChange={(value) => setFilters(prev => ({ ...prev, category: value }))}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="rbac">RBAC</SelectItem>
                <SelectItem value="role_assignment">Role Assignment</SelectItem>
                <SelectItem value="permission_change">Permission Change</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={filters.severity}
              onValueChange={(value) => setFilters(prev => ({ ...prev, severity: value }))}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="error">Error</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={filters.action}
              onValueChange={(value) => setFilters(prev => ({ ...prev, action: value }))}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="assign">Assign</SelectItem>
                <SelectItem value="revoke">Revoke</SelectItem>
                <SelectItem value="grant">Grant</SelectItem>
                <SelectItem value="create">Create</SelectItem>
                <SelectItem value="update">Update</SelectItem>
                <SelectItem value="delete">Delete</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Content */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin mr-2" />
              Loading audit logs...
            </div>
          ) : (
            <>
              {activeTab === 'all' && renderAllAuditLogs()}
              {activeTab === 'roles' && renderRoleAuditLogs()}
              {activeTab === 'permissions' && renderPermissionAuditLogs()}
            </>
          )}

          {/* Pagination */}
          <div className="flex items-center justify-between mt-6">
            <div className="text-sm text-gray-500">
              Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} logs
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page === 1}
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
