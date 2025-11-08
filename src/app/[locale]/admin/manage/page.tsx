'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import PermissionGuard from '@/components/auth/PermissionGuard'
import { safeFetch } from '@/lib/utils/safe-fetch'
import { useAdmin } from '@/lib/admin/hooks'
import { UserRoleAssignmentModal } from '@/components/admin/rbac/UserRoleAssignmentModal'
import { RoleFormModal } from '@/components/admin/rbac/RoleFormModal'
import { PermissionAssignmentModal } from '@/components/admin/rbac/PermissionAssignmentModal'
import { PermissionFormModal } from '@/components/admin/rbac/PermissionFormModal'
import { RolesDataTable } from '@/components/admin/rbac/RolesDataTable'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { 
  Users, 
  Shield, 
  Key, 
  Menu,
  UserCheck, 
  UserX, 
  Search, 
  Plus,
  Settings,
  AlertTriangle,
  Edit2,
  Trash2
} from 'lucide-react'

// Types
interface User {
  id: string
  email: string
  display_name?: string
  roles: RoleAssignment[]
  created_at?: string
  last_sign_in_at?: string
}

interface RoleAssignment {
  id: string
  role_id: string
  name: string
  display_name: string
  description: string
  assigned_at: string
  assigned_by: string
}

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

interface MenuItem {
  id: string
  label: string
  label_ar?: string
  href: string
  icon?: string
  description?: string
  permission_id?: string
  permission?: Permission
  is_active: boolean
  sort_order: number
  parent_id?: string
  children?: MenuItem[]
}

interface Statistics {
  totalUsers: number
  usersWithRoles: number
  usersWithoutRoles: number
  totalRoles: number
  totalPermissions: number
  totalMenuItems: number
}

