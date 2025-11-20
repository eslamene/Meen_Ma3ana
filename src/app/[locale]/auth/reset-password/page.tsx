'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { createBrowserClient } from '@supabase/ssr'
import { Lock, Eye, EyeOff, AlertCircle, Shield, ArrowRight } from 'lucide-react'

export default function ResetPasswordPage() {
  const t = useTranslations('auth')
  const router = useRouter()
  const params = useParams()
  const localeParam = params.locale as string
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [isValidSession, setIsValidSession] = useState(false)
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Helper for consistent input classes
  const getInputClasses = (hasRightIcon = false) => {
    const iconPadding = 'pl-11 sm:pl-12'
    const rightIconPadding = hasRightIcon ? 'pr-11 sm:pr-12' : 'pr-4'
    return `block w-full ${iconPadding} ${rightIconPadding} py-3 sm:py-3.5 text-sm sm:text-base border border-gray-300/70 bg-white/60 backdrop-blur-sm rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-[#6B8E7E]/50 focus:border-[#6B8E7E] focus:bg-white/80 disabled:bg-gray-100/60 disabled:cursor-not-allowed transition-all placeholder:text-gray-400`
  }

  // Helper for consistent icon container classes
  const getIconContainerClasses = () => {
    return `absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none`
  }

  // Helper for consistent right icon button classes
  const getRightIconButtonClasses = () => {
    return `absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors`
  }

  useEffect(() => {
    // Check session and listen for auth state changes
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          setError(t('invalidResetLink'))
          return
        }
        
        // If we have a session, it means Supabase validated the reset link
        // Trust Supabase's session creation - if there's a session, the link was valid
        if (session) {
          // Set recovery mode cookie for UI purposes (to hide menu)
          document.cookie = 'recovery_mode=true; path=/; max-age=900' // 15 minutes
          setIsValidSession(true)
          
          // Clean up URL hash/params if present
          const hash = window.location.hash
          const urlParams = new URLSearchParams(window.location.search)
          if (hash || urlParams.has('type')) {
            window.history.replaceState({}, '', window.location.pathname)
          }
          return
        }
        
        // No session yet - might be processing hash tokens
        // Check if we have recovery tokens in URL (hash or query params)
        const hash = window.location.hash
        const hashParams = new URLSearchParams(hash.substring(1))
        const urlParams = new URLSearchParams(window.location.search)
        const hasRecoveryToken = hashParams.has('access_token') || 
                                 hashParams.has('type') || 
                                 urlParams.has('type')
        
        // If we have recovery tokens, wait for Supabase to process them
        if (hasRecoveryToken) {
          // Supabase will process hash tokens and create session
          // The auth state change listener will handle it
          return
        }
        
        // No session and no recovery tokens - invalid link
        setError(t('invalidResetLink'))
      } catch (err) {
        setError(t('invalidResetLink'))
      }
    }
    
    // Initial check
    checkSession()
    
    // Listen for auth state changes (Supabase processes hash tokens and creates session)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (session) {
          // Set recovery mode cookie for UI purposes
          document.cookie = 'recovery_mode=true; path=/; max-age=900'
          setIsValidSession(true)
          
          // Clean up URL
          const hash = window.location.hash
          const urlParams = new URLSearchParams(window.location.search)
          if (hash || urlParams.has('type')) {
            window.history.replaceState({}, '', window.location.pathname)
          }
        }
      }
    })
    
    return () => {
      subscription.unsubscribe()
    }
  }, [supabase.auth, t])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    if (password !== confirmPassword) {
      setError(t('passwordsDoNotMatch'))
      setLoading(false)
      return
    }

    if (password.length < 8) {
      setError(t('passwordMinLength'))
      setLoading(false)
      return
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      })

      if (error) {
        throw error
      }

      setMessage(t('passwordUpdatedSuccess'))
      
      // Clear recovery mode cookie
      document.cookie = 'recovery_mode=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
      
      // Sign out the user after password update
      await supabase.auth.signOut()
      
      setTimeout(() => {
        router.push(`/${localeParam}/auth/login`)
      }, 2000)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : t('unknownError')
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  if (!isValidSession && error) {
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
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-6">
                    <AlertCircle className="h-8 w-8 text-red-600" />
                  </div>
                  <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-3">
                    {t('invalidResetLinkTitle')}
                  </h1>
                  <p className="text-base sm:text-lg text-gray-700 mb-8">
                    {error}
                  </p>
                  <Link href={`/${localeParam}/auth/forgot-password`}>
                    <button className="w-full flex justify-center items-center py-3.5 sm:py-4 px-6 sm:px-8 border border-transparent rounded-xl sm:rounded-2xl shadow-xl text-sm sm:text-base lg:text-lg font-bold text-white transition-all duration-200 bg-gradient-to-r from-[#6B8E7E] to-[#5a7a6b] hover:from-[#5a7a6b] hover:to-[#4a6a5b] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#6B8E7E] disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98] backdrop-blur-sm">
                      <span className="flex items-center">
                            {t('requestNewResetLink')}
                        <ArrowRight className="ml-2" style={{ width: '1rem', height: '1rem' }} />
                      </span>
                    </button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
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
                  <Lock className="h-5 w-5 text-[#6B8E7E]" />
                  <span className="text-sm font-semibold text-gray-800">{t('resetYourPassword')}</span>
                </div>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-3">
                  {t('resetYourPassword')}
                </h1>
                <p className="text-base sm:text-lg text-gray-700">
                  {t('enterNewPassword')}
                </p>
              </div>
              
              {/* Form */}
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
                  {/* New Password field */}
                  <div>
                    <label htmlFor="password" className="block text-sm sm:text-base font-semibold text-gray-800 mb-2">
                      {t('newPassword')} <span className="text-[#E74C3C]">*</span>
                    </label>
                    <div className="relative">
                      <div className={getIconContainerClasses()}>
                        <Lock className="h-5 w-5 sm:h-6 sm:w-6 text-gray-500" />
                      </div>
                      <input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={8}
                        disabled={!isValidSession || loading}
                        className={getInputClasses(true)}
                        placeholder={t('newPasswordPlaceholder')}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className={getRightIconButtonClasses()}
                        tabIndex={-1}
                        aria-label={showPassword ? t('hidePassword') : t('showPassword')}
                        disabled={!isValidSession || loading}
                      >
                        {showPassword ? (
                          <EyeOff className="h-5 w-5 sm:h-6 sm:w-6" />
                        ) : (
                          <Eye className="h-5 w-5 sm:h-6 sm:w-6" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password field */}
                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm sm:text-base font-semibold text-gray-800 mb-2">
                      {t('confirmNewPassword')} <span className="text-[#E74C3C]">*</span>
                    </label>
                    <div className="relative">
                      <div className={getIconContainerClasses()}>
                        <Lock className="h-5 w-5 sm:h-6 sm:w-6 text-gray-500" />
                      </div>
                      <input
                        id="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        minLength={8}
                        disabled={!isValidSession || loading}
                        className={getInputClasses(true)}
                        placeholder={t('confirmNewPasswordPlaceholder')}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className={getRightIconButtonClasses()}
                        tabIndex={-1}
                        aria-label={showConfirmPassword ? t('hidePassword') : t('showPassword')}
                        disabled={!isValidSession || loading}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-5 w-5 sm:h-6 sm:w-6" />
                        ) : (
                          <Eye className="h-5 w-5 sm:h-6 sm:w-6" />
                        )}
                      </button>
                    </div>
                    {confirmPassword && password !== confirmPassword && (
                      <div className="mt-2.5 text-xs sm:text-sm text-red-700 bg-red-50/80 backdrop-blur-sm p-3 rounded-xl border border-red-200/70">
                        {t('passwordsDoNotMatch')}
                      </div>
                    )}
                  </div>

                  {/* Submit button */}
                  <button
                    type="submit"
                    disabled={!isValidSession || loading}
                    className="w-full flex justify-center items-center py-3.5 sm:py-4 px-6 sm:px-8 border border-transparent rounded-xl sm:rounded-2xl shadow-xl text-sm sm:text-base lg:text-lg font-bold text-white transition-all duration-200 bg-gradient-to-r from-[#6B8E7E] to-[#5a7a6b] hover:from-[#5a7a6b] hover:to-[#4a6a5b] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#6B8E7E] disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98] backdrop-blur-sm"
                  >
                    {loading ? (
                      <span className="flex items-center">
                        <svg className="animate-spin h-5 w-5 text-white -ml-1 mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        {t('updatingPassword')}
                      </span>
                    ) : (
                      <span className="flex items-center">
                            {t('updatePassword')}
                        <ArrowRight className="ml-2" style={{ width: '1rem', height: '1rem' }} />
                      </span>
                    )}
                  </button>
                </form>

                <div className="relative pt-4 sm:pt-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300/50"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-white/40 backdrop-blur-sm text-gray-600 rounded-full">{t('or')}</span>
                  </div>
                </div>

                <div className="text-center">
                  <Link 
                    href={`/${localeParam}/auth/login`} 
                    className="text-sm sm:text-base font-medium text-[#6B8E7E] hover:text-[#5a7a6b] transition-colors inline-flex items-center group"
                  >
                    {t('backToSignIn')}
                    <ArrowRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
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
