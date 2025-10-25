'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useDatabaseRBAC } from './useDatabaseRBAC'
import { Permission, UserWithRoles } from '../rbac/database-rbac'

export interface ModulePermission {
  id: string
  name: string
  display_name: string
  description?: string
}

export interface NavigationModule {
  id: string
  name: string
  display_name: string
  icon: string
  color: string
  sort_order: number
  permissions: ModulePermission[]
  hasAnyPermission: boolean
}

interface UseModularRBACReturn {
  modules: NavigationModule[]
  loading: boolean
  error: string | null
  hasModuleAccess: (moduleName: string) => boolean
  getModulePermissions: (moduleName: string) => ModulePermission[]
  refreshModules: () => Promise<void>
  // Expose userRoles so consumers don't need to call useDatabaseRBAC separately
  userRoles: UserWithRoles | null
  userPermissions: Permission[] | null
}

export function useModularRBAC(): UseModularRBACReturn {
  const [modules, setModules] = useState<NavigationModule[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const { userRoles, hasAnyPermission, loading: rbacLoading } = useDatabaseRBAC()
  const supabase = createClient()

  const fetchModulesWithPermissions = useCallback(async () => {
    if (rbacLoading || !userRoles) {
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Get all modules with their permissions
      const { data: modulesData, error: modulesError } = await supabase
        .from('permission_modules')
        .select(`
          id,
          name,
          display_name,
          icon,
          color,
          sort_order,
          permissions(
            id,
            name,
            display_name,
            description
          )
        `)
        .order('sort_order')

      if (modulesError) {
        throw modulesError
      }

      // Process modules and check user permissions
      const processedModules: NavigationModule[] = (modulesData || []).map(module => {
        const modulePermissions = module.permissions || []
        const permissionNames = modulePermissions.map(p => p.name)
        const hasAccess = hasAnyPermission(permissionNames)
        
        return {
          id: module.id,
          name: module.name,
          display_name: module.display_name,
          icon: module.icon,
          color: module.color,
          sort_order: module.sort_order,
          permissions: modulePermissions,
          hasAnyPermission: hasAccess
        }
      })

      setModules(processedModules)
      
    } catch (err) {
      console.error('Error fetching modular navigation:', err)
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(`Failed to load navigation modules: ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }, [supabase, userRoles, hasAnyPermission, rbacLoading])

  // Refresh modules when RBAC data changes
  useEffect(() => {
    fetchModulesWithPermissions()
  }, [fetchModulesWithPermissions])

  // Listen for RBAC updates from other components
  useEffect(() => {
    const handleRBACUpdate = () => {
      fetchModulesWithPermissions()
    }

    window.addEventListener('rbac-updated', handleRBACUpdate)
    
    return () => {
      window.removeEventListener('rbac-updated', handleRBACUpdate)
    }
  }, [fetchModulesWithPermissions])

  // Helper functions
  const hasModuleAccess = useCallback((moduleName: string) => {
    const foundModule = modules.find(m => m.name === moduleName)
    return foundModule?.hasAnyPermission || false
  }, [modules])

  const getModulePermissions = useCallback((moduleName: string) => {
    const foundModule = modules.find(m => m.name === moduleName)
    return foundModule?.permissions || []
  }, [modules])

  const refreshModules = useCallback(async () => {
    await fetchModulesWithPermissions()
  }, [fetchModulesWithPermissions])

  // Compute user permissions for easy access (memoized to prevent re-renders)
  const userPermissions = useMemo(() => {
    return userRoles?.permissions?.map(p => p.name) || []
  }, [userRoles])

  // Memoize filtered modules to prevent unnecessary re-renders
  const filteredModules = useMemo(() => {
    return modules.filter(m => m.hasAnyPermission)
  }, [modules])

  return {
    modules: filteredModules,
    loading,
    error,
    hasModuleAccess,
    getModulePermissions,
    refreshModules,
    userRoles,
    userPermissions: userPermissions as unknown as Permission[] | null
  }
}
