'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import PermissionGuard from '@/components/auth/PermissionGuard'
import { DeleteConfirmationDialog } from '@/components/admin/rbac/DeleteConfirmationDialog'
import { RoleFormModal } from '@/components/admin/rbac/RoleFormModal'
import { RolesDataTable } from '@/components/admin/rbac/RolesDataTable'
import { PermissionAssignmentModal } from '@/components/admin/rbac/PermissionAssignmentModal'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { Shield, Key, Users, Plus, Edit2, Trash2, ChevronUp, ChevronDown } from 'lucide-react'

// Types
interface Role {
  id: string
  name: string
  display_name: string
  description: string
  is_system: boolean
  permissions_count: number
  users_count: number
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

interface Module {
  id: string
  name: string
  display_name: string
  icon: string
  color: string
}

interface PermissionsByModule {
  [moduleName: string]: {
    module: Module
    permissions: Permission[]
  }
}

export default function RolesPage() {
  const t = useTranslations('rbac.roles')
  const tCommon = useTranslations('rbac.common')
  const [roles, setRoles] = useState<Role[]>([])
  const [permissionsByModule, setPermissionsByModule] = useState<PermissionsByModule>({})
  const [loading, setLoading] = useState(true)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [assignModalOpen, setAssignModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [selectedRole, setSelectedRole] = useState<Role | undefined>(undefined)
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([])
  const { toast } = useToast()

  // Fetch data
  useEffect(() => {
    fetchRoles()
    fetchPermissions()
  }, [])

  const fetchRoles = async () => {
    try {
      const res = await fetch('/api/admin/rbac/roles', {
        credentials: 'include'
      })
      if (res.ok) {
        const data = await res.json()
        // Map permissions count for RolesDataTable compatibility
        const rolesWithCounts = data.roles.map((role: any) => ({
          ...role,
          permissions_count: role.permissions?.length || 0,
          users_count: role.user_count || 0
        }))
        setRoles(rolesWithCounts)
      } else {
        const errorData = await res.json()
        console.error('Roles fetch error:', errorData)
        toast({ title: 'Error', description: errorData.error || 'Failed to fetch roles', type: 'error' })
      }
    } catch (error) {
      console.error('Roles fetch error:', error)
      toast({ title: 'Error', description: 'Failed to fetch roles', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const fetchPermissions = async () => {
    try {
      const res = await fetch('/api/admin/rbac/permissions', {
        credentials: 'include'
      })
      if (res.ok) {
        const data = await res.json()
        setPermissionsByModule(data.permissionsByModule)
      } else {
        const errorData = await res.json()
        console.error('Permissions fetch error:', errorData)
      }
    } catch (error) {
      console.error('Permissions fetch error:', error)
    }
  }

  // Filtered and sorted roles
  const filteredRoles = roles

  // Handlers
  const handleCreate = async (roleData: { name: string; display_name: string; description: string; is_system: boolean }) => {
    try {
      const res = await fetch('/api/admin/rbac/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: roleData.name,
          display_name: roleData.display_name,
          description: roleData.description,
          permissions: selectedPermissions
        })
      })
      if (res.ok) {
        toast({ title: 'Success', description: 'Role created successfully', type: 'success' })
        setCreateModalOpen(false)
        setSelectedPermissions([])
        fetchRoles()
      } else {
        const error = await res.json()
        toast({ title: 'Error', description: error.error, type: 'error' })
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to create role', type: 'error' })
    }
  }

  const handleEdit = async (roleData: { name: string; display_name: string; description: string; is_system: boolean }) => {
    if (!selectedRole) return
    try {
      const res = await fetch(`/api/admin/rbac/roles/${selectedRole.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          display_name: roleData.display_name,
          description: roleData.description,
          permissions: selectedPermissions
        })
      })
      if (res.ok) {
        toast({ title: 'Success', description: 'Role updated successfully', type: 'success' })
        setEditModalOpen(false)
        fetchRoles()
      } else {
        const error = await res.json()
        toast({ title: 'Error', description: error.error, type: 'error' })
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update role', type: 'error' })
    }
  }

  const handleDelete = async () => {
    if (!selectedRole) return
    
    // Prevent deletion of system roles or roles with users assigned
    if (selectedRole.is_system) {
      toast({ title: 'Error', description: 'System roles cannot be deleted', type: 'error' })
      setDeleteModalOpen(false)
      return
    }
    
    if (selectedRole.user_count > 0) {
      toast({ title: 'Error', description: 'Cannot delete role that is assigned to users. Remove all assignments first.', type: 'error' })
      setDeleteModalOpen(false)
      return
    }
    
    try {
      const res = await fetch(`/api/admin/rbac/roles/${selectedRole.id}`, {
        method: 'DELETE',
        credentials: 'include'
      })
      if (res.ok) {
        toast({ title: 'Success', description: 'Role deleted successfully', type: 'success' })
        setDeleteModalOpen(false)
        fetchRoles()
      } else {
        const error = await res.json()
        toast({ title: 'Error', description: error.error, type: 'error' })
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete role', type: 'error' })
    }
  }

  const handleAssignPermissions = async (permissionIds: string[]) => {
    if (!selectedRole) return
    try {
      const res = await fetch(`/api/admin/rbac/roles/${selectedRole.id}/permissions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          permission_ids: permissionIds
        })
      })
      if (res.ok) {
        toast({ title: 'Success', description: 'Permissions assigned successfully', type: 'success' })
        setAssignModalOpen(false)
        fetchRoles()
      } else {
        const error = await res.json()
        toast({ title: 'Error', description: error.error, type: 'error' })
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to assign permissions', type: 'error' })
    }
  }

  const openCreateModal = () => {
    setSelectedPermissions([])
    setCreateModalOpen(true)
  }

  const openEditModal = (role: Role) => {
    setSelectedRole(role)
    setSelectedPermissions(role.permissions.map(p => p.id))
    setEditModalOpen(true)
  }

  const openAssignModal = (role: Role) => {
    setSelectedRole(role)
    setSelectedPermissions(role.permissions.map(p => p.id))
    setAssignModalOpen(true)
  }

  const openDeleteModal = (role: Role) => {
    setSelectedRole(role)
    setDeleteModalOpen(true)
  }


  return (
    <PermissionGuard permission="manage:rbac">
      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Shield className="h-8 w-8" />
              {t('title')}
            </h1>
            <p className="text-gray-600">{t('description')}</p>
          </div>
          <button 
            onClick={openCreateModal} 
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Plus size={16} />
            {t('createRole')}
          </button>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">{t('stats.totalRoles')}</p>
                  <p className="text-2xl font-bold">{roles.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-gray-600" />
                <div>
                  <p className="text-sm text-gray-600">{t('systemRole')}</p>
                  <p className="text-2xl font-bold">{roles.filter(r => r.is_system).length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm text-gray-600">{t('customRole')}</p>
                  <p className="text-2xl font-bold">{roles.filter(r => !r.is_system).length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="text-sm text-gray-600">{t('stats.usersWithRoles')}</p>
                  <p className="text-2xl font-bold">{roles.reduce((sum, r) => sum + r.user_count, 0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Table */}
        <RolesDataTable 
          roles={filteredRoles}
          loading={loading}
          onEdit={openEditModal}
          onDelete={openDeleteModal}
          onAssignPermissions={openAssignModal}
        />

        {/* Create Modal */}
        <RoleFormModal
          open={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          onSave={handleCreate}
          existingNames={roles.map(r => r.name)}
        />

        {/* Edit Modal */}
        <RoleFormModal
          open={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          role={selectedRole}
          onSave={handleEdit}
          existingNames={roles.filter(r => r.id !== selectedRole?.id).map(r => r.name)}
        />

        {/* Assign Permissions Modal */}
        <PermissionAssignmentModal
          roleId={selectedRole?.id || ''}
          roleName={selectedRole?.display_name || ''}
          currentPermissions={[]}
          open={assignModalOpen}
          onClose={() => setAssignModalOpen(false)}
          onSave={handleAssignPermissions}
        />

        {/* Delete Confirmation Dialog */}
        <DeleteConfirmationDialog
          open={deleteModalOpen}
          onClose={() => setDeleteModalOpen(false)}
          onConfirm={handleDelete}
          title="Delete Role"
          description="Are you sure you want to delete {itemName}? This action cannot be undone."
          itemName={selectedRole?.display_name || ''}
          itemType="role"
          dangerLevel={selectedRole?.is_system || (selectedRole?.user_count ?? 0) > 0 ? 'high' : 'medium'}
        />
      </div>
    </PermissionGuard>
  )
}