'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useParams } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { getAppUrl } from '@/lib/utils/app-url'
import { Chrome, Apple, Facebook } from 'lucide-react'

import { defaultLogger as logger } from '@/lib/logger'

interface SocialSignInProps {
  mode?: 'login' | 'register'
  onSuccess?: () => void
  onError?: (error: string) => void
}

export default function SocialSignIn({ mode = 'login', onSuccess, onError }: SocialSignInProps) {
  const t = useTranslations('auth')
  const params = useParams()
  const locale = params.locale as string
  const [loading, setLoading] = useState<string | null>(null)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const handleSocialSignIn = async (provider: 'google' | 'apple' | 'facebook') => {
    try {
      setLoading(provider)
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${getAppUrl()}/${locale}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      })

      if (error) {
        throw error
      }

      // OAuth redirects automatically, so we don't need to handle success here
      // The callback route will handle the redirect
    } catch (error: any) {
      setLoading(null)
      const errorMessage = error?.message || t('socialSignInError')
      onError?.(errorMessage)
      logger.error(`Error signing in with ${provider}:`, { error: error })
    }
  }

  const buttonClasses = (provider: string) => {
    const baseClasses = "w-full flex items-center justify-center gap-3 px-4 py-3.5 sm:py-4 rounded-xl sm:rounded-2xl font-semibold text-sm sm:text-base transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl border-2"
    
    const providerClasses = {
      google: "bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400",
      apple: "bg-black text-white border-black hover:bg-gray-900 hover:border-gray-800",
      facebook: "bg-[#1877F2] text-white border-[#1877F2] hover:bg-[#166FE5] hover:border-[#166FE5]"
    }
    
    return `${baseClasses} ${providerClasses[provider as keyof typeof providerClasses]}`
  }

  const iconClasses = "h-5 w-5 sm:h-6 sm:w-6"

  return (
    <div className="space-y-3 sm:space-y-4">
      <button
        type="button"
        onClick={() => handleSocialSignIn('google')}
        disabled={loading !== null}
        className={buttonClasses('google')}
        aria-label={t('signInWithGoogle')}
      >
        {loading === 'google' ? (
          <svg className="animate-spin h-5 w-5 text-gray-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        ) : (
          <>
            <Chrome className={iconClasses} />
            <span>{t('signInWithGoogle')}</span>
          </>
        )}
      </button>

      <button
        type="button"
        onClick={() => handleSocialSignIn('apple')}
        disabled={loading !== null}
        className={buttonClasses('apple')}
        aria-label={t('signInWithApple')}
      >
        {loading === 'apple' ? (
          <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        ) : (
          <>
            <Apple className={iconClasses} />
            <span>{t('signInWithApple')}</span>
          </>
        )}
      </button>

      <button
        type="button"
        onClick={() => handleSocialSignIn('facebook')}
        disabled={loading !== null}
        className={buttonClasses('facebook')}
        aria-label={t('signInWithFacebook')}
      >
        {loading === 'facebook' ? (
          <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        ) : (
          <>
            <Facebook className={iconClasses} />
            <span>{t('signInWithFacebook')}</span>
          </>
        )}
      </button>
    </div>
  )
}


