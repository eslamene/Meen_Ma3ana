'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useParams } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { getAppUrl } from '@/lib/utils/app-url'
import { Mail, ArrowRight } from 'lucide-react'

import { defaultLogger as logger } from '@/lib/logger'

export default function PasswordResetForm() {
  const t = useTranslations('auth')
  const params = useParams()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Helper for consistent input classes
  const getInputClasses = () => `
    block w-full pl-11 sm:pl-12 pr-4 py-3 sm:py-3.5 text-sm sm:text-base border border-gray-300/70 bg-white/60 backdrop-blur-sm rounded-xl shadow-sm 
    focus:outline-none focus:ring-2 focus:ring-[#6B8E7E]/50 focus:border-[#6B8E7E] focus:bg-white/80 
    disabled:bg-gray-100/60 disabled:cursor-not-allowed transition-all placeholder:text-gray-400
  `

  // Helper for consistent icon container classes
  const getIconContainerClasses = () => `
    absolute inset-y-0 left-0 pl-4 
    flex items-center pointer-events-none
  `

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    try {
      // Use the locale-specific reset password route
      const redirectTo = `${getAppUrl()}/${params.locale}/auth/reset-password`
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectTo
      })

      if (error) throw error

      setMessage(t('resetEmailSent'))
      setEmail('') // Clear the email field after successful submission
    } catch (error) {
      logger.error('Password reset error:', { error: error })
      let errorMessage = t('unknownError')
      
      if (error instanceof Error) {
        if (error.message.includes('For security purposes, you can only request this after')) {
          errorMessage = t('resetEmailRateLimit') || 'Please wait a few seconds before requesting another password reset email.'
        } else {
          errorMessage = error.message
        }
      }
      
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      {error && (
        <div className="text-red-700 text-sm sm:text-base bg-red-50/80 backdrop-blur-sm p-3.5 sm:p-4 rounded-xl border border-red-200/70 flex items-start" role="alert">
          <span className="mr-2 mt-0.5">⚠</span>
          <span>{error}</span>
        </div>
      )}

      {message && (
        <div className="text-green-700 text-sm sm:text-base bg-green-50/80 backdrop-blur-sm p-3.5 sm:p-4 rounded-xl border border-green-200/70 flex items-start" role="alert">
          <span className="mr-2 mt-0.5">✓</span>
          <span>{message}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
        <div>
          <label htmlFor="email" className="block text-sm sm:text-base font-semibold text-gray-800 mb-2">
            {t('email')} <span className="text-[#E74C3C]">*</span>
          </label>
          <div className="relative">
            <div className={getIconContainerClasses()}>
              <Mail className="h-5 w-5 sm:h-6 sm:w-6 text-gray-500" />
            </div>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck="false"
              disabled={loading}
              className={getInputClasses()}
              placeholder={t('emailPlaceholder')}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !email.trim()}
          className={`w-full flex justify-center items-center py-3.5 sm:py-4 px-6 sm:px-8 border border-transparent rounded-xl sm:rounded-2xl shadow-xl text-sm sm:text-base lg:text-lg font-bold text-white transition-all duration-200 bg-gradient-to-r from-[#6B8E7E] to-[#5a7a6b] hover:from-[#5a7a6b] hover:to-[#4a6a5b] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#6B8E7E] disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98] backdrop-blur-sm`}
        >
          {loading ? (
            <span className="flex items-center">
              <svg className="animate-spin h-5 w-5 text-white -ml-1 mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {t('loading')}
            </span>
          ) : (
            <span className="flex items-center">
                  {t('sendResetLink')}
              <ArrowRight className="ml-2" style={{ width: '1rem', height: '1rem' }} />
            </span>
          )}
        </button>
      </form>

      <div className="text-center">
        <p className="text-xs sm:text-sm text-gray-600">
          {t('resetEmailConfirmation')}
        </p>
      </div>
    </div>
  )
}