export default function UnifiedAdminManagementPage() {
  const [activeTab, setActiveTab] = useState('users')
  const [users, setUsers] = useState<User[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [manageRolesModal, setManageRolesModal] = useState<{
    open: boolean
    user?: User
  }>({ open: false })
  const [createRoleModal, setCreateRoleModal] = useState(false)
  const [editRoleModal, setEditRoleModal] = useState(false)
  const [assignPermissionsModal, setAssignPermissionsModal] = useState(false)
  const [createPermissionModal, setCreatePermissionModal] = useState(false)
  const [editPermissionModal, setEditPermissionModal] = useState(false)
  const [selectedRole, setSelectedRole] = useState<Role | undefined>(undefined)
  const [selectedPermission, setSelectedPermission] = useState<Permission | undefined>(undefined)
  const [menuRoleFilter, setMenuRoleFilter] = useState<string>('all')
  const { toast } = useToast()
  const { user: currentUser } = useAdmin()

  // Fetch all data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const [usersRes, rolesRes, permissionsRes, menuRes] = await Promise.all([
        safeFetch('/api/admin/users'),
        safeFetch('/api/admin/roles'),
        safeFetch('/api/admin/permissions'),
        safeFetch('/api/admin/menu?all=true')
      ])

      if (usersRes.ok) {
        setUsers(usersRes.data?.users || [])
      }
      
      if (rolesRes.ok) {
        // Roles already have permissions_count and users_count from API
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
      
      if (menuRes.ok) {
        setMenuItems(menuRes.data?.menuItems || [])
      }
    } catch (error) {
      console.error('Fetch error:', error)
      toast({
        title: 'Error',
        description: 'Failed to fetch data',
        type: 'error'
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Calculate statistics
  const statistics: Statistics = useMemo(() => {
    const totalUsers = users.length
    const usersWithRoles = users.filter(u => u.roles.length > 0).length
    const usersWithoutRoles = totalUsers - usersWithRoles
    const totalRoles = roles.length
    const totalPermissions = permissions.length
    const totalMenuItems = menuItems.length

    return {
      totalUsers,
      usersWithRoles,
      usersWithoutRoles,
      totalRoles,
      totalPermissions,
      totalMenuItems
    }
  }, [users, roles, permissions, menuItems])

  // Filter users
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesSearch = user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (user.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
      
      const matchesRole = roleFilter === 'all' || 
                         (roleFilter === 'no-roles' && user.roles.length === 0) ||
                         user.roles.some(role => role.name === roleFilter)

      return matchesSearch && matchesRole
    })
  }, [users, searchTerm, roleFilter])

  // Handle role assignment
  const handleRoleAssignment = async (userId: string, roleIds: string[]) => {
    try {
      console.log('Assigning roles:', { userId, roleIds })
      const res = await fetch(`/api/admin/users/${userId}/roles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ role_ids: roleIds })
      })

      const data = await res.json()
      console.log('Role assignment response:', { status: res.status, data })

      if (res.ok) {
        toast({
          title: 'Success',
          description: `Roles updated: ${data.added || 0} added, ${data.removed || 0} removed`,
          type: 'success'
        })
        // Refresh data after a short delay to ensure DB is updated
        setTimeout(() => {
          fetchData()
        }, 500)
        setManageRolesModal({ open: false })
      } else {
        console.error('Role assignment failed:', data)
        toast({
          title: 'Error',
          description: data.error || data.details || 'Failed to assign roles',
          type: 'error'
        })
      }
    } catch (error) {
      console.error('Role assignment error:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to assign roles',
        type: 'error'
      })
    }
  }

  // Handle role operations
  const handleCreateRole = async (roleData: { name: string; display_name: string; description: string }) => {
    try {
      const res = await fetch('/api/admin/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(roleData)
      })

      if (res.ok) {
        toast({ title: 'Success', description: 'Role created successfully', type: 'success' })
        setCreateRoleModal(false)
        fetchData()
      } else {
        const error = await res.json()
        toast({ title: 'Error', description: error.error || 'Failed to create role', type: 'error' })
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to create role', type: 'error' })
    }
  }

  const handleEditRole = async (roleData: { display_name: string; description: string }) => {
    if (!selectedRole) return
    try {
      const res = await fetch(`/api/admin/roles/${selectedRole.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(roleData)
      })

      if (res.ok) {
        toast({ title: 'Success', description: 'Role updated successfully', type: 'success' })
        setEditRoleModal(false)
        fetchData()
      } else {
        const error = await res.json()
        toast({ title: 'Error', description: error.error || 'Failed to update role', type: 'error' })
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update role', type: 'error' })
    }
  }

  const handleAssignPermissions = async (roleId: string, permissionIds: string[]) => {
    try {
      console.log('Assigning permissions:', { roleId, permissionIds })
      const res = await fetch(`/api/admin/roles/${roleId}/permissions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ permission_ids: permissionIds })
      })

      const data = await res.json()
      console.log('Permission assignment response:', { status: res.status, data })

      if (res.ok) {
        toast({ 
          title: 'Success', 
          description: `Permissions updated: ${permissionIds.length} permissions assigned`, 
          type: 'success' 
        })
        setAssignPermissionsModal(false)
        // Refresh data after a short delay to ensure DB is updated
        setTimeout(() => {
          fetchData()
        }, 500)
      } else {
        console.error('Permission assignment failed:', data)
        toast({ 
          title: 'Error', 
          description: data.error || data.details || 'Failed to assign permissions', 
          type: 'error' 
        })
      }
    } catch (error) {
      console.error('Permission assignment error:', error)
      toast({ 
        title: 'Error', 
        description: error instanceof Error ? error.message : 'Failed to assign permissions', 
        type: 'error' 
      })
    }
  }

  // Handle permission operations
  const handleCreatePermission = async (permissionData: {
    name: string
    display_name: string
    description: string
    resource: string
    action: string
  }) => {
    try {
      const res = await fetch('/api/admin/permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(permissionData)
      })

      if (res.ok) {
        toast({ title: 'Success', description: 'Permission created successfully', type: 'success' })
        setCreatePermissionModal(false)
        fetchData()
      } else {
        const error = await res.json()
        toast({ title: 'Error', description: error.error || 'Failed to create permission', type: 'error' })
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to create permission', type: 'error' })
    }
  }

  const handleEditPermission = async (permissionData: {
    display_name: string
    description: string
  }) => {
    if (!selectedPermission) return
    try {
      const res = await fetch(`/api/admin/permissions/${selectedPermission.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(permissionData)
      })

      if (res.ok) {
        toast({ title: 'Success', description: 'Permission updated successfully', type: 'success' })
        setEditPermissionModal(false)
        fetchData()
      } else {
        const error = await res.json()
        toast({ title: 'Error', description: error.error || 'Failed to update permission', type: 'error' })
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update permission', type: 'error' })
    }
  }

  // Handle menu item operations
  const handleUpdateMenuItemPermission = async (menuItemId: string, permissionId: string | null) => {
    try {
      const res = await fetch(`/api/admin/menu/${menuItemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ permission_id: permissionId })
      })

      if (res.ok) {
        toast({ title: 'Success', description: 'Menu item updated successfully', type: 'success' })
        fetchData()
      } else {
        const error = await res.json()
        toast({ title: 'Error', description: error.error || 'Failed to update menu item', type: 'error' })
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update menu item', type: 'error' })
    }
  }

  // Build menu tree
  const buildMenuTree = (items: MenuItem[]): MenuItem[] => {
    const itemMap = new Map<string, MenuItem>()
    const roots: MenuItem[] = []

    items.forEach(item => {
      itemMap.set(item.id, { ...item, children: [] })
    })

    items.forEach(item => {
      const menuItem = itemMap.get(item.id)!
      if (item.parent_id && itemMap.has(item.parent_id)) {
        const parent = itemMap.get(item.parent_id)!
        if (!parent.children) parent.children = []
        parent.children.push(menuItem)
      } else {
        roots.push(menuItem)
      }
    })

    return roots.sort((a, b) => a.sort_order - b.sort_order)
  }

  const menuTree = useMemo(() => buildMenuTree(menuItems), [menuItems])

  // Filter menu items by role (via permissions)
  const filteredMenuItems = useMemo(() => {
    if (menuRoleFilter === 'all') return menuTree
    
    const role = roles.find(r => r.id === menuRoleFilter)
    if (!role || !role.permissions) return menuTree

    const rolePermissionIds = new Set(role.permissions.map(p => p.id))
    
    const filterMenu = (items: MenuItem[]): MenuItem[] => {
      return items
        .filter(item => !item.permission_id || rolePermissionIds.has(item.permission_id))
        .map(item => ({
          ...item,
          children: item.children ? filterMenu(item.children) : []
        }))
    }

    return filterMenu(menuTree)
  }, [menuTree, menuRoleFilter, roles])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <PermissionGuard permission="manage:rbac">
      <div className="space-y-6 p-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Admin Management</h1>
          <p className="text-muted-foreground mt-2">
            Manage users, roles, permissions, and menu items
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.totalUsers}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Users with Roles</CardTitle>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.usersWithRoles}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Roles</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.totalRoles}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Permissions</CardTitle>
              <Key className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.totalPermissions}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Menu Items</CardTitle>
              <Menu className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.totalMenuItems}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Users w/o Roles</CardTitle>
              <UserX className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.usersWithoutRoles}</div>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="users">
              <Users className="h-4 w-4 mr-2" />
              Users
            </TabsTrigger>
            <TabsTrigger value="roles">
              <Shield className="h-4 w-4 mr-2" />
              Roles
            </TabsTrigger>
            <TabsTrigger value="permissions">
              <Key className="h-4 w-4 mr-2" />
              Permissions
            </TabsTrigger>
            <TabsTrigger value="menus">
              <Menu className="h-4 w-4 mr-2" />
              Menus
            </TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>User Management</CardTitle>
                    <CardDescription>Manage users and assign roles</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Search and Filter */}
                <div className="flex gap-4 mb-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search users..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Filter by role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      <SelectItem value="no-roles">No Roles</SelectItem>
                      {roles.map(role => (
                        <SelectItem key={role.id} value={role.name}>
                          {role.display_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Users Table */}
                <div className="space-y-2">
                  {filteredUsers.map(user => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-4">
                        <Avatar>
                          <AvatarFallback>
                            {user.email.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{user.email}</div>
                          <div className="text-sm text-muted-foreground">
                            {user.roles.length > 0 ? (
                              <div className="flex gap-2 mt-1">
                                {user.roles.map(role => (
                                  <Badge key={role.id} variant="outline">
                                    {role.display_name}
                                  </Badge>
                                ))}
                              </div>
                            ) : (
                              <span className="text-orange-600">No roles assigned</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setManageRolesModal({ open: true, user })}
                      >
                        <Settings className="h-4 w-4 mr-2" />
                        Manage Roles
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Roles Tab */}
          <TabsContent value="roles" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Role Management</CardTitle>
                    <CardDescription>Create and manage roles, assign permissions</CardDescription>
                  </div>
                  <Button onClick={() => setCreateRoleModal(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Role
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
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
              </CardContent>
            </Card>
          </TabsContent>

          {/* Permissions Tab */}
          <TabsContent value="permissions" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Permission Management</CardTitle>
                    <CardDescription>Create and manage permissions</CardDescription>
                  </div>
                  <Button onClick={() => setCreatePermissionModal(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Permission
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {permissions.map(permission => (
                    <div
                      key={permission.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div>
                        <div className="font-medium">{permission.display_name}</div>
                        <div className="text-sm text-muted-foreground">
                          {permission.name} • {permission.resource}:{permission.action}
                        </div>
                        {permission.description && (
                          <div className="text-sm text-muted-foreground mt-1">
                            {permission.description}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Badge variant={permission.is_system ? 'default' : 'outline'}>
                          {permission.is_system ? 'System' : 'Custom'}
                        </Badge>
                        {!permission.is_system && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedPermission(permission)
                                setEditPermissionModal(true)
                              }}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Menus Tab */}
          <TabsContent value="menus" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Menu Management</CardTitle>
                    <CardDescription>Manage menu items and their visibility by role</CardDescription>
                  </div>
                  <Select value={menuRoleFilter} onValueChange={setMenuRoleFilter}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Filter by role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      {roles.map(role => (
                        <SelectItem key={role.id} value={role.id}>
                          {role.display_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {filteredMenuItems.map(item => (
                    <MenuItemComponent
                      key={item.id}
                      item={item}
                      permissions={permissions}
                      roles={roles}
                      onUpdatePermission={handleUpdateMenuItemPermission}
                      level={0}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Modals */}
        {manageRolesModal.open && manageRolesModal.user && (
          <UserRoleAssignmentModal
            open={manageRolesModal.open}
            onClose={() => setManageRolesModal({ open: false })}
            userId={manageRolesModal.user.id}
            userEmail={manageRolesModal.user.email}
            currentRoles={manageRolesModal.user.roles.map(r => r.role_id)}
            allRoles={roles}
            onSave={(roleIds) => handleRoleAssignment(manageRolesModal.user!.id, roleIds)}
          />
        )}

        {createRoleModal && (
          <RoleFormModal
            open={createRoleModal}
            onClose={() => setCreateRoleModal(false)}
            onSubmit={handleCreateRole}
          />
        )}

        {editRoleModal && selectedRole && (
          <RoleFormModal
            open={editRoleModal}
            onClose={() => {
              setEditRoleModal(false)
              setSelectedRole(undefined)
            }}
            onSubmit={handleEditRole}
            role={selectedRole}
          />
        )}

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

        {createPermissionModal && (
          <PermissionFormModal
            open={createPermissionModal}
            onClose={() => setCreatePermissionModal(false)}
            onSubmit={handleCreatePermission}
          />
        )}

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

// Menu Item Component (recursive)
function MenuItemComponent({
  item,
  permissions,
  roles,
  onUpdatePermission,
  level = 0
}: {
  item: MenuItem
  permissions: Permission[]
  roles: Role[]
  onUpdatePermission: (menuItemId: string, permissionId: string | null) => void
  level?: number
}) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [showPermissionSelect, setShowPermissionSelect] = useState(false)

  // Find which roles can see this menu item
  const visibleRoles = useMemo(() => {
    if (!item.permission_id) return roles // Public menu item
    return roles.filter(role => 
      role.permissions?.some(p => p.id === item.permission_id)
    )
  }, [item.permission_id, roles])

  return (
    <div className={`border rounded-lg ${level > 0 ? 'ml-6 mt-2' : ''}`}>
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3 flex-1">
          {item.children && item.children.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? '▼' : '▶'}
            </Button>
          )}
          <div className="flex-1">
            <div className="font-medium">{item.label}</div>
            <div className="text-sm text-muted-foreground">{item.href}</div>
            {item.permission_id && (
              <div className="mt-2">
                <div className="text-xs text-muted-foreground mb-1">Visible to roles:</div>
                <div className="flex gap-1 flex-wrap">
                  {visibleRoles.map(role => (
                    <Badge key={role.id} variant="outline" className="text-xs">
                      {role.display_name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={item.permission_id || 'none'}
            onValueChange={(value) => {
              onUpdatePermission(item.id, value === 'none' ? null : value)
              setShowPermissionSelect(false)
            }}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select permission" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No Permission (Public)</SelectItem>
              {permissions.map(perm => (
                <SelectItem key={perm.id} value={perm.id}>
                  {perm.display_name} ({perm.name})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      {isExpanded && item.children && item.children.length > 0 && (
        <div className="pl-4 pb-2">
          {item.children.map(child => (
            <MenuItemComponent
              key={child.id}
              item={child}
              permissions={permissions}
              roles={roles}
              onUpdatePermission={onUpdatePermission}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}

