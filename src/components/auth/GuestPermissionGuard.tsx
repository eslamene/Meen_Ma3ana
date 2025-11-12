'use client'

import { ReactNode } from 'react'
import { useAdmin } from '@/lib/admin/hooks'
import { useAuth } from '@/components/auth/AuthProvider'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Lock, LogIn, UserPlus } from 'lucide-react'

interface GuestPermissionGuardProps {
  children: ReactNode
  // Visitor permissions required
  visitorPermissions?: string[]
  requireAll?: boolean // For visitor permissions: require all (AND) or any (OR)
  // Fallback content when access is denied
  fallback?: ReactNode
  // Show loading state
  showLoading?: boolean
  loadingComponent?: ReactNode
  // Custom messages
  title?: string
  description?: string
  showAuthPrompt?: boolean
}

/**
 * Permission Guard for Unauthenticated Users (Public Role)
 * Handles both public permissions and auth prompts
 */
export function GuestPermissionGuard({
  children,
  visitorPermissions = [], // Legacy prop name - represents public permissions
  requireAll = false,
  fallback = null,
  showLoading = true,
  loadingComponent,
  title = "Authentication Required",
  description = "Please sign in to access this content.",
  showAuthPrompt = true
}: GuestPermissionGuardProps) {
  const { user } = useAuth()
  const { hasPermission, loading } = useAdmin()

  // Show loading state
  if (loading && showLoading) {
    return loadingComponent || (
      <div className="flex items-center gap-2 p-2">
        <div className="w-3 h-3 border border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
        <div className="text-xs text-gray-500">Loading...</div>
      </div>
    )
  }

  // If user is authenticated, render children (authenticated users bypass visitor checks)
  if (user) {
    return <>{children}</>
  }

  // Check visitor permissions for unauthenticated users
  if (visitorPermissions.length > 0) {
    const hasRequiredPermissions = requireAll 
      ? visitorPermissions.every(p => hasPermission(p))
      : visitorPermissions.some(p => hasPermission(p))
    
    if (hasRequiredPermissions) {
      return <>{children}</>
    }
  } else {
    // No visitor permissions specified, allow access for guests
    return <>{children}</>
  }

  // Access denied - show fallback or auth prompt
  if (fallback) {
    return <>{fallback}</>
  }

  if (showAuthPrompt) {
    return (
      <div className="min-h-[400px] flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center">
            <div className="mb-4">
              <Lock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">{title}</h2>
              <p className="text-gray-600">{description}</p>
            </div>
            
            <div className="space-y-3">
              <Link href="/auth/login" className="w-full">
                <Button className="w-full">
                  <LogIn className="h-4 w-4 mr-2" />
                  Sign In
                </Button>
              </Link>
              
              <Link href="/auth/register" className="w-full">
                <Button variant="outline" className="w-full">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Create Account
                </Button>
              </Link>
            </div>
            
            <p className="text-xs text-gray-500 mt-4">
              Join our platform to access all features and contribute to meaningful causes.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return null
}

export default GuestPermissionGuard
