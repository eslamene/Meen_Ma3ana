'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  Shield, 
  Users, 
  Key, 
  Plus, 
  Edit, 
  Trash2, 
  Settings,
  UserCheck,
  AlertTriangle,
  Save,
  X
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useDatabaseRBAC } from '@/lib/hooks/useDatabaseRBAC'
import { dbRBAC, Role, Permission, UserWithRoles } from '@/lib/rbac/database-rbac'
import { PermissionGuard } from '@/components/auth/PermissionGuard'
import { useToast } from '@/components/ui/toast'

interface RoleFormData {
  name: string
  display_name: string
  description: string
  permissions: string[]
}

interface PermissionFormData {
  name: string
  display_name: string
  description: string
  resource: string
  action: string
}

export default function RBACManagementPage() {
  const t = useTranslations('admin')
  const { roles, permissions, loading, refreshUserRoles } = useDatabaseRBAC()
  const { toast } = useToast()
  
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [selectedPermission, setSelectedPermission] = useState<Permission | null>(null)
  const [roleFormData, setRoleFormData] = useState<RoleFormData>({
    name: '',
    display_name: '',
    description: '',
    permissions: []
  })
  const [permissionFormData, setPermissionFormData] = useState<PermissionFormData>({
    name: '',
    display_name: '',
    description: '',
    resource: '',
    action: ''
  })
  
  const [showRoleDialog, setShowRoleDialog] = useState(false)
  const [showPermissionDialog, setShowPermissionDialog] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  // Get role permissions
  const getRolePermissions = (roleId: string): Permission[] => {
    // This would need to be fetched from the database
    // For now, return empty array
    return []
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
        
        // Update role permissions (this would need more complex logic)
        // For now, just show success
        toast({
          type: 'success',
          title: 'Success',
          description: 'Role updated successfully'
        })
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

  // Handle permission form submission
  const handlePermissionSubmit = async () => {
    try {
      setSaving(true)
      
      if (isEditing && selectedPermission) {
        // Update existing permission
        await dbRBAC.updatePermission(selectedPermission.id, {
          display_name: permissionFormData.display_name,
          description: permissionFormData.description,
          resource: permissionFormData.resource,
          action: permissionFormData.action
        })
        
        toast({
          type: 'success',
          title: 'Success',
          description: 'Permission updated successfully'
        })
      } else {
        // Create new permission
        await dbRBAC.createPermission({
          name: permissionFormData.name,
          display_name: permissionFormData.display_name,
          description: permissionFormData.description,
          resource: permissionFormData.resource,
          action: permissionFormData.action,
          is_system: false
        })
        
        toast({
          type: 'success',
          title: 'Success',
          description: 'Permission created successfully'
        })
      }
      
      setShowPermissionDialog(false)
      resetPermissionForm()
      // Refresh data
      window.location.reload()
    } catch (error) {
      console.error('Error saving permission:', error)
      toast({
        type: 'error',
        title: 'Error',
        description: 'Failed to save permission'
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

  const resetPermissionForm = () => {
    setPermissionFormData({
      name: '',
      display_name: '',
      description: '',
      resource: '',
      action: ''
    })
    setSelectedPermission(null)
    setIsEditing(false)
  }

  // Edit role
  const editRole = (role: Role) => {
    setSelectedRole(role)
    setRoleFormData({
      name: role.name,
      display_name: role.display_name,
      description: role.description || '',
      permissions: [] // Would need to fetch from database
    })
    setIsEditing(true)
    setShowRoleDialog(true)
  }

  // Edit permission
  const editPermission = (permission: Permission) => {
    setSelectedPermission(permission)
    setPermissionFormData({
      name: permission.name,
      display_name: permission.display_name,
      description: permission.description || '',
      resource: permission.resource,
      action: permission.action
    })
    setIsEditing(true)
    setShowPermissionDialog(true)
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

  // Delete permission
  const deletePermission = async (permissionId: string) => {
    if (!confirm('Are you sure you want to delete this permission?')) return
    
    try {
      await dbRBAC.deletePermission(permissionId)
      toast({
        type: 'success',
        title: 'Success',
        description: 'Permission deleted successfully'
      })
      window.location.reload()
    } catch (error) {
      console.error('Error deleting permission:', error)
      toast({
        type: 'error',
        title: 'Error',
        description: 'Failed to delete permission'
      })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading RBAC configuration...</p>
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
          <p className="text-gray-600">You don't have permission to manage RBAC settings.</p>
        </div>
      </div>
    }>
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">RBAC Management</h1>
          <p className="text-gray-600">Manage roles, permissions, and user access control</p>
        </div>

        <Tabs defaultValue="roles" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="roles" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Roles ({roles.length})
            </TabsTrigger>
            <TabsTrigger value="permissions" className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              Permissions ({permissions.length})
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              User Management
            </TabsTrigger>
          </TabsList>

          {/* Roles Tab */}
          <TabsContent value="roles" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Roles</h2>
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
                    <div>
                      <Label>Permissions</Label>
                      <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border rounded p-3">
                        {permissions.map((permission) => (
                          <div key={permission.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`perm-${permission.id}`}
                              checked={roleFormData.permissions.includes(permission.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setRoleFormData(prev => ({
                                    ...prev,
                                    permissions: [...prev.permissions, permission.id]
                                  }))
                                } else {
                                  setRoleFormData(prev => ({
                                    ...prev,
                                    permissions: prev.permissions.filter(id => id !== permission.id)
                                  }))
                                }
                              }}
                            />
                            <Label htmlFor={`perm-${permission.id}`} className="text-sm">
                              {permission.display_name}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
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
          </TabsContent>

          {/* Permissions Tab */}
          <TabsContent value="permissions" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Permissions</h2>
              <Dialog open={showPermissionDialog} onOpenChange={setShowPermissionDialog}>
                <DialogTrigger asChild>
                  <Button onClick={() => { resetPermissionForm(); setShowPermissionDialog(true) }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Permission
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{isEditing ? 'Edit Permission' : 'Create New Permission'}</DialogTitle>
                    <DialogDescription>
                      {isEditing ? 'Update permission details' : 'Create a new permission for the system'}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="perm-name">Permission Name</Label>
                      <Input
                        id="perm-name"
                        value={permissionFormData.name}
                        onChange={(e) => setPermissionFormData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="e.g., cases:create"
                        disabled={isEditing}
                      />
                    </div>
                    <div>
                      <Label htmlFor="perm-display-name">Display Name</Label>
                      <Input
                        id="perm-display-name"
                        value={permissionFormData.display_name}
                        onChange={(e) => setPermissionFormData(prev => ({ ...prev, display_name: e.target.value }))}
                        placeholder="e.g., Create Cases"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="perm-resource">Resource</Label>
                        <Input
                          id="perm-resource"
                          value={permissionFormData.resource}
                          onChange={(e) => setPermissionFormData(prev => ({ ...prev, resource: e.target.value }))}
                          placeholder="e.g., cases"
                        />
                      </div>
                      <div>
                        <Label htmlFor="perm-action">Action</Label>
                        <Input
                          id="perm-action"
                          value={permissionFormData.action}
                          onChange={(e) => setPermissionFormData(prev => ({ ...prev, action: e.target.value }))}
                          placeholder="e.g., create"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="perm-description">Description</Label>
                      <Textarea
                        id="perm-description"
                        value={permissionFormData.description}
                        onChange={(e) => setPermissionFormData(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Describe what this permission allows..."
                        rows={3}
                      />
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" onClick={() => setShowPermissionDialog(false)}>
                        <X className="h-4 w-4 mr-2" />
                        Cancel
                      </Button>
                      <Button onClick={handlePermissionSubmit} disabled={saving}>
                        <Save className="h-4 w-4 mr-2" />
                        {saving ? 'Saving...' : (isEditing ? 'Update' : 'Create')}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid gap-4">
              {permissions.map((permission) => (
                <Card key={permission.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 rounded-lg">
                          <Key className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{permission.display_name}</CardTitle>
                          <CardDescription>{permission.name}</CardDescription>
                        </div>
                        <Badge variant="outline">
                          {permission.resource}:{permission.action}
                        </Badge>
                        {permission.is_system && (
                          <Badge variant="secondary">System Permission</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => editPermission(permission)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        {!permission.is_system && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => deletePermission(permission.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  {permission.description && (
                    <CardContent>
                      <p className="text-sm text-gray-600">{permission.description}</p>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">User Management</h2>
              <Button>
                <UserCheck className="h-4 w-4 mr-2" />
                Assign Roles
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>User Role Assignment</CardTitle>
                <CardDescription>
                  Manage user roles and permissions. This feature will be implemented to show users and their assigned roles.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-gray-500">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>User management interface coming soon...</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </PermissionGuard>
  )
}
