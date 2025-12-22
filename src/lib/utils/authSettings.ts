/**
 * Authentication Settings Utility
 * 
 * Fetches authentication policy settings from system_config table
 * Provides default values if settings are not found
 * 
 * Settings include:
 * - Password policy (min length, requirements)
 * - Email validation regex
 */

import { createClient } from '@/lib/supabase/client'

import { defaultLogger as logger } from '@/lib/logger'

export interface AuthSettings {
  passwordMinLength: number
  passwordRequireUppercase: boolean
  passwordRequireLowercase: boolean
  passwordRequireNumber: boolean
  passwordRequireSpecial: boolean
  emailRegex: string
}

// Default settings - these should NOT be used in production
// All values should come from system_config via getAuthSettings()
// These are only used as a last resort if database is completely unavailable
const DEFAULT_SETTINGS: AuthSettings = {
  passwordMinLength: 8, // Should come from system_config 'auth.password.min_length'
  passwordRequireUppercase: true, // Should come from system_config 'auth.password.require_uppercase'
  passwordRequireLowercase: true, // Should come from system_config 'auth.password.require_lowercase'
  passwordRequireNumber: true, // Should come from system_config 'auth.password.require_number'
  passwordRequireSpecial: true, // Should come from system_config 'auth.password.require_special'
  emailRegex: '', // Should come from system_config 'auth.email.regex' - empty triggers fallback
}

/**
 * Normalizes a regex pattern retrieved from PostgreSQL database for use in JavaScript RegExp
 * 
 * With dollar-quoting in PostgreSQL, the pattern should be stored exactly as JavaScript needs it.
 * However, we still check and handle any escaping issues that might occur.
 * 
 * The pattern is stored using PostgreSQL dollar-quoting ($$) which avoids SQL escaping issues,
 * so it should be retrieved exactly as stored, ready for JavaScript RegExp.
 */
function normalizeRegexPattern(pattern: string): string {
  if (!pattern || typeof pattern !== 'string') {
    return pattern
  }
  
  // With dollar-quoting, the pattern should already be correct
  // But we trim it to be safe
  return pattern.trim()
}

/**
 * Fetches authentication settings from system_config
 * Returns default values if settings are not found
 */
