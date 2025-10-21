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
  X,
  Heart,
  DollarSign,
  Bell,
  BarChart3,
  FileText,
  CreditCard,
  User,
  Package
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useDatabaseRBAC } from '@/lib/hooks/useDatabaseRBAC'
import { dbRBAC, Role, Permission, UserWithRoles } from '@/lib/rbac/database-rbac'
import { PermissionGuard } from '@/components/auth/PermissionGuard'
import { useToast } from '@/components/ui/toast'

// Modular Permissions Selector Component
interface ModularPermissionsSelectorProps {
  permissions: Permission[]
  selectedPermissions: string[]
  onPermissionChange: (permissionId: string, checked: boolean) => void
}

function ModularPermissionsSelector({ permissions, selectedPermissions, onPermissionChange }: ModularPermissionsSelectorProps) {
  // Group permissions by module/resource
  const groupedPermissions = permissions.reduce((acc: Record<string, any>, permission) => {
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
    const iconMap: Record<string, React.ComponentType<any>> = {
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
  
  // Smart form helpers
  const [availableResources] = useState([
    'admin', 'cases', 'contributions', 'users', 'profile', 'notifications', 
    'reports', 'settings', 'analytics', 'payments', 'files', 'messages'
  ])
  
  const [availableActions] = useState([
    'create', 'read', 'update', 'delete', 'manage', 'approve', 'publish', 
    'archive', 'export', 'import', 'view', 'edit', 'remove'
  ])
  
  const [permissionTemplates] = useState([
    { resource: 'cases', action: 'create', display: 'Create Cases', desc: 'Allow creating new charity cases' },
    { resource: 'cases', action: 'read', display: 'View Cases', desc: 'Allow viewing case details and listings' },
    { resource: 'cases', action: 'update', display: 'Edit Cases', desc: 'Allow modifying existing cases' },
    { resource: 'cases', action: 'delete', display: 'Delete Cases', desc: 'Allow removing cases from system' },
    { resource: 'contributions', action: 'approve', display: 'Approve Contributions', desc: 'Allow approving or rejecting contributions' },
    { resource: 'users', action: 'manage', display: 'Manage Users', desc: 'Allow creating, updating, and deleting users' },
    { resource: 'admin', action: 'read', display: 'Access Admin Dashboard', desc: 'Allow viewing admin dashboard and analytics' }
  ])
  
  const [showRoleDialog, setShowRoleDialog] = useState(false)
  const [showPermissionDialog, setShowPermissionDialog] = useState(false)
  const [showUserRoleDialog, setShowUserRoleDialog] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  
  // User management state
  const [users, setUsers] = useState<any[]>([])
  const [userRoles, setUserRoles] = useState<any[]>([])
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [selectedUserRoles, setSelectedUserRoles] = useState<string[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)

  // Get role permissions from API
  const fetchRolePermissions = async (roleId: string): Promise<string[]> => {
    try {
      const response = await fetch(`/api/admin/role-permissions?roleId=${roleId}`)
      const data = await response.json()
      
      if (data.success && data.role && data.role.role_permissions) {
        return data.role.role_permissions.map((rp: any) => rp.permissions.id)
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

  // Handle permission form submission
  const handlePermissionSubmit = async () => {
    if (!permissionFormData.name || !permissionFormData.display_name) {
      toast({
        type: 'error',
        title: 'Validation Error',
        description: 'Permission name and display name are required'
      })
      return
    }
    
    try {
      setSaving(true)
      
      const url = '/api/admin/permissions'
      const method = isEditing ? 'PUT' : 'POST'
      const body = isEditing && selectedPermission 
        ? {
            id: selectedPermission.id,
            display_name: permissionFormData.display_name,
            description: permissionFormData.description
          }
        : {
            name: permissionFormData.name,
            display_name: permissionFormData.display_name,
            description: permissionFormData.description,
            resource: permissionFormData.resource,
            action: permissionFormData.action
          }
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      
      const data = await response.json()
      
      if (data.success) {
        toast({
          type: 'success',
          title: 'Success',
          description: `Permission ${isEditing ? 'updated' : 'created'} successfully`
        })
        setShowPermissionDialog(false)
        resetPermissionForm()
        fetchRolesAndPermissions() // Refresh permissions list
      } else {
        throw new Error(data.error || `Failed to ${isEditing ? 'update' : 'create'} permission`)
      }
    } catch (error) {
      console.error('Error saving permission:', error)
      toast({
        type: 'error',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save permission'
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

  // Fetch users and their roles
  const fetchUsers = async () => {
    try {
      setLoadingUsers(true)
      
      // Fetch all users from Supabase Auth
      const response = await fetch('/api/admin/users')
      const data = await response.json()
      
      if (data.success) {
        setUsers(data.users)
        setUserRoles(data.userRoles)
      } else {
        throw new Error(data.error || 'Failed to fetch users')
      }
    } catch (error) {
      console.error('Error fetching users:', error)
      toast({
        type: 'error',
        title: 'Error',
        description: 'Failed to fetch users'
      })
    } finally {
      setLoadingUsers(false)
    }
  }

  // Open user role assignment dialog
  const openUserRoleDialog = (user: any) => {
    setSelectedUser(user)
    
    // Get current user roles
    const currentRoles = userRoles
      .filter(ur => ur.user_id === user.id)
      .map(ur => ur.role_id)
    
    setSelectedUserRoles(currentRoles)
    setShowUserRoleDialog(true)
  }

  // Save user role assignments
  const saveUserRoles = async () => {
    if (!selectedUser) return
    
    try {
      setSaving(true)
      
      const response = await fetch('/api/admin/assign-user-roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUser.id,
          roleIds: selectedUserRoles
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        toast({
          type: 'success',
          title: 'Success',
          description: 'User roles updated successfully'
        })
        
        // Signal that RBAC has been updated
        localStorage.setItem('rbac_updated', Date.now().toString())
        window.dispatchEvent(new CustomEvent('rbac-updated'))
        
        setShowUserRoleDialog(false)
        fetchUsers() // Refresh user data
      } else {
        throw new Error(data.error || 'Failed to update user roles')
      }
    } catch (error) {
      console.error('Error saving user roles:', error)
      toast({
        type: 'error',
        title: 'Error',
        description: 'Failed to update user roles'
      })
    } finally {
      setSaving(false)
    }
  }

  // Toggle user role selection
  const toggleUserRole = (roleId: string) => {
    setSelectedUserRoles(prev => 
      prev.includes(roleId)
        ? prev.filter(id => id !== roleId)
        : [...prev, roleId]
    )
  }

  // Smart permission form helpers
  const generatePermissionName = (resource: string, action: string) => {
    if (!resource || !action) return ''
    return `${resource}:${action}`
  }

  const generateDisplayName = (resource: string, action: string) => {
    if (!resource || !action) return ''
    
    const actionMap: { [key: string]: string } = {
      'create': 'Create',
      'read': 'View', 
      'update': 'Edit',
      'delete': 'Delete',
      'manage': 'Manage',
      'approve': 'Approve',
      'publish': 'Publish',
      'archive': 'Archive',
      'export': 'Export',
      'import': 'Import',
      'view': 'View',
      'edit': 'Edit',
      'remove': 'Remove'
    }
    
    const resourceMap: { [key: string]: string } = {
      'admin': 'Admin',
      'cases': 'Cases',
      'contributions': 'Contributions', 
      'users': 'Users',
      'profile': 'Profile',
      'notifications': 'Notifications',
      'reports': 'Reports',
      'settings': 'Settings',
      'analytics': 'Analytics',
      'payments': 'Payments',
      'files': 'Files',
      'messages': 'Messages'
    }
    
    const actionText = actionMap[action] || action.charAt(0).toUpperCase() + action.slice(1)
    const resourceText = resourceMap[resource] || resource.charAt(0).toUpperCase() + resource.slice(1)
    
    return `${actionText} ${resourceText}`
  }

  const generateDescription = (resource: string, action: string) => {
    if (!resource || !action) return ''
    
    const template = permissionTemplates.find(t => t.resource === resource && t.action === action)
    if (template) return template.desc
    
    const actionDescMap: { [key: string]: string } = {
      'create': 'Allow creating new',
      'read': 'Allow viewing and accessing',
      'update': 'Allow modifying existing', 
      'delete': 'Allow removing',
      'manage': 'Allow full management of',
      'approve': 'Allow approving or rejecting',
      'publish': 'Allow publishing',
      'archive': 'Allow archiving',
      'export': 'Allow exporting data from',
      'import': 'Allow importing data to',
      'view': 'Allow viewing',
      'edit': 'Allow editing',
      'remove': 'Allow removing'
    }
    
    const actionDesc = actionDescMap[action] || `Allow ${action} operations on`
    return `${actionDesc} ${resource} in the system`
  }

  const applyTemplate = (template: typeof permissionTemplates[0]) => {
    setPermissionFormData({
      name: generatePermissionName(template.resource, template.action),
      display_name: template.display,
      description: template.desc,
      resource: template.resource,
      action: template.action
    })
  }

  const handlePermissionFieldChange = (field: keyof PermissionFormData, value: string) => {
    const newData = { ...permissionFormData, [field]: value }
    
    // Auto-generate dependent fields when resource or action changes
    if (field === 'resource' || field === 'action') {
      if (newData.resource && newData.action) {
        newData.name = generatePermissionName(newData.resource, newData.action)
        
        // Only auto-generate if fields are empty or were auto-generated
        if (!permissionFormData.display_name || permissionFormData.display_name === generateDisplayName(permissionFormData.resource, permissionFormData.action)) {
          newData.display_name = generateDisplayName(newData.resource, newData.action)
        }
        
        if (!permissionFormData.description || permissionFormData.description === generateDescription(permissionFormData.resource, permissionFormData.action)) {
          newData.description = generateDescription(newData.resource, newData.action)
        }
      }
    }
    
    setPermissionFormData(newData)
  }

  // Get user role names
  const getUserRoleNames = (userId: string): string[] => {
    return userRoles
      .filter(ur => ur.user_id === userId)
      .map(ur => {
        const role = roles.find(r => r.id === ur.role_id)
        return role?.display_name || 'Unknown'
      })
  }

  // Fetch users when component mounts
  useEffect(() => {
    fetchUsers()
  }, [])

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
                <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="text-xl">
                      {isEditing ? '✏️ Edit Permission' : '🆕 Create Smart Permission'}
                    </DialogTitle>
                    <DialogDescription>
                      {isEditing ? 'Update permission details' : 'Create a new permission with intelligent auto-generation and templates'}
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column - Quick Templates */}
                    <div className="lg:col-span-1">
                      <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        📋 Quick Templates
                      </h4>
                      <div className="space-y-2 max-h-80 overflow-y-auto">
                        {permissionTemplates.map((template, index) => (
                          <div
                            key={index}
                            onClick={() => applyTemplate(template)}
                            className="p-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-all duration-200 group"
                          >
                            <div className="font-medium text-sm text-gray-900 group-hover:text-blue-900">
                              {template.display}
                            </div>
                            <div className="text-xs text-blue-600 mt-1 font-mono bg-blue-100 px-2 py-1 rounded">
                              {template.resource}:{template.action}
                            </div>
                            <div className="text-xs text-gray-600 mt-2 line-clamp-2">
                              {template.desc}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Right Column - Smart Form */}
                    <div className="lg:col-span-2">
                      <div className="space-y-5">
                        {/* Resource & Action Selection */}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="perm-resource" className="text-sm font-medium flex items-center gap-2">
                              🏷️ Resource
                            </Label>
                            <Select 
                              value={permissionFormData.resource} 
                              onValueChange={(value) => handlePermissionFieldChange('resource', value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select resource..." />
                              </SelectTrigger>
                              <SelectContent>
                                {availableResources.map(resource => (
                                  <SelectItem key={resource} value={resource}>
                                    {resource.charAt(0).toUpperCase() + resource.slice(1)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div>
                            <Label htmlFor="perm-action" className="text-sm font-medium flex items-center gap-2">
                              ⚡ Action
                            </Label>
                            <Select 
                              value={permissionFormData.action} 
                              onValueChange={(value) => handlePermissionFieldChange('action', value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select action..." />
                              </SelectTrigger>
                              <SelectContent>
                                {availableActions.map(action => (
                                  <SelectItem key={action} value={action}>
                                    {action.charAt(0).toUpperCase() + action.slice(1)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {/* Auto-generated Permission Name */}
                        <div>
                          <Label htmlFor="perm-name" className="text-sm font-medium flex items-center gap-2">
                            🔑 Permission Name
                            <Badge variant="secondary" className="text-xs">auto-generated</Badge>
                          </Label>
                          <Input
                            id="perm-name"
                            value={permissionFormData.name}
                            onChange={(e) => handlePermissionFieldChange('name', e.target.value)}
                            placeholder="Select resource and action to auto-generate"
                            className="font-mono bg-gray-50"
                            disabled={isEditing}
                          />
                        </div>
                        
                        {/* Auto-generated Display Name */}
                        <div>
                          <Label htmlFor="perm-display-name" className="text-sm font-medium flex items-center gap-2">
                            📝 Display Name
                            <Badge variant="outline" className="text-xs">editable</Badge>
                          </Label>
                          <Input
                            id="perm-display-name"
                            value={permissionFormData.display_name}
                            onChange={(e) => handlePermissionFieldChange('display_name', e.target.value)}
                            placeholder="Human-readable permission name"
                          />
                        </div>
                        
                        {/* Auto-generated Description */}
                        <div>
                          <Label htmlFor="perm-description" className="text-sm font-medium flex items-center gap-2">
                            📄 Description
                            <Badge variant="outline" className="text-xs">editable</Badge>
                          </Label>
                          <Textarea
                            id="perm-description"
                            value={permissionFormData.description}
                            onChange={(e) => handlePermissionFieldChange('description', e.target.value)}
                            placeholder="Detailed description of what this permission allows"
                            rows={3}
                          />
                        </div>

                        {/* Live Preview */}
                        {permissionFormData.name && (
                          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                            <h5 className="text-sm font-semibold text-blue-900 mb-3 flex items-center gap-2">
                              🔍 Live Preview
                            </h5>
                            <div className="space-y-2 text-sm">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-700">Name:</span> 
                                <code className="bg-blue-100 px-2 py-1 rounded text-blue-800 font-mono text-xs">
                                  {permissionFormData.name}
                                </code>
                              </div>
                              <div className="flex items-start gap-2">
                                <span className="font-medium text-gray-700">Display:</span> 
                                <span className="text-gray-900">{permissionFormData.display_name}</span>
                              </div>
                              <div className="flex items-start gap-2">
                                <span className="font-medium text-gray-700">Description:</span> 
                                <span className="text-gray-700">{permissionFormData.description}</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-gray-200">
                    <Button variant="outline" onClick={() => setShowPermissionDialog(false)}>
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                    <Button 
                      onClick={handlePermissionSubmit} 
                      disabled={saving || !permissionFormData.name || !permissionFormData.display_name}
                      className="min-w-[120px]"
                    >
                      {saving ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          {isEditing ? 'Update' : 'Create'}
                        </>
                      )}
                    </Button>
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
              <Button onClick={() => fetchUsers()} disabled={loadingUsers}>
                {loadingUsers ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ) : (
                  <UserCheck className="h-4 w-4 mr-2" />
                )}
                Refresh Users
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>User Role Assignment</CardTitle>
                <CardDescription>
                  Manage user roles and permissions. Click on a user to assign or modify their roles.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingUsers ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-500">Loading users...</p>
                  </div>
                ) : users.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No users found</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {users.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                        onClick={() => openUserRoleDialog(user)}
                      >
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-blue-600 font-semibold">
                              {user.email?.charAt(0).toUpperCase() || 'U'}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium">{user.email}</p>
                            <p className="text-sm text-gray-500">
                              ID: {user.id.substring(0, 8)}...
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {getUserRoleNames(user.id).map((roleName) => (
                            <Badge key={roleName} variant="outline">
                              {roleName}
                            </Badge>
                          ))}
                          {getUserRoleNames(user.id).length === 0 && (
                            <Badge variant="outline" className="text-gray-400">
                              No roles
                            </Badge>
                          )}
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* User Role Assignment Dialog */}
        <Dialog open={showUserRoleDialog} onOpenChange={setShowUserRoleDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Assign Roles to User</DialogTitle>
              <DialogDescription>
                Select roles for {selectedUser?.email}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="space-y-3">
                {roles.map((role) => (
                  <div key={role.id} className="flex items-center space-x-3">
                    <Checkbox
                      id={`role-${role.id}`}
                      checked={selectedUserRoles.includes(role.id)}
                      onCheckedChange={() => toggleUserRole(role.id)}
                    />
                    <div className="flex-1">
                      <Label htmlFor={`role-${role.id}`} className="font-medium">
                        {role.display_name}
                      </Label>
                      <p className="text-sm text-gray-500">{role.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowUserRoleDialog(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button onClick={saveUserRoles} disabled={saving}>
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Roles
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </PermissionGuard>
  )
}
