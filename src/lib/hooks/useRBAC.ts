/**
 * Clean RBAC Hook - Single Source of Truth
 * Handles permissions from database with efficient caching and session management
 */

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Permission {
  id: string
  name: string
  display_name: string
  description: string
  resource: string
  action: string
  module_id: string | null
}

interface Module {
  id: string
  name: string
  display_name: string
  description: string
  icon: string
  order_index: number
}

interface UserRole {
  id: string
  name: string
  display_name: string
}

interface NavigationItem {
  id: string
  key: string
  label_key: string
  href: string
  icon: string
  module_id: string | null
  permission_id: string | null
  parent_id: string | null
  order_index: number
  is_standalone: boolean
  is_active: boolean
  exact_match: boolean
}

interface RBACState {
  userRoles: UserRole[]
  userPermissions: Permission[]
  modules: Module[]
  navigationItems: NavigationItem[]
  isLoading: boolean
  error: string | null
  lastFetched: number | null
}

const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes
const SESSION_CHECK_INTERVAL = 60 * 1000 // 1 minute
const IDLE_TIMEOUT = 15 * 60 * 1000 // 15 minutes

export function useRBAC() {
  const [state, setState] = useState<RBACState>({
    userRoles: [],
    userPermissions: [],
    modules: [],
    navigationItems: [],
    isLoading: true,
    error: null,
    lastFetched: null
  })

  const sessionCheckInterval = useRef<NodeJS.Timeout>()
  const idleTimeout = useRef<NodeJS.Timeout>()
  const lastActivity = useRef<number>(Date.now())
  const isFetching = useRef(false)

  // Update last activity timestamp
  const updateActivity = useCallback(() => {
    lastActivity.current = Date.now()
    
    // Reset idle timeout
    if (idleTimeout.current) {
      clearTimeout(idleTimeout.current)
    }
    
    idleTimeout.current = setTimeout(() => {
      console.log('[RBAC] User idle, refreshing session...')
      fetchRBACData(true)
    }, IDLE_TIMEOUT)
  }, [])

  // Fetch RBAC data from database
  const fetchRBACData = useCallback(async (forceRefresh = false) => {
    // Prevent concurrent fetches
    if (isFetching.current) {
      console.log('[RBAC] Already fetching, skipping...')
      return
    }

    // Check cache validity
    const now = Date.now()
    if (!forceRefresh && state.lastFetched && (now - state.lastFetched) < CACHE_DURATION) {
      console.log('[RBAC] Using cached data')
      return
    }

    isFetching.current = true
    console.log('[RBAC] Fetching RBAC data...')

    try {
      const supabase = createClient()

      // Check if user is authenticated
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        console.log('[RBAC] No authenticated user')
        setState({
          userRoles: [],
          userPermissions: [],
          modules: [],
          navigationItems: [],
          isLoading: false,
          error: null,
          lastFetched: now
        })
        isFetching.current = false
        return
      }

      // Fetch user roles
      const { data: userRolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select(`
          role:roles(id, name, display_name)
        `)
        .eq('user_id', user.id)

      if (rolesError) throw rolesError

      const roles = (userRolesData || [])
        .map(ur => ur.role)
        .filter(Boolean) as UserRole[]

      const roleIds = roles.map(r => r.id)

      // Fetch permissions for these roles
      const { data: rolePermissionsData, error: permissionsError } = await supabase
        .from('role_permissions')
        .select(`
          permission:permissions(
            id, name, display_name, description, 
            resource, action, module_id
          )
        `)
        .in('role_id', roleIds)

      if (permissionsError) throw permissionsError

      const permissions = (rolePermissionsData || [])
        .map(rp => rp.permission)
        .filter(Boolean) as Permission[]

      // Get unique module IDs from permissions
      const moduleIds = [...new Set(permissions.map(p => p.module_id).filter(Boolean))] as string[]

      // Fetch modules
      const { data: modulesData, error: modulesError } = await supabase
        .from('permission_modules')
        .select('*')
        .in('id', moduleIds)
        .order('order_index', { ascending: true })

      if (modulesError) throw modulesError

      // Fetch navigation items
      const { data: navigationData, error: navigationError } = await supabase
        .from('navigation_items')
        .select('*')
        .eq('is_active', true)
        .order('order_index', { ascending: true })

      if (navigationError) throw navigationError

      console.log('[RBAC] Data fetched successfully', {
        roles: roles.length,
        permissions: permissions.length,
        modules: modulesData?.length || 0,
        navigationItems: navigationData?.length || 0
      })

      setState({
        userRoles: roles,
        userPermissions: permissions,
        modules: modulesData || [],
        navigationItems: navigationData || [],
        isLoading: false,
        error: null,
        lastFetched: now
      })
    } catch (error) {
      console.error('[RBAC] Error fetching data:', error)
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: (error as Error).message
      }))
    } finally {
      isFetching.current = false
    }
  }, [state.lastFetched])

  // Setup session check and activity tracking
  useEffect(() => {
    console.log('[RBAC] Initializing...')
    
    // Initial fetch
    fetchRBACData()

    // Setup activity listeners
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart']
    events.forEach(event => {
      window.addEventListener(event, updateActivity, { passive: true })
    })

    // Setup session check interval
    sessionCheckInterval.current = setInterval(async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        console.log('[RBAC] Session lost, clearing data')
        setState({
          userRoles: [],
          userPermissions: [],
          modules: [],
          navigationItems: [],
          isLoading: false,
          error: null,
          lastFetched: null
        })
      }
    }, SESSION_CHECK_INTERVAL)

    // Cleanup
    return () => {
      events.forEach(event => {
        window.removeEventListener(event, updateActivity)
      })
      if (sessionCheckInterval.current) {
        clearInterval(sessionCheckInterval.current)
      }
      if (idleTimeout.current) {
        clearTimeout(idleTimeout.current)
      }
    }
  }, [])

  // Helper: Check if user has permission
  const hasPermission = useCallback((permissionName: string): boolean => {
    return state.userPermissions.some(p => p.name === permissionName)
  }, [state.userPermissions])

  // Helper: Check if user has any of the permissions
  const hasAnyPermission = useCallback((permissionNames: string[]): boolean => {
    return permissionNames.some(name => hasPermission(name))
  }, [hasPermission])

  // Helper: Check if user has all permissions
  const hasAllPermissions = useCallback((permissionNames: string[]): boolean => {
    return permissionNames.every(name => hasPermission(name))
  }, [hasPermission])

  // Helper: Get permissions by module
  const getPermissionsByModule = useCallback((moduleId: string): Permission[] => {
    return state.userPermissions.filter(p => p.module_id === moduleId)
  }, [state.userPermissions])

  // Helper: Get modules with at least one permission
  const getAccessibleModules = useCallback((): Module[] => {
    return state.modules.filter(module => 
      state.userPermissions.some(p => p.module_id === module.id)
    )
  }, [state.modules, state.userPermissions])

  // Manual refresh
  const refresh = useCallback(() => {
    console.log('[RBAC] Manual refresh triggered')
    return fetchRBACData(true)
  }, [fetchRBACData])

  return {
    // State
    userRoles: state.userRoles,
    userPermissions: state.userPermissions,
    modules: state.modules,
    navigationItems: state.navigationItems,
    isLoading: state.isLoading,
    error: state.error,
    
    // Helpers
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    getPermissionsByModule,
    getAccessibleModules,
    
    // Actions
    refresh
  }
}