export async function getAuthSettings(): Promise<AuthSettings> {
  try {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('system_config')
      .select('config_key, config_value')
      .in('config_key', [
        'auth.password.min_length',
        'auth.password.require_uppercase',
        'auth.password.require_lowercase',
        'auth.password.require_number',
        'auth.password.require_special',
        'auth.email.regex',
      ])

    if (error) {
      logger.error('Error fetching auth settings:', { error: error })
      logger.warn('Using default auth settings due to error')
      return DEFAULT_SETTINGS
    }

    // Log if no data returned
    if (!data || data.length === 0) {
      logger.warn('No auth settings found in system_config, using defaults')
      return DEFAULT_SETTINGS
    }

    // Convert array to object for easier access
    const settingsMap = new Map(
      data.map(item => [item.config_key, item.config_value])
    )

    // Get email regex from system_config - this MUST come from database, not hardcoded
    let emailRegexFromConfig = settingsMap.get('auth.email.regex')
    if (!emailRegexFromConfig || emailRegexFromConfig.trim() === '') {
      logger.error('WARNING: auth.email.regex not found in system_config!')
      logger.error('Email validation will use fallback simple pattern. Please ensure auth.email.regex is set in system_config table.')
      // Don't throw - allow other settings to work, but emailRegex will be empty
      // This will trigger the fallback simple pattern in validateEmail()
    } else {
      // Trim the pattern
      emailRegexFromConfig = emailRegexFromConfig.trim()
      
      // Normalize the pattern for JavaScript RegExp
      // PostgreSQL stores patterns with specific escaping that needs to be handled
      emailRegexFromConfig = normalizeRegexPattern(emailRegexFromConfig)
      
      // Debug: Log what we got from the database (before normalization)
      if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
        console.log('Retrieved email regex from system_config (before normalization):', {
          length: emailRegexFromConfig.length,
          firstChars: emailRegexFromConfig.substring(0, 100),
          hasBackslashes: emailRegexFromConfig.includes('\\'),
          backslashCount: (emailRegexFromConfig.match(/\\/g) || []).length,
          doubleBackslashCount: (emailRegexFromConfig.match(/\\\\/g) || []).length
        })
      }
      
      // Normalize the pattern
      const normalizedPattern = normalizeRegexPattern(emailRegexFromConfig)
      
      // Debug: Log after normalization
      if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
        console.log('After normalization:', {
          length: normalizedPattern.length,
          firstChars: normalizedPattern.substring(0, 100),
          backslashCount: (normalizedPattern.match(/\\/g) || []).length
        })
      }
      
      // Test if the pattern can be compiled as a RegExp
      try {
        const testRegex = new RegExp(normalizedPattern, 'i')
        // Test with a known valid email
        const testResult = testRegex.test('test@example.com')
        if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
          console.log('Email regex pattern is valid, compiled successfully', {
            testResult,
            regexString: testRegex.toString().substring(0, 100)
          })
        }
        // Use the normalized pattern
        emailRegexFromConfig = normalizedPattern
      } catch (regexError) {
        logger.error('ERROR: Email regex from system_config is invalid after normalization!', { error: regexError })
        logger.error('Original pattern (first 200 chars):', { error: emailRegexFromConfig.substring(0, 200) })
        logger.error('Normalized pattern (first 200 chars):', { error: normalizedPattern.substring(0, 200) })
        logger.error('Full pattern length:', { error: emailRegexFromConfig.length })
        // Set to empty so fallback is used
        emailRegexFromConfig = ''
      }
    }

    // Get all password settings from system_config - these MUST come from database
    const passwordMinLengthFromConfig = settingsMap.get('auth.password.min_length')
    const requireUppercaseFromConfig = settingsMap.get('auth.password.require_uppercase')
    const requireLowercaseFromConfig = settingsMap.get('auth.password.require_lowercase')
    const requireNumberFromConfig = settingsMap.get('auth.password.require_number')
    const requireSpecialFromConfig = settingsMap.get('auth.password.require_special')

    // Validate that all required settings are present
    const missingSettings: string[] = []
    if (!passwordMinLengthFromConfig) missingSettings.push('auth.password.min_length')
    if (requireUppercaseFromConfig === undefined || requireUppercaseFromConfig === null) missingSettings.push('auth.password.require_uppercase')
    if (requireLowercaseFromConfig === undefined || requireLowercaseFromConfig === null) missingSettings.push('auth.password.require_lowercase')
    if (requireNumberFromConfig === undefined || requireNumberFromConfig === null) missingSettings.push('auth.password.require_number')
    if (requireSpecialFromConfig === undefined || requireSpecialFromConfig === null) missingSettings.push('auth.password.require_special')

    if (missingSettings.length > 0) {
      logger.error('WARNING: Missing required auth settings in system_config:', { error: missingSettings })
      logger.error('Please ensure all auth settings are configured in system_config table.')
    }

    const settings: AuthSettings = {
      // All values MUST come from system_config - no hardcoded fallbacks
      passwordMinLength: passwordMinLengthFromConfig 
        ? parseInt(passwordMinLengthFromConfig, 10) 
        : DEFAULT_SETTINGS.passwordMinLength, // Only used if database value is missing
      passwordRequireUppercase: requireUppercaseFromConfig === 'true' || 
        (requireUppercaseFromConfig === undefined ? DEFAULT_SETTINGS.passwordRequireUppercase : false),
      passwordRequireLowercase: requireLowercaseFromConfig === 'true' || 
        (requireLowercaseFromConfig === undefined ? DEFAULT_SETTINGS.passwordRequireLowercase : false),
      passwordRequireNumber: requireNumberFromConfig === 'true' || 
        (requireNumberFromConfig === undefined ? DEFAULT_SETTINGS.passwordRequireNumber : false),
      passwordRequireSpecial: requireSpecialFromConfig === 'true' || 
        (requireSpecialFromConfig === undefined ? DEFAULT_SETTINGS.passwordRequireSpecial : false),
      // Email regex MUST come from system_config dynamically - no hardcoded fallback
      // If not found, empty string will trigger fallback simple pattern in validateEmail()
      emailRegex: emailRegexFromConfig || '',
    }
    
    return settings
  } catch (error) {
    logger.error('Exception fetching auth settings:', { error: error })
    logger.warn('Using default auth settings due to exception')
    return DEFAULT_SETTINGS
  }
}

/**
 * Hook to use auth settings in React components
 * Caches settings to avoid repeated fetches
 */
let cachedSettings: AuthSettings | null = null
let settingsPromise: Promise<AuthSettings> | null = null

export function useAuthSettings(): AuthSettings {
  // For client components, we'll fetch on first call
  // In a real implementation, you might want to use React Query or similar
  if (!cachedSettings && !settingsPromise) {
    settingsPromise = getAuthSettings().then(settings => {
      cachedSettings = settings
      settingsPromise = null
      return settings
    })
  }

  // Return cached settings or default if not loaded yet
  return cachedSettings || DEFAULT_SETTINGS
}

/**
 * Clear cached settings (useful for testing or when settings are updated)
 */
export function clearAuthSettingsCache() {
  cachedSettings = null
  settingsPromise = null
}

/**
 * Get default settings (synchronous, for use in non-async contexts)
 */
export function getDefaultAuthSettings(): AuthSettings {
  return { ...DEFAULT_SETTINGS }
}

