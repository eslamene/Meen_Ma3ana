'use client'

import { useDatabaseRBAC } from './useDatabaseRBAC'
import { useGuestRBAC } from './useGuestRBAC'
import { useAuth } from '@/components/auth/AuthProvider'

interface UseUnifiedRBACReturn {
  // Universal permission checks
  hasPermission: (permission: string) => boolean
  hasAnyPermission: (permissions: string[]) => boolean
  loading: boolean
  error: string | null
  
  // User state
  isAuthenticated: boolean
  isGuest: boolean
  
  // Convenience checks
  canViewCases: boolean
  canViewPublicContent: boolean
  canCreateContributions: boolean
  canAccessAdmin: boolean
}

export function useUnifiedRBAC(): UseUnifiedRBACReturn {
  const { user } = useAuth()
  const authenticatedRBAC = useDatabaseRBAC()
  const guestRBAC = useGuestRBAC()
  
  const isAuthenticated = !!user
  const isGuest = !user
  
  // Use appropriate RBAC system based on authentication status
  const activeRBAC = isAuthenticated ? authenticatedRBAC : guestRBAC
  
  // Universal permission check
  const hasPermission = (permission: string): boolean => {
    if (isAuthenticated) {
      return authenticatedRBAC.hasPermission(permission)
    } else {
      return guestRBAC.hasVisitorPermission(permission)
    }
  }
  
  // Universal multiple permission check
  const hasAnyPermission = (permissions: string[]): boolean => {
    if (isAuthenticated) {
      return authenticatedRBAC.hasAnyPermission(permissions)
    } else {
      return guestRBAC.hasAnyVisitorPermission(permissions)
    }
  }
  
  // Convenience permission checks
  const canViewCases = isAuthenticated 
    ? authenticatedRBAC.hasPermission('cases:read')
    : guestRBAC.hasVisitorPermission('cases:view_public')
    
  const canViewPublicContent = isAuthenticated
    ? true // Authenticated users can view public content
    : guestRBAC.hasVisitorPermission('content:view_public')
    
  const canCreateContributions = isAuthenticated 
    ? authenticatedRBAC.hasPermission('contributions:create')
    : false // Guests cannot create contributions
    
  const canAccessAdmin = isAuthenticated
    ? authenticatedRBAC.hasPermission('admin:dashboard')
    : false // Guests cannot access admin
  
  return {
    hasPermission,
    hasAnyPermission,
    loading: activeRBAC.loading,
    error: activeRBAC.error,
    isAuthenticated,
    isGuest,
    canViewCases,
    canViewPublicContent,
    canCreateContributions,
    canAccessAdmin
  }
}
