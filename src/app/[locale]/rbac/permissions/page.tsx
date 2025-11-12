'use client'

import React, { useState, useEffect, useCallback } from 'react'
import PermissionGuard from '@/components/auth/PermissionGuard'
import { safeFetch } from '@/lib/utils/safe-fetch'
import { PermissionFormModal } from '@/components/admin/rbac/PermissionFormModal'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { Plus, Edit2, Shield } from 'lucide-react'

interface Permission {
  id: string
  name: string
  display_name: string
  description: string
  resource: string
  action: string
  is_system: boolean
}

export default function AdminPermissionsPage() {
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [loading, setLoading] = useState(true)
  const [createPermissionModal, setCreatePermissionModal] = useState(false)
  const [editPermissionModal, setEditPermissionModal] = useState(false)
  const [selectedPermission, setSelectedPermission] = useState<Permission | undefined>(undefined)
  const { toast } = useToast()

  // Fetch permissions
  const fetchPermissions = useCallback(async () => {
    try {
      setLoading(true)
      const permissionsRes = await safeFetch('/api/admin/permissions')

      if (permissionsRes.ok) {
        setPermissions(permissionsRes.data?.permissions || [])
      } else {
        toast({
          title: 'Error',
          description: 'Failed to fetch permissions',
          type: 'error'
        })
      }
    } catch (error) {
      console.error('Fetch error:', error)
      toast({
        title: 'Error',
        description: 'Failed to fetch permissions',
        type: 'error'
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchPermissions()
  }, [fetchPermissions])

  const handleCreatePermission = async (permissionData: {
    name: string
    display_name: string
    description: string
    resource: string
    action: string
  }) => {
    try {
      const response = await safeFetch('/api/admin/permissions', {
        method: 'POST',
        body: JSON.stringify(permissionData)
      })

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Permission created successfully'
        })
        setCreatePermissionModal(false)
        fetchPermissions()
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create permission',
        type: 'error'
      })
    }
  }

  const handleEditPermission = async (permissionData: {
    display_name: string
    description: string
  }) => {
    if (!selectedPermission) return

    try {
      const response = await safeFetch(`/api/admin/permissions/${selectedPermission.id}`, {
        method: 'PUT',
        body: JSON.stringify(permissionData)
      })

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Permission updated successfully'
        })
        setEditPermissionModal(false)
        setSelectedPermission(undefined)
        fetchPermissions()
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update permission',
        type: 'error'
      })
    }
  }

  return (
    <PermissionGuard permission="admin:permissions">
      <div className="container mx-auto py-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Permission Management</h1>
          <p className="text-muted-foreground">
            Create and manage permissions
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Permissions</CardTitle>
                <CardDescription>Create and manage permissions</CardDescription>
              </div>
              <Button onClick={() => setCreatePermissionModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Permission
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading permissions...</div>
            ) : permissions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No permissions found</div>
            ) : (
              <div className="space-y-2">
                {permissions.map(permission => (
                  <div
                    key={permission.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{permission.display_name}</span>
                        {permission.is_system && (
                          <Badge variant="secondary">System</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {permission.description}
                      </p>
                      <div className="flex gap-2 mt-2">
                        <Badge variant="outline">{permission.resource}</Badge>
                        <Badge variant="outline">{permission.action}</Badge>
                        <Badge variant="outline" className="font-mono text-xs">
                          {permission.name}
                        </Badge>
                      </div>
                    </div>
                    {!permission.is_system && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedPermission(permission)
                          setEditPermissionModal(true)
                        }}
                      >
                        <Edit2 className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create Permission Modal */}
        {createPermissionModal && (
          <PermissionFormModal
            open={createPermissionModal}
            onClose={() => setCreatePermissionModal(false)}
            onSubmit={handleCreatePermission}
          />
        )}

        {/* Edit Permission Modal */}
        {editPermissionModal && selectedPermission && (
          <PermissionFormModal
            open={editPermissionModal}
            onClose={() => {
              setEditPermissionModal(false)
              setSelectedPermission(undefined)
            }}
            onSubmit={handleEditPermission}
            permission={selectedPermission}
          />
        )}
      </div>
    </PermissionGuard>
  )
}

