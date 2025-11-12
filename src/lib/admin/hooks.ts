'use client'

/**
 * Clean Administration Hook
 * Client-side hook for accessing user roles, permissions, and menu items
 */

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'
import { defaultLogger } from '@/lib/logger'
import type {
  AdminRole,
  AdminPermission,
  AdminMenuItem,
} from './types'

interface UseAdminReturn {
  user: User | null
  loading: boolean
  roles: AdminRole[]
  permissions: AdminPermission[]
  menuItems: AdminMenuItem[]
  hasPermission: (permissionName: string) => boolean
  hasRole: (roleName: string) => boolean
  hasAnyRole: (roleNames: string[]) => boolean
  hasAnyPermission: (permissionNames: string[]) => boolean
  refresh: () => Promise<void>
}

export function useAdmin(): UseAdminReturn {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [roles, setRoles] = useState<AdminRole[]>([])
  const [permissions, setPermissions] = useState<AdminPermission[]>([])
  const [menuItems, setMenuItems] = useState<AdminMenuItem[]>([])

  const supabase = createClient()

  const fetchUserData = useCallback(async () => {
    try {
      setLoading(true)

      // Get current user
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      setUser(currentUser)

      if (!currentUser) {
        // Get public menu items
        const { data: publicMenu } = await supabase
          .from('admin_menu_items')
          .select('*')
          .eq('is_active', true)
          .is('permission_id', null)
          .order('sort_order')

        setMenuItems(buildMenuTree(publicMenu || []))
        setRoles([])
        setPermissions([])
        return
      }

      // Fetch user roles, permissions, and menu items in parallel
      const [rolesRes, permissionsRes, menuRes] = await Promise.all([
        supabase
          .from('admin_user_roles')
          .select(`
            admin_roles (*)
          `)
          .eq('user_id', currentUser.id)
          .eq('is_active', true),
        supabase.rpc('get_user_permission_names', { user_id: currentUser.id }),
        supabase.rpc('get_user_menu_items', { user_id: currentUser.id }),
      ])

      // Extract roles first - handle both array and object formats
      const userRoles = (rolesRes.data || [])
        .map((ur: any) => {
          // Handle both array and object formats from Supabase
          const role = Array.isArray(ur.admin_roles) ? ur.admin_roles[0] : ur.admin_roles
          return role
        })
        .filter(Boolean) as AdminRole[]
      
      // Sort roles by level (highest first) to ensure consistent ordering
      userRoles.sort((a, b) => (b.level || 0) - (a.level || 0))
      
      defaultLogger.info('Fetched user roles:', {
        userId: currentUser.id,
        rolesCount: userRoles.length,
        roles: userRoles.map(r => ({ name: r.name, level: r.level, display_name: r.display_name }))
      })
      
      setRoles(userRoles)

      // Handle permissions with fallback
      let userPermissions: AdminPermission[] = []
      if (permissionsRes.error) {
        // Log Supabase error properly - pass details as data parameter
        const errorMessage = permissionsRes.error.message || 'Unknown error'
        const errorData: Record<string, string> = { type: 'supabase_rpc_error' }
        if (permissionsRes.error.details) errorData.details = permissionsRes.error.details
        if (permissionsRes.error.hint) errorData.hint = permissionsRes.error.hint
        if (permissionsRes.error.code) errorData.code = permissionsRes.error.code
        
        defaultLogger.error(
          `Error fetching permissions (RPC may not exist): ${errorMessage}`,
          new Error(errorMessage),
          Object.keys(errorData).length > 1 ? errorData : undefined
        )
        // Fallback: fetch permissions manually
        const { data: fallbackPermissions } = await supabase
          .from('admin_user_roles')
          .select(`
            admin_roles!inner(
              admin_role_permissions(
                admin_permissions(*)
              )
            )
          `)
          .eq('user_id', currentUser.id)
          .eq('is_active', true)
        
        const allPermissions: AdminPermission[] = []
        if (fallbackPermissions) {
          fallbackPermissions.forEach((ur: any) => {
            if (ur.admin_roles?.admin_role_permissions) {
              ur.admin_roles.admin_role_permissions.forEach((rp: any) => {
                if (rp.admin_permissions && rp.admin_permissions.is_active) {
                  allPermissions.push(rp.admin_permissions)
                }
              })
            }
          })
        }
        userPermissions = [...new Map(allPermissions.map(p => [p.id, p])).values()]
      } else {
        // Get full permission details
        if (permissionsRes.data && permissionsRes.data.length > 0) {
          const { data: permissionDetails } = await supabase
            .from('admin_permissions')
            .select('*')
            .in('name', permissionsRes.data)
            .eq('is_active', true)

          userPermissions = permissionDetails || []
        }
      }
      setPermissions(userPermissions)

      // Handle menu items with fallback
      if (menuRes.error) {
        // Log Supabase error properly - pass details as data parameter
        const errorMessage = menuRes.error.message || 'Unknown error'
        const errorData: Record<string, string> = { type: 'supabase_rpc_error' }
        if (menuRes.error.details) errorData.details = menuRes.error.details
        if (menuRes.error.hint) errorData.hint = menuRes.error.hint
        if (menuRes.error.code) errorData.code = menuRes.error.code
        
        defaultLogger.error(
          `Error fetching menu items (RPC may not exist): ${errorMessage}`,
          new Error(errorMessage),
          Object.keys(errorData).length > 1 ? errorData : undefined
        )
        // Fallback: fetch menu items manually
        const { data: fallbackMenu } = await supabase
          .from('admin_menu_items')
          .select('*')
          .eq('is_active', true)
          .order('sort_order')
        
        // Filter menu items based on permissions
        const accessibleMenu = (fallbackMenu || []).filter((item: AdminMenuItem) => {
          if (!item.permission_id) return true // Public items
          return userPermissions.some(p => p.id === item.permission_id)
        })
        setMenuItems(buildMenuTree(accessibleMenu))
      } else {
        // Build menu tree
        setMenuItems(buildMenuTree(menuRes.data || []))
      }
    } catch (error) {
      // Handle both Error objects and other error types
      const errorMessage = error instanceof Error 
        ? error.message 
        : typeof error === 'string' 
        ? error 
        : 'Unknown error'
      
      // Pass Error instance if available, otherwise pass undefined and include details as data
      const errorInstance = error instanceof Error ? error : undefined
      const errorDetails = error instanceof Error 
        ? { name: error.name, stack: error.stack }
        : error && typeof error === 'object' && Object.keys(error).length > 0
        ? error
        : undefined
      
      defaultLogger.error(
        `Error fetching admin data: ${errorMessage}`, 
        errorInstance,
        errorDetails
      )
      setRoles([])
      setPermissions([])
      setMenuItems([])
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchUserData()
  }, [fetchUserData])

  const hasPermission = useCallback((permissionName: string): boolean => {
    // If user is authenticated, check their permissions
    if (user) {
      return permissions.some(p => p.name === permissionName)
    }
    
    // For unauthenticated users (public role), allow public dashboard and cases view
    // Cases should be publicly viewable so unauthenticated users can browse and contribute
    const publicPermissions = ['dashboard:view', 'cases:view']
    return publicPermissions.includes(permissionName)
  }, [permissions, user])

  const hasRole = useCallback((roleName: string): boolean => {
    return roles.some(r => r.name === roleName)
  }, [roles])

  const hasAnyRole = useCallback((roleNames: string[]): boolean => {
    return roleNames.some(roleName => roles.some(r => r.name === roleName))
  }, [roles])

  const hasAnyPermission = useCallback((permissionNames: string[]): boolean => {
    // If user is authenticated, check their permissions
    if (user) {
      return permissionNames.some(permissionName => 
        permissions.some(p => p.name === permissionName)
      )
    }
    
    // For unauthenticated users (public role), allow public dashboard and cases view
    // Cases should be publicly viewable so unauthenticated users can browse and contribute
    const publicPermissions = ['dashboard:view', 'cases:view']
    return permissionNames.some(permissionName => 
      publicPermissions.includes(permissionName)
    )
  }, [permissions, user])

  return {
    user,
    loading,
    roles,
    permissions,
    menuItems,
    hasPermission,
    hasRole,
    hasAnyRole,
    hasAnyPermission,
    refresh: fetchUserData,
  }
}

/**
 * Build menu tree from flat list
 */
function buildMenuTree(items: AdminMenuItem[]): AdminMenuItem[] {
  const itemMap = new Map<string, AdminMenuItem>()
  const rootItems: AdminMenuItem[] = []

  // Create map of all items
  items.forEach(item => {
    itemMap.set(item.id, { ...item, children: [] })
  })

  // Build tree structure
  items.forEach(item => {
    const menuItem = itemMap.get(item.id)!
    if (item.parent_id) {
      const parent = itemMap.get(item.parent_id)
      if (parent) {
        if (!parent.children) parent.children = []
        parent.children.push(menuItem)
      }
    } else {
      rootItems.push(menuItem)
    }
  })

  // Sort items
  const sortItems = (items: AdminMenuItem[]) => {
    items.sort((a, b) => a.sort_order - b.sort_order)
    items.forEach(item => {
      if (item.children) {
        sortItems(item.children)
      }
    })
  }

  sortItems(rootItems)
  return rootItems
}

