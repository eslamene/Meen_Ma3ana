/**
 * Phone number utilities for normalization and validation
 */

/**
 * Normalize phone number to a standard format
 * Handles various formats: +20, 0020, 20, or just the number
 * Returns normalized format: +20XXXXXXXXXX
 */
export function normalizePhoneNumber(phone: string, countryCode: string = '+20'): string {
  if (!phone) return ''
  
  // Remove all spaces, dashes, and parentheses
  let cleaned = phone.replace(/[\s\-\(\)]/g, '')
  
  // If country code is provided separately, ensure it starts with +
  const normalizedCountryCode = countryCode.startsWith('+') ? countryCode : `+${countryCode}`
  
  // Remove country code from phone if it exists
  // Handle +20, 0020, 20 formats
  if (cleaned.startsWith('+20')) {
    cleaned = cleaned.substring(3)
  } else if (cleaned.startsWith('0020')) {
    cleaned = cleaned.substring(4)
  } else if (cleaned.startsWith('20') && cleaned.length > 10) {
    cleaned = cleaned.substring(2)
  }
  
  // Remove leading zeros from the number part
  cleaned = cleaned.replace(/^0+/, '')
  
  // Combine country code with number
  return `${normalizedCountryCode}${cleaned}`
}

/**
 * Extract country code from phone number
 * Returns the country code (e.g., "+20") and the number part
 */
export function extractCountryCode(phone: string): { countryCode: string; number: string } {
  if (!phone) return { countryCode: '+20', number: '' }
  
  // Remove all spaces, dashes, and parentheses
  const cleaned = phone.replace(/[\s\-\(\)]/g, '')
  
  // Check for +20 format
  if (cleaned.startsWith('+20')) {
    return { countryCode: '+20', number: cleaned.substring(3).replace(/^0+/, '') }
  }
  
  // Check for 0020 format
  if (cleaned.startsWith('0020')) {
    return { countryCode: '+20', number: cleaned.substring(4).replace(/^0+/, '') }
  }
  
  // Check for 20 format (if number is long enough)
  if (cleaned.startsWith('20') && cleaned.length > 10) {
    return { countryCode: '+20', number: cleaned.substring(2).replace(/^0+/, '') }
  }
  
  // Default to +20 if no country code detected
  return { countryCode: '+20', number: cleaned.replace(/^0+/, '') }
}

/**
 * Validate phone number format (mobile number part only, without country code)
 * Egyptian mobile numbers: 10 digits starting with 01 or 1
 * Valid formats: 01XXXXXXXX (10 digits), 1XXXXXXXXX (10 digits)
 */
export function validateMobileNumber(mobileNumber: string): boolean {
  if (!mobileNumber) return false
  
  // Remove all spaces, dashes
  const cleaned = mobileNumber.replace(/[\s\-]/g, '')
  
  // Remove leading zeros
  const normalized = cleaned.replace(/^0+/, '')
  
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
 */
export function validatePhoneNumber(phone: string, countryCode: string = '+20'): boolean {
  if (!phone) return false
  
  const normalized = normalizePhoneNumber(phone, countryCode)
  
  // Remove country code to get mobile part
  const mobilePart = normalized.replace(/^\+\d{1,3}/, '')
  
  return validateMobileNumber(mobilePart)
}

/**
 * Format phone number for display
 * Example: +20 100 433 1083
 */
export function formatPhoneNumber(phone: string): string {
  if (!phone) return ''
  
  const normalized = normalizePhoneNumber(phone)
  
  // Format: +20 XXX XXX XXXX
  if (normalized.startsWith('+20')) {
    const number = normalized.substring(3)
    if (number.length === 10) {
      return `+20 ${number.substring(0, 3)} ${number.substring(3, 6)} ${number.substring(6)}`
    }
  }
  
  return normalized
}

