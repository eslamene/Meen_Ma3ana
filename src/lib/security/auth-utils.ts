/**
 * Security utilities for authentication
 */

import type { AuthSettings } from '@/lib/utils/authSettings'
import { getDefaultAuthSettings } from '@/lib/utils/authSettings'

/**
 * Validates password strength using configurable settings
 * Requirements are configurable via system_config:
 * - Minimum length (default: 8)
 * - Uppercase letter (default: required)
 * - Lowercase letter (default: required)
 * - Number (default: required)
 * - Special character (default: required)
 */
export function validatePasswordStrength(
  password: string,
  settings?: AuthSettings
): {
  isValid: boolean
  errors: string[]
} {
  // Use provided settings, or get default
  const authSettings = settings || getDefaultAuthSettings()
  const errors: string[] = []

  if (password.length < authSettings.passwordMinLength) {
    errors.push('passwordMinLength')
  }

  if (authSettings.passwordRequireUppercase && !/[A-Z]/.test(password)) {
    errors.push('passwordNeedsUppercase')
  }

  if (authSettings.passwordRequireLowercase && !/[a-z]/.test(password)) {
    errors.push('passwordNeedsLowercase')
  }

  if (authSettings.passwordRequireNumber && !/[0-9]/.test(password)) {
    errors.push('passwordNeedsNumber')
  }

  if (authSettings.passwordRequireSpecial && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('passwordNeedsSpecial')
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Sanitizes email input to prevent XSS
 */
export function sanitizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

/**
 * Sanitizes error messages to prevent information leakage
 * Returns generic error messages that don't reveal if email exists
 */
export function sanitizeAuthError(error: Error | unknown): string {
  if (!(error instanceof Error)) {
    return 'authErrorGeneric'
  }

  const errorMessage = error.message.toLowerCase()

  // Don't reveal if email exists or not
  if (
    errorMessage.includes('invalid login') ||
    errorMessage.includes('invalid credentials') ||
    errorMessage.includes('email not confirmed') ||
    errorMessage.includes('user not found') ||
    errorMessage.includes('wrong password')
  ) {
    return 'authErrorInvalidCredentials'
  }

  // Rate limiting errors
  if (
    errorMessage.includes('rate limit') ||
    errorMessage.includes('too many requests') ||
    errorMessage.includes('too many attempts')
  ) {
    return 'authErrorRateLimit'
  }

  // Account locked errors
  if (
    errorMessage.includes('locked') ||
    errorMessage.includes('suspended') ||
    errorMessage.includes('disabled')
  ) {
    return 'authErrorAccountLocked'
  }

  // Network errors
  if (
    errorMessage.includes('network') ||
    errorMessage.includes('timeout') ||
    errorMessage.includes('connection')
  ) {
    return 'authErrorNetwork'
  }

  // Generic error for everything else
  return 'authErrorGeneric'
}

/**
 * Client-side rate limiting for login attempts
 * Uses localStorage to track attempts per email
 */
export interface RateLimitState {
  attempts: number
  lockoutUntil: number | null
  lastAttempt: number
}

const MAX_ATTEMPTS = 5
const LOCKOUT_DURATION = 15 * 60 * 1000 // 15 minutes
const ATTEMPT_WINDOW = 15 * 60 * 1000 // 15 minutes

export function checkRateLimit(email: string): {
  allowed: boolean
  remainingAttempts: number
  lockoutUntil: number | null
} {
  if (typeof window === 'undefined') {
    return { allowed: true, remainingAttempts: MAX_ATTEMPTS, lockoutUntil: null }
  }

  const key = `auth_rate_limit_${email.toLowerCase()}`
  const stored = localStorage.getItem(key)
  const now = Date.now()

  if (!stored) {
    return { allowed: true, remainingAttempts: MAX_ATTEMPTS, lockoutUntil: null }
  }

  const state: RateLimitState = JSON.parse(stored)

  // Check if lockout period has passed
  if (state.lockoutUntil && now < state.lockoutUntil) {
    return {
      allowed: false,
      remainingAttempts: 0,
      lockoutUntil: state.lockoutUntil
    }
  }

  // Reset if lockout period has passed
  if (state.lockoutUntil && now >= state.lockoutUntil) {
    localStorage.removeItem(key)
    return { allowed: true, remainingAttempts: MAX_ATTEMPTS, lockoutUntil: null }
  }

  // Reset attempts if window has passed
  if (now - state.lastAttempt > ATTEMPT_WINDOW) {
    localStorage.removeItem(key)
    return { allowed: true, remainingAttempts: MAX_ATTEMPTS, lockoutUntil: null }
  }

  const remainingAttempts = Math.max(0, MAX_ATTEMPTS - state.attempts)

  return {
    allowed: state.attempts < MAX_ATTEMPTS,
    remainingAttempts,
    lockoutUntil: state.lockoutUntil
  }
}

export function recordFailedAttempt(email: string): void {
  if (typeof window === 'undefined') return

  const key = `auth_rate_limit_${email.toLowerCase()}`
  const stored = localStorage.getItem(key)
  const now = Date.now()

  let state: RateLimitState = stored
    ? JSON.parse(stored)
    : { attempts: 0, lockoutUntil: null, lastAttempt: now }

  // Reset if window has passed
  if (now - state.lastAttempt > ATTEMPT_WINDOW) {
    state = { attempts: 0, lockoutUntil: null, lastAttempt: now }
  }

  state.attempts++
  state.lastAttempt = now

  // Lock out if max attempts reached
  if (state.attempts >= MAX_ATTEMPTS) {
    state.lockoutUntil = now + LOCKOUT_DURATION
  }

  localStorage.setItem(key, JSON.stringify(state))
}

export function clearRateLimit(email: string): void {
  if (typeof window === 'undefined') return
  const key = `auth_rate_limit_${email.toLowerCase()}`
  localStorage.removeItem(key)
}

/**
 * Validates email format using configurable regex from system_config
 * Uses RFC 5322 compliant pattern from system_config as primary validator
 * Falls back to a simple pattern only if the configured regex is missing or invalid
 */
export function validateEmail(email: string, settings?: AuthSettings): boolean {
  if (!email || typeof email !== 'string') {
    return false
  }
  
  const trimmedEmail = email.trim()
  if (!trimmedEmail) {
    return false
  }
  
  const authSettings = settings || getDefaultAuthSettings()
  
  // Primary validation: Use RFC 5322 compliant regex from system_config
  // Note: emailRegex should always come from system_config via getAuthSettings()
  // getDefaultAuthSettings() returns empty string, which will trigger fallback
  if (authSettings.emailRegex && authSettings.emailRegex !== '') {
    try {
      const regexPattern = authSettings.emailRegex.trim()
      
      // Debug: Log the pattern to see what we're getting from the database
      if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
        console.log('Email regex from config:', {
          pattern: regexPattern,
          patternLength: regexPattern.length,
          firstChars: regexPattern.substring(0, 50),
          hasBackslashes: regexPattern.includes('\\')
        })
      }
      
      // Ensure the pattern is properly formatted for RegExp
      // PostgreSQL stores \\ as \ in the database, which is correct for RegExp
      // But if somehow we get double backslashes, we need to handle it
      // The pattern should work as-is from the database
      
      // Add case-insensitive flag for comprehensive RFC 5322 pattern
      const regex = new RegExp(regexPattern, 'i')
      const isValid = regex.test(trimmedEmail)
      
      if (isValid) {
        return true
      }
      
      // RFC 5322 pattern didn't match - log for debugging
      if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
        console.warn('RFC 5322 email regex did not match:', {
          email: trimmedEmail,
          pattern: regexPattern.substring(0, 100),
          regexString: regex.toString().substring(0, 100),
          testResult: isValid
        })
      }
      
      // RFC 5322 pattern failed - email is invalid
      return false
    } catch (error) {
      // If configured regex is invalid, fall back to simple pattern
      console.error('Invalid email regex in config, falling back to simple pattern:', error)
      console.error('Pattern that failed (first 200 chars):', authSettings.emailRegex.substring(0, 200))
      // Fall through to simple pattern validation below
    }
  }
  
  // Fallback: Simple, reliable email validation pattern
  // Only used if no regex is configured or if the configured regex is invalid
  const simpleEmailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return simpleEmailRegex.test(trimmedEmail)
}

/**
 * Validates minimum password length using configurable settings
 * Used for both login and registration
 */
export function validatePasswordLength(password: string, settings?: AuthSettings): boolean {
  const authSettings = settings || getDefaultAuthSettings()
  return password.length >= authSettings.passwordMinLength
}

/**
 * Generates a simple CSRF token (for client-side use)
 * Note: Real CSRF protection should be server-side
 */
export function generateCSRFToken(): string {
  const array = new Uint8Array(32)
  if (typeof window !== 'undefined' && window.crypto) {
    window.crypto.getRandomValues(array)
  } else {
    // Fallback for environments without crypto
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256)
    }
  }
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}

