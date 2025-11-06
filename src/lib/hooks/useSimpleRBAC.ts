'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { databaseRBAC } from '@/lib/rbac/database-permissions'
import { User } from '@supabase/supabase-js'
import { defaultLogger } from '@/lib/logger'

interface SimpleModule {
  id: string
  name: string
  display_name: string
  icon: string
  color: string
  sort_order: number
  items: SimpleNavigationItem[]
}

interface SimpleNavigationItem {
  label: string
  href: string
  icon: string
  description: string
  sortOrder: number
  permission?: string
}

interface SimpleRBACReturn {
  user: User | null
  loading: boolean
  modules: SimpleModule[]
  hasPermission: (permission: string) => boolean
  hasRole: (role: string) => boolean
}

export function useSimpleRBAC(): SimpleRBACReturn {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [modules, setModules] = useState<SimpleModule[]>([])
  const [userRoles, setUserRoles] = useState<string[]>([])
  const [userPermissions, setUserPermissions] = useState<string[]>([])
  const [hasFetched, setHasFetched] = useState(false)

  // Create client lazily - only in browser environment
  const [supabase] = useState(() => {
    if (typeof window === 'undefined') {
      throw new Error('useSimpleRBAC can only be used in client components')
    }
    return createClient()
  })

  // Simple permission check
  const hasPermission = useCallback((permission: string) => {
    return userPermissions.includes(permission)
  }, [userPermissions])

  // Simple role check
  const hasRole = useCallback((role: string) => {
    return userRoles.includes(role)
  }, [userRoles])

  // Fetch user data
  useEffect(() => {
    if (hasFetched) return // Prevent multiple fetches

    let mounted = true

    const fetchUserData = async () => {
      try {
        setLoading(true)
        
        // Get current user
        const { data: { user: currentUser } } = await supabase.auth.getUser()
        
        if (!mounted) return
        
        setUser(currentUser)

        if (currentUser) {
          // Get user roles and permissions using database RBAC service
          const [roles, permissions] = await Promise.all([
            databaseRBAC.getUserRoles(currentUser.id),
            databaseRBAC.getUserPermissions(currentUser.id)
          ])

          if (!mounted) return

          const roleNames = roles.map(r => r.name)
          const permissionNames = permissions.map(p => p.name)
          
          setUserRoles(roleNames)
          setUserPermissions(permissionNames)

          // Get modules with navigation items using database RBAC service
          const modulesData = await databaseRBAC.getPermissionModules()

          if (!mounted) return

          // Get navigation items from database for each module
          const processedModules: SimpleModule[] = await Promise.all(
            modulesData.map(async (module) => {
              // Get permissions for this module
              const modulePermissions = await databaseRBAC.getPermissionsByModule(module.id)
              
              // Convert permissions to navigation items
              const items: SimpleNavigationItem[] = modulePermissions
                .filter(permission => permissionNames.includes(permission.name))
                .map(permission => ({
                  label: permission.display_name,
                  href: getNavigationHref(permission.resource, permission.action),
                  icon: getNavigationIcon(permission.resource, permission.action),
                  description: permission.description,
                  sortOrder: 1, // Default sort order
                  permission: permission.name
                }))

              return {
                id: module.id,
                name: module.name,
                display_name: module.display_name,
                icon: module.icon,
                color: module.color,
                sort_order: module.sort_order,
                items
              }
            })
          )

          // Filter modules that have items and user has access based on permissions
          const accessibleModules = processedModules.filter(module => {
            if (module.items.length === 0) return false
            
            // Check if user has any permission for this module
            const hasModuleAccess = permissionNames.some((permission: string) => 
              permission?.startsWith(module.name + ':') || 
              permission?.includes(module.name)
            )
            
            return hasModuleAccess
          })

          if (mounted) {
            setModules(accessibleModules)
            setHasFetched(true)
          }
        } else {
          if (mounted) {
            setModules([])
            setHasFetched(true)
          }
        }
      } catch (error) {
        defaultLogger.error('Error fetching user data', error)
        if (mounted) {
          setModules([])
          setHasFetched(true)
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    fetchUserData()

    return () => {
      mounted = false
    }
  }, [hasFetched, supabase]) // Include supabase dependency

  return {
    user,
    loading,
    modules,
    hasPermission,
    hasRole
  }
}

// Helper function to generate navigation href based on resource and action
function getNavigationHref(resource: string, action: string): string {
  const basePaths: Record<string, string> = {
    'admin': '/admin',
    'cases': '/cases',
    'contributions': '/contributions',
    'beneficiaries': '/beneficiaries',
    'projects': '/projects',
    'sponsorships': '/sponsorships',
    'users': '/admin/users',
    'profile': '/profile',
    'notifications': '/notifications',
    'reports': '/admin/reports',
    'files': '/admin/files',
    'payments': '/admin/payments',
    'messages': '/messages',
    'rbac': '/admin/access-control/roles',
    'roles': '/admin/access-control/roles',
    'permissions': '/admin/access-control/permissions'
  }

  const basePath = basePaths[resource] || `/${resource}`
  
  // Handle specific action mappings
  if (action === 'create') {
    return `${basePath}/create`
  } else if (action === 'read' || action === 'view') {
    return basePath
  } else if (action === 'update' || action === 'edit') {
    return `${basePath}/edit`
  } else if (action === 'delete') {
    return `${basePath}/delete`
  } else if (action === 'manage') {
    return `${basePath}/manage`
  } else if (action === 'approve') {
    return `${basePath}/approve`
  } else if (action === 'reject') {
    return `${basePath}/reject`
  }
  
  // Special handling for RBAC resources
  if (resource === 'rbac' && action === 'manage') {
    return '/admin/access-control/roles'
  } else if (resource === 'roles' && action === 'manage') {
    return '/admin/access-control/roles'
  } else if (resource === 'permissions' && action === 'manage') {
    return '/admin/access-control/permissions'
  }
  
  return basePath
}

// Helper function to generate navigation icon based on resource and action
function getNavigationIcon(resource: string, action: string): string {
  const resourceIcons: Record<string, string> = {
    'admin': 'Settings',
    'cases': 'Heart',
    'contributions': 'CreditCard',
    'beneficiaries': 'Users',
    'projects': 'Package',
    'sponsorships': 'HandHeart',
    'users': 'Users',
    'profile': 'User',
    'notifications': 'Bell',
    'reports': 'BarChart3',
    'files': 'FileText',
    'payments': 'DollarSign',
    'messages': 'MessageSquare',
    'rbac': 'Shield',
    'roles': 'UserCheck',
    'permissions': 'Key'
  }

  const actionIcons: Record<string, string> = {
    'create': 'Plus',
    'read': 'Eye',
    'view': 'Eye',
    'update': 'Edit',
    'edit': 'Edit',
    'delete': 'Trash2',
    'manage': 'Settings',
    'approve': 'Check',
    'reject': 'X',
    'dashboard': 'BarChart3',
    'analytics': 'TrendingUp'
  }

  // Return action-specific icon if available, otherwise resource icon
  return actionIcons[action] || resourceIcons[resource] || 'Circle'
}
