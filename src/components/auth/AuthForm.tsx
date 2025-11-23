'use client'

import { useState, useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import {
  validatePasswordStrength,
  validatePasswordLength,
  sanitizeEmail,
  sanitizeAuthError,
  checkRateLimit,
  recordFailedAttempt,
  clearRateLimit,
  validateEmail
} from '@/lib/security/auth-utils'
import { getAuthSettings, getDefaultAuthSettings, type AuthSettings } from '@/lib/utils/authSettings'
import { getAppUrl } from '@/lib/utils/app-url'
import { Eye, EyeOff, Lock, Mail, User, Phone, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

interface AuthFormProps {
  mode: 'login' | 'register'
  onSuccess?: () => void
  onError?: (error: string) => void
}

export default function AuthForm({ mode, onSuccess, onError }: AuthFormProps) {
  const t = useTranslations('auth')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordErrors, setPasswordErrors] = useState<string[]>([])
  const [rateLimitState, setRateLimitState] = useState<{
    allowed: boolean
    remainingAttempts: number
    lockoutUntil: number | null
  } | null>(null)
  const [authSettings, setAuthSettings] = useState<AuthSettings | null>(null)
  const [success, setSuccess] = useState(false)
  const [successEmail, setSuccessEmail] = useState('')
  
  // Honeypot field for bot protection
  const honeypotRef = useRef<HTMLInputElement>(null)
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const router = useRouter()
  const params = useParams()
  const localeParam = params.locale as string

  // Check rate limit when email changes (for login mode)
  useEffect(() => {
    if (mode === 'login' && email) {
      const sanitizedEmail = sanitizeEmail(email)
      if (validateEmail(sanitizedEmail)) {
        const rateLimit = checkRateLimit(sanitizedEmail)
        setRateLimitState(rateLimit)
      } else {
        setRateLimitState(null)
      }
    }
  }, [email, mode])

  // Load auth settings on mount
  useEffect(() => {
    getAuthSettings().then(settings => {
      setAuthSettings(settings)
    })
  }, [])

  // Validate password strength for registration
  useEffect(() => {
    if (mode === 'register' && password && authSettings) {
      const validation = validatePasswordStrength(password, authSettings)
      setPasswordErrors(validation.errors)
    } else {
      setPasswordErrors([])
    }
  }, [password, mode, authSettings])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Honeypot check - if filled, it's a bot
    if (honeypotRef.current?.value) {
      return
    }

    setLoading(true)
    setError('')

    const sanitizedEmail = sanitizeEmail(email)

    // Use authSettings if loaded, otherwise use default settings
    const settings = authSettings || getDefaultAuthSettings()

    // Validate email format
    if (!validateEmail(sanitizedEmail, settings)) {
      setError(t('invalidEmail'))
      setSuccess(false)
      setLoading(false)
      return
    }

    // Validate password length for both login and registration
    if (!validatePasswordLength(password, settings)) {
      setError(t('passwordMinLength'))
      setSuccess(false)
      setLoading(false)
      return
    }

    // Validate registration fields
      if (mode === 'register') {
      if (!firstName.trim()) {
        setError(t('firstNameRequired'))
        setSuccess(false)
        setLoading(false)
        return
      }
      if (!lastName.trim()) {
        setError(t('lastNameRequired'))
        setSuccess(false)
        setLoading(false)
        return
      }

      // Check if phone number is provided and validate uniqueness
      if (phone.trim()) {
        // Validate phone format
        if (!/^[\+]?[1-9][\d]{0,15}$/.test(phone.trim())) {
          setError(t('phoneInvalid'))
          setSuccess(false)
          setLoading(false)
          return
        }

        // Check if phone number already exists
        const { data: existingUser, error: checkError } = await supabase
          .from('users')
          .select('id')
          .eq('phone', phone.trim())
          .maybeSingle()

        if (checkError && checkError.code !== 'PGRST116') {
          // Error other than "not found" - log but continue
          console.error('Error checking phone uniqueness:', checkError)
        }

        if (existingUser) {
          setError(t('phoneAlreadyExists'))
          setSuccess(false)
          setLoading(false)
          return
        }
      }

        if (password !== confirmPassword) {
          setError(t('passwordsDoNotMatch'))
          setSuccess(false)
        setLoading(false)
        return
      }

      const passwordValidation = validatePasswordStrength(password, settings)
      if (!passwordValidation.isValid) {
        setError(t('passwordWeak'))
        setSuccess(false)
        setLoading(false)
        return
      }
    }

    // Check rate limiting for login
    if (mode === 'login') {
      const rateLimit = checkRateLimit(sanitizedEmail)
      if (!rateLimit.allowed) {
        const lockoutMinutes = rateLimit.lockoutUntil
          ? Math.ceil((rateLimit.lockoutUntil - Date.now()) / 60000)
          : 15
        setError(t('authErrorAccountLocked', { minutes: lockoutMinutes }))
        setSuccess(false)
        setLoading(false)
        return
      }
    }

    try {
      if (mode === 'register') {
        // Get the app URL for email redirect
        const appUrl = getAppUrl()
        const redirectUrl = `${appUrl}/${localeParam}/auth/callback`
        
        // Log warning in development if using localhost
        if (process.env.NODE_ENV === 'development' && appUrl.includes('localhost')) {
          console.warn('⚠️ Using localhost for email redirect. Set NEXT_PUBLIC_APP_URL in production.')
        }
        
        // Sign up with user metadata
        const { data, error } = await supabase.auth.signUp({
          email: sanitizedEmail,
          password,
          options: {
            emailRedirectTo: redirectUrl,
            data: {
              first_name: firstName.trim(),
              last_name: lastName.trim(),
              phone: phone.trim() || null
            }
          }
        })

        if (error) {
          const sanitizedError = sanitizeAuthError(error, true) // true = isRegistration
          setError(t(sanitizedError))
          setSuccess(false)
          onError?.(t(sanitizedError))
          setLoading(false)
          return
        }

        // Create user record in users table
        if (data?.user) {
          const { error: userError } = await supabase
            .from('users')
            .upsert({
              id: data.user.id,
              email: sanitizedEmail,
              first_name: firstName.trim(),
              last_name: lastName.trim(),
              phone: phone.trim() || null,
              role: 'donor',
              language: localeParam
            }, {
              onConflict: 'id'
            })

          if (userError) {
            // Check if error is due to duplicate phone number
            if (userError.code === '23505' && userError.message.includes('phone')) {
              setError(t('phoneAlreadyExists'))
              setSuccess(false)
              onError?.(t('phoneAlreadyExists'))
              setLoading(false)
              return
            }
            
            console.error('Error creating user record:', userError)
            // Don't fail registration if user record creation fails - it might be handled by trigger
          }
        }

        clearRateLimit(sanitizedEmail)
        
        // Set success state to replace form with success message
        setSuccess(true)
        setSuccessEmail(sanitizedEmail)
        setError('')
        
        // Show toast notification
        toast.success('Account Created', {
          description: t('signUpSuccess'),
          duration: 5000
        })
        
        onSuccess?.()
      } else {
        // Add artificial delay to prevent timing attacks
        const startTime = Date.now()
        
        const { error } = await supabase.auth.signInWithPassword({
          email: sanitizedEmail,
          password
        })

        // Ensure minimum response time to prevent timing attacks
        const minResponseTime = 500
        const elapsed = Date.now() - startTime
        if (elapsed < minResponseTime) {
          await new Promise(resolve => setTimeout(resolve, minResponseTime - elapsed))
        }

        if (error) {
          recordFailedAttempt(sanitizedEmail)
          const rateLimit = checkRateLimit(sanitizedEmail)
          setRateLimitState(rateLimit)
          
          const sanitizedError = sanitizeAuthError(error)
          setError(t(sanitizedError))
          onError?.(t(sanitizedError))
          return
        }

        clearRateLimit(sanitizedEmail)
        router.push(`/${localeParam}/dashboard`)
      }
    } catch (error) {
      const sanitizedError = sanitizeAuthError(error, mode === 'register')
      setError(t(sanitizedError))
      setSuccess(false) // Ensure success is cleared on error
      onError?.(t(sanitizedError))
      
      if (mode === 'login') {
        recordFailedAttempt(sanitizedEmail)
        const rateLimit = checkRateLimit(sanitizedEmail)
        setRateLimitState(rateLimit)
      }
    } finally {
      setLoading(false)
    }
  }

  const isLockedOut = rateLimitState ? !rateLimitState.allowed : false

  // Show success message instead of form for registration
  if (mode === 'register' && success) {
    return (
      <div className="space-y-6">
        <div className="bg-green-50/90 backdrop-blur-sm border-2 border-green-200 rounded-2xl p-6 sm:p-8 text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-green-100 rounded-full p-3">
              <CheckCircle2 className="h-12 w-12 text-green-600" />
            </div>
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3">
            {t('accountCreated') || 'Account Created'}
          </h3>
          <p className="text-sm sm:text-base text-gray-700 mb-2">
            {t('signUpSuccess')}
          </p>
          {successEmail && (
            <p className="text-sm text-gray-600 mb-6">
              {t('checkEmailForVerification') || 'Please check your email inbox for'} <strong>{successEmail}</strong> {t('toVerifyAccount') || 'to verify your account.'}
            </p>
          )}
          <div className="bg-blue-50/80 backdrop-blur-sm border border-blue-200 rounded-xl p-4 mt-4">
            <p className="text-xs sm:text-sm text-blue-800">
              <strong>{t('nextSteps') || 'Next Steps:'}</strong>
            </p>
            <ul className="text-xs sm:text-sm text-blue-700 mt-2 space-y-1 text-left list-disc list-inside">
              <li>{t('checkEmailInbox') || 'Check your email inbox (and spam folder)'}</li>
              <li>{t('clickVerificationLink') || 'Click the verification link in the email'}</li>
              <li>{t('returnToLogin') || 'Return here to sign in once verified'}</li>
            </ul>
          </div>
        </div>
        <div className="text-center">
          <Link 
            href={`/${localeParam}/auth/login`}
            className="inline-flex items-center text-sm sm:text-base font-semibold text-[#6B8E7E] hover:text-[#5a7a6b] transition-colors"
          >
            {t('goToLogin') || 'Go to Login'} <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </div>
      </div>
    )
  }

  // Helper function to get input classes
  const getInputClasses = (hasRightIcon = false) => {
    const iconPadding = 'pl-11 sm:pl-12'
    const rightIconPadding = hasRightIcon ? 'pr-11 sm:pr-12' : 'pr-4'
    return `block w-full ${iconPadding} ${rightIconPadding} py-3 sm:py-3.5 text-sm sm:text-base border border-gray-300/70 bg-white/60 backdrop-blur-sm rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-[#6B8E7E]/50 focus:border-[#6B8E7E] focus:bg-white/80 disabled:bg-gray-100/60 disabled:cursor-not-allowed transition-all placeholder:text-gray-400`
  }

  // Helper function to get icon container classes
  const getIconContainerClasses = () => {
    return `absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none`
  }

  // Helper function to get right icon button classes
  const getRightIconButtonClasses = () => {
    return `absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors`
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5 lg:space-y-6" noValidate>
      {/* Honeypot field */}
      <input
        ref={honeypotRef}
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        style={{
          position: 'absolute',
          left: '-9999px',
          opacity: 0,
          pointerEvents: 'none'
        }}
        aria-hidden="true"
      />

      {/* Registration fields */}
      {mode === 'register' && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
            <div>
              <label htmlFor="firstName" className="block text-sm sm:text-base font-semibold text-gray-800 mb-2">
                {t('firstName')} <span className="text-[#E74C3C]">*</span>
              </label>
              <div className="relative">
                <div className={getIconContainerClasses()}>
                  <User className="h-5 w-5 sm:h-6 sm:w-6 text-gray-500" />
                </div>
                <input
                  id="firstName"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  autoComplete="given-name"
                  disabled={loading}
                  className={getInputClasses()}
                  placeholder={t('firstNamePlaceholder')}
                />
              </div>
            </div>
            <div>
              <label htmlFor="lastName" className="block text-sm sm:text-base font-semibold text-gray-800 mb-2">
                {t('lastName')} <span className="text-[#E74C3C]">*</span>
              </label>
              <div className="relative">
                <div className={getIconContainerClasses()}>
                  <User className="h-5 w-5 sm:h-6 sm:w-6 text-gray-500" />
                </div>
                <input
                  id="lastName"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  autoComplete="family-name"
                  disabled={loading}
                  className={getInputClasses()}
                  placeholder={t('lastNamePlaceholder')}
                />
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm sm:text-base font-semibold text-gray-800 mb-2">
              {t('phone')} <span className="text-gray-500 text-xs sm:text-sm font-normal">({t('optional')})</span>
            </label>
            <div className="relative">
              <div className={getIconContainerClasses()}>
                <Phone className="h-5 w-5 sm:h-6 sm:w-6 text-gray-500" />
              </div>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                autoComplete="tel"
                disabled={loading}
                className={getInputClasses()}
                placeholder={t('phonePlaceholder')}
              />
            </div>
          </div>
        </>
      )}

      {/* Email field */}
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
            disabled={isLockedOut || loading}
            className={getInputClasses()}
          placeholder={t('emailPlaceholder')}
        />
        </div>
      </div>

      {/* Password field */}
      <div>
        <label htmlFor="password" className="block text-sm sm:text-base font-semibold text-gray-800 mb-2">
          {t('password')} <span className="text-[#E74C3C]">*</span>
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
            minLength={authSettings?.passwordMinLength || 8}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            disabled={isLockedOut || loading}
            className={getInputClasses(true)}
          placeholder={t('passwordPlaceholder')}
        />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className={getRightIconButtonClasses()}
            tabIndex={-1}
            aria-label={showPassword ? t('hidePassword') : t('showPassword')}
          >
            {showPassword ? (
              <EyeOff className="h-5 w-5 sm:h-6 sm:w-6" />
            ) : (
              <Eye className="h-5 w-5 sm:h-6 sm:w-6" />
            )}
          </button>
        </div>
        
        {/* Password length warning for login */}
        {mode === 'login' && password && authSettings && password.length > 0 && password.length < authSettings.passwordMinLength && (
          <div className="mt-2.5 text-xs sm:text-sm text-amber-700 bg-amber-50/80 backdrop-blur-sm p-3 rounded-xl border border-amber-200/70">
            {t('passwordMinLength')}
          </div>
        )}
        
        {/* Password strength indicator for registration */}
        {mode === 'register' && password && (
          <div className="mt-2.5 space-y-1.5">
            {passwordErrors.length > 0 && (
              <div className="text-xs sm:text-sm text-red-700 space-y-1.5 bg-red-50/80 backdrop-blur-sm p-3 rounded-xl border border-red-200/70">
                {passwordErrors.map((errorKey) => (
                  <div key={errorKey} className="flex items-center">
                    <span className="mr-2">•</span>
                    {t(errorKey)}
                  </div>
                ))}
              </div>
            )}
            {passwordErrors.length === 0 && password.length > 0 && (
              <div className="text-xs sm:text-sm text-green-700 bg-green-50/80 backdrop-blur-sm p-3 rounded-xl border border-green-200/70 flex items-center">
                <span className="mr-2">✓</span>
                {t('passwordStrong')}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Confirm password for registration */}
      {mode === 'register' && (
        <div>
          <label htmlFor="confirmPassword" className="block text-sm sm:text-base font-semibold text-gray-800 mb-2">
            {t('confirmPassword')} <span className="text-[#E74C3C]">*</span>
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
              minLength={authSettings?.passwordMinLength || 8}
              autoComplete="new-password"
              disabled={loading}
              className={getInputClasses(true)}
            placeholder={t('confirmPasswordPlaceholder')}
          />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className={getRightIconButtonClasses()}
              tabIndex={-1}
              aria-label={showConfirmPassword ? t('hidePassword') : t('showPassword')}
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
      )}

      {/* Rate limit warning */}
      {mode === 'login' && rateLimitState && rateLimitState.remainingAttempts < 5 && rateLimitState.remainingAttempts > 0 && (
        <div className="text-amber-700 text-sm sm:text-base bg-amber-50/80 backdrop-blur-sm p-3.5 sm:p-4 rounded-xl border border-amber-200/70 flex items-center">
          <span className="mr-2">⚠</span>
          {t('remainingAttempts', { count: rateLimitState.remainingAttempts })}
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="text-red-700 text-sm sm:text-base bg-red-50/80 backdrop-blur-sm p-3.5 sm:p-4 rounded-xl border border-red-200/70 flex items-start" role="alert">
          <span className="mr-2 mt-0.5">⚠</span>
          <span>{error}</span>
        </div>
      )}

      {/* Submit button */}
      <button
        type="submit"
        disabled={loading || isLockedOut}
        className={`w-full flex justify-center items-center py-3.5 sm:py-4 px-6 sm:px-8 border border-transparent rounded-xl sm:rounded-2xl shadow-xl text-sm sm:text-base lg:text-lg font-bold text-white transition-all duration-200 ${
          mode === 'login' 
            ? 'bg-gradient-to-r from-[#6B8E7E] to-[#5a7a6b] hover:from-[#5a7a6b] hover:to-[#4a6a5b] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#6B8E7E]' 
            : 'bg-gradient-to-r from-[#E74C3C] to-[#C0392B] hover:from-[#C0392B] hover:to-[#A93226] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#E74C3C]'
        } disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98] backdrop-blur-sm`}
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
                {mode === 'login' ? t('signIn') : t('signUp')}
            <ArrowRight className="ml-2" style={{ width: '1rem', height: '1rem' }} />
          </span>
        )}
      </button>
    </form>
  )
} 
