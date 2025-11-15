'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import PermissionGuard from '@/components/auth/PermissionGuard'
import Container from '@/components/layout/Container'
import { useLayout } from '@/components/layout/LayoutProvider'
import { safeFetch } from '@/lib/utils/safe-fetch'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Menu } from 'lucide-react'

// Types
interface Permission {
  id: string
  name: string
  display_name: string
  description: string
  resource: string
  action: string
  is_system: boolean
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

export default function MenuAccessPage() {
  const { containerVariant } = useLayout()
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [loading, setLoading] = useState(true)
  const [menuRoleFilter, setMenuRoleFilter] = useState<string>('all')

  // Fetch all data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const [rolesRes, permissionsRes, menuRes] = await Promise.all([
        safeFetch('/api/admin/roles'),
        safeFetch('/api/admin/permissions'),
        safeFetch('/api/admin/menu?all=true')
      ])

      if (rolesRes.ok) {
        setRoles(rolesRes.data?.roles || [])
      }
      
      if (permissionsRes.ok) {
        setPermissions(permissionsRes.data?.permissions || [])
      }

      if (menuRes.ok) {
        setMenuItems(menuRes.data?.menuItems || [])
      }
    } catch (error) {
      console.error('Fetch error:', error)
      toast.error('Error', { description: error instanceof Error ? error.message : 'Failed to fetch data' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchData()
  }, [fetchData])

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
        toast.success('Success', { description: 'Menu item updated successfully' })   
        fetchData()
      } else {
        const error = await res.json()
        toast.error('Error', { description: error.error || 'Failed to update menu item' })
      }
    } catch (error) {
      toast.error('Error', { description: 'Failed to update menu item' })
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
    <PermissionGuard permission="admin:menu">
      <div className="min-h-screen bg-gray-50">
        <Container variant={containerVariant} className="py-6">
        <div>
          <h1 className="text-3xl font-bold">Menu Access Management</h1>
          <p className="text-muted-foreground">
            Manage menu items and their visibility by role
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Menu Access</CardTitle>
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
        </Container>
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

