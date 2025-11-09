'use client'

import { useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'

/**
 * Redirect page for old admin/users/roles route
 * Redirects to the unified admin management page
 */
export default function AdminUserRolesRedirectPage() {
  const router = useRouter()
  const params = useParams()
  
  useEffect(() => {
    // Redirect to unified admin management page
    router.replace(`/${params.locale}/admin/manage`)
  }, [router, params.locale])

  // Show loading state while redirecting
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecting to Admin Management...</p>
      </div>
    </div>
  )
}
