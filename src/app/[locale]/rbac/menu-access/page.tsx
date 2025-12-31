'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import PermissionGuard from '@/components/auth/PermissionGuard'
import Container from '@/components/layout/Container'
import { useLayout } from '@/components/layout/LayoutProvider'
import { safeFetch } from '@/lib/utils/safe-fetch'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { 
  Menu, 
  ChevronDown, 
  ChevronRight, 
  Shield, 
  Users, 
  Grid3x3,
  List,
  CheckSquare,
  XSquare,
  Search,
  Filter,
  Save,
  RefreshCw
} from 'lucide-react'
import DetailPageHeader from '@/components/crud/DetailPageHeader'
import { useParams } from 'next/navigation'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
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

type ViewMode = 'matrix' | 'list' | 'tree'

export default function MenuAccessPage() {
  const { containerVariant } = useLayout()
  const params = useParams()
  const locale = params.locale as string
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('matrix')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('all')
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [pendingChanges, setPendingChanges] = useState<Map<string, string | null>>(new Map())
  const [saving, setSaving] = useState(false)

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
        const rolesData = (rolesRes.data?.roles || []).map((role: any) => ({
          ...role,
          permissions: role.permissions || [],
          permissions_count: role.permissions_count || role.permissions?.length || 0,
          users_count: role.users_count || 0
        }))
        setRoles(rolesData)
        // Expand all items by default
        const allItemIds = new Set<string>()
        const collectIds = (items: MenuItem[]) => {
          items.forEach(item => {
            allItemIds.add(item.id)
            if (item.children) collectIds(item.children)
          })
        }
        if (menuRes.ok) {
          const items = menuRes.data?.menuItems || []
          collectIds(buildMenuTree(items))
          setExpandedItems(allItemIds)
        }
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

  // Flatten menu tree for matrix view
  const flattenMenuTree = useCallback((items: MenuItem[], level = 0): MenuItem[] => {
    const result: MenuItem[] = []
    items.forEach(item => {
      result.push({ ...item, sort_order: level * 1000 + item.sort_order })
      if (item.children && expandedItems.has(item.id)) {
        result.push(...flattenMenuTree(item.children, level + 1))
      }
    })
    return result
  }, [expandedItems])

  // Filter menu items
  const filteredMenuItems = useMemo(() => {
    let filtered = menuTree

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      const filterItems = (items: MenuItem[]): MenuItem[] => {
        return items
          .filter(item => 
            item.label.toLowerCase().includes(term) ||
            item.href.toLowerCase().includes(term) ||
            item.description?.toLowerCase().includes(term) ||
            item.permission?.display_name.toLowerCase().includes(term) ||
            item.permission?.name.toLowerCase().includes(term)
          )
          .map(item => ({
            ...item,
            children: item.children ? filterItems(item.children) : []
          }))
      }
      filtered = filterItems(menuTree)
    }

    // Filter by role
    if (selectedRoleFilter !== 'all') {
      const role = roles.find(r => r.id === selectedRoleFilter)
      if (role && role.permissions) {
        const rolePermissionIds = new Set(role.permissions.map(p => p.id))
        const filterByRole = (items: MenuItem[]): MenuItem[] => {
          return items
            .filter(item => !item.permission_id || rolePermissionIds.has(item.permission_id))
            .map(item => ({
              ...item,
              children: item.children ? filterByRole(item.children) : []
            }))
        }
        filtered = filterByRole(filtered)
      }
    }

    return filtered
  }, [menuTree, searchTerm, selectedRoleFilter, roles])

  // Check if a role has access to a menu item
  const hasAccess = useCallback((menuItem: MenuItem, role: Role): boolean => {
    if (!menuItem.permission_id) return true // Public item
    return role.permissions?.some(p => p.id === menuItem.permission_id) || false
  }, [])

  // Toggle access for a role
  const toggleAccess = useCallback((menuItem: MenuItem, role: Role) => {
    if (!menuItem.permission_id) {
      // Public menu items - can't toggle access
      toast.info('Info', { description: 'This menu item is public and accessible to all roles' })
      return
    }

    const key = `${menuItem.id}:${role.id}`
    const currentAccess = hasAccess(menuItem, role)
    
    setPendingChanges(prev => {
      const newMap = new Map(prev)
      if (currentAccess) {
        // Remove access - mark for removal
        newMap.set(key, 'remove')
      } else {
        // Add access - mark for addition
        newMap.set(key, menuItem.permission_id || null)
      }
      return newMap
    })
  }, [hasAccess])

  // Bulk operations
  const handleBulkOperation = useCallback(async (
    operation: 'grant' | 'revoke',
    roleId: string,
    menuItems: MenuItem[]
  ) => {
    try {
      setSaving(true)
      const role = roles.find(r => r.id === roleId)
      if (!role) return

      // Get current role permissions
      const currentPermissionIds = new Set(role.permissions?.map(p => p.id) || [])
      const permissionIdsToUpdate = new Set(currentPermissionIds)

      // Apply bulk operation
      menuItems.forEach(item => {
        if (!item.permission_id) return // Skip public items
        
        if (operation === 'grant') {
          permissionIdsToUpdate.add(item.permission_id)
        } else if (operation === 'revoke') {
          permissionIdsToUpdate.delete(item.permission_id)
        }
      })

      // Update role permissions
      const response = await fetch(`/api/admin/roles/${roleId}/permissions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ permission_ids: Array.from(permissionIdsToUpdate) })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || `Failed to ${operation} access`)
      }

      toast.success('Success', { description: `Bulk ${operation} completed` })
      setPendingChanges(new Map())
      fetchData()
    } catch (error) {
      toast.error('Error', { description: error instanceof Error ? error.message : `Failed to ${operation} access` })
    } finally {
      setSaving(false)
    }
  }, [roles, fetchData])

  // Save pending changes
  const handleSaveChanges = useCallback(async () => {
    try {
      setSaving(true)
      
      // Group changes by role
      const roleChanges = new Map<string, { add: Set<string>, remove: Set<string> }>()
      
      pendingChanges.forEach((value, key) => {
        const [, roleId] = key.split(':')
        if (!roleChanges.has(roleId)) {
          roleChanges.set(roleId, { add: new Set(), remove: new Set() })
        }
        
        const changes = roleChanges.get(roleId)!
        if (value === 'remove') {
          // Find the menu item's permission to remove
          const [menuItemId] = key.split(':')
          const menuItem = flatMenuItems.find(m => m.id === menuItemId)
          if (menuItem?.permission_id) {
            changes.remove.add(menuItem.permission_id)
          }
        } else if (value) {
          changes.add.add(value)
        }
      })

      // Update each role's permissions
      const updatePromises = Array.from(roleChanges.entries()).map(async ([roleId, changes]) => {
        const role = roles.find(r => r.id === roleId)
        if (!role) return

        // Get current permissions
        const currentPermissionIds = new Set(role.permissions?.map(p => p.id) || [])
        
        // Apply changes
        changes.remove.forEach(permId => currentPermissionIds.delete(permId))
        changes.add.forEach(permId => currentPermissionIds.add(permId))
        
        // Update role permissions
        const response = await fetch(`/api/admin/roles/${roleId}/permissions`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ permission_ids: Array.from(currentPermissionIds) })
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || `Failed to update permissions for ${role.display_name}`)
        }
      })

      await Promise.all(updatePromises)

      toast.success('Success', { description: 'Changes saved successfully' })
      setPendingChanges(new Map())
      fetchData()
    } catch (error) {
      toast.error('Error', { description: error instanceof Error ? error.message : 'Failed to save changes' })
    } finally {
      setSaving(false)
    }
  }, [pendingChanges, fetchData, roles, filteredMenuItems, flattenMenuTree])

  // Toggle item expansion
  const toggleExpanded = useCallback((itemId: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev)
      if (newSet.has(itemId)) {
        newSet.delete(itemId)
      } else {
        newSet.add(itemId)
      }
      return newSet
    })
  }, [])

  const flatMenuItems = useMemo(() => flattenMenuTree(filteredMenuItems), [flattenMenuTree, filteredMenuItems])
  const hasPendingChanges = pendingChanges.size > 0

  return (
    <PermissionGuard permission="admin:menu">
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/30">
        <Container variant={containerVariant} className="py-6 sm:py-8 lg:py-10">
          {/* Header */}
          <DetailPageHeader
            backUrl={`/${locale}/rbac`}
            icon={Menu}
            title="Menu Access Management"
            description="Manage menu item visibility by role with bulk operations"
            showBackButton={false}
            badge={{
              label: `${menuItems.length} ${menuItems.length === 1 ? 'item' : 'items'}`,
              variant: 'secondary'
            }}
          />

          {/* Controls */}
          <Card className="border border-gray-200 shadow-sm mb-6">
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col gap-4">
                {/* Search and Filters */}
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search menu items..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <Select value={selectedRoleFilter} onValueChange={setSelectedRoleFilter}>
                    <SelectTrigger className="w-full sm:w-[200px]">
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
                  <Select value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
                    <SelectTrigger className="w-full sm:w-[200px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="matrix">
                        <div className="flex items-center gap-2">
                          <Grid3x3 className="h-4 w-4" />
                          <span>Matrix View</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="list">
                        <div className="flex items-center gap-2">
                          <List className="h-4 w-4" />
                          <span>List View</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="tree">
                        <div className="flex items-center gap-2">
                          <Menu className="h-4 w-4" />
                          <span>Tree View</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Bulk Actions */}
                {viewMode === 'matrix' && roles.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-200">
                    <span className="text-sm font-medium text-gray-700 self-center">Bulk Actions:</span>
                    {roles.map(role => (
                      <div key={role.id} className="flex gap-2">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleBulkOperation('grant', role.id, flatMenuItems)}
                                disabled={saving}
                                className="h-8"
                              >
                                <CheckSquare className="h-3 w-3 mr-1" />
                                Grant All ({role.display_name})
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Grant access to all visible menu items for {role.display_name}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    ))}
                  </div>
                )}

                {/* Save Changes Button */}
                {hasPendingChanges && (
                  <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                    <span className="text-sm text-gray-600">
                      {pendingChanges.size} pending change{pendingChanges.size !== 1 ? 's' : ''}
                    </span>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPendingChanges(new Map())}
                        disabled={saving}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleSaveChanges}
                        disabled={saving}
                        className="bg-indigo-600 hover:bg-indigo-700"
                      >
                        {saving ? (
                          <>
                            <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="h-3 w-3 mr-1" />
                            Save Changes
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Content */}
          <Card className="border border-gray-200 shadow-sm">
            <CardContent className="p-4 sm:p-6">
              {loading ? (
                <div className="text-center py-12">
                  <div className="inline-block">
                    <div className="h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-sm text-gray-600">Loading menu items...</p>
                  </div>
                </div>
              ) : viewMode === 'matrix' ? (
                <MatrixView
                  menuItems={flatMenuItems}
                  roles={roles}
                  hasAccess={hasAccess}
                  toggleAccess={toggleAccess}
                  pendingChanges={pendingChanges}
                />
              ) : viewMode === 'list' ? (
                <ListView
                  menuItems={filteredMenuItems}
                  roles={roles}
                  permissions={permissions}
                  hasAccess={hasAccess}
                  onUpdatePermission={async (menuItemId, permissionId) => {
                    try {
                      await fetch(`/api/admin/menu/${menuItemId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({ permission_id: permissionId })
                      })
                      toast.success('Success', { description: 'Menu item updated successfully' })
                      fetchData()
                    } catch (error) {
                      toast.error('Error', { description: 'Failed to update menu item' })
                    }
                  }}
                />
              ) : (
                <TreeView
                  menuItems={filteredMenuItems}
                  roles={roles}
                  permissions={permissions}
                  hasAccess={hasAccess}
                  toggleAccess={toggleAccess}
                  expandedItems={expandedItems}
                  toggleExpanded={toggleExpanded}
                  pendingChanges={pendingChanges}
                  onUpdatePermission={async (menuItemId, permissionId) => {
                    try {
                      await fetch(`/api/admin/menu/${menuItemId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({ permission_id: permissionId })
                      })
                      toast.success('Success', { description: 'Menu item updated successfully' })
                      fetchData()
                    } catch (error) {
                      toast.error('Error', { description: 'Failed to update menu item' })
                    }
                  }}
                />
              )}
            </CardContent>
          </Card>
        </Container>
      </div>
    </PermissionGuard>
  )
}

// Matrix View Component
function MatrixView({
  menuItems,
  roles,
  hasAccess,
  toggleAccess,
  pendingChanges
}: {
  menuItems: MenuItem[]
  roles: Role[]
  hasAccess: (menuItem: MenuItem, role: Role) => boolean
  toggleAccess: (menuItem: MenuItem, role: Role) => void
  pendingChanges: Map<string, string | null>
}) {
  if (menuItems.length === 0) {
    return (
      <div className="text-center py-12">
        <Menu className="h-12 w-12 mx-auto mb-4 text-gray-400 opacity-50" />
        <p className="text-sm text-gray-600">No menu items found</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left p-3 font-semibold text-sm text-gray-900 sticky left-0 bg-white z-10 min-w-[300px]">
              Menu Item
            </th>
            {roles.map(role => (
              <th key={role.id} className="text-center p-3 font-semibold text-sm text-gray-900 min-w-[120px]">
                <div className="flex flex-col items-center gap-1">
                  <span>{role.display_name}</span>
                  <Badge variant="secondary" className="text-xs">
                    {role.users_count} users
                  </Badge>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {menuItems.map((item, index) => {
            const indent = item.parent_id ? 2 : 0
            const changeKey = `${item.id}:`
            const hasPendingChange = Array.from(pendingChanges.keys()).some(k => k.startsWith(changeKey))
            
            return (
              <tr
                key={item.id}
                className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                  index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                } ${hasPendingChange ? 'bg-yellow-50' : ''}`}
              >
                <td className="p-3 sticky left-0 bg-inherit z-10">
                  <div className="flex items-center gap-2" style={{ paddingLeft: `${indent * 16}px` }}>
                    {item.parent_id && <ChevronRight className="h-3 w-3 text-gray-400" />}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm text-gray-900">{item.label}</span>
                        {!item.is_active && (
                          <Badge variant="outline" className="text-xs">Inactive</Badge>
                        )}
                        {!item.permission_id && (
                          <Badge variant="outline" className="text-xs bg-blue-50">Public</Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 truncate mt-1">{item.href}</p>
                    </div>
                  </div>
                </td>
                {roles.map(role => {
                  const currentAccess = hasAccess(item, role)
                  const key = `${item.id}:${role.id}`
                  const pendingValue = pendingChanges.get(key)
                  
                  // Determine display state: pending change overrides current state
                  let displayAccess = currentAccess
                  if (pendingValue === 'remove') {
                    displayAccess = false
                  } else if (pendingValue && pendingValue !== 'remove') {
                    displayAccess = true
                  }
                  
                  // Disable checkbox if menu item is public (no permission required)
                  const isDisabled = !item.permission_id
                  
                  return (
                    <td key={role.id} className="p-3 text-center">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex justify-center">
                              <Checkbox
                                checked={displayAccess}
                                onCheckedChange={() => toggleAccess(item, role)}
                                disabled={isDisabled}
                                className={pendingValue ? 'ring-2 ring-yellow-400' : ''}
                              />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>
                              {isDisabled 
                                ? 'Public menu item - accessible to all'
                                : displayAccess 
                                  ? 'Click to remove access for ' + role.display_name
                                  : 'Click to grant access for ' + role.display_name
                              }
                              {pendingValue && <span className="block text-xs text-yellow-600 mt-1">(Pending change)</span>}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// List View Component
function ListView({
  menuItems,
  roles,
  permissions,
  hasAccess,
  onUpdatePermission
}: {
  menuItems: MenuItem[]
  roles: Role[]
  permissions: Permission[]
  hasAccess: (menuItem: MenuItem, role: Role) => boolean
  onUpdatePermission: (menuItemId: string, permissionId: string | null) => void
}) {
  if (menuItems.length === 0) {
    return (
      <div className="text-center py-12">
        <Menu className="h-12 w-12 mx-auto mb-4 text-gray-400 opacity-50" />
        <p className="text-sm text-gray-600">No menu items found</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {menuItems.map(item => (
        <MenuItemCard
          key={item.id}
          item={item}
          roles={roles}
          permissions={permissions}
          hasAccess={hasAccess}
          onUpdatePermission={onUpdatePermission}
          level={0}
        />
      ))}
    </div>
  )
}

// Tree View Component
function TreeView({
  menuItems,
  roles,
  permissions,
  hasAccess,
  toggleAccess,
  expandedItems,
  toggleExpanded,
  pendingChanges,
  onUpdatePermission
}: {
  menuItems: MenuItem[]
  roles: Role[]
  permissions: Permission[]
  hasAccess: (menuItem: MenuItem, role: Role) => boolean
  toggleAccess: (menuItem: MenuItem, role: Role) => void
  expandedItems: Set<string>
  toggleExpanded: (itemId: string) => void
  pendingChanges: Map<string, string | null>
  onUpdatePermission: (menuItemId: string, permissionId: string | null) => void
}) {
  if (menuItems.length === 0) {
    return (
      <div className="text-center py-12">
        <Menu className="h-12 w-12 mx-auto mb-4 text-gray-400 opacity-50" />
        <p className="text-sm text-gray-600">No menu items found</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {menuItems.map(item => (
        <MenuItemTreeCard
          key={item.id}
          item={item}
          roles={roles}
          permissions={permissions}
          hasAccess={hasAccess}
          toggleAccess={toggleAccess}
          expandedItems={expandedItems}
          toggleExpanded={toggleExpanded}
          pendingChanges={pendingChanges}
          onUpdatePermission={onUpdatePermission}
          level={0}
        />
      ))}
    </div>
  )
}

// Menu Item Card Component (for List View)
function MenuItemCard({
  item,
  roles,
  permissions,
  hasAccess,
  onUpdatePermission,
  level = 0
}: {
  item: MenuItem
  roles: Role[]
  permissions: Permission[]
  hasAccess: (menuItem: MenuItem, role: Role) => boolean
  onUpdatePermission: (menuItemId: string, permissionId: string | null) => void
  level?: number
}) {
  const visibleRoles = useMemo(() => {
    if (!item.permission_id) return roles
    return roles.filter(role => hasAccess(item, role))
  }, [item, roles, hasAccess])

  return (
    <Card className={`border border-gray-200 bg-white hover:shadow-md transition-all ${level > 0 ? 'ml-6' : ''}`}>
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h4 className="font-semibold text-sm sm:text-base text-gray-900">
                {item.label}
              </h4>
              {item.is_active ? (
                <Badge variant="default" className="text-xs bg-green-500">Active</Badge>
              ) : (
                <Badge variant="outline" className="text-xs text-gray-500">Inactive</Badge>
              )}
              {!item.permission_id && (
                <Badge variant="outline" className="text-xs bg-blue-50">
                  <Shield className="h-3 w-3 mr-1" />
                  Public
                </Badge>
              )}
            </div>
            <p className="text-xs text-gray-500 truncate mb-2">{item.href}</p>
            
            {item.permission_id && visibleRoles.length > 0 && (
              <div className="mt-2">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Users className="h-3 w-3 text-gray-400" />
                  <span className="text-xs font-medium text-gray-600">Visible to:</span>
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {visibleRoles.map(role => (
                    <Badge key={role.id} variant="secondary" className="text-xs">
                      {role.display_name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

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
  )
}

// Menu Item Tree Card Component (for Tree View)
function MenuItemTreeCard({
  item,
  roles,
  permissions,
  hasAccess,
  toggleAccess,
  expandedItems,
  toggleExpanded,
  pendingChanges,
  onUpdatePermission,
  level = 0
}: {
  item: MenuItem
  roles: Role[]
  permissions: Permission[]
  hasAccess: (menuItem: MenuItem, role: Role) => boolean
  toggleAccess: (menuItem: MenuItem, role: Role) => void
  expandedItems: Set<string>
  toggleExpanded: (itemId: string) => void
  pendingChanges: Map<string, string | null>
  onUpdatePermission: (menuItemId: string, permissionId: string | null) => void
  level?: number
}) {
  const hasChildren = item.children && item.children.length > 0
  const isExpanded = expandedItems.has(item.id)
  const visibleRoles = useMemo(() => {
    if (!item.permission_id) return roles
    return roles.filter(role => hasAccess(item, role))
  }, [item, roles, hasAccess])

  return (
    <div className={level > 0 ? 'ml-6' : ''}>
      <Card className="border border-gray-200 bg-white hover:shadow-md transition-all">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              {hasChildren && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleExpanded(item.id)}
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
                  <h4 className="font-semibold text-sm sm:text-base text-gray-900">
                    {item.label}
                  </h4>
                  {item.is_active ? (
                    <Badge variant="default" className="text-xs bg-green-500">Active</Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs text-gray-500">Inactive</Badge>
                  )}
                  {!item.permission_id && (
                    <Badge variant="outline" className="text-xs bg-blue-50">
                      <Shield className="h-3 w-3 mr-1" />
                      Public
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-gray-500 truncate mb-2">{item.href}</p>
                
                {item.permission_id && visibleRoles.length > 0 && (
                  <div className="mt-2">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Users className="h-3 w-3 text-gray-400" />
                      <span className="text-xs font-medium text-gray-600">Visible to:</span>
                    </div>
                    <div className="flex gap-1.5 flex-wrap">
                      {visibleRoles.map(role => (
                        <Badge key={role.id} variant="secondary" className="text-xs">
                          {role.display_name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

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

      {isExpanded && hasChildren && (
        <div className="mt-3 space-y-3">
          {item.children!.map(child => (
            <MenuItemTreeCard
              key={child.id}
              item={child}
              roles={roles}
              permissions={permissions}
              hasAccess={hasAccess}
              toggleAccess={toggleAccess}
              expandedItems={expandedItems}
              toggleExpanded={toggleExpanded}
              pendingChanges={pendingChanges}
              onUpdatePermission={onUpdatePermission}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}
