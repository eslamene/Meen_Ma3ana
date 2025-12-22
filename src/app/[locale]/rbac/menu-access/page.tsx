'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import PermissionGuard from '@/components/auth/PermissionGuard'
import Container from '@/components/layout/Container'
import { useLayout } from '@/components/layout/LayoutProvider'
import { safeFetch } from '@/lib/utils/safe-fetch'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Menu, ChevronDown, ChevronRight, Shield, Users } from 'lucide-react'
import DetailPageHeader from '@/components/crud/DetailPageHeader'
import { useParams } from 'next/navigation'

import { defaultLogger as logger } from '@/lib/logger'

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
  const params = useParams()
  const locale = params.locale as string
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
      logger.error('Fetch error:', { error: error })
      toast.error('Error', { description: error instanceof Error ? error.message : 'Failed to fetch data' })
    } finally {
      setLoading(false)
    }
  }, [])

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

  return (
    <PermissionGuard permission="admin:menu">
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/30">
        <Container variant={containerVariant} className="py-6 sm:py-8 lg:py-10">
          {/* Header */}
          <DetailPageHeader
            backUrl={`/${locale}/rbac`}
            icon={Menu}
            title="Menu Access Management"
            description="Manage menu items and their visibility by role"
            showBackButton={false}
            badge={{
              label: `${menuItems.length} ${menuItems.length === 1 ? 'item' : 'items'}`,
              variant: 'secondary'
            }}
          />

          {/* Filter and Menu Items */}
          <Card className="border border-gray-200 shadow-sm">
            <CardContent className="p-4 sm:p-6">
              {/* Role Filter */}
              <div className="mb-6 pb-4 border-b border-gray-200">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-1">Filter by Role</h3>
                    <p className="text-xs text-gray-600">View menu items visible to a specific role</p>
                  </div>
                  <Select value={menuRoleFilter} onValueChange={setMenuRoleFilter}>
                    <SelectTrigger className="w-full sm:w-[200px] h-10">
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
              </div>

              {/* Menu Items List */}
              {loading ? (
                <div className="text-center py-12">
                  <div className="inline-block">
                    <div className="h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-sm text-gray-600">Loading menu items...</p>
                  </div>
                </div>
              ) : filteredMenuItems.length === 0 ? (
                <div className="text-center py-12">
                  <Menu className="h-12 w-12 mx-auto mb-4 text-gray-400 opacity-50" />
                  <p className="text-sm text-gray-600">No menu items found</p>
                </div>
              ) : (
                <div className="space-y-3">
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
              )}
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

  const hasChildren = item.children && item.children.length > 0

  return (
    <div className={`${level > 0 ? 'ml-4 sm:ml-6 mt-2' : ''}`}>
      <Card className="border border-gray-200 bg-white hover:shadow-md transition-all duration-200">
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            {/* Left: Menu Item Info */}
            <div className="flex items-start gap-3 flex-1 min-w-0">
              {hasChildren && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="h-7 w-7 p-0 shrink-0 hover:bg-indigo-50 hover:text-indigo-600"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
              )}
              {!hasChildren && <div className="w-7" />}
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h4 className="font-semibold text-sm sm:text-base text-gray-900 truncate">
                    {item.label}
                  </h4>
                  {item.is_active ? (
                    <Badge variant="default" className="text-xs bg-green-500">
                      Active
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs text-gray-500">
                      Inactive
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-gray-500 truncate mb-2">{item.href}</p>
                
                {item.permission_id && visibleRoles.length > 0 && (
                  <div className="mt-2">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Users className="h-3 w-3 text-gray-400" />
                      <span className="text-xs font-medium text-gray-600">Visible to roles:</span>
                    </div>
                    <div className="flex gap-1.5 flex-wrap">
                      {visibleRoles.map(role => (
                        <Badge key={role.id} variant="secondary" className="text-xs font-medium">
                          {role.display_name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                {!item.permission_id && (
                  <div className="mt-2">
                    <Badge variant="outline" className="text-xs bg-gray-50 text-gray-600">
                      <Shield className="h-3 w-3 mr-1" />
                      Public Access
                    </Badge>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Permission Selector */}
            <div className="flex items-center gap-2 shrink-0">
              <Select
                value={item.permission_id || 'none'}
                onValueChange={(value) => {
                  onUpdatePermission(item.id, value === 'none' ? null : value)
                }}
              >
                <SelectTrigger className="w-full sm:w-[220px] h-9 text-xs sm:text-sm">
                  <SelectValue placeholder="Select permission" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  <SelectItem value="none">No Permission (Public)</SelectItem>
                  {permissions.map(perm => (
                    <SelectItem key={perm.id} value={perm.id} className="text-xs sm:text-sm">
                      <div className="flex flex-col">
                        <span className="font-medium">{perm.display_name}</span>
                        <span className="text-xs text-gray-500">{perm.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Children */}
      {isExpanded && hasChildren && (
        <div className="mt-3 space-y-3">
          {item.children!.map(child => (
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

