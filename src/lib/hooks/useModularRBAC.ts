'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useDatabaseRBAC } from './useDatabaseRBAC'

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
        
        return {
          id: module.id,
          name: module.name,
          display_name: module.display_name,
          icon: module.icon,
          color: module.color,
          sort_order: module.sort_order,
          permissions: modulePermissions,
          hasAnyPermission: hasAnyPermission(permissionNames)
        }
      })

      setModules(processedModules)
      console.log('Loaded modular navigation:', processedModules.filter(m => m.hasAnyPermission))
      
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

  return {
    modules: modules.filter(m => m.hasAnyPermission), // Only return modules user has access to
    loading,
    error,
    hasModuleAccess,
    getModulePermissions,
    refreshModules
  }
}
