'use client'

import React, { useState, useEffect, useCallback } from 'react'
import PermissionGuard from '@/components/auth/PermissionGuard'
import Container from '@/components/layout/Container'
import { useLayout } from '@/components/layout/LayoutProvider'
import { safeFetch } from '@/lib/utils/safe-fetch'
import { RoleFormModal } from '@/components/admin/rbac/RoleFormModal'
import { PermissionAssignmentModal } from '@/components/admin/rbac/PermissionAssignmentModal'
import { RolesDataTable } from '@/components/admin/rbac/RolesDataTable'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Plus, Shield } from 'lucide-react'
import DetailPageHeader from '@/components/crud/DetailPageHeader'
import { useParams } from 'next/navigation'

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
  const params = useParams()
  const locale = params.locale as string
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
  }, [])

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
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/30">
        <Container variant={containerVariant} className="py-6 sm:py-8 lg:py-10">
          {/* Header */}
          <DetailPageHeader
            backUrl={`/${locale}/rbac`}
            icon={Shield}
            title="Role Management"
            description="Create and manage roles, assign permissions"
            showBackButton={false}
            badge={{
              label: `${roles.length} ${roles.length === 1 ? 'role' : 'roles'}`,
              variant: 'secondary'
            }}
            menuActions={[
              {
                label: 'Create Role',
                icon: Plus,
                onClick: () => setCreateRoleModal(true),
              },
            ]}
          />

          {/* Roles List */}
          <Card className="border border-gray-200 shadow-sm">
            <CardContent className="p-4 sm:p-6">
              {loading ? (
                <div className="text-center py-12">
                  <div className="inline-block">
                    <div className="h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-sm text-gray-600">Loading roles...</p>
                  </div>
                </div>
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

