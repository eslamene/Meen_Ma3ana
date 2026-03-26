'use client'

/**
 * Clean Administration Hook
 * Client-side hook for accessing user roles, permissions, and menu items
 * (data from GET /api/admin/context — no direct Supabase `.from()` / RPC in the browser).
 */

import { useState, useEffect, useCallback } from 'react'
import { User } from '@supabase/supabase-js'
import { defaultLogger } from '@/lib/logger'
import type {
  AdminRole,
  AdminPermission,
  AdminMenuItem,
} from './types'

type AdminContextResponse = {
  user: { id: string; email?: string } | null
  roles: AdminRole[]
  permissions: AdminPermission[]
  menuItems: AdminMenuItem[]
}

let adminContextInFlight: Promise<AdminContextResponse> | null = null
let adminContextCache: AdminContextResponse | null = null
let adminContextCacheAt = 0
const ADMIN_CONTEXT_CACHE_TTL_MS = 10_000

async function fetchAdminContext(force = false): Promise<AdminContextResponse> {
  const now = Date.now()
  const cacheValid = !force && adminContextCache && now - adminContextCacheAt < ADMIN_CONTEXT_CACHE_TTL_MS
  if (cacheValid && adminContextCache) {
    return adminContextCache
  }

  if (!force && adminContextInFlight) {
    return adminContextInFlight
  }

  adminContextInFlight = (async () => {
    const res = await fetch('/api/admin/context', { credentials: 'include' })
    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      throw new Error(errText || `Admin context failed (${res.status})`)
    }
    const data = (await res.json()) as AdminContextResponse
    adminContextCache = data
    adminContextCacheAt = Date.now()
    return data
  })()

  try {
    return await adminContextInFlight
  } finally {
    adminContextInFlight = null
  }
}

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

  const fetchUserData = useCallback(async (force = false) => {
    try {
      setLoading(true)
      const data = await fetchAdminContext(force)

      setUser(
        data.user
          ? ({
              id: data.user.id,
              email: data.user.email,
            } as User)
          : null
      )
      setRoles(data.roles || [])
      setPermissions(data.permissions || [])
      setMenuItems(buildMenuTree(data.menuItems || []))

      // Intentionally avoid per-render role logs to keep the console signal clean.
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
  }, [])

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
    refresh: () => fetchUserData(true),
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

