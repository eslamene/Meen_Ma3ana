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
import { normalizePhoneNumber, validateMobileNumber, extractCountryCode } from '@/lib/utils/phone'
import { getAuthSettings, getDefaultAuthSettings, type AuthSettings } from '@/lib/utils/authSettings'
import { getAppUrl } from '@/lib/utils/app-url'
import { Eye, EyeOff, Lock, Mail, User, Phone, ArrowRight, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { defaultLogger as logger } from '@/lib/logger'

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
  const [countryCode, setCountryCode] = useState('+20')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const passwordInputRef = useRef<HTMLInputElement>(null)
  const confirmPasswordInputRef = useRef<HTMLInputElement>(null)
  const [passwordErrors, setPasswordErrors] = useState<string[]>([])
  const [rateLimitState, setRateLimitState] = useState<{
    allowed: boolean
    remainingAttempts: number
    lockoutUntil: number | null
  } | null>(null)
  const [authSettings, setAuthSettings] = useState<AuthSettings | null>(null)
  const [success, setSuccess] = useState(false)
  const [successEmail, setSuccessEmail] = useState('')
  const [resending, setResending] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)
  const [showResendVerification, setShowResendVerification] = useState(false)
  const [unverifiedEmail, setUnverifiedEmail] = useState('')
  
  // Inline validation errors
  const [emailError, setEmailError] = useState('')
  const [phoneError, setPhoneError] = useState('')
  const [validatingEmail, setValidatingEmail] = useState(false)
  const [validatingPhone, setValidatingPhone] = useState(false)
  
  // Honeypot field for bot protection
  const honeypotRef = useRef<HTMLInputElement>(null)
  
  // Debounce timers
  const emailDebounceTimer = useRef<NodeJS.Timeout | null>(null)
  const phoneDebounceTimer = useRef<NodeJS.Timeout | null>(null)
  
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

  // Inline email validation with debouncing
  useEffect(() => {
    if (emailDebounceTimer.current) {
      clearTimeout(emailDebounceTimer.current)
    }

    // Clear error when field is empty
    if (!email.trim()) {
      setEmailError('')
      return
    }

    emailDebounceTimer.current = setTimeout(async () => {
      const sanitizedEmail = sanitizeEmail(email)
      const settings = authSettings || getDefaultAuthSettings()

      // Validate email format
      if (!validateEmail(sanitizedEmail, settings)) {
        setEmailError(t('invalidEmail'))
        return
      }

      // Only check for duplicates during registration
      if (mode === 'register') {
        setValidatingEmail(true)
        try {
          // Check if email already exists
          const { data: existingUser, error: checkError } = await supabase
            .from('users')
            .select('id')
            .eq('email', sanitizedEmail)
            .maybeSingle()

          if (checkError && checkError.code !== 'PGRST116') {
            // Error other than "not found" - don't show error, just log
            logger.error('Error checking email:', { error: checkError })
            setEmailError('')
          } else if (existingUser) {
            setEmailError(t('authErrorEmailAlreadyExists'))
          } else {
            setEmailError('')
          }
        } catch (err) {
          logger.error('Error validating email:', { error: err })
          setEmailError('')
        } finally {
          setValidatingEmail(false)
        }
      } else {
        setEmailError('')
      }
    }, 500) // 500ms debounce

    return () => {
      if (emailDebounceTimer.current) {
        clearTimeout(emailDebounceTimer.current)
      }
    }
  }, [email, mode, authSettings, t])

  // Extract country code from phone input if user types it (only extract, don't change country code field)
  const phoneInputRef = useRef<string>('')
  useEffect(() => {
    if (phone.trim() && mode === 'register' && phone !== phoneInputRef.current) {
      // Check if user typed country code in the phone field
      const cleaned = phone.replace(/[\s\-\(\)]/g, '')
      
      // If phone starts with country code patterns, extract the number part only
      if (cleaned.startsWith('+20') || cleaned.startsWith('0020') || (cleaned.startsWith('20') && cleaned.length > 10)) {
        const extracted = extractCountryCode(cleaned)
        // Update phone to only contain the mobile number part (country code stays fixed)
        if (extracted.number && phone !== extracted.number) {
          phoneInputRef.current = extracted.number
          setPhone(extracted.number)
          return
        }
      }
      phoneInputRef.current = phone
    }
  }, [phone, mode])

  // Inline phone validation with debouncing
  useEffect(() => {
    if (phoneDebounceTimer.current) {
      clearTimeout(phoneDebounceTimer.current)
    }

    // Clear error when field is empty (phone is optional)
    if (!phone.trim()) {
      setPhoneError('')
      return
    }

    phoneDebounceTimer.current = setTimeout(async () => {
      const trimmedPhone = phone.trim()

      // Validate mobile number format (without country code)
      if (!validateMobileNumber(trimmedPhone)) {
        setPhoneError(t('phoneInvalid'))
        return
      }

      // Only check for duplicates during registration
      if (mode === 'register') {
        setValidatingPhone(true)
        try {
          // Normalize phone number with country code for database check
          const normalizedPhone = normalizePhoneNumber(trimmedPhone, countryCode)
          
          // Check if phone already exists
          const { data: existingUser, error: checkError } = await supabase
            .from('users')
            .select('id')
            .eq('phone', normalizedPhone)
            .maybeSingle()

          if (checkError && checkError.code !== 'PGRST116') {
            // Error other than "not found" - don't show error, just log
            logger.error('Error checking phone:', { error: checkError })
            setPhoneError('')
          } else if (existingUser) {
            setPhoneError(t('phoneAlreadyExists'))
          } else {
            setPhoneError('')
          }
        } catch (err) {
          logger.error('Error validating phone:', { error: err })
          setPhoneError('')
        } finally {
          setValidatingPhone(false)
        }
      } else {
        setPhoneError('')
      }
    }, 500) // 500ms debounce

    return () => {
      if (phoneDebounceTimer.current) {
        clearTimeout(phoneDebounceTimer.current)
      }
    }
  }, [phone, countryCode, mode, t])

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
      setError(emailError || t('invalidEmail'))
      setSuccess(false)
      setLoading(false)
      return
    }

    // Check inline validation errors
    if (mode === 'register' && emailError) {
      setError(emailError)
      setSuccess(false)
      setLoading(false)
      return
    }

    if (mode === 'register' && phoneError) {
      setError(phoneError)
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
      // Check inline validation errors first
      if (emailError) {
        setError(emailError)
        setSuccess(false)
        setLoading(false)
        return
      }

      if (phoneError) {
        setError(phoneError)
        setSuccess(false)
        setLoading(false)
        return
      }

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
        
        // Log the URL being used for debugging
        logger.debug('Email redirect URL', { redirectUrl, appUrl, environment: process.env.NODE_ENV, appUrlEnv: process.env.NEXT_PUBLIC_APP_URL })
        
        // Log warning in development if using localhost
        if (process.env.NODE_ENV === 'development' && appUrl.includes('localhost')) {
          logger.warn('⚠️ Using localhost for email redirect. Set NEXT_PUBLIC_APP_URL in production.')
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
          // Check if error is due to email already existing
          const isEmailExistsError = error.message?.toLowerCase().includes('already registered') ||
            error.message?.toLowerCase().includes('user already registered') ||
            error.message?.toLowerCase().includes('email already exists') ||
            error.message?.toLowerCase().includes('already been registered') ||
            error.message?.toLowerCase().includes('user already exists')
          
          if (isEmailExistsError) {
            // Check if user exists and is unverified
            try {
              // Try to get the user from auth (we can't directly query auth.users, so we'll try to resend)
              // If resend works, user exists but is unverified
              const { error: resendError } = await supabase.auth.resend({
                type: 'signup',
                email: sanitizedEmail,
                options: {
                  emailRedirectTo: redirectUrl
                }
              })
              
              if (!resendError) {
                // User exists but is unverified - resend was successful
                setSuccess(true)
                setSuccessEmail(sanitizedEmail)
                setError('')
                toast.success(t('verificationEmailResent') || 'Verification email sent!', {
                  description: t('emailExistsUnverified') || 'This email is already registered but not verified. We\'ve sent a new verification email.',
                  duration: 7000
                })
                onSuccess?.()
                setLoading(false)
                return
              } else {
                // Resend failed - user might be verified or there's another issue
                // Check if it's a rate limit error
                if (resendError.message?.includes('For security purposes, you can only request this after')) {
                  const waitMatch = resendError.message.match(/(\d+)\s+seconds?/i)
                  const waitSeconds = waitMatch ? parseInt(waitMatch[1], 10) : 30
                  const waitMinutes = Math.ceil(waitSeconds / 60)
                  
                  const rateLimitMessage = waitMinutes > 1
                    ? t('resendRateLimitMinutes', { minutes: waitMinutes }) || `Please wait ${waitMinutes} minutes before requesting another verification email.`
                    : t('resendRateLimitSeconds', { seconds: waitSeconds }) || `Please wait ${waitSeconds} seconds before requesting another verification email.`
                  
                  setError(rateLimitMessage)
                  toast.error(t('resendRateLimit') || 'Please wait before resending', {
                    description: rateLimitMessage,
                    duration: 7000
                  })
                  setLoading(false)
                  return
                }
                
                // User might be verified - suggest login instead
                setError(t('emailExistsVerified') || 'This email is already registered and verified. Please sign in instead.')
                toast.error(t('emailExistsVerified') || 'Email already verified', {
                  description: t('pleaseSignIn') || 'Please sign in with your existing account.',
                  duration: 5000
                })
                setLoading(false)
                return
              }
            } catch (resendErr) {
              // If resend fails, fall through to show generic error
              logger.error('Error checking/resending verification:', { error: resendErr })
            }
          }
          
          // For other errors, show the sanitized error message
          const sanitizedError = sanitizeAuthError(error, true) // true = isRegistration
          setError(t(sanitizedError))
          setSuccess(false)
          onError?.(t(sanitizedError))
          setLoading(false)
          return
        }

        // Create user record in users table
        if (data?.user) {
          // Normalize phone number with country code
          const normalizedPhone = phone.trim() 
            ? normalizePhoneNumber(phone.trim(), countryCode)
            : null

          const { error: userError } = await supabase
            .from('users')
            .upsert({
              id: data.user.id,
              email: sanitizedEmail,
              first_name: firstName.trim(),
              last_name: lastName.trim(),
              phone: normalizedPhone,
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
            
            logger.error('Error creating user record:', { error: userError })
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
          
          // Check if error is due to unverified email
          const isUnverifiedError = error.message?.toLowerCase().includes('email not confirmed') ||
            error.message?.toLowerCase().includes('email not verified') ||
            error.message?.toLowerCase().includes('confirm your email')
          
          if (isUnverifiedError) {
            // Show resend verification option
            setShowResendVerification(true)
            setUnverifiedEmail(sanitizedEmail)
            setError(t('emailNotVerified') || 'Your email address has not been verified. Please check your email for a verification link.')
            onError?.(t('emailNotVerified') || 'Email not verified')
            // Clear resend success state when showing new error
            setResendSuccess(false)
            return
          } else {
            // Hide resend option for other errors
            setShowResendVerification(false)
          }
          
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

  const handleResendVerification = async (emailToResend?: string) => {
    const email = emailToResend || successEmail
    if (!email) return

    try {
      setResending(true)
      setResendSuccess(false)
      setError('')

      // Get the app URL for email redirect (same as registration)
      const appUrl = getAppUrl()
      const redirectUrl = `${appUrl}/${localeParam}/auth/callback`
      
      logger.debug('Resend - Email redirect URL', { redirectUrl, appUrl })

      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: redirectUrl
        }
      })

      if (resendError) {
        // Handle rate limiting specifically
        if (resendError.message?.includes('For security purposes, you can only request this after')) {
          // Extract wait time from error message (e.g., "after 29 seconds")
          const waitMatch = resendError.message.match(/(\d+)\s+seconds?/i)
          const waitSeconds = waitMatch ? parseInt(waitMatch[1], 10) : 30
          const waitMinutes = Math.ceil(waitSeconds / 60)
          
          const rateLimitMessage = waitMinutes > 1
            ? t('resendRateLimitMinutes', { minutes: waitMinutes }) || `Please wait ${waitMinutes} minutes before requesting another verification email.`
            : t('resendRateLimitSeconds', { seconds: waitSeconds }) || `Please wait ${waitSeconds} seconds before requesting another verification email.`
          
          setError(rateLimitMessage)
          toast.error(t('resendRateLimit') || 'Please wait before resending', {
            description: rateLimitMessage,
            duration: 7000
          })
          return
        }
        throw resendError
      }

      setResendSuccess(true)
      setShowResendVerification(false) // Hide the resend option after successful send
      toast.success(t('verificationEmailSent') || 'Verification email sent!', {
        description: t('checkEmailInbox') || 'Please check your email inbox.',
        duration: 5000
      })
    } catch (error) {
      logger.error('Error resending verification email:', { error: error })
      const errorMessage = error instanceof Error && error.message?.includes('rate limit')
        ? t('resendRateLimit') || 'Please wait before resending another email.'
        : t('resendError') || 'Failed to send verification email. Please try again.'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setResending(false)
    }
  }

  // Show success message instead of form for registration
  if (mode === 'register' && success) {
    return (
      <div className="space-y-6">
        <div className="bg-green-50/90 backdrop-blur-sm border-2 border-green-200 rounded-2xl p-8 sm:p-10 text-center">
          <div className="flex justify-center mb-6">
            <div className="bg-green-100 rounded-full p-4">
              <CheckCircle2 className="h-16 w-16 text-green-600" />
            </div>
          </div>
          <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
            {t('accountCreated') || 'Account Created'}
          </h3>
          <p className="text-base sm:text-lg text-gray-700 mb-2">
            {t('signUpSuccessSimple') || 'Please check your email to verify your account.'}
          </p>
          {successEmail && (
            <p className="text-sm text-gray-600 mb-6">
              {t('emailSentTo') || 'Email sent to:'} <span className="font-semibold">{successEmail}</span>
            </p>
          )}

          {/* Error message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center justify-center space-x-2">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
              <p className="text-sm text-red-800">{error}</p>
          </div>
          )}

          {/* Success message for resend */}
          {resendSuccess && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center justify-center space-x-2">
              <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
              <p className="text-sm text-green-800">{t('verificationEmailSent') || 'Verification email sent!'}</p>
        </div>
          )}

          <div className="space-y-3">
            {/* Resend button */}
            <button
              onClick={() => handleResendVerification()}
              disabled={resending || resendSuccess}
              className="w-full inline-flex items-center justify-center px-6 py-3 bg-white border-2 border-[#6B8E7E] text-[#6B8E7E] font-semibold rounded-xl hover:bg-[#6B8E7E] hover:text-white transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {resending ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  {t('sending') || 'Sending...'}
                </>
              ) : resendSuccess ? (
                <>
                  <CheckCircle2 className="mr-2 h-5 w-5" />
                  {t('emailSent') || 'Email Sent!'}
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-5 w-5" />
                  {t('resendVerificationEmail') || 'Resend Verification Email'}
                </>
              )}
            </button>

            {/* Go to Login button */}
          <Link 
            href={`/${localeParam}/auth/login`}
              className="block w-full inline-flex items-center justify-center px-6 py-3 bg-[#6B8E7E] text-white font-semibold rounded-xl hover:bg-[#5a7a6b] transition-colors shadow-lg"
          >
              {t('goToLogin') || 'Go to Login'} <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
          </div>
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
    return `absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors z-10 cursor-pointer`
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
            <div className="flex gap-2">
              {/* Country Code Field - Read Only */}
              <div className="relative w-28 flex-shrink-0">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                  <span className="text-gray-500 text-base font-medium">+</span>
                </div>
                <input
                  id="countryCode"
                  type="text"
                  value={countryCode.replace('+', '')}
                  readOnly
                  disabled
                  className="w-full pl-7 pr-3 py-3 sm:py-3.5 text-sm sm:text-base border border-gray-300/70 bg-gray-100/80 backdrop-blur-sm rounded-xl shadow-sm cursor-not-allowed opacity-70 transition-all"
                  placeholder="20"
                  maxLength={3}
                  tabIndex={-1}
                  aria-label="Country code (read-only)"
                />
              </div>
              {/* Phone Number Field */}
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Phone className="h-5 w-5 sm:h-6 sm:w-6 text-gray-500" />
              </div>
              <input
                id="phone"
                type="tel"
                value={phone}
                  onChange={(e) => {
                    // Only allow digits, remove any non-digit characters
                    const value = e.target.value.replace(/\D/g, '')
                    // Remove leading zeros
                    let cleaned = value.replace(/^0+/, '')
                    // If user types country code digits (20) at start, remove them
                    // Only if the number is long enough to be a full number with country code
                    if (cleaned.startsWith('20') && cleaned.length > 10) {
                      cleaned = cleaned.substring(2)
                    }
                    // Limit to 10 digits (Egyptian mobile number length)
                    if (cleaned.length > 10) {
                      cleaned = cleaned.substring(0, 10)
                    }
                    phoneInputRef.current = cleaned
                    setPhone(cleaned)
                    setPhoneError('') // Clear error when user starts typing
                  }}
                autoComplete="tel"
                disabled={loading}
                  className={`block w-full pl-11 sm:pl-12 ${validatingPhone ? 'pr-12' : 'pr-4'} py-3 sm:py-3.5 text-sm sm:text-base border border-gray-300/70 bg-white/60 backdrop-blur-sm rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-[#6B8E7E]/50 focus:border-[#6B8E7E] focus:bg-white/80 disabled:bg-gray-100/60 disabled:cursor-not-allowed transition-all placeholder:text-gray-400 ${phoneError ? 'border-red-500 focus:border-red-500 focus:ring-red-500/50' : ''}`}
                  placeholder={t('phoneNumberPlaceholder') || '01XX XXX XXXX'}
                  maxLength={10}
              />
                {validatingPhone && (
                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
                    <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
            </div>
                )}
              </div>
            </div>
            {phoneError && (
              <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {phoneError}
              </p>
            )}
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
          onChange={(e) => {
            setEmail(e.target.value)
            setEmailError('') // Clear error when user starts typing
            // Clear resend verification state when email changes
            if (mode === 'login') {
              setShowResendVerification(false)
              setResendSuccess(false)
            }
          }}
          required
            autoComplete="email"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck="false"
            disabled={isLockedOut || loading}
          className={`${getInputClasses()} ${emailError ? 'border-red-500 focus:border-red-500 focus:ring-red-500/50' : ''} ${validatingEmail ? 'pr-12' : ''}`}
          placeholder={t('emailPlaceholder')}
        />
        {validatingEmail && (
          <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
            <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
        </div>
        )}
        </div>
        {emailError && (
          <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
            <AlertCircle className="h-4 w-4" />
            {emailError}
          </p>
        )}
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
          ref={passwordInputRef}
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
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              const newShowPassword = !showPassword
              setShowPassword(newShowPassword)
              
              // Safari fix: blur and refocus to ensure type change takes effect
              if (passwordInputRef.current) {
                const input = passwordInputRef.current
                const currentValue = input.value
                const currentSelectionStart = input.selectionStart
                const currentSelectionEnd = input.selectionEnd
                
                // Blur to release focus
                input.blur()
                
                // Use setTimeout to ensure Safari processes the type change
                setTimeout(() => {
                  if (passwordInputRef.current) {
                    passwordInputRef.current.focus()
                    // Restore cursor position
                    if (currentSelectionStart !== null && currentSelectionEnd !== null) {
                      passwordInputRef.current.setSelectionRange(currentSelectionStart, currentSelectionEnd)
                    }
                  }
                }, 10)
              }
            }}
            onMouseDown={(e) => {
              e.preventDefault()
              e.stopPropagation()
            }}
            className={getRightIconButtonClasses()}
            tabIndex={-1}
            disabled={isLockedOut || loading}
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
            ref={confirmPasswordInputRef}
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
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                const newShowConfirmPassword = !showConfirmPassword
                setShowConfirmPassword(newShowConfirmPassword)
                
                // Safari fix: blur and refocus to ensure type change takes effect
                if (confirmPasswordInputRef.current) {
                  const input = confirmPasswordInputRef.current
                  const currentValue = input.value
                  const currentSelectionStart = input.selectionStart
                  const currentSelectionEnd = input.selectionEnd
                  
                  // Blur to release focus
                  input.blur()
                  
                  // Use setTimeout to ensure Safari processes the type change
                  setTimeout(() => {
                    if (confirmPasswordInputRef.current) {
                      confirmPasswordInputRef.current.focus()
                      // Restore cursor position
                      if (currentSelectionStart !== null && currentSelectionEnd !== null) {
                        confirmPasswordInputRef.current.setSelectionRange(currentSelectionStart, currentSelectionEnd)
                      }
                    }
                  }, 10)
                }
              }}
              onMouseDown={(e) => {
                e.preventDefault()
                e.stopPropagation()
              }}
              className={getRightIconButtonClasses()}
              tabIndex={-1}
              disabled={loading}
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
        <div className="space-y-3">
        <div className="text-red-700 text-sm sm:text-base bg-red-50/80 backdrop-blur-sm p-3.5 sm:p-4 rounded-xl border border-red-200/70 flex items-start" role="alert">
          <span className="mr-2 mt-0.5">⚠</span>
            <span className="flex-1">{error}</span>
          </div>
          
          {/* Resend verification button for unverified users (login mode only) */}
          {mode === 'login' && showResendVerification && unverifiedEmail && (
            <div className="bg-blue-50/80 backdrop-blur-sm p-3.5 sm:p-4 rounded-xl border border-blue-200/70">
              <p className="text-sm sm:text-base text-blue-800 mb-3">
                {t('resendVerificationPrompt') || 'Need a new verification email?'}
              </p>
              <button
                type="button"
                onClick={() => handleResendVerification(unverifiedEmail)}
                disabled={resending || resendSuccess}
                className="w-full inline-flex items-center justify-center px-4 py-2.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
              >
                {resending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('sending') || 'Sending...'}
                  </>
                ) : resendSuccess ? (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    {t('emailSent') || 'Email Sent!'}
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    {t('resendVerificationEmail') || 'Resend Verification Email'}
                  </>
                )}
              </button>
              {resendSuccess && (
                <p className="mt-2 text-xs sm:text-sm text-blue-700">
                  {t('checkEmailInbox') || 'Please check your email inbox for the verification link.'}
                </p>
              )}
            </div>
          )}
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
