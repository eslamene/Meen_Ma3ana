'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  Shield, 
  Plus, 
  Edit, 
  Trash2, 
  Settings,
  AlertTriangle,
  Save,
  X,
  Heart,
  DollarSign,
  Bell,
  BarChart3,
  FileText,
  CreditCard,
  User,
  Package,
  Users
} from 'lucide-react'
import { useDatabaseRBAC } from '@/lib/hooks/useDatabaseRBAC'
import { dbRBAC, Role, Permission } from '@/lib/rbac/database-rbac'
import { PermissionGuard } from '@/components/auth/PermissionGuard'
import { useToast } from '@/hooks/use-toast'

// Modular Permissions Selector Component
interface ModularPermissionsSelectorProps {
  permissions: Permission[]
  selectedPermissions: string[]
  onPermissionChange: (permissionId: string, checked: boolean) => void
}

function ModularPermissionsSelector({ permissions, selectedPermissions, onPermissionChange }: ModularPermissionsSelectorProps) {
  // Group permissions by module/resource
  const groupedPermissions = permissions.reduce((acc: Record<string, { name: string, display_name: string, icon: React.ComponentType<{ className?: string }>, color: string, permissions: Permission[] }>, permission) => {
    const resourceKey = permission.resource || 'other'
    if (!acc[resourceKey]) {
      acc[resourceKey] = {
        name: resourceKey,  
        display_name: resourceKey.charAt(0).toUpperCase() + resourceKey.slice(1),
        icon: getModuleIcon(resourceKey),
        color: getModuleColor(resourceKey),
        permissions: []
      }
    }
    acc[resourceKey].permissions.push(permission)
    return acc
  }, {})

  function getModuleIcon(resource: string) {
    const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
      admin: Settings,
      cases: Heart,
      contributions: DollarSign,
      users: Users,
      notifications: Bell,
      reports: BarChart3,
      files: FileText,
      payments: CreditCard,
      profile: User,
      rbac: Shield
    }
    return iconMap[resource] || Package
  }

  function getModuleColor(resource: string) {
    const colorMap: { [key: string]: string } = {
      admin: 'red',
      cases: 'blue', 
      contributions: 'green',
      users: 'purple',
      notifications: 'yellow',
      reports: 'indigo',
      files: 'gray',
      payments: 'emerald',
      profile: 'orange',
      rbac: 'red'
    }
    return colorMap[resource] || 'gray'
  }

  function getColorClass(color: string) {
    const colorMap: { [key: string]: string } = {
      red: 'bg-red-100 text-red-800 border-red-200',
      blue: 'bg-blue-100 text-blue-800 border-blue-200',
      green: 'bg-green-100 text-green-800 border-green-200',
      purple: 'bg-purple-100 text-purple-800 border-purple-200',
      yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      indigo: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      gray: 'bg-gray-100 text-gray-800 border-gray-200',
      emerald: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      orange: 'bg-orange-100 text-orange-800 border-orange-200'
    }
    return colorMap[color] || colorMap['gray']
  }

  return (
    <div>
      <Label className="text-base font-medium mb-3 block">📦 Permissions by Module</Label>
      <div className="max-h-80 overflow-y-auto border rounded-lg">
        {Object.entries(groupedPermissions).map(([moduleKey, moduleData]) => {
          const IconComponent = moduleData.icon
          return (
            <div key={moduleKey} className="border-b border-gray-100 last:border-b-0">
              <div className="p-3 bg-gray-50 border-b border-gray-200">
                <div className="flex items-center gap-2">
                  <IconComponent className="h-4 w-4 text-gray-600" />
                  <span className="font-medium text-sm text-gray-900">{moduleData.display_name}</span>
                  <Badge variant="outline" className={`text-xs ${getColorClass(moduleData.color)}`}>
                    {moduleData.permissions.length}
                  </Badge>
                </div>
              </div>
              <div className="p-3 space-y-2">
                {moduleData.permissions.map((permission: Permission) => (
                  <div key={permission.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`perm-${permission.id}`}
                      checked={selectedPermissions.includes(permission.id)}
                      onCheckedChange={(checked) => onPermissionChange(permission.id, !!checked)}
                    />
                    <Label htmlFor={`perm-${permission.id}`} className="text-sm flex-1 cursor-pointer">
                      {permission.display_name}
                    </Label>
                    <code className="text-xs text-gray-500 bg-gray-100 px-1 rounded">
                      {permission.name}
                    </code>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

interface RoleFormData {
  name: string
  display_name: string
  description: string
  permissions: string[]
}

export default function RolesManagementPage() {
  const { roles, permissions, loading, refreshUserRoles } = useDatabaseRBAC()
  const { toast } = useToast()
  
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [roleFormData, setRoleFormData] = useState<RoleFormData>({
    name: '',
    display_name: '',
    description: '',
    permissions: []
  })
  
  const [showRoleDialog, setShowRoleDialog] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  // Get role permissions from API
  const fetchRolePermissions = async (roleId: string): Promise<string[]> => {
    try {
      const response = await fetch(`/api/admin/role-permissions?roleId=${roleId}`)
      const data = await response.json()
      
      if (data.success && data.role && data.role.role_permissions) {
        return data.role.role_permissions.map((rp: { permissions: { id: string } }) => rp.permissions.id)
      }
      return []
    } catch (error) {
      console.error('Error fetching role permissions:', error)
      return []
    }
  }

  // Handle role form submission
  const handleRoleSubmit = async () => {
    try {
      setSaving(true)
      
      if (isEditing && selectedRole) {
        // Update existing role
        await dbRBAC.updateRole(selectedRole.id, {
          display_name: roleFormData.display_name,
          description: roleFormData.description
        })
        
        // Update role permissions
        const permissionsResponse = await fetch('/api/admin/update-role-permissions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roleId: selectedRole.id,
            permissionIds: roleFormData.permissions
          })
        })
        
        const permissionsData = await permissionsResponse.json()
        
        if (!permissionsData.success) {
          throw new Error(permissionsData.error || 'Failed to update permissions')
        }
        
        toast({
          type: 'success',
          title: 'Success',
          description: 'Role and permissions updated successfully'
        })
        
        // Signal that RBAC has been updated
        localStorage.setItem('rbac_updated', Date.now().toString())
        window.dispatchEvent(new CustomEvent('rbac-updated'))
      } else {
        // Create new role
        const newRole = await dbRBAC.createRole({
          name: roleFormData.name,
          display_name: roleFormData.display_name,
          description: roleFormData.description,
          is_system: false
        })
        
        // Assign permissions to role
        for (const permissionId of roleFormData.permissions) {
          await dbRBAC.assignPermissionToRole(newRole.id, permissionId)
        }
        
        toast({
          type: 'success',
          title: 'Success',
          description: 'Role created successfully'
        })
      }
      
      setShowRoleDialog(false)
      resetRoleForm()
      // Refresh data
      window.location.reload()
    } catch (error) {
      console.error('Error saving role:', error)
      toast({
        type: 'error',
        title: 'Error',
        description: 'Failed to save role'
      })
    } finally {
      setSaving(false)
    }
  }

  // Reset forms
  const resetRoleForm = () => {
    setRoleFormData({
      name: '',
      display_name: '',
      description: '',
      permissions: []
    })
    setSelectedRole(null)
    setIsEditing(false)
  }

  // Edit role
  const editRole = async (role: Role) => {
    setSelectedRole(role)
    
    // Fetch current role permissions
    const currentPermissions = await fetchRolePermissions(role.id)
    
    setRoleFormData({
      name: role.name,
      display_name: role.display_name,
      description: role.description || '',
      permissions: currentPermissions
    })
    setIsEditing(true)
    setShowRoleDialog(true)
  }

  // Delete role
  const deleteRole = async (roleId: string) => {
    if (!confirm('Are you sure you want to delete this role?')) return
    
    try {
      await dbRBAC.deleteRole(roleId)
      toast({
        type: 'success',
        title: 'Success',
        description: 'Role deleted successfully'
      })
      window.location.reload()
    } catch (error) {
      console.error('Error deleting role:', error)
      toast({
        type: 'error',
        title: 'Error',
        description: 'Failed to delete role'
      })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading roles...</p>
        </div>
      </div>
    )
  }

  return (
    <PermissionGuard allowedPermissions={['admin:rbac']} fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
          <p className="text-gray-600">You don&apos;t have permission to manage roles.</p>
        </div>
      </div>
    }>
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Role Management</h1>
          <p className="text-gray-600">Create and manage user roles with specific permissions</p>
        </div>

        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Roles ({roles.length})</h2>
            <Dialog open={showRoleDialog} onOpenChange={setShowRoleDialog}>
              <DialogTrigger asChild>
                <Button onClick={() => { resetRoleForm(); setShowRoleDialog(true) }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Role
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{isEditing ? 'Edit Role' : 'Create New Role'}</DialogTitle>
                  <DialogDescription>
                    {isEditing ? 'Update role information and permissions' : 'Create a new role with specific permissions'}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="role-name">Role Name</Label>
                      <Input
                        id="role-name"
                        value={roleFormData.name}
                        onChange={(e) => setRoleFormData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="e.g., content_manager"
                        disabled={isEditing}
                      />
                    </div>
                    <div>
                      <Label htmlFor="role-display-name">Display Name</Label>
                      <Input
                        id="role-display-name"
                        value={roleFormData.display_name}
                        onChange={(e) => setRoleFormData(prev => ({ ...prev, display_name: e.target.value }))}
                        placeholder="e.g., Content Manager"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="role-description">Description</Label>
                    <Textarea
                      id="role-description"
                      value={roleFormData.description}
                      onChange={(e) => setRoleFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Describe what this role can do..."
                      rows={3}
                    />
                  </div>
                  <ModularPermissionsSelector 
                    permissions={permissions}
                    selectedPermissions={roleFormData.permissions}
                    onPermissionChange={(permissionId, checked) => {
                      if (checked) {
                        setRoleFormData(prev => ({
                          ...prev,
                          permissions: [...prev.permissions, permissionId]
                        }))
                      } else {
                        setRoleFormData(prev => ({
                          ...prev,
                          permissions: prev.permissions.filter(id => id !== permissionId)
                        }))
                      }
                    }}
                  />
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setShowRoleDialog(false)}>
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                    <Button onClick={handleRoleSubmit} disabled={saving}>
                      <Save className="h-4 w-4 mr-2" />
                      {saving ? 'Saving...' : (isEditing ? 'Update' : 'Create')}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4">
            {roles.map((role) => (
              <Card key={role.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Shield className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{role.display_name}</CardTitle>
                        <CardDescription>{role.name}</CardDescription>
                      </div>
                      {role.is_system && (
                        <Badge variant="secondary">System Role</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => editRole(role)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      {!role.is_system && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => deleteRole(role.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                {role.description && (
                  <CardContent>
                    <p className="text-sm text-gray-600">{role.description}</p>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        </div>
      </div>
    </PermissionGuard>
  )
}
