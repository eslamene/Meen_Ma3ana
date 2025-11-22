'use client'

import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import AuthForm from '@/components/auth/AuthForm'
import SocialSignIn from '@/components/auth/SocialSignIn'
import { ArrowRight, Shield } from 'lucide-react'
import { useAuth } from '@/components/auth/AuthProvider'

export default function LoginPage() {
  const t = useTranslations('auth')
  const params = useParams()
  const router = useRouter()
  const locale = params.locale as string
  const { user, loading } = useAuth()

  // Redirect authenticated users away from login page
  useEffect(() => {
    if (!loading && user) {
      router.replace(`/${locale}/dashboard`)
    }
  }, [user, loading, router, locale])

  // Security: Clear any sensitive data from sessionStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const keysToRemove: string[] = []
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i)
        if (key && (key.includes('auth_token') || key.includes('sensitive'))) {
          keysToRemove.push(key)
        }
      }
      keysToRemove.forEach(key => sessionStorage.removeItem(key))
    }
  }, [])

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-100 via-orange-100 to-red-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#6B8E7E] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Don't render login form if user is authenticated (will redirect)
  if (user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-100 via-orange-100 to-red-100 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 -left-20 w-96 h-96 bg-[#6B8E7E]/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 -right-20 w-96 h-96 bg-[#E74C3C]/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-[#6B8E7E]/5 to-[#E74C3C]/5 rounded-full blur-3xl"></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center py-8 sm:py-12 lg:py-16 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md sm:max-w-lg lg:max-w-xl">
          {/* Glass effect card */}
          <div className="bg-white/40 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/30 p-6 sm:p-8 lg:p-10 xl:p-12 relative overflow-hidden">
            {/* Glass effect overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent pointer-events-none"></div>
            
            <div className="relative z-10">
              {/* Header Section */}
              <div className="text-center mb-6 sm:mb-8 lg:mb-10">
                <div className="inline-flex items-center justify-center space-x-2 bg-white/60 backdrop-blur-md px-5 py-2.5 rounded-full mb-6 shadow-lg border border-white/30">
                  <Shield className="h-5 w-5 text-[#6B8E7E]" />
                  <span className="text-sm font-semibold text-gray-800">{t('secureConnection')}</span>
                </div>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-3">
            {t('signInToAccount')}
                </h1>
                <p className="text-base sm:text-lg text-gray-700">
                  {t('signInSubtitle')}
          </p>
        </div>
        
              {/* Form */}
              <div className="space-y-5 sm:space-y-6">
          <AuthForm mode="login" />
                
                <div className="flex items-center justify-between pt-2">
                  <Link 
                    href={`/${locale}/auth/forgot-password`} 
                    className="text-sm sm:text-base font-medium text-[#6B8E7E] hover:text-[#5a7a6b] transition-colors flex items-center group"
                  >
                    {t('forgotPassword')}
                    <ArrowRight className="ml-1 h-3 w-3 sm:h-4 sm:w-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>

                {/* Social Sign-In - Only show if enabled */}
                {process.env.NEXT_PUBLIC_ENABLE_SOCIAL_LOGIN === 'true' && (
                  <>
                <div className="relative pt-4 sm:pt-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300/50"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-white/40 backdrop-blur-sm text-gray-600 rounded-full">{t('or')}</span>
                  </div>
                </div>

                {/* Social Sign-In */}
                <SocialSignIn mode="login" />

                <div className="relative pt-4 sm:pt-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300/50"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-white/40 backdrop-blur-sm text-gray-600 rounded-full">{t('or')}</span>
                  </div>
                </div>
                  </>
                )}
          
          <div className="text-center">
                  <p className="text-sm sm:text-base text-gray-700">
                    {t('dontHaveAccount')}{' '}
                    <Link 
                      href={`/${locale}/auth/register`} 
                      className="font-semibold text-[#E74C3C] hover:text-[#C0392B] transition-colors inline-flex items-center group"
                    >
                      {t('createNewAccount')}
                      <ArrowRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Link>
                  </p>
                </div>
              </div>

              {/* Security Notice */}
              <div className="mt-6 sm:mt-8 lg:mt-10 pt-6 border-t border-gray-300/50">
                <div className="flex items-center justify-center space-x-2 text-xs sm:text-sm text-gray-600">
                  <Shield className="h-4 w-4 text-[#6B8E7E]" />
                  <p>{t('securityNotice')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 
