'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

interface UseGuestRBACReturn {
  // Permission checks for unauthenticated users
  hasVisitorPermission: (permission: string) => boolean
  hasAnyVisitorPermission: (permissions: string[]) => boolean
  loading: boolean
  error: string | null
  
  // Visitor-specific permissions
  canViewPublicCases: boolean
  canViewPublicContent: boolean
  canViewPublicStats: boolean
}

const VISITOR_PERMISSIONS = [
  'cases:view_public',
  'content:view_public', 
  'stats:view_public'
]

export function useGuestRBAC(): UseGuestRBACReturn {
  const [visitorPermissions, setVisitorPermissions] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  // Fetch visitor role permissions
  const fetchVisitorPermissions = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // First get the visitor role ID
      const { data: visitorRole, error: roleError } = await supabase
        .from('roles')
        .select('id')
        .eq('name', 'visitor')
        .single()

      if (roleError) {
        throw new Error(`Visitor role not found: ${roleError.message}`)
      }

      // Get visitor role permissions
      const { data: rolePermissions, error: permError } = await supabase
        .from('role_permissions')
        .select(`
          permissions(name)
        `)
        .eq('role_id', visitorRole.id)

      if (permError) {
        throw permError
      }

      const permissions = rolePermissions?.map(rp => rp.permissions.name) || []
      console.log('Fetched visitor permissions:', permissions)
      setVisitorPermissions(permissions)
      
    } catch (err: any) {
      console.error('Error fetching visitor permissions:', err)
      setError(`Failed to fetch visitor permissions: ${err.message || 'Unknown error'}`)
      // Fallback to default visitor permissions
      console.log('Using fallback visitor permissions:', VISITOR_PERMISSIONS)
      setVisitorPermissions(VISITOR_PERMISSIONS)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  // Initialize visitor permissions
  useEffect(() => {
    fetchVisitorPermissions()
  }, [fetchVisitorPermissions])

  // Permission check functions
  const hasVisitorPermission = useCallback((permission: string): boolean => {
    return visitorPermissions.includes(permission)
  }, [visitorPermissions])

  const hasAnyVisitorPermission = useCallback((permissions: string[]): boolean => {
    return permissions.some(permission => hasVisitorPermission(permission))
  }, [hasVisitorPermission])

  // Convenience permission checks
  const canViewPublicCases = hasVisitorPermission('cases:view_public')
  const canViewPublicContent = hasVisitorPermission('content:view_public')
  const canViewPublicStats = hasVisitorPermission('stats:view_public')

  return {
    hasVisitorPermission,
    hasAnyVisitorPermission,
    loading,
    error,
    canViewPublicCases,
    canViewPublicContent,
    canViewPublicStats
  }
}
