/**
 * Phone number utilities for normalization and validation
 * Supports international phone numbers while defaulting to Egypt (+20) for local numbers
 */

/**
 * Detect country code from phone number
 * Returns the detected country code or null if not found
 */
function detectCountryCode(phone: string): { code: string; length: number } | null {
  if (!phone) return null
  
  const cleaned = phone.replace(/[\s\-\(\)]/g, '')
  
  // Check for international format with + (e.g., +971, +20, +1)
  const plusMatch = cleaned.match(/^\+(\d{1,3})/)
  if (plusMatch) {
    return { code: `+${plusMatch[1]}`, length: plusMatch[0].length }
  }
  
  // Check for 00 format (e.g., 00971, 0020)
  const doubleZeroMatch = cleaned.match(/^00(\d{1,3})/)
  if (doubleZeroMatch) {
    return { code: `+${doubleZeroMatch[1]}`, length: doubleZeroMatch[0].length }
  }
  
  return null
}

/**
 * Normalize phone number to a standard format
 * Handles international numbers and defaults to Egypt (+20) for local numbers
 * Returns normalized format: +COUNTRYCODEXXXXXXXXX
 * 
 * Examples:
 * - "+971504278747" -> "+971504278747"
 * - "00971504278747" -> "+971504278747"
 * - "01012345678" -> "+201012345678" (defaults to Egypt)
 * - "+201012345678" -> "+201012345678"
 * - "+20+971504278747" -> "+971504278747" (fixes malformed input)
 */
export function normalizePhoneNumber(phone: string, defaultCountryCode: string = '+20'): string {
  if (!phone) return ''
  
  // Remove all spaces, dashes, and parentheses
  let cleaned = phone.replace(/[\s\-\(\)]/g, '')
  
  // Handle malformed input with multiple country codes (e.g., "+20+971...")
  // Find all country codes in the string
  let detectedCode: { code: string; length: number } | null = null
  let remainingNumber = cleaned
  
  // First, detect country code
  detectedCode = detectCountryCode(remainingNumber)
  
  if (detectedCode) {
    // Remove the detected country code
    remainingNumber = remainingNumber.substring(detectedCode.length)
    
    // Check if there's another country code after (malformed input like "+20+971...")
    const nextCode = detectCountryCode(remainingNumber)
    if (nextCode) {
      // Use the second country code (the actual one) and ignore the first
      detectedCode = nextCode
      remainingNumber = remainingNumber.substring(nextCode.length)
    }
    
    // Phone has a country code, use it
    // Remove leading zeros from number part
    const normalizedNumber = remainingNumber.replace(/^0+/, '')
    return `${detectedCode.code}${normalizedNumber}`
  }
  
  // No country code detected, use default (Egypt +20)
  const normalizedDefaultCode = defaultCountryCode.startsWith('+') ? defaultCountryCode : `+${defaultCountryCode}`
  
  // Remove leading zeros from the number part
  cleaned = cleaned.replace(/^0+/, '')
  
  // Combine default country code with number
  return `${normalizedDefaultCode}${cleaned}`
}

/**
 * Extract country code from phone number
 * Returns the country code (e.g., "+20", "+971") and the number part
 */
export function extractCountryCode(phone: string, defaultCountryCode: string = '+20'): { countryCode: string; number: string } {
  if (!phone) return { countryCode: defaultCountryCode, number: '' }
  
  // Remove all spaces, dashes, and parentheses
  const cleaned = phone.replace(/[\s\-\(\)]/g, '')
  
  // Detect country code
  const detectedCode = detectCountryCode(cleaned)
  
  if (detectedCode) {
    const numberPart = cleaned.substring(detectedCode.length).replace(/^0+/, '')
    return { countryCode: detectedCode.code, number: numberPart }
  }
  
  // Default to provided country code if no country code detected
  const normalizedDefaultCode = defaultCountryCode.startsWith('+') ? defaultCountryCode : `+${defaultCountryCode}`
  return { countryCode: normalizedDefaultCode, number: cleaned.replace(/^0+/, '') }
}

/**
 * Validate phone number format (mobile number part only, without country code)
 * For Egyptian numbers: 10 digits starting with 01 or 1
 * For international numbers: accepts any valid length (6-15 digits)
 * Valid formats: 
 * - Egyptian: 01XXXXXXXX (10 digits), 1XXXXXXXXX (10 digits)
 * - International: varies by country
 */
export function validateMobileNumber(mobileNumber: string, isInternational: boolean = false): boolean {
  if (!mobileNumber) return false
  
  // Remove all spaces, dashes
  const cleaned = mobileNumber.replace(/[\s\-]/g, '')
  
  // Remove leading zeros
  const normalized = cleaned.replace(/^0+/, '')
  
  // For international numbers, accept broader range (6-15 digits)
  if (isInternational) {
    return /^\d{6,15}$/.test(normalized)
  }
  
  // Egyptian mobile: Should be exactly 10 digits starting with 1
  // Valid: 1XXXXXXXXX (10 digits total)
  // Also accept 01XXXXXXXX (will be normalized to 1XXXXXXXXX)
  if (cleaned.length === 10 && cleaned.startsWith('01')) {
    return /^01\d{8}$/.test(cleaned)
  }
  
  // Normalized format: 10 digits starting with 1
  return /^1\d{9}$/.test(normalized) && normalized.length === 10
}

/**
 * Validate complete phone number (with country code)
 * Supports international numbers
 */
export function validatePhoneNumber(phone: string, defaultCountryCode: string = '+20'): boolean {
  if (!phone) return false
  
  const normalized = normalizePhoneNumber(phone, defaultCountryCode)
  
  // Extract country code to determine if it's international
  const { countryCode, number } = extractCountryCode(phone, defaultCountryCode)
  const isInternational = countryCode !== defaultCountryCode
  
  // Remove country code to get mobile part
  const mobilePart = normalized.replace(/^\+\d{1,3}/, '')
  
  return validateMobileNumber(mobilePart, isInternational)
}

/**
 * Format phone number for display
 * Examples: 
 * - Egyptian: +20 100 433 1083
 * - International: +971 50 427 8747
 */
export function formatPhoneNumber(phone: string, defaultCountryCode: string = '+20'): string {
  if (!phone) return ''
  
  const normalized = normalizePhoneNumber(phone, defaultCountryCode)
  
  // Extract country code and number
  const { countryCode, number } = extractCountryCode(phone, defaultCountryCode)
  
  // Format Egyptian numbers: +20 XXX XXX XXXX
  if (countryCode === '+20' && number.length === 10) {
    return `${countryCode} ${number.substring(0, 3)} ${number.substring(3, 6)} ${number.substring(6)}`
  }
  
  // Format UAE numbers: +971 XX XXX XXXX
  if (countryCode === '+971' && number.length >= 9) {
    const formatted = number.length === 9 
      ? `${number.substring(0, 2)} ${number.substring(2, 5)} ${number.substring(5)}`
      : number
    return `${countryCode} ${formatted}`
  }
  
  // For other international numbers, return normalized format
  return normalized
}

