'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/components/auth/AuthProvider'

interface ProtectedRouteProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export default function ProtectedRoute({ children, fallback }: ProtectedRouteProps) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const params = useParams()
  const locale = params.locale as string
  const [checkingVerification, setCheckingVerification] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      router.push(`/${locale}/auth/login`)
      return
    }

    // Check email verification if user is logged in
    if (!loading && user && !user.email_confirmed_at) {
      setCheckingVerification(true)
      // Redirect to email verification page
      router.push(`/${locale}/auth/verify-email`)
    } else {
      setCheckingVerification(false)
    }
  }, [user, loading, router, locale])

  if (loading || checkingVerification) {
    return fallback || (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  // If user is not verified, don't render children (redirect will happen)
  if (!user.email_confirmed_at) {
    return null
  }

  return <>{children}</>
} 