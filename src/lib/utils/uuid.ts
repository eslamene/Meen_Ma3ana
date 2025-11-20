/**
 * UUID Validation Utility
 * 
 * Provides functions to validate UUID format
 */

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Validates if a string is a valid UUID format
 * @param value - The string to validate
 * @returns true if the string is a valid UUID format, false otherwise
 */
export function isValidUUID(value: string | null | undefined): boolean {
  if (!value || typeof value !== 'string') {
    return false
  }
  return UUID_REGEX.test(value)
}

/**
 * Validates a UUID and throws an error if invalid
 * @param value - The string to validate
 * @param fieldName - The name of the field being validated (for error messages)
 * @throws Error if the UUID is invalid
 */
export function validateUUID(value: string | null | undefined, fieldName = 'ID'): asserts value is string {
  if (!isValidUUID(value)) {
    throw new Error(`Invalid ${fieldName} format: expected UUID, got "${value}"`)
  }
}


