'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Redirect page for admin/users without locale
 * Redirects to the localized version
 */
export default function AdminUsersRedirectPage() {
  const router = useRouter()
  
  useEffect(() => {
    // Redirect to the RBAC user management page
    router.replace('/en/rbac/users')
  }, [router])

  // Show loading state while redirecting
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecting to user management...</p>
      </div>
    </div>
  )
}
