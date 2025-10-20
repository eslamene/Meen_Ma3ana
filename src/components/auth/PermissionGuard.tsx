'use client'

import { useState, useEffect } from 'react'
import { useAuth } from './AuthProvider'
import { hasPermission, Permission, UserRole } from '@/lib/rbac'
import { createClient } from '@/lib/supabase/client'

interface PermissionGuardProps {
  children: React.ReactNode
  permission: Permission
  fallback?: React.ReactNode
  resourceOwnerId?: string
}

// Shared hook for fetching user role from database
function useUserRoleFromDB(): { userRole: UserRole; loading: boolean } {
  const { user } = useAuth()
  const [userRole, setUserRole] = useState<UserRole>('donor')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      fetchUserRole()
    } else {
      setLoading(false)
    }
  }, [user])

  const fetchUserRole = async () => {
    try {
      const supabase = createClient()
      
      // First try to get role from user metadata (for backward compatibility)
      let role = (user?.user_metadata?.role as UserRole) || 'donor'
      
      // Then fetch the latest role from the database
      const { data, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', user?.id)
        .single()

      if (!error && data?.role) {
        role = data.role as UserRole
        
        // Update the session metadata if it's different
        if (role !== user?.user_metadata?.role) {
          await supabase.auth.updateUser({
            data: { role: role }
          })
        }
      }
      
      setUserRole(role)
    } catch (error) {
      console.error('Error fetching user role:', error)
      setUserRole('donor')
    } finally {
      setLoading(false)
    }
  }

  return { userRole, loading }
}

export default function PermissionGuard({ 
  children, 
  permission, 
  fallback = null,
  resourceOwnerId 
}: PermissionGuardProps) {
  const { user } = useAuth()
  const { userRole, loading } = useUserRoleFromDB()

  if (loading) {
    return <div>Loading...</div>
  }

  if (!user) {
    return fallback
  }

  // Check if user has permission
  const hasAccess = hasPermission(userRole, permission)
  
  if (!hasAccess) {
    return fallback
  }

  // If resourceOwnerId is provided, check ownership
  if (resourceOwnerId && resourceOwnerId !== user.id) {
    // For certain permissions, users can only access their own resources
    const ownerOnlyPermissions: Permission[] = [
      'contributions:update',
      'sponsorships:update',
      'communications:update',
    ]
    
    if (ownerOnlyPermissions.includes(permission)) {
      return fallback
    }
  }

  return <>{children}</>
}

// Hook for checking permissions in components
export function usePermission(permission: Permission): boolean {
  const { user } = useAuth()
  const { userRole, loading } = useUserRoleFromDB()

  if (!user || loading) return false
  
  return hasPermission(userRole, permission)
}

// Hook for getting user role
export function useUserRole(): UserRole {
  const { userRole } = useUserRoleFromDB()
  return userRole
} 