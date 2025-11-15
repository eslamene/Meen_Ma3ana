'use client'

import React, { useState, useEffect, useCallback } from 'react'
import PermissionGuard from '@/components/auth/PermissionGuard'
import Container from '@/components/layout/Container'
import { useLayout } from '@/components/layout/LayoutProvider'
import { safeFetch } from '@/lib/utils/safe-fetch'
import { RoleFormModal } from '@/components/admin/rbac/RoleFormModal'
import { PermissionAssignmentModal } from '@/components/admin/rbac/PermissionAssignmentModal'
import { RolesDataTable } from '@/components/admin/rbac/RolesDataTable'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'

interface Role {
  id: string
  name: string
  display_name: string
  description: string
  is_system: boolean
  permissions_count: number
  users_count: number
  permissions?: Permission[]
}

interface Permission {
  id: string
  name: string
  display_name: string
  description: string
  resource: string
  action: string
  is_system: boolean
}

export default function AdminRolesPage() {
  const { containerVariant } = useLayout()
  const [roles, setRoles] = useState<Role[]>([])
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [loading, setLoading] = useState(true)
  const [createRoleModal, setCreateRoleModal] = useState(false)
  const [editRoleModal, setEditRoleModal] = useState(false)
  const [assignPermissionsModal, setAssignPermissionsModal] = useState(false)
  const [selectedRole, setSelectedRole] = useState<Role | undefined>(undefined)

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const [rolesRes, permissionsRes] = await Promise.all([
        safeFetch('/api/admin/roles'),
        safeFetch('/api/admin/permissions')
      ])

      if (rolesRes.ok) {
        const mappedRoles = (rolesRes.data?.roles || []).map((role: any) => ({
          ...role,
          permissions_count: role.permissions_count || role.permissions?.length || 0,
          users_count: role.users_count || 0
        }))
        setRoles(mappedRoles)
      }
      
      if (permissionsRes.ok) {
        setPermissions(permissionsRes.data?.permissions || [])
      }
    } catch (error) {
      console.error('Fetch error:', error)
      toast.error('Error', { description: 'Failed to fetch data' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleEditRole = async (roleData: { display_name: string; description: string }) => {
    if (!selectedRole) return

    try {
      const response = await safeFetch(`/api/admin/roles/${selectedRole.id}`, {
        method: 'PUT',
        body: JSON.stringify(roleData)
      })

      if (response.ok) {
        toast.success('Success', { description: 'Role updated successfully' })
        setEditRoleModal(false)
        setSelectedRole(undefined)
        fetchData()
      } else {
        const errorMessage = response.error || response.data?.error || 'Failed to update role'
        toast.error('Error', { description: errorMessage })
      }
    } catch (error) {
      console.error('Update role error:', error)
      toast.error('Error', { description: error instanceof Error ? error.message : 'Failed to update role' })
    }
  }

  const handleAssignPermissions = async (roleId: string, permissionIds: string[]) => {
    try {
      const response = await safeFetch(`/api/admin/roles/${roleId}/permissions`, {
        method: 'PUT',
        body: JSON.stringify({ permission_ids: permissionIds })
      })

      if (response.ok) {
        toast.success('Success', { description: 'Permissions assigned successfully' })
        setAssignPermissionsModal(false)
        setSelectedRole(undefined)
        fetchData()
      } else {
        const errorMessage = response.error || response.data?.error || 'Failed to assign permissions'
        toast.error('Error', { description: errorMessage })
      }
    } catch (error) {
      console.error('Assign permissions error:', error)
      toast.error('Error', { description: error instanceof Error ? error.message : 'Failed to assign permissions' })
    }
  }

  const handleCreateRole = async (roleData: { name: string; display_name: string; description: string }) => {
    try {
      const response = await safeFetch('/api/admin/roles', {
        method: 'POST',
        body: JSON.stringify(roleData)
      })

      if (response.ok) {
        toast.success('Success', { description: 'Role created successfully' })
        setCreateRoleModal(false)
        fetchData()
      } else {
        const errorMessage = response.error || response.data?.error || 'Failed to create role'
        toast.error('Error', { description: errorMessage })
      }
    } catch (error) {
      console.error('Create role error:', error)
      toast.error('Error', { description: error instanceof Error ? error.message : 'Failed to create role' })
    }
  }

  return (
    <PermissionGuard permission="admin:roles">
      <div className="min-h-screen bg-gray-50">
        <Container variant={containerVariant} className="py-6">
        <div>
          <h1 className="text-3xl font-bold">Role Management</h1>
          <p className="text-muted-foreground">
            Create and manage roles, assign permissions
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Roles</CardTitle>
                <CardDescription>Create and manage roles, assign permissions</CardDescription>
              </div>
              <Button onClick={() => setCreateRoleModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Role
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading roles...</div>
            ) : (
              <RolesDataTable
                roles={roles}
                onEdit={(role) => {
                  setSelectedRole(role)
                  setEditRoleModal(true)
                }}
                onDelete={(role) => {
                  setSelectedRole(role)
                  // Handle delete
                }}
                onAssignPermissions={(role) => {
                  setSelectedRole(role)
                  setAssignPermissionsModal(true)
                }}
              />
            )}
          </CardContent>
        </Card>

        {/* Create Role Modal */}
        {createRoleModal && (
          <RoleFormModal
            open={createRoleModal}
            onClose={() => setCreateRoleModal(false)}
            onSubmit={handleCreateRole}
          />
        )}

        {/* Edit Role Modal */}
        {editRoleModal && selectedRole && (
          <RoleFormModal
            open={editRoleModal}
            onClose={() => {
              setEditRoleModal(false)
              setSelectedRole(undefined)
            }}
            onSubmit={async (data) => {
              try {
                await handleEditRole(data)
              } catch (error) {
                // Error already handled in handleEditRole
                console.error('Error in edit role handler:', error)
              }
            }}
            role={selectedRole}
          />
        )}

        {/* Assign Permissions Modal */}
        {assignPermissionsModal && selectedRole && (
          <PermissionAssignmentModal
            open={assignPermissionsModal}
            onClose={() => {
              setAssignPermissionsModal(false)
              setSelectedRole(undefined)
            }}
            role={selectedRole}
            permissions={permissions}
            onSave={(permissionIds) => handleAssignPermissions(selectedRole.id, permissionIds)}
          />
        )}
        </Container>
      </div>
    </PermissionGuard>
  )
}

