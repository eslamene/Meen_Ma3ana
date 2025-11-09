'use client'

import { useState, useEffect } from 'react'

export interface Permission {
  id: string
  name: string
  display_name: string
  description?: string
  resource: string
  action: string
  is_system: boolean
  module_id?: string
}

export interface Module {
  id: string
  name: string
  display_name: string
  description?: string
  icon: string
  color: string
  sort_order: number
  is_system: boolean
  permissions_count: number
}

export type PermissionsByModule = Record<string, Permission[]>

export function useRBACData() {
  const [modules, setModules] = useState<Module[]>([])
  const [permissionsByModule, setPermissionsByModule] = useState<PermissionsByModule>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)

        const [modulesRes, permissionsRes] = await Promise.all([
          fetch('/api/admin/rbac/modules', { credentials: 'include' }),
          fetch('/api/admin/rbac/permissions', { credentials: 'include' })
        ])

        if (!modulesRes.ok || !permissionsRes.ok) {
          throw new Error('Failed to fetch RBAC data')
        }

        const modulesData = await modulesRes.json()
        const permissionsData = await permissionsRes.json()

        setModules(modulesData.modules || [])
        setPermissionsByModule(permissionsData.permissionsByModule || {})
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
        console.error('Error fetching RBAC data:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  return {
    modules,
    permissionsByModule,
    loading,
    error,
    refetch: () => {
      setLoading(true)
      // Trigger re-fetch by updating a dependency
    }
  }
}

