'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth/AuthProvider'
import { Heart } from 'lucide-react'
import { locales } from '@/i18n/request'

export default function LocaleHomePage() {
  const router = useRouter()
  const params = useParams()
  // Get locale directly from URL params to ensure we use the correct locale
  const locale = (params?.locale as string) || 'en'
  const { user, loading } = useAuth()

  useEffect(() => {
    // Validate locale
    const validLocale = locales.includes(locale as typeof locales[number]) 
      ? locale 
      : 'en'
    
    if (!loading) {
      // Redirect authenticated users to dashboard
      if (user) {
        router.replace(`/${validLocale}/dashboard`)
      } else {
        // Redirect unauthenticated users to landing page
        router.replace(`/${validLocale}/landing`)
      }
    }
  }, [user, loading, router, locale])

  // Show loading state while checking auth and redirecting
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-[#6B8E7E]/5 flex items-center justify-center">
      <div className="text-center">
        <div className="relative inline-block">
          <div className="w-20 h-20 border-4 border-[#6B8E7E]/20 border-t-[#6B8E7E] rounded-full animate-spin"></div>
          <Heart className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-[#6B8E7E] fill-[#6B8E7E]" />
        </div>
        <p className="mt-6 text-lg text-gray-600 font-medium">
          Loading...
        </p>
      </div>
    </div>
  )
}

