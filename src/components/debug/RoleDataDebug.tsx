'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RefreshCw, Eye, EyeOff } from 'lucide-react'

import { defaultLogger as logger } from '@/lib/logger'

export default function RoleDataDebug() {
  const [roleData, setRoleData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [showRaw, setShowRaw] = useState(false)

  const fetchRoleData = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/profile/role')
      if (response.ok) {
        const data = await response.json()
        setRoleData(data)
      } else {
        logger.error('Failed to fetch role data:', { error: response.statusText })
      }
    } catch (error) {
      logger.error('Error fetching role data:', { error: error })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRoleData()
  }, [])

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-8 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Role Data Debug</CardTitle>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={fetchRoleData}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowRaw(!showRaw)}>
              {showRaw ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
              {showRaw ? 'Hide Raw' : 'Show Raw'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {roleData ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">User Info</h4>
                <div className="text-sm text-gray-600">
                  <p>ID: {roleData.user?.id}</p>
                  <p>Email: {roleData.user?.email}</p>
                </div>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Summary</h4>
                <div className="text-sm text-gray-600">
                  <p>Roles: {roleData.total_roles}</p>
                  <p>Permissions: {roleData.total_permissions}</p>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-2">Roles</h4>
              <div className="space-y-2">
                {roleData.roles?.map((role: any) => (
                  <div key={role.id} className="flex items-center gap-2">
                    <Badge variant="outline">{role.name}</Badge>
                    <span className="text-sm text-gray-600">{role.display_name}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-2">Permissions (First 10)</h4>
              <div className="space-y-1">
                {roleData.permissions?.slice(0, 10).map((permission: any) => (
                  <div key={permission.id} className="text-sm text-gray-600">
                    {permission.display_name} ({permission.name})
                  </div>
                ))}
                {roleData.permissions?.length > 10 && (
                  <div className="text-sm text-gray-500">
                    ... and {roleData.permissions.length - 10} more
                  </div>
                )}
              </div>
            </div>

            {showRaw && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Raw Data</h4>
                <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto">
                  {JSON.stringify(roleData, null, 2)}
                </pre>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center text-gray-500">
            <p>No role data available</p>
            <Button size="sm" variant="outline" onClick={fetchRoleData} className="mt-2">
              Try Again
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
